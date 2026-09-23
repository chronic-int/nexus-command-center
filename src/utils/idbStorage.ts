import { WorkspaceState, compareVersions } from '../domain/workspaceDomain';
import { STORAGE_KEYS, getStoredItem, setStoredItem } from './storage';
import { PersistedEnvelope, PersistenceStatus } from '../types';
import { broadcastStorageCommit } from './tabSync';

const DB_NAME = 'nexus_indexeddb';
const DB_VERSION = 1;
const STORE_NAME = 'workspace_store';
const RECORD_KEY = 'current_workspace';
const ENVELOPE_STORAGE_KEY = 'nexus_workspace_envelope';

let dbInstance: IDBDatabase | null = null;
let isOpening = false;
let openPromise: Promise<IDBDatabase | null> | null = null;

// Persistence status state & listeners
let currentStatus: PersistenceStatus = 'saved';
const statusListeners = new Set<(status: PersistenceStatus) => void>();

export function getPersistenceStatus(): PersistenceStatus {
  return currentStatus;
}

export function setPersistenceStatus(status: PersistenceStatus): void {
  if (currentStatus === status) return;
  currentStatus = status;
  for (const listener of statusListeners) {
    try {
      listener(status);
    } catch {
      // ignore listener errors
    }
  }
}

export function onPersistenceStatusChange(listener: (status: PersistenceStatus) => void): () => void {
  statusListeners.add(listener);
  listener(currentStatus);
  return () => {
    statusListeners.delete(listener);
  };
}

/**
 * Initializes and caches the IndexedDB connection.
 * Returns null if IndexedDB is not supported or access is denied.
 */
export async function getIDBDatabase(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return null;
  }
  if (dbInstance) {
    return dbInstance;
  }
  if (isOpening && openPromise) {
    return openPromise;
  }

  isOpening = true;
  openPromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = (event) => {
        dbInstance = (event.target as IDBOpenDBRequest).result;
        isOpening = false;
        resolve(dbInstance);
      };

      request.onerror = (err) => {
        console.warn('[NEXUS IDB] Failed to open IndexedDB database, using fallback:', err);
        isOpening = false;
        resolve(null);
      };

      request.onblocked = () => {
        console.warn('[NEXUS IDB] Database open blocked by another tab');
        isOpening = false;
        resolve(null);
      };
    } catch (err) {
      console.warn('[NEXUS IDB] Exception while opening IndexedDB:', err);
      isOpening = false;
      resolve(null);
    }
  });

  return openPromise;
}

/**
 * Wraps a workspace state in a PersistedEnvelope.
 */
export function wrapWorkspaceEnvelope(state: WorkspaceState): PersistedEnvelope<WorkspaceState> {
  return {
    schemaVersion: state.schemaVersion ?? 1,
    epoch: state.epoch ?? 1,
    revision: state.revision ?? 1,
    savedAt: state.lastSavedAt || new Date().toISOString(),
    data: state,
  };
}

/**
 * Directly loads the raw persisted envelope from IndexedDB.
 */
export async function loadRawEnvelopeFromIDB(): Promise<PersistedEnvelope<WorkspaceState> | null> {
  try {
    const db = await getIDBDatabase();
    if (!db) return null;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(RECORD_KEY);

        req.onsuccess = () => {
          const val = req.result;
          if (!val) {
            resolve(null);
            return;
          }
          // Check if enveloped or raw legacy format
          if (val.schemaVersion && val.data) {
            resolve(val as PersistedEnvelope<WorkspaceState>);
          } else if (val.projects && val.tasks) {
            // Legacy un-enveloped format
            resolve({
              schemaVersion: 1,
              epoch: val.epoch ?? 1,
              revision: val.revision ?? 1,
              savedAt: val.lastSavedAt || new Date().toISOString(),
              data: val as WorkspaceState,
            });
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  } catch {
    return null;
  }
}

/**
 * Directly writes a workspace state record into IndexedDB with monotonicity check.
 * Rejects or ignores writes that would regress durable epoch/revision.
 */
export async function saveWorkspaceToIDB(state: WorkspaceState): Promise<boolean> {
  try {
    const db = await getIDBDatabase();
    if (!db) return false;

    const candidateEnvelope = wrapWorkspaceEnvelope(state);

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        // Check currently stored record to guarantee monotonicity
        const getReq = store.get(RECORD_KEY);

        getReq.onsuccess = () => {
          const current = getReq.result;
          if (current) {
            const currentEnvelope = current.data ? current : {
              epoch: current.epoch ?? 1,
              revision: current.revision ?? 1,
            };

            // If candidate is strictly older or colliding, do not regress durable storage
            const cmp = compareVersions(currentEnvelope, candidateEnvelope);
            if (cmp > 0) {
              console.warn(
                `[NEXUS IDB] Discarding stale write (candidate epoch:${candidateEnvelope.epoch} rev:${candidateEnvelope.revision} <= current epoch:${currentEnvelope.epoch} rev:${currentEnvelope.revision})`
              );
              resolve(false);
              return;
            }
            if (
              cmp === 0 &&
              currentEnvelope.savedAt &&
              candidateEnvelope.savedAt &&
              currentEnvelope.savedAt !== candidateEnvelope.savedAt
            ) {
              console.warn(
                `[NEXUS IDB] Concurrent same-revision collision detected (epoch:${candidateEnvelope.epoch} rev:${candidateEnvelope.revision})`
              );
              resolve(false);
              return;
            }
          }

          const putReq = store.put(candidateEnvelope, RECORD_KEY);
          putReq.onsuccess = () => resolve(true);
          putReq.onerror = (err) => {
            console.warn('[NEXUS IDB] Write put failed:', err);
            resolve(false);
          };
        };

        getReq.onerror = (err) => {
          console.warn('[NEXUS IDB] Pre-write check failed:', err);
          // Attempt put anyway if get failed
          const putReq = store.put(candidateEnvelope, RECORD_KEY);
          putReq.onsuccess = () => resolve(true);
          putReq.onerror = () => resolve(false);
        };
      } catch (err) {
        console.warn('[NEXUS IDB] Transaction creation exception:', err);
        resolve(false);
      }
    });
  } catch (err) {
    console.warn('[NEXUS IDB] saveWorkspaceToIDB failed:', err);
    return false;
  }
}

/**
 * Directly loads workspace state from IndexedDB.
 */
export async function loadWorkspaceFromIDB(): Promise<WorkspaceState | null> {
  const envelope = await loadRawEnvelopeFromIDB();
  return envelope ? envelope.data : null;
}

/**
 * Clears workspace data from IndexedDB.
 */
export async function clearWorkspaceFromIDB(): Promise<boolean> {
  try {
    const db = await getIDBDatabase();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(RECORD_KEY);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Debounced Write Queue with In-Flight Coalescing, Retries & Status
// ---------------------------------------------------------------------------

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingStateToPersist: WorkspaceState | null = null;
let isWriteInFlight = false;
let flushResolvers: Array<() => void> = [];
let lastFailedState: WorkspaceState | null = null;

export function retryFailedPersistence(): void {
  if (lastFailedState) {
    const state = lastFailedState;
    lastFailedState = null;
    scheduleWorkspacePersistence(state, 0);
  }
}

/**
 * Flushes any pending writes asynchronously. Resolves when all writes are committed.
 */
export async function flushWorkspacePersistence(): Promise<void> {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  if (!pendingStateToPersist && !isWriteInFlight) {
    return;
  }

  return new Promise((resolve) => {
    flushResolvers.push(resolve);
    triggerPersistCycle();
  });
}

/**
 * Executes a write attempt with up to 3 retries and exponential backoff.
 */
async function writeWithRetries(state: WorkspaceState, maxRetries = 3): Promise<boolean> {
  let attempt = 0;
  while (attempt < maxRetries) {
    attempt++;
    const success = await saveWorkspaceToIDB(state);
    if (success) {
      return true;
    }
    if (attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, attempt * 50));
    }
  }
  return false;
}

/**
 * Core write loop: writes pendingStateToPersist, then drains any newer state or resolves waiters.
 */
async function triggerPersistCycle(): Promise<void> {
  if (isWriteInFlight) {
    return;
  }

  if (!pendingStateToPersist) {
    const resolvers = flushResolvers;
    flushResolvers = [];
    resolvers.forEach((r) => r());
    return;
  }

  const stateToWrite = pendingStateToPersist;
  pendingStateToPersist = null;
  isWriteInFlight = true;
  setPersistenceStatus('saving');

  try {
    const idbSuccess = await writeWithRetries(stateToWrite, 3);
    if (idbSuccess) {
      setPersistenceStatus('saved');
      lastFailedState = null;
      try {
        broadcastStorageCommit(stateToWrite.epoch ?? 1, stateToWrite.revision ?? 1);
      } catch {
        // ignore
      }
    } else {
      // Check if IDB already holds a newer or conflicting revision (stale rejection vs actual IDB error)
      const currentStored = await loadRawEnvelopeFromIDB();
      const candidateEnvelope = wrapWorkspaceEnvelope(stateToWrite);
      if (currentStored && compareVersions(currentStored, candidateEnvelope) >= 0) {
        // Discarded because stored state is strictly newer or colliding
        setPersistenceStatus('conflict');
        lastFailedState = null;
      } else {
        // Fallback to localStorage envelope with best-effort
        try {
          const envelope = wrapWorkspaceEnvelope(stateToWrite);
          localStorage.setItem(ENVELOPE_STORAGE_KEY, JSON.stringify(envelope));
          // Also keep raw keys for backwards compatibility if quota allows
          setStoredItem(STORAGE_KEYS.PROJECTS, stateToWrite.projects);
          setStoredItem(STORAGE_KEYS.TASKS, stateToWrite.tasks);
          setPersistenceStatus('saved');
          lastFailedState = null;
        } catch (storageErr) {
          console.warn('[NEXUS Storage] Fallback write to localStorage failed:', storageErr);
          setPersistenceStatus('error');
          lastFailedState = stateToWrite;
        }
      }
    }
  } catch (err) {
    console.warn('[NEXUS Storage] Persistence cycle exception:', err);
    setPersistenceStatus('error');
    lastFailedState = stateToWrite;
  } finally {
    isWriteInFlight = false;

    if (pendingStateToPersist) {
      // Another mutation was queued while writing
      triggerPersistCycle();
    } else {
      const resolvers = flushResolvers;
      flushResolvers = [];
      resolvers.forEach((r) => r());
    }
  }
}

/**
 * Schedules a debounced persistence write (default 500ms).
 * Coalesces rapid consecutive mutations into a single disk write.
 */
export function scheduleWorkspacePersistence(state: WorkspaceState, delayMs: number = 500): void {
  // If we already have a pending state, ensure we don't regress version
  if (pendingStateToPersist && compareVersions(pendingStateToPersist, state) > 0) {
    return;
  }
  pendingStateToPersist = state;

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    triggerPersistCycle();
  }, delayMs);
}

/**
 * Loads the raw envelope stored in localStorage (if any).
 */
export function loadEnvelopeFromLocalStorage(): PersistedEnvelope<WorkspaceState> | null {
  try {
    const raw = localStorage.getItem(ENVELOPE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.data && parsed.epoch !== undefined) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Unified persistence loader:
 * Checks IndexedDB and LocalStorage, resolves split-brain by picking highest (epoch, revision).
 */
export async function loadUnifiedWorkspace(): Promise<WorkspaceState | null> {
  // 1. Fetch both envelopes
  const idbEnvelope = await loadRawEnvelopeFromIDB();
  const localEnvelope = loadEnvelopeFromLocalStorage();

  // 2. Resolve split-brain: choose whichever envelope has strictly higher version
  if (idbEnvelope && localEnvelope) {
    const cmp = compareVersions(localEnvelope, idbEnvelope);
    if (cmp > 0) {
      console.warn(
        `[NEXUS Storage] LocalStorage envelope (epoch:${localEnvelope.epoch}, rev:${localEnvelope.revision}) is newer than IndexedDB (epoch:${idbEnvelope.epoch}, rev:${idbEnvelope.revision}). Migrating forward.`
      );
      // Migrate newer localStorage state to IndexedDB asynchronously
      saveWorkspaceToIDB(localEnvelope.data).catch(() => {});
      return localEnvelope.data;
    }
    return idbEnvelope.data;
  }

  if (idbEnvelope) {
    return idbEnvelope.data;
  }

  if (localEnvelope) {
    return localEnvelope.data;
  }

  // 3. Check legacy localStorage keys fallback
  try {
    const projects = getStoredItem(STORAGE_KEYS.PROJECTS, null);
    const tasks = getStoredItem(STORAGE_KEYS.TASKS, null);
    if (projects && tasks) {
      const members = getStoredItem(STORAGE_KEYS.MEMBERS, []);
      const pendingInvitations = getStoredItem(STORAGE_KEYS.INVITATIONS, []);
      const documents = getStoredItem(STORAGE_KEYS.DOCUMENTS, []);
      const notifications = getStoredItem(STORAGE_KEYS.NOTIFICATIONS, []);
      const automations = getStoredItem(STORAGE_KEYS.AUTOMATIONS, []);
      const activities = getStoredItem(STORAGE_KEYS.ACTIVITIES, []);

      return {
        schemaVersion: 1,
        epoch: 1,
        revision: 1,
        projects,
        tasks,
        members,
        pendingInvitations,
        documents,
        notifications,
        automations,
        activities,
      };
    }
  } catch {
    // ignore
  }

  return null;
}

// ---------------------------------------------------------------------------
// Page Lifecycle Listeners
// ---------------------------------------------------------------------------

if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushWorkspacePersistence().catch(() => {});
    }
  });

  window.addEventListener('pagehide', () => {
    flushWorkspacePersistence().catch(() => {});
  });
}

/**
 * Resets internal module state for testing.
 */
export function resetIDBForTesting(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      // ignore
    }
  }
  dbInstance = null;
  isOpening = false;
  openPromise = null;
  pendingStateToPersist = null;
  isWriteInFlight = false;
  lastFailedState = null;
  currentStatus = 'saved';
  statusListeners.clear();
  flushResolvers = [];
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}
