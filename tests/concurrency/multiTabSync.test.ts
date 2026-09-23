import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTabSyncSession,
  applyRemoteTaskDelta,
  resetTabSyncForTesting,
} from '../../src/utils/tabSync';
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
import { MutationBroadcastPayload, Task } from '../../src/types';

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

describe('Multi-Tab Coordination, Field-Level Merges & Automation Isolation', () => {
  beforeEach(() => {
    resetTabSyncForTesting();
    localStorage.clear();
  });

  it('filters out self-originating messages and delivers remote mutations to other tabs', () => {
    const tab1 = createTabSyncSession('tab_1');
    const tab2 = createTabSyncSession('tab_2');

    const tab1Received: MutationBroadcastPayload[] = [];
    const tab2Received: MutationBroadcastPayload[] = [];

    tab1.init({
      onRemoteMutation: (p) => tab1Received.push(p),
      onRemoteReset: () => {},
    });

    tab2.init({
      onRemoteMutation: (p) => tab2Received.push(p),
      onRemoteReset: () => {},
    });

    // 1. Message originating from tab_1 dispatched to tab_1 -> ignored as self-message
    tab1.dispatchSyncMessage({
      type: 'MUTATION_BROADCAST',
      payload: {
        sourceTabId: 'tab_1',
        epoch: 1,
        revision: 2,
        mutationId: 'mut_tab1_self',
        mutationType: 'UPDATE_TASK',
        timestamp: new Date().toISOString(),
      },
    });

    expect(tab1Received).toHaveLength(0);

    // 2. Message originating from tab_1 dispatched to tab_2 -> accepted and delivered
    tab2.dispatchSyncMessage({
      type: 'MUTATION_BROADCAST',
      payload: {
        sourceTabId: 'tab_1',
        epoch: 1,
        revision: 3,
        mutationId: 'mut_tab1_to_tab2',
        mutationType: 'UPDATE_TASK',
        timestamp: new Date().toISOString(),
      },
    });

    expect(tab2Received).toHaveLength(1);
    expect(tab2Received[0].mutationId).toBe('mut_tab1_to_tab2');

    tab1.close();
    tab2.close();
  });

  it('deduplicates identical mutation IDs delivered multiple times across channels', () => {
    const session = createTabSyncSession('tab_subscriber');
    const received: MutationBroadcastPayload[] = [];

    session.init({
      onRemoteMutation: (p) => received.push(p),
      onRemoteReset: () => {},
    });

    const syncMessage = {
      type: 'MUTATION_BROADCAST',
      payload: {
        sourceTabId: 'tab_publisher',
        epoch: 1,
        revision: 5,
        mutationId: 'mut_duplicate_test',
        mutationType: 'UPDATE_TASK',
        timestamp: new Date().toISOString(),
      },
    };

    // First arrival
    session.dispatchSyncMessage(syncMessage);
    // Duplicate arrival
    session.dispatchSyncMessage(syncMessage);

    // Must be processed exactly once
    expect(received).toHaveLength(1);
    session.close();
  });

  it('performs fine-grained 3-way field merge for concurrent non-conflicting task edits across tabs', () => {
    const base = createBaselineWorkspace();
    const originalTask = base.tasks[0];

    // Tab 1 edits task title
    const tab1Task: Task = {
      ...originalTask,
      title: 'Title Updated by Tab 1',
      updatedAt: '2026-09-23T10:01:00.000Z',
      version: 2,
    };

    // Tab 2 concurrently edits task priority and adds a label
    const tab2Task: Task = {
      ...originalTask,
      priority: 'Urgent',
      labels: [...originalTask.labels, 'Tab2-Label'],
      updatedAt: '2026-09-23T10:02:00.000Z',
      version: 2,
    };

    // Tab 2 has tab2Task locally in its workspace
    const tab2State: WorkspaceState = {
      ...base,
      tasks: [tab2Task, ...base.tasks.slice(1)],
    };

    // Tab 2 receives Tab 1's delta with 3-way baseline
    const { nextState, hadConflict } = applyRemoteTaskDelta(
      tab2State,
      tab1Task,
      1,
      3,
      originalTask
    );

    // Non-overlapping fields (title vs priority + labels) should NOT report a field conflict
    expect(hadConflict).toBe(false);

    const mergedTask = nextState.tasks.find((t) => t.id === originalTask.id)!;
    // Both edits are preserved!
    expect(mergedTask.title).toBe('Title Updated by Tab 1');
    expect(mergedTask.priority).toBe('Urgent');
    expect(mergedTask.labels).toContain('Tab2-Label');
    expect(mergedTask.version).toBe(3);
  });

  it('flags direct field conflicts when two tabs concurrently edit the exact same field', () => {
    const base = createBaselineWorkspace();
    const originalTask = base.tasks[0];

    // Tab 1 moves task to 'Review'
    const tab1Task: Task = {
      ...originalTask,
      status: 'Review',
      updatedAt: '2026-09-23T10:01:00.000Z',
      version: 2,
    };

    // Tab 2 concurrently moves same task to 'Done'
    const tab2Task: Task = {
      ...originalTask,
      status: 'Done',
      updatedAt: '2026-09-23T10:02:00.000Z',
      version: 2,
    };

    const tab2State: WorkspaceState = {
      ...base,
      tasks: [tab2Task, ...base.tasks.slice(1)],
    };

    const { nextState, hadConflict } = applyRemoteTaskDelta(
      tab2State,
      tab1Task,
      1,
      3,
      originalTask
    );

    // Direct status conflict must be flagged
    expect(hadConflict).toBe(true);
    // Deterministic resolution: later timestamp or tiebreaker wins
    const resolved = nextState.tasks.find((t) => t.id === originalTask.id)!;
    expect(resolved.status).toBe('Done');
  });

  it('guarantees remote mutations do NOT trigger automation side-effects on receiving tabs', () => {
    const base = createBaselineWorkspace();
    const initialNotificationCount = base.notifications.length;
    const initialActivityCount = base.activities.length;

    // A task is updated remotely to 'Urgent', which would normally trigger an automation
    const urgentRemoteTask: Task = {
      ...base.tasks[0],
      priority: 'Urgent',
      updatedAt: '2026-09-23T10:05:00.000Z',
      version: 2,
    };

    // Receiving tab applies remote delta
    const { nextState } = applyRemoteTaskDelta(base, urgentRemoteTask, 1, 2);

    // Invariant: Receiving tab does NOT generate new notification or activity spam
    expect(nextState.notifications.length).toBe(initialNotificationCount);
    expect(nextState.activities.length).toBe(initialActivityCount);
    expect(nextState.tasks[0].priority).toBe('Urgent');
  });
});
