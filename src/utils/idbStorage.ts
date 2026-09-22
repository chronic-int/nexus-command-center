import { WorkspaceState } from '../domain/workspaceDomain';
import { STORAGE_KEYS, getStoredItem, setStoredItem } from './storage';

const DB_NAME = 'nexus_indexeddb';
const DB_VERSION = 1;
const STORE_NAME = 'workspace_store';
const RECORD_KEY = 'current_workspace';

let dbInstance: IDBDatabase | null = null;
let isOpening = false;
let openPromise: Promise<IDBDatabase | null> | null = null;

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
 * Directly writes a workspace state record into IndexedDB.
 */
export async function saveWorkspaceToIDB(state: WorkspaceState): Promise<boolean> {
  try {
    const db = await getIDBDatabase();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(state, RECORD_KEY);

        req.onsuccess = () => resolve(true);
        req.onerror = (err) => {
          console.warn('[NEXUS IDB] Write transaction failed:', err);
          resolve(false);
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
          resolve(val || null);
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
// Debounced Write Queue with In-Flight Coalescing
// ---------------------------------------------------------------------------

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingStateToPersist: WorkspaceState | null = null;
let isWriteInFlight = false;
let flushResolvers: Array<() => void> = [];

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

  try {
    const idbSuccess = await saveWorkspaceToIDB(stateToWrite);
    if (!idbSuccess) {
      // Fallback to localStorage (best-effort; catches QuotaExceededError without crashing)
      try {
        setStoredItem(STORAGE_KEYS.PROJECTS, stateToWrite.projects);
        setStoredItem(STORAGE_KEYS.TASKS, stateToWrite.tasks);
        setStoredItem(STORAGE_KEYS.MEMBERS, stateToWrite.members);
        setStoredItem(STORAGE_KEYS.INVITATIONS, stateToWrite.pendingInvitations);
        setStoredItem(STORAGE_KEYS.DOCUMENTS, stateToWrite.documents);
        setStoredItem(STORAGE_KEYS.NOTIFICATIONS, stateToWrite.notifications);
        setStoredItem(STORAGE_KEYS.AUTOMATIONS, stateToWrite.automations);
        setStoredItem(STORAGE_KEYS.ACTIVITIES, stateToWrite.activities);
      } catch (err) {
        console.warn('[NEXUS Storage] Fallback write to localStorage failed:', err);
      }
    }
  } catch (err) {
    console.warn('[NEXUS Storage] Persistence cycle exception:', err);
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
 * Unified persistence loader:
 * Checks IndexedDB first. If not found or empty, loads from LocalStorage.
 */
export async function loadUnifiedWorkspace(): Promise<WorkspaceState | null> {
  // 1. Try IndexedDB
  const idbData = await loadWorkspaceFromIDB();
  if (idbData && idbData.projects && idbData.tasks) {
    return idbData;
  }

  // 2. Check localStorage fallback
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
