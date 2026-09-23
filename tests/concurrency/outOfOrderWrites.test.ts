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
  createResetWorkspaceState,
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

describe('Out-of-Order Writes, Monotonicity & Reset Protection', () => {
  beforeEach(async () => {
    resetIDBForTesting();
    await clearWorkspaceFromIDB();
    localStorage.clear();
  });

  it('rejects out-of-order writes (writes 12, 10, 11) and guarantees storage never regresses', async () => {
    const base = createBaselineWorkspace();

    const write12: WorkspaceState = {
      ...base,
      epoch: 1,
      revision: 12,
      tasks: base.tasks.map((t, idx) => (idx === 0 ? { ...t, title: 'Title at Revision 12' } : t)),
    };

    const write10: WorkspaceState = {
      ...base,
      epoch: 1,
      revision: 10,
      tasks: base.tasks.map((t, idx) => (idx === 0 ? { ...t, title: 'Title at Revision 10' } : t)),
    };

    const write11: WorkspaceState = {
      ...base,
      epoch: 1,
      revision: 11,
      tasks: base.tasks.map((t, idx) => (idx === 0 ? { ...t, title: 'Title at Revision 11' } : t)),
    };

    // 1. Write 12 commits first
    const ok12 = await saveWorkspaceToIDB(write12);
    expect(ok12).toBe(true);

    let currentEnvelope = await loadRawEnvelopeFromIDB();
    expect(currentEnvelope).not.toBeNull();
    expect(currentEnvelope!.revision).toBe(12);
    expect(currentEnvelope!.data.tasks[0].title).toBe('Title at Revision 12');

    // 2. Delayed write 10 arrives later out-of-order
    await saveWorkspaceToIDB(write10);

    // Durable state must NOT regress to 10
    currentEnvelope = await loadRawEnvelopeFromIDB();
    expect(currentEnvelope!.revision).toBe(12);
    expect(currentEnvelope!.data.tasks[0].title).toBe('Title at Revision 12');

    // 3. Delayed write 11 arrives later out-of-order
    await saveWorkspaceToIDB(write11);

    // Durable state must still be at 12
    currentEnvelope = await loadRawEnvelopeFromIDB();
    expect(currentEnvelope!.revision).toBe(12);
    expect(currentEnvelope!.data.tasks[0].title).toBe('Title at Revision 12');
  });

  it('coalesces multiple rapid writes in the debounced queue and flushes monotonically', async () => {
    const base = createBaselineWorkspace();

    const state1 = { ...base, revision: 2 };
    const state2 = { ...base, revision: 3 };
    const state3 = { ...base, revision: 4, tasks: [{ ...base.tasks[0], title: 'Final Coalesced Title' }, ...base.tasks.slice(1)] };

    scheduleWorkspacePersistence(state1, 50);
    scheduleWorkspacePersistence(state2, 50);
    scheduleWorkspacePersistence(state3, 50);

    await flushWorkspacePersistence();

    const stored = await loadUnifiedWorkspace();
    expect(stored).not.toBeNull();
    expect(stored!.revision).toBe(4);
    expect(stored!.tasks[0].title).toBe('Final Coalesced Title');
  });

  it('defeats reset resurrection: late in-flight write from epoch 1 is rejected after epoch 2 reset', async () => {
    const base = createBaselineWorkspace();

    // 1. Tab had state at epoch 1, revision 100
    const activeEpoch1State: WorkspaceState = {
      ...base,
      epoch: 1,
      revision: 100,
    };
    await saveWorkspaceToIDB(activeEpoch1State);

    // 2. A slow in-flight write from epoch 1, revision 105 is generated
    const slowInFlightEpoch1Write: WorkspaceState = {
      ...base,
      epoch: 1,
      revision: 105,
      tasks: [{ ...base.tasks[0], title: 'Resurrected Task from Zombie Epoch 1' }, ...base.tasks.slice(1)],
    };

    // 3. Destructive workspace reset occurs: advances epoch to 2, resets revision to 1
    const resetEpoch2State = createResetWorkspaceState(activeEpoch1State, {
      ...base,
      tasks: [{ ...base.tasks[0], title: 'Clean Seed Task Epoch 2' }, ...base.tasks.slice(1)],
    });

    expect(resetEpoch2State.epoch).toBe(2);
    expect(resetEpoch2State.revision).toBe(1);

    // Commit reset state
    const resetOk = await saveWorkspaceToIDB(resetEpoch2State);
    expect(resetOk).toBe(true);

    let envelopeAfterReset = await loadRawEnvelopeFromIDB();
    expect(envelopeAfterReset!.epoch).toBe(2);
    expect(envelopeAfterReset!.revision).toBe(1);
    expect(envelopeAfterReset!.data.tasks[0].title).toBe('Clean Seed Task Epoch 2');

    // 4. Slow in-flight write from epoch 1, revision 105 finally attempts to commit
    await saveWorkspaceToIDB(slowInFlightEpoch1Write);

    // 5. Monotonicity guard must preserve epoch 2 and reject epoch 1 zombie data
    const finalEnvelope = await loadRawEnvelopeFromIDB();
    expect(finalEnvelope!.epoch).toBe(2);
    expect(finalEnvelope!.revision).toBe(1);
    expect(finalEnvelope!.data.tasks[0].title).toBe('Clean Seed Task Epoch 2');
    expect(finalEnvelope!.data.tasks.some((t) => t.title.includes('Zombie'))).toBe(false);
  });
});
