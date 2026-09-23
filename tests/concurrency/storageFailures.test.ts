import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import {
  saveWorkspaceToIDB,
  loadUnifiedWorkspace,
  wrapWorkspaceEnvelope,
  clearWorkspaceFromIDB,
  onPersistenceStatusChange,
  scheduleWorkspacePersistence,
  flushWorkspacePersistence,
  resetIDBForTesting,
} from '../../src/utils/idbStorage';
import {
  WorkspaceState,
} from '../../src/domain/workspaceDomain';
import {
  INITIAL_PROJECTS,
  INITIAL_TASKS,
  INITIAL_MEMBERS,
  INITIAL_DOCUMENTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUTOMATIONS,
  INITIAL_ACTIVITIES,
} from '../../src/data/seedData';
import { createLargeWorkspace } from '../../src/data/largeWorkspaceGenerator';
import { PersistenceStatus } from '../../src/types';

function createBaselineWorkspace(): WorkspaceState {
  return {
    schemaVersion: 1,
    epoch: 1,
    revision: 1,
    projects: [...INITIAL_PROJECTS],
    tasks: [...INITIAL_TASKS],
    members: [...INITIAL_MEMBERS],
    pendingInvitations: [],
    documents: [...INITIAL_DOCUMENTS],
    notifications: [...INITIAL_NOTIFICATIONS],
    automations: [...INITIAL_AUTOMATIONS],
    activities: [...INITIAL_ACTIVITIES],
  };
}

describe('Storage Failures, Split-Brain Resolution & >5MB Durability', () => {
  beforeEach(async () => {
    resetIDBForTesting();
    await clearWorkspaceFromIDB();
    localStorage.clear();
  });

  it('resolves split-brain between LocalStorage and IndexedDB by adopting the newest snapshot and migrating forward', async () => {
    const base = createBaselineWorkspace();

    // 1. Older snapshot in IndexedDB (e.g. rev 10)
    const idbState: WorkspaceState = {
      ...base,
      epoch: 1,
      revision: 10,
      tasks: [{ ...base.tasks[0], title: 'Old Task in IndexedDB' }, ...base.tasks.slice(1)],
    };
    await saveWorkspaceToIDB(idbState);

    // 2. Newer snapshot in LocalStorage (e.g. rev 15 written during a previous tab when IDB was blocked)
    const localState: WorkspaceState = {
      ...base,
      epoch: 1,
      revision: 15,
      tasks: [{ ...base.tasks[0], title: 'Newer Task in LocalStorage' }, ...base.tasks.slice(1)],
    };
    const localEnvelope = wrapWorkspaceEnvelope(localState);
    localStorage.setItem('nexus_workspace_envelope', JSON.stringify(localEnvelope));

    // 3. Load unified workspace
    const loaded = await loadUnifiedWorkspace();

    // Must resolve in favor of the newer LocalStorage snapshot
    expect(loaded).not.toBeNull();
    expect(loaded!.revision).toBe(15);
    expect(loaded!.tasks[0].title).toBe('Newer Task in LocalStorage');
  });

  it('tracks honest persistence status transitions (saving -> saved)', async () => {
    const statuses: PersistenceStatus[] = [];
    const unsubscribe = onPersistenceStatusChange((s) => {
      statuses.push(s);
    });

    const base = createBaselineWorkspace();
    const nextState = { ...base, revision: 2 };

    scheduleWorkspacePersistence(nextState, 10);
    await flushWorkspacePersistence();

    unsubscribe();

    expect(statuses).toContain('saving');
    expect(statuses[statuses.length - 1]).toBe('saved');
  });

  it('handles simulated storage write failures with retry and status reporting', async () => {
    resetIDBForTesting();
    const statuses: PersistenceStatus[] = [];
    const unsubscribe = onPersistenceStatusChange((s) => {
      statuses.push(s);
    });

    // Mock Storage.prototype.setItem to throw QuotaExceededError
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError: DOM Exception 22');
    });

    // Mock indexedDB.open to fail
    const openSpy = vi.spyOn(indexedDB, 'open').mockImplementation(() => {
      const req = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as unknown as IDBOpenDBRequest;
      setTimeout(() => {
        if (req.onerror) {
          req.onerror(new Event('error') as unknown as Event);
        }
      }, 0);
      return req;
    });

    try {
      const base = createBaselineWorkspace();
      scheduleWorkspacePersistence(base, 5);
      await flushWorkspacePersistence();

      // Status should report error
      expect(statuses).toContain('error');
    } finally {
      storageSpy.mockRestore();
      openSpy.mockRestore();
      resetIDBForTesting();
      unsubscribe();
    }
  });

  it('durably persists and recovers a real >5MB payload roundtrip without data corruption', async () => {
    resetIDBForTesting();
    // 1. Generate large scale workspace (450 projects, 9000 tasks, 3000 activities)
    const largeWorkspace = createLargeWorkspace({
      seed: 42,
      projects: 450,
      tasks: 9000,
      members: 150,
      notifications: 1500,
      activities: 3000,
      documents: 300,
      automations: 50,
    });
    largeWorkspace.schemaVersion = 1;
    largeWorkspace.epoch = 1;
    largeWorkspace.revision = 42;

    const envelope = wrapWorkspaceEnvelope(largeWorkspace);
    const serializedJson = JSON.stringify(envelope);
    const byteLength = new TextEncoder().encode(serializedJson).length;

    // Explicitly assert payload exceeds 5MB fixture requirement (5,242,880 bytes)
    expect(byteLength).toBeGreaterThan(5 * 1024 * 1024);

    // 2. Persist to real IndexedDB
    const startTime = performance.now();
    const saveSuccess = await saveWorkspaceToIDB(largeWorkspace);
    const writeDuration = performance.now() - startTime;

    expect(saveSuccess).toBe(true);

    // 3. Round-trip recovery from IndexedDB
    const loadStartTime = performance.now();
    const recovered = await loadUnifiedWorkspace();
    const readDuration = performance.now() - loadStartTime;

    expect(recovered).not.toBeNull();
    expect(recovered!.tasks.length).toBe(9000);
    expect(recovered!.projects.length).toBe(450);
    expect(recovered!.members.length).toBe(150);
    expect(recovered!.revision).toBe(42);

    // Verify entity field integrity
    expect(recovered!.tasks[0].id).toBe(largeWorkspace.tasks[0].id);
    expect(recovered!.tasks[8999].id).toBe(largeWorkspace.tasks[8999].id);
    expect(recovered!.projects[449].id).toBe(largeWorkspace.projects[449].id);

    console.log(
      `>5MB Persistence Benchmark: ${(byteLength / (1024 * 1024)).toFixed(2)} MB written in ${writeDuration.toFixed(1)}ms, read in ${readDuration.toFixed(1)}ms`
    );
  }, 15000);
});
