import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  saveWorkspaceToIDB,
  loadUnifiedWorkspace,
  loadRawEnvelopeFromIDB,
  clearWorkspaceFromIDB,
  scheduleWorkspacePersistence,
  flushWorkspacePersistence,
  resetIDBForTesting,
} from '../../src/utils/idbStorage';
import {
  WorkspaceState,
  createTaskOp,
  updateTaskOp,
  moveTaskStatusOp,
  createResetWorkspaceState,
  compareVersions,
  recomputeWorkspaceMetrics,
} from '../../src/domain/workspaceDomain';
import {
  createTabSyncSession,
  applyRemoteTaskDelta,
  resetTabSyncForTesting,
} from '../../src/utils/tabSync';
import { validateWorkspaceIntegrity } from '../../src/domain/workspaceIntegrity';
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

function createBaselineWorkspace(): WorkspaceState {
  const raw: WorkspaceState = {
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
  return recomputeWorkspaceMetrics(raw);
}

describe('Final Adversarial Multi-Tab & Asynchronous Concurrency Scenario', () => {
  beforeEach(async () => {
    resetIDBForTesting();
    resetTabSyncForTesting();
    await clearWorkspaceFromIDB();
    localStorage.clear();
  });

  it('maintains strict domain integrity and state consistency across two concurrent tabs under rapid bursts, cross-tab delta merges, and storage flushes', async () => {
    const baseline = createBaselineWorkspace();
    await saveWorkspaceToIDB(baseline);

    const sessionA = createTabSyncSession('tab_A');
    const sessionB = createTabSyncSession('tab_B');

    let stateA = { ...baseline };
    let stateB = { ...baseline };

    // 1. Tab A executes a burst of 10 consecutive task creations
    for (let i = 1; i <= 10; i++) {
      const { state: nextA, task } = createTaskOp(
        stateA,
        {
          title: `Task A-${i}`,
          priority: i % 2 === 0 ? 'High' : 'Medium',
          projectId: stateA.projects[0].id,
        },
        '2026-09-23T10:00:00.000Z'
      );
      stateA = nextA;
      scheduleWorkspacePersistence(stateA, 50);

      // Broadcast to Tab B
      sessionB.dispatchSyncMessage({
        type: 'MUTATION_BROADCAST',
        payload: {
          sourceTabId: 'tab_A',
          epoch: stateA.epoch ?? 1,
          revision: stateA.revision ?? 1,
          mutationId: `mut_A_${i}`,
          mutationType: 'CREATE_TASK',
          timestamp: new Date().toISOString(),
          taskDeltas: [task],
        },
      });

      // Tab B applies the delta
      const res = applyRemoteTaskDelta(stateB, task, stateA.epoch ?? 1, stateA.revision ?? 1);
      stateB = res.nextState;
    }

    expect(stateA.tasks.length).toBe(baseline.tasks.length + 10);
    expect(stateB.tasks.length).toBe(baseline.tasks.length + 10);

    // 2. Tab B executes concurrent edits to an existing task (task[0]) while Tab A edits a different field
    const targetTask = baseline.tasks[0];

    // Tab A changes targetTask title
    const { state: nextA, task: updatedA } = updateTaskOp(
      stateA,
      targetTask.id,
      { title: 'Concurrent Title from Tab A' },
      '2026-09-23T10:05:00.000Z'
    );
    stateA = nextA;

    // Tab B changes targetTask description and dueDate
    const { state: nextB, task: updatedB } = updateTaskOp(
      stateB,
      targetTask.id,
      {
        description: 'Concurrent Description from Tab B',
        dueDate: '2026-10-31',
      },
      '2026-09-23T10:06:00.000Z'
    );
    stateB = nextB;

    // Both tabs exchange deltas with 3-way baseline
    const mergeIntoB = applyRemoteTaskDelta(stateB, updatedA!, stateA.epoch ?? 1, stateA.revision ?? 1, targetTask);
    stateB = mergeIntoB.nextState;

    const mergeIntoA = applyRemoteTaskDelta(stateA, updatedB!, stateB.epoch ?? 1, stateB.revision ?? 1, targetTask);
    stateA = mergeIntoA.nextState;

    // Both edits are preserved on both tabs without conflict!
    const taskOnA = stateA.tasks.find((t) => t.id === targetTask.id)!;
    const taskOnB = stateB.tasks.find((t) => t.id === targetTask.id)!;

    expect(taskOnA.title).toBe('Concurrent Title from Tab A');
    expect(taskOnA.description).toBe('Concurrent Description from Tab B');
    expect(taskOnA.dueDate).toBe('2026-10-31');

    expect(taskOnB.title).toBe('Concurrent Title from Tab A');
    expect(taskOnB.description).toBe('Concurrent Description from Tab B');
    expect(taskOnB.dueDate).toBe('2026-10-31');

    // 3. Tab A flushes persistence to storage
    scheduleWorkspacePersistence(stateA, 0);
    await flushWorkspacePersistence();

    // 4. Verify durable IndexedDB snapshot
    const persisted = await loadUnifiedWorkspace();
    expect(persisted).not.toBeNull();
    expect(persisted!.tasks.some((t) => t.title === 'Concurrent Title from Tab A')).toBe(true);

    // 5. Destructive reset on Tab A: increments epoch to 2
    const resetA = createResetWorkspaceState(stateA, {
      ...baseline,
      tasks: [{ ...baseline.tasks[0], title: 'Epoch 2 Clean Task' }, ...baseline.tasks.slice(1)],
    });
    expect(resetA.epoch).toBe(2);
    expect(resetA.revision).toBe(1);

    await saveWorkspaceToIDB(resetA);

    // 6. Delayed out-of-order write from Tab B (epoch 1, rev 25) attempts to write to disk
    const delayedTabBWrite: WorkspaceState = {
      ...stateB,
      epoch: 1,
      revision: 25,
      tasks: [{ ...stateB.tasks[0], title: 'Resurrected Zombie Task' }, ...stateB.tasks.slice(1)],
    };
    await saveWorkspaceToIDB(delayedTabBWrite);

    // Durable store must remain at epoch 2, rejecting epoch 1 resurrection
    const finalStoredEnvelope = await loadRawEnvelopeFromIDB();
    expect(finalStoredEnvelope!.epoch).toBe(2);
    expect(finalStoredEnvelope!.revision).toBe(1);
    expect(finalStoredEnvelope!.data.tasks[0].title).toBe('Epoch 2 Clean Task');

    // 7. Full domain integrity validation
    const issuesA = validateWorkspaceIntegrity(stateA);
    const issuesB = validateWorkspaceIntegrity(stateB);
    const issuesStored = validateWorkspaceIntegrity(finalStoredEnvelope!.data);

    expect(issuesA.filter((i) => i.severity === 'error')).toEqual([]);
    expect(issuesB.filter((i) => i.severity === 'error')).toEqual([]);
    expect(issuesStored.filter((i) => i.severity === 'error')).toEqual([]);

    sessionA.close();
    sessionB.close();
  });
});
