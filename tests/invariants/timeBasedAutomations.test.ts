import { describe, it, expect } from 'vitest';
import { createTestWorkspace, REFERENCE_DATE } from '../testUtils';
import { evaluateOverdueTasksOp, createTaskOp } from '../../src/domain/workspaceDomain';
import { AutomationRule } from '../../src/types';
import { validateWorkspaceIntegrity } from '../../src/domain/workspaceIntegrity';

describe('Time-Based Automations & Overdue Invariants', () => {
  it('triggers automations on overdue tasks deterministically with injected referenceDate', () => {
    let ws = createTestWorkspace();

    // Rule: When task overdue -> escalate to Urgent
    const overdueRule: AutomationRule = {
      id: 'rule-overdue-escalate',
      name: 'Escalate Overdue',
      description: 'Escalate overdue tasks to Urgent',
      trigger: 'DEADLINE_OVERDUE',
      condition: 'Status != Done',
      action: 'Escalate priority to Urgent',
      enabled: true,
    };

    ws.automations = [overdueRule];

    // Create a task due on 2026-09-15 (in the past relative to referenceDate 2026-09-22)
    const { state: s1, task: overdueTask } = createTaskOp(
      ws,
      {
        projectId: ws.projects[0].id,
        title: 'Past Due Feature',
        dueDate: '2026-09-15',
        priority: 'Low',
        status: 'In Progress',
      },
      REFERENCE_DATE
    );
    ws = s1;

    // Evaluate overdue tasks as of 2026-09-22
    const { state: evaluatedState, triggeredCount } = evaluateOverdueTasksOp(ws, REFERENCE_DATE);

    expect(triggeredCount).toBeGreaterThan(0);

    const resultingTask = evaluatedState.tasks.find((t) => t.id === overdueTask.id)!;
    expect(resultingTask.priority).toBe('Urgent');

    const errors = validateWorkspaceIntegrity(evaluatedState).filter((i) => i.severity === 'error');
    expect(errors).toHaveLength(0);
  });

  it('ignores tasks that are marked Done regardless of due date', () => {
    let ws = createTestWorkspace();

    const overdueRule: AutomationRule = {
      id: 'rule-overdue-escalate-2',
      name: 'Escalate Overdue',
      description: 'Escalate',
      trigger: 'DEADLINE_OVERDUE',
      condition: 'Status != Done',
      action: 'Escalate priority to Urgent',
      enabled: true,
    };

    ws.automations = [overdueRule];

    // Create a completed task with a past due date
    const { state: s1, task: doneTask } = createTaskOp(
      ws,
      {
        projectId: ws.projects[0].id,
        title: 'Old Done Task',
        dueDate: '2026-08-01',
        priority: 'Low',
        status: 'Done',
      },
      REFERENCE_DATE
    );
    ws = s1;

    // Evaluate
    const { state: evaluatedState, triggeredCount } = evaluateOverdueTasksOp(ws, REFERENCE_DATE);
    const resultingTask = evaluatedState.tasks.find((t) => t.id === doneTask.id)!;

    // Completed task remains Low priority
    expect(resultingTask.priority).toBe('Low');
    expect(resultingTask.status).toBe('Done');
  });
});
