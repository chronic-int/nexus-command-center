import { describe, it, expect } from 'vitest';
import { createTestWorkspace, REFERENCE_DATE } from '../testUtils';
import { createTaskOp, moveTaskStatusOp, updateTaskOp } from '../../src/domain/workspaceDomain';
import { AutomationRule } from '../../src/types';
import { validateWorkspaceIntegrity } from '../../src/domain/workspaceIntegrity';

describe('Snapshot Safety & State Composition Invariants', () => {
  it('safely composes user status transition with automation priority escalation without losing either', () => {
    let ws = createTestWorkspace();

    // Rule: When task status changes to "In Review" -> escalate priority to Urgent
    const reviewEscalateRule: AutomationRule = {
      id: 'rule-escalate-review',
      name: 'Review Escalation',
      description: 'Escalate on review',
      trigger: 'STATUS_CHANGED',
      triggerDescription: 'When task moves to Review',
      condition: 'Always',
      conditionDescription: 'Always',
      action: 'Escalate priority to Urgent',
      actionDescription: 'Escalate to Urgent',
      enabled: true,
      executionCount: 0,
    };

    ws.automations = [reviewEscalateRule];

    const targetTask = ws.tasks.find((t) => t.status === 'In Progress') || ws.tasks[0];
    // Ensure initial priority is Medium
    const { state: preparedState } = updateTaskOp(
      ws,
      targetTask.id,
      { priority: 'Medium', status: 'In Progress' },
      REFERENCE_DATE
    );
    ws = preparedState;

    // Execute status transition
    const { state: composedState, task: finalTask } = moveTaskStatusOp(
      ws,
      targetTask.id,
      'Review',
      REFERENCE_DATE
    );

    // Both the status transition AND the automation action must be present in the new state
    expect(finalTask?.status).toBe('Review');
    expect(finalTask?.priority).toBe('Urgent');

    const stateTask = composedState.tasks.find((t) => t.id === targetTask.id)!;
    expect(stateTask.status).toBe('Review');
    expect(stateTask.priority).toBe('Urgent');

    // Metrics and integrity must be preserved
    const errors = validateWorkspaceIntegrity(composedState).filter((i) => i.severity === 'error');
    expect(errors).toHaveLength(0);
  });

  it('sequential atomic operations preserve all prior mutations without stale state drops', () => {
    let ws = createTestWorkspace();
    const projectId = ws.projects[0].id;

    // Step 1: Create Task A
    const res1 = createTaskOp(ws, { projectId, title: 'Sequential Task 1' }, REFERENCE_DATE);
    ws = res1.state;

    // Step 2: Create Task B
    const res2 = createTaskOp(ws, { projectId, title: 'Sequential Task 2' }, REFERENCE_DATE);
    ws = res2.state;

    // Step 3: Complete Task A
    const res3 = moveTaskStatusOp(ws, res1.task.id, 'Done', REFERENCE_DATE);
    ws = res3.state;

    // Step 4: Update Task B
    const res4 = updateTaskOp(ws, res2.task.id, { priority: 'Urgent' }, REFERENCE_DATE);
    ws = res4.state;

    // Assert: Task A is Done, Task B is Urgent, both exist
    const taskA = ws.tasks.find((t) => t.id === res1.task.id);
    const taskB = ws.tasks.find((t) => t.id === res2.task.id);

    expect(taskA).toBeDefined();
    expect(taskA?.status).toBe('Done');

    expect(taskB).toBeDefined();
    expect(taskB?.priority).toBe('Urgent');

    const errors = validateWorkspaceIntegrity(ws).filter((i) => i.severity === 'error');
    expect(errors).toHaveLength(0);
  });
});
