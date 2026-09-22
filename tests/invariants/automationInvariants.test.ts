import { describe, it, expect } from 'vitest';
import { createTestWorkspace, REFERENCE_DATE } from '../testUtils';
import {
  processWorkspaceAutomation,
  evaluateAutomationCondition,
  executeAutomationAction,
} from '../../src/utils/automationEngine';
import { applyAutomationEvent, createTaskOp, moveTaskStatusOp } from '../../src/domain/workspaceDomain';
import { AutomationRule, Task } from '../../src/types';

describe('Automation Engine Invariants & Capability Matrix', () => {
  it('never executes disabled automation rules', () => {
    const ws = createTestWorkspace();
    const disabledRule: AutomationRule = {
      id: 'rule-disabled-1',
      name: 'Disabled Test Rule',
      description: 'Should never run',
      trigger: 'STATUS_CHANGED',
      condition: 'Always',
      action: 'Escalate priority to Urgent',
      enabled: false,
    };

    const task = { ...ws.tasks[0], status: 'Done' as const };
    const prevTask = { ...ws.tasks[0], status: 'In Progress' as const };

    const result = processWorkspaceAutomation(
      [disabledRule],
      { type: 'STATUS_CHANGED', task, previousTask: prevTask },
      ws.tasks,
      ws.projects,
      REFERENCE_DATE
    );

    expect(result.triggeredRuleIds).toHaveLength(0);
    expect(result.newNotifications).toHaveLength(0);
  });

  it('updates rule lastTriggered metadata when rule fires', () => {
    let ws = createTestWorkspace();
    const activeRule: AutomationRule = {
      id: 'rule-active-1',
      name: 'Active Rule',
      description: 'Fires when task moves to Done',
      trigger: 'STATUS_CHANGED',
      condition: 'Always',
      action: 'Send review notification to lead',
      enabled: true,
    };

    ws.automations = [activeRule];

    const targetTask = ws.tasks.find((t) => t.status !== 'Done')!;
    const { state: nextState } = moveTaskStatusOp(ws, targetTask.id, 'Done', REFERENCE_DATE);

    const updatedRule = nextState.automations.find((r) => r.id === activeRule.id)!;
    expect(updatedRule.lastTriggered).toBe('Just now');
  });

  it('evaluates all supported condition types correctly', () => {
    const ws = createTestWorkspace();
    const sampleTask: Task = {
      ...ws.tasks[0],
      status: 'In Progress',
      priority: 'Urgent',
      assigneeId: 'unassigned',
      labels: ['DevOps', 'Infra'],
      subtasks: [
        { id: 'sub-1', title: 'Part 1', completed: true },
        { id: 'sub-2', title: 'Part 2', completed: false },
      ],
    };

    // Condition: Status != Done
    expect(evaluateAutomationCondition('Status != Done', sampleTask, ws.tasks, ws.projects)).toBe(true);
    expect(evaluateAutomationCondition('Status != Done', { ...sampleTask, status: 'Done' }, ws.tasks, ws.projects)).toBe(false);

    // Condition: Assignee is unassigned
    expect(evaluateAutomationCondition('Assignee is unassigned', sampleTask, ws.tasks, ws.projects)).toBe(true);
    expect(evaluateAutomationCondition('Assignee is unassigned', { ...sampleTask, assigneeId: 'user-1' }, ws.tasks, ws.projects)).toBe(false);

    // Condition: Priority == Urgent
    expect(evaluateAutomationCondition('Priority == Urgent', sampleTask, ws.tasks, ws.projects)).toBe(true);
    expect(evaluateAutomationCondition('Priority == Urgent', { ...sampleTask, priority: 'Low' }, ws.tasks, ws.projects)).toBe(false);

    // Condition: Subtasks completion < 100%
    expect(evaluateAutomationCondition('Subtasks completion < 100%', sampleTask, ws.tasks, ws.projects)).toBe(true);
    const allCompletedSubtasks = [
      { id: 'sub-1', title: 'Part 1', completed: true },
      { id: 'sub-2', title: 'Part 2', completed: true },
    ];
    expect(evaluateAutomationCondition('Subtasks completion < 100%', { ...sampleTask, subtasks: allCompletedSubtasks }, ws.tasks, ws.projects)).toBe(false);

    // Condition: All subtasks completed
    expect(evaluateAutomationCondition('All subtasks completed', { ...sampleTask, subtasks: allCompletedSubtasks }, ws.tasks, ws.projects)).toBe(true);
    expect(evaluateAutomationCondition('All subtasks completed', sampleTask, ws.tasks, ws.projects)).toBe(false);

    // Condition: DevOps/Infra label
    expect(evaluateAutomationCondition('DevOps/Infra', sampleTask, ws.tasks, ws.projects)).toBe(true);
    expect(evaluateAutomationCondition('DevOps/Infra', { ...sampleTask, labels: ['UI', 'Frontend'] }, ws.tasks, ws.projects)).toBe(false);

    // Condition: Always
    expect(evaluateAutomationCondition('Always', sampleTask, ws.tasks, ws.projects)).toBe(true);
  });

  it('executes all action types properly without silent no-ops', () => {
    const ws = createTestWorkspace();
    const task: Task = {
      ...ws.tasks[0],
      priority: 'Low',
      assigneeId: 'unassigned',
      subtasks: [
        { id: 's1', title: 'Done subtask', completed: true },
        { id: 's2', title: 'Remaining subtask', completed: false },
      ],
    };

    // Action 1: Escalate priority to Urgent
    const action1Result = executeAutomationAction(
      'Escalate priority to Urgent',
      task,
      [task],
      ws.projects,
      'rule-1'
    );
    const updatedTask1 = action1Result.updatedTasks.find((t) => t.id === task.id)!;
    expect(updatedTask1.priority).toBe('Urgent');

    // Action 2: Assign task to Alex Rivera
    const action2Result = executeAutomationAction(
      'Assign task to Alex Rivera',
      task,
      [task],
      ws.projects,
      'rule-2'
    );
    const updatedTask2 = action2Result.updatedTasks.find((t) => t.id === task.id)!;
    expect(updatedTask2.assigneeId).toBe('user-1');

    // Action 3: Archive completed subtasks
    const action3Result = executeAutomationAction(
      'Archive completed subtasks',
      task,
      [task],
      ws.projects,
      'rule-3'
    );
    const updatedTask3 = action3Result.updatedTasks.find((t) => t.id === task.id)!;
    expect(updatedTask3.subtasks).toHaveLength(1);
    expect(updatedTask3.subtasks[0].id).toBe('s2');

    // Action 4: Send review notification to lead
    const action4Result = executeAutomationAction(
      'Send review notification to lead',
      task,
      [task],
      ws.projects,
      'rule-4'
    );
    expect(action4Result.notifications.length).toBeGreaterThan(0);
    expect(action4Result.notifications[0].title).toContain('Task Ready for Lead Review');

    // Action 5: Dispatch webhook
    const action5Result = executeAutomationAction(
      'Dispatch webhook to external CI/CD',
      task,
      [task],
      ws.projects,
      'rule-5'
    );
    expect(action5Result.activities.length).toBeGreaterThan(0);
    expect(action5Result.activities[0].action).toContain('webhook');
  });

  it('triggers automation upon task creation when matching criteria met', () => {
    let ws = createTestWorkspace();
    // Rule: When task created without assignee -> assign to Alex Rivera
    const autoAssignRule: AutomationRule = {
      id: 'rule-auto-assign',
      name: 'Auto Assign Unassigned',
      description: 'Auto assign',
      trigger: 'TASK_CREATED',
      condition: 'Assignee is unassigned',
      action: 'Assign task to Alex Rivera',
      enabled: true,
    };

    ws.automations = [autoAssignRule];

    const { state: nextState, task: created } = createTaskOp(
      ws,
      {
        projectId: ws.projects[0].id,
        assigneeId: 'unassigned',
        title: 'Needs Triage',
      },
      REFERENCE_DATE
    );

    // The created task in state should now be assigned to user-1 (Alex Rivera)
    const resultingTask = nextState.tasks.find((t) => t.id === created.id)!;
    expect(resultingTask.assigneeId).toBe('user-1');
  });
});
