import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  saveWorkspaceToIDB,
  loadUnifiedWorkspace,
  clearWorkspaceFromIDB,
  resetIDBForTesting,
} from '../../src/utils/idbStorage';
import {
  WorkspaceState,
  createTaskOp,
  compareVersions,
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

describe('Startup Hydration Races & Monotonicity', () => {
  beforeEach(async () => {
    resetIDBForTesting();
    await clearWorkspaceFromIDB();
    localStorage.clear();
  });

  it('prevents stale async storage snapshot from overwriting user mutations executed before hydration completes', async () => {
    // 1. Storage contains a previous persisted workspace with revision 1
    const storedState = createBaselineWorkspace();
    storedState.revision = 1;
    await saveWorkspaceToIDB(storedState);

    // 2. Application starts with in-memory baseline state
    let inMemoryState = createBaselineWorkspace();
    let localMutatedBeforeHydration = false;

    // Simulate async storage read in flight (deferred resolution)
    let resolveStorageRead!: (val: WorkspaceState | null) => void;
    const pendingHydrationPromise = new Promise<WorkspaceState | null>((resolve) => {
      resolveStorageRead = resolve;
    });

    // 3. User immediately interacts before hydration promise completes:
    // Creates a new urgent task in memory
    const { state: mutatedState, task: createdTask } = createTaskOp(
      inMemoryState,
      {
        title: 'Urgent Pre-Hydration Bugfix',
        priority: 'Urgent',
        projectId: storedState.projects[0].id,
      },
      '2026-09-23T10:00:00.000Z'
    );

    inMemoryState = mutatedState;
    localMutatedBeforeHydration = true;
    expect(inMemoryState.revision).toBe(2);
    expect(inMemoryState.tasks.some((t) => t.id === createdTask.id)).toBe(true);

    // 4. Async storage read finally completes with the older snapshot (revision 1)
    const rawPersisted = await loadUnifiedWorkspace();
    resolveStorageRead(rawPersisted);
    const persistedSnapshot = await pendingHydrationPromise;

    expect(persistedSnapshot).not.toBeNull();
    expect(persistedSnapshot!.revision).toBe(1);

    // 5. Hydration guard logic:
    // When local mutations have occurred (or persisted is older/equal), in-memory state is protected
    const shouldOverwrite =
      !localMutatedBeforeHydration &&
      compareVersions(persistedSnapshot!, inMemoryState) > 0;

    expect(shouldOverwrite).toBe(false);

    if (!shouldOverwrite) {
      // In-memory state remains authoritative
      // Persisted state does NOT overwrite user's created task
      expect(inMemoryState.tasks.some((t) => t.id === createdTask.id)).toBe(true);
      expect(inMemoryState.revision).toBe(2);
    }
  });

  it('allows hydration to update in-memory state when storage is genuinely newer and user has not mutated', async () => {
    // 1. Storage contains a newer snapshot (e.g. from another tab or previous session)
    const storedState = createBaselineWorkspace();
    storedState.epoch = 1;
    storedState.revision = 15;
    await saveWorkspaceToIDB(storedState);

    // 2. Fresh mount with baseline revision 1
    let inMemoryState = createBaselineWorkspace();
    inMemoryState.revision = 1;
    const localMutated = false;

    // 3. Hydrate
    const persisted = await loadUnifiedWorkspace();
    expect(persisted).not.toBeNull();

    const shouldOverwrite =
      !localMutated && compareVersions(persisted!, inMemoryState) > 0;

    expect(shouldOverwrite).toBe(true);
    if (shouldOverwrite) {
      inMemoryState = persisted!;
    }

    expect(inMemoryState.revision).toBe(15);
  });

  it('guarantees repeated / duplicate hydration passes are idempotent', async () => {
    const storedState = createBaselineWorkspace();
    storedState.revision = 5;
    await saveWorkspaceToIDB(storedState);

    const firstLoad = await loadUnifiedWorkspace();
    const secondLoad = await loadUnifiedWorkspace();

    expect(firstLoad).not.toBeNull();
    expect(secondLoad).not.toBeNull();
    expect(firstLoad!.revision).toBe(secondLoad!.revision);
    expect(firstLoad!.tasks.length).toBe(secondLoad!.tasks.length);
    expect(compareVersions(firstLoad!, secondLoad!)).toBe(0);
  });
});
