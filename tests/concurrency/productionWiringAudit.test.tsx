import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  saveWorkspaceToIDB,
  loadUnifiedWorkspace,
  clearWorkspaceFromIDB,
  resetIDBForTesting,
  getPersistenceStatus,
  setPersistenceStatus,
} from '../../src/utils/idbStorage';
import {
  WorkspaceState,
  createTaskOp,
  updateTaskOp,
  advanceWorkspaceVersion,
  mergeTaskFields,
} from '../../src/domain/workspaceDomain';
import { hydrateAndValidateWorkspace, WorkspaceDefaults } from '../../src/domain/workspaceHydration';
import { validateWorkspaceIntegrity } from '../../src/domain/workspaceIntegrity';
import { applyRemoteTaskDelta, resetTabSyncForTesting } from '../../src/utils/tabSync';
import {
  INITIAL_PROJECTS,
  INITIAL_TASKS,
  INITIAL_MEMBERS,
  INITIAL_DOCUMENTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUTOMATIONS,
  INITIAL_ACTIVITIES,
} from '../../src/data/seedData';
import { Task } from '../../src/types';

const defaultSeed: WorkspaceDefaults = {
  projects: INITIAL_PROJECTS,
  tasks: INITIAL_TASKS,
  members: INITIAL_MEMBERS,
  pendingInvitations: [],
  documents: INITIAL_DOCUMENTS,
  notifications: INITIAL_NOTIFICATIONS,
  automations: INITIAL_AUTOMATIONS,
  activities: INITIAL_ACTIVITIES,
};

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

describe('Prompt 7 Final Examination: Production Wiring & Integration Audit', () => {
  beforeEach(async () => {
    resetIDBForTesting();
    resetTabSyncForTesting();
    await clearWorkspaceFromIDB();
    localStorage.clear();
    setPersistenceStatus('saved');
  });

  it('AUDIT BUG 1: Hydration must preserve (schemaVersion, epoch, revision, lastSavedAt) and not drop them', () => {
    const rawSavedState: WorkspaceState = {
      ...createBaselineWorkspace(),
      schemaVersion: 1,
      epoch: 2,
      revision: 42,
      lastSavedAt: '2026-09-23T12:00:00.000Z',
    };

    const hydrated = hydrateAndValidateWorkspace(rawSavedState, defaultSeed).workspace;

    // In existing implementation, epoch and revision were undefined (wiped during hydration!)
    expect(hydrated.epoch).toBe(2);
    expect(hydrated.revision).toBe(42);
    expect(hydrated.schemaVersion).toBe(1);
    expect(hydrated.lastSavedAt).toBe('2026-09-23T12:00:00.000Z');
  });

  it('AUDIT BUG 1 (End-to-End Failure): Reload must NOT cause subsequent mutations to be rejected as stale writes', async () => {
    // 1. Initial lifecycle: User performs mutations up to revision 5, durably persisted to IDB
    let state = createBaselineWorkspace();
    state = advanceWorkspaceVersion(state, { revision: 5 });
    const saved = await saveWorkspaceToIDB(state);
    expect(saved).toBe(true);

    // 2. Browser Tab Reload: state is loaded from IDB and passed through hydration sanitization
    const persisted = await loadUnifiedWorkspace();
    expect(persisted).not.toBeNull();

    // The real AppContext mount path:
    const sanitized = hydrateAndValidateWorkspace(persisted!, createBaselineWorkspace()).workspace;

    // 3. User creates a new task post-reload in memory
    const { state: postReloadState, task: newTask } = createTaskOp(sanitized, {
      title: 'Post-Reload Urgent Task',
      projectId: sanitized.projects[0].id,
    });

    expect(newTask.title).toBe('Post-Reload Urgent Task');

    // Revision post-reload MUST be strictly greater than what was stored before reload (rev 5)
    // In existing code, sanitized had revision: undefined, so advanceWorkspaceVersion produced revision: 1!
    expect(postReloadState.revision).toBeGreaterThan(5);

    // 4. Persistence attempt post-reload must succeed and NOT be discarded as a stale write!
    // In existing code, candidate rev 1 was discarded against stored rev 5!
    const writeResult = await saveWorkspaceToIDB(postReloadState);
    expect(writeResult).toBe(true);

    // 5. Subsequent reload must verify the new task is actually on disk
    const reloadedFromDisk = await loadUnifiedWorkspace();
    expect(reloadedFromDisk).not.toBeNull();
    const taskFound = reloadedFromDisk!.tasks.some((t) => t.title === 'Post-Reload Urgent Task');
    expect(taskFound).toBe(true);
  });

  it('AUDIT BUG 4: 3-Way Merge must preserve concurrent disjoint edits when supplied with pre-mutation baseline', () => {
    const base = createBaselineWorkspace();
    const originalTask = base.tasks[0];

    // Tab 1 edits title
    const tab1Task: Task = {
      ...originalTask,
      title: 'Audited Tab 1 Title',
      updatedAt: '2026-09-23T12:00:01.000Z',
      version: (originalTask.version ?? 1) + 1,
    };

    // Tab 2 concurrently edits priority to Urgent (timestamp slightly later)
    const tab2Task: Task = {
      ...originalTask,
      priority: 'Urgent',
      updatedAt: '2026-09-23T12:00:02.000Z',
      version: (originalTask.version ?? 1) + 1,
    };

    const tab2State: WorkspaceState = {
      ...base,
      tasks: [tab2Task, ...base.tasks.slice(1)],
    };

    // Tab 2 applies Tab 1's delta with the baseline task
    const { nextState, hadConflict } = applyRemoteTaskDelta(
      tab2State,
      tab1Task,
      1,
      3,
      originalTask // The common baseline
    );

    const merged = nextState.tasks.find((t) => t.id === originalTask.id);
    expect(merged).toBeDefined();
    // Non-overlapping edits must both be retained:
    expect(merged!.title).toBe('Audited Tab 1 Title');
    expect(merged!.priority).toBe('Urgent');
    expect(hadConflict).toBe(false);
  });

  it('AUDIT BUG 5: validateWorkspaceIntegrity must reject states with invalid, missing, or NaN epoch/revision', () => {
    const stateWithBadEpoch: WorkspaceState = {
      ...createBaselineWorkspace(),
      epoch: -1,
    };
    const issues1 = validateWorkspaceIntegrity(stateWithBadEpoch);
    expect(issues1.some((i) => i.severity === 'error' && i.message.includes('epoch'))).toBe(true);

    const stateWithBadRev: WorkspaceState = {
      ...createBaselineWorkspace(),
      revision: NaN,
    };
    const issues2 = validateWorkspaceIntegrity(stateWithBadRev);
    expect(issues2.some((i) => i.severity === 'error' && i.message.includes('revision'))).toBe(true);
  });

  it('AUDIT BUG 6: saveWorkspaceToIDB must report rejection when stored state is newer (not resolve true as succeeded)', async () => {
    // Current stored state is revision 10
    let stored = createBaselineWorkspace();
    stored = advanceWorkspaceVersion(stored, { revision: 10 });
    await saveWorkspaceToIDB(stored);

    // Candidate stale write has revision 4
    let staleCandidate = createBaselineWorkspace();
    staleCandidate = advanceWorkspaceVersion(staleCandidate, { revision: 4 });

    const result = await saveWorkspaceToIDB(staleCandidate);
    // In existing code, it resolved true ("treated as succeeded"), which caused the UI to report 'saved'!
    expect(result).toBe(false);
  });

  it('AUDIT BUG 6 (Cycle Integration): triggerPersistCycle must set persistence status to "conflict" on stale write rejection', async () => {
    // 1. Durably save revision 20
    let stored = createBaselineWorkspace();
    stored = advanceWorkspaceVersion(stored, { revision: 20 });
    await saveWorkspaceToIDB(stored);

    // 2. Schedule a stale write (revision 5) and flush persistence queue
    let stale = createBaselineWorkspace();
    stale = advanceWorkspaceVersion(stale, { revision: 5 });

    const { scheduleWorkspacePersistence, flushWorkspacePersistence } = await import(
      '../../src/utils/idbStorage'
    );
    scheduleWorkspacePersistence(stale, 0);
    await flushWorkspacePersistence();

    // Persistence status must transition to 'conflict' rather than staying 'saved' or false success
    expect(getPersistenceStatus()).toBe('conflict');
  });

  it('AUDIT: Monotonic revision advancement must increment revision on every domain mutation', () => {
    let state = createBaselineWorkspace();
    const initialRev = state.revision ?? 1;

    // Operation 1: Create Task
    const res1 = createTaskOp(state, { title: 'Audit Task 1', projectId: state.projects[0].id });
    expect(res1.state.revision).toBe(initialRev + 1);

    // Operation 2: Update Task
    const res2 = updateTaskOp(res1.state, res1.task.id, { title: 'Audit Task 1 Renamed' });
    expect(res2.state.revision).toBe(res1.state.revision + 1);

    // Ensure advanceWorkspaceVersion never regresses revision
    const regressedAttempt = advanceWorkspaceVersion(res2.state, { revision: 1 });
    expect(regressedAttempt.revision).toBe(res2.state.revision + 1);
  });
});
