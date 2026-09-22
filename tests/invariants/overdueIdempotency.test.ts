import { describe, it, expect } from 'vitest';
import { createTestWorkspace, REFERENCE_DATE } from '../testUtils';
import { createTaskOp, evaluateOverdueTasksOp } from '../../src/domain/workspaceDomain';
import { AutomationRule } from '../../src/types';
import { validateWorkspaceIntegrity } from '../../src/domain/workspaceIntegrity';

describe('Time-Based Automation Idempotency & Re-Evaluation Guards', () => {
  it('guarantees repeated overdue evaluations produce zero duplicate notifications or activities', () => {
    let ws = createTestWorkspace();

    const overdueRule: AutomationRule = {
      id: 'rule-idempotent-overdue',
      name: 'Escalate Overdue',
      description: 'Escalate overdue tasks to Urgent',
      trigger: 'Task deadline expires',
      condition: 'Status != Done',
      action: 'Set Priority = Urgent & Send Notification',
      enabled: true,
    };
    ws.automations = [overdueRule];

    // Create overdue task
    const { state: s1, task: overdueTask } = createTaskOp(
      ws,
      {
        projectId: ws.projects[0].id,
        title: 'Overdue Idempotency Target',
        dueDate: '2026-09-10', // 12 days before referenceDate 2026-09-22
        priority: 'Low',
        status: 'In Progress',
      },
      REFERENCE_DATE
    );
    ws = s1;

    // RUN 1
    const run1 = evaluateOverdueTasksOp(ws, REFERENCE_DATE);
    expect(run1.triggeredCount).toBe(1);
    const notificationsAfterRun1 = run1.state.notifications.length;
    const activitiesAfterRun1 = run1.state.activities.length;
    const taskAfterRun1 = run1.state.tasks.find((t) => t.id === overdueTask.id)!;
    expect(taskAfterRun1.priority).toBe('Urgent');
    expect(taskAfterRun1.lastOverdueHandledDeadline).toBe('2026-09-10');

    // RUN 2 (Immediate identical re-evaluation)
    const run2 = evaluateOverdueTasksOp(run1.state, REFERENCE_DATE);
    expect(run2.triggeredCount).toBe(0);
    expect(run2.state.notifications.length).toBe(notificationsAfterRun1);
    expect(run2.state.activities.length).toBe(activitiesAfterRun1);

    // RUN 3 (Third identical evaluation)
    const run3 = evaluateOverdueTasksOp(run2.state, REFERENCE_DATE);
    expect(run3.triggeredCount).toBe(0);
    expect(run3.state.notifications.length).toBe(notificationsAfterRun1);
    expect(run3.state.activities.length).toBe(activitiesAfterRun1);

    // Invariant check
    const errors = validateWorkspaceIntegrity(run3.state).filter((i) => i.severity === 'error');
    expect(errors).toHaveLength(0);
  });

  it('allows future deadline transition to trigger after user extends due date', () => {
    let ws = createTestWorkspace();

    const overdueRule: AutomationRule = {
      id: 'rule-idempotent-overdue-2',
      name: 'Escalate Overdue',
      description: 'Escalate',
      trigger: 'Task deadline expires',
      condition: 'Status != Done',
      action: 'Set Priority = Urgent & Send Notification',
      enabled: true,
    };
    ws.automations = [overdueRule];

    // Create overdue task
    const { state: s1, task: overdueTask } = createTaskOp(
      ws,
      {
        projectId: ws.projects[0].id,
        title: 'Overdue Deadline Extension Target',
        dueDate: '2026-09-10',
        priority: 'Low',
        status: 'In Progress',
      },
      REFERENCE_DATE
    );
    ws = s1;

    // First evaluation handles 2026-09-10
    const run1 = evaluateOverdueTasksOp(ws, REFERENCE_DATE);
    expect(run1.triggeredCount).toBe(1);

    // User updates task due date to new date in past (e.g. 2026-09-18)
    const updatedState = {
      ...run1.state,
      tasks: run1.state.tasks.map((t) =>
        t.id === overdueTask.id ? { ...t, dueDate: '2026-09-18', priority: 'Medium' as const } : t
      ),
    };

    // New evaluation sees different dueDate from lastOverdueHandledDeadline!
    const run2 = evaluateOverdueTasksOp(updatedState, REFERENCE_DATE);
    expect(run2.triggeredCount).toBe(1);

    const taskAfterRun2 = run2.state.tasks.find((t) => t.id === overdueTask.id)!;
    expect(taskAfterRun2.lastOverdueHandledDeadline).toBe('2026-09-18');
  });
});
