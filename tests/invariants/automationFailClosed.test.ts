import { describe, it, expect } from 'vitest';
import {
  taskMatchesCondition,
  processWorkspaceAutomation,
} from '../../src/utils/automationEngine';
import { Task, Project, AutomationRule } from '../../src/types';

describe('Automation Fail-Closed and Keyword Disambiguation Invariants', () => {
  const dummyTask: Task = {
    id: 'task-test-1',
    title: 'Arbitrary Task',
    description: 'Task description',
    projectId: 'prj-1',
    key: 'PRJ-1',
    status: 'In Progress',
    priority: 'Medium',
    assigneeId: 'usr-1',
    labels: ['frontend'],
    dueDate: '2026-10-01',
    subtasks: [],
    comments: [],
    attachments: [],
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
  };

  const dummyProject: Project = {
    id: 'prj-1',
    name: 'Apollo Alpha',
    key: 'APL',
    description: 'Alpha project',
    color: '#6366f1',
    category: 'Engineering',
    leadId: 'usr-1',
    memberIds: ['usr-1'],
    progress: 50,
    health: 'On Track',
    startDate: '2026-01-01',
    deadline: '2026-12-31',
    tags: ['Core'],
  };

  describe('Condition Fail-Closed Evaluation', () => {
    it('evaluates nonsense or adversarial condition strings to false', () => {
      const nonsenseConditions = [
        'Priority approximately purple',
        'Status is maybe done',
        'Assignee looks like Bob',
        'Project is floating in space',
        'Random invalid predicate that should never match',
        'SELECT * FROM tasks WHERE 1=1',
        '<script>alert(1)</script>',
        'true',
        'null',
      ];

      for (const cond of nonsenseConditions) {
        const result = taskMatchesCondition(dummyTask, cond, [dummyTask], [dummyProject]);
        expect(
          result,
          `Condition "${cond}" should evaluate to false under fail-closed security, but returned true`
        ).toBe(false);
      }
    });

    it('evaluates valid known conditions correctly', () => {
      expect(taskMatchesCondition(dummyTask, 'always')).toBe(true);
      expect(taskMatchesCondition(dummyTask, 'status != done')).toBe(true);
      expect(taskMatchesCondition({ ...dummyTask, status: 'Done' }, 'status != done')).toBe(false);

      expect(taskMatchesCondition({ ...dummyTask, priority: 'Urgent' }, 'priority == urgent')).toBe(true);
      expect(taskMatchesCondition({ ...dummyTask, priority: 'Low' }, 'priority == urgent')).toBe(false);

      expect(taskMatchesCondition({ ...dummyTask, assigneeId: '' }, 'assignee is unassigned')).toBe(true);
      expect(taskMatchesCondition(dummyTask, 'assignee is unassigned')).toBe(false);

      expect(taskMatchesCondition(dummyTask, 'project == apollo', [dummyTask], [dummyProject])).toBe(true);
      expect(taskMatchesCondition(dummyTask, 'project == zeus', [dummyTask], [dummyProject])).toBe(false);
    });
  });

  describe('Action Keyword Disambiguation & Simulation Honesty', () => {
    it('does not mutate task priority when an action description contains urgent in notification text', () => {
      const rule: AutomationRule = {
        id: 'rule-notify-urgent-text',
        name: 'Urgent Notification Rule',
        description: 'Sends urgent notification',
        trigger: 'Task created',
        condition: 'always',
        action: 'Send notification: Urgent review is pending for this submission',
        enabled: true,
      };

      const result = processWorkspaceAutomation(
        [rule],
        { type: 'TASK_CREATED', task: dummyTask },
        [dummyTask],
        [dummyProject]
      );

      // Task priority should NOT have been mutated to Urgent because this is a notification action
      const updated = result.updatedTasks.find((t) => t.id === dummyTask.id);
      expect(updated ? updated.priority : dummyTask.priority).toBe('Medium');
      // A notification should have been generated
      expect(result.newNotifications.length).toBeGreaterThan(0);
    });

    it('explicitly states local simulation when executing webhook actions', () => {
      const rule: AutomationRule = {
        id: 'rule-webhook',
        name: 'Webhook Rule',
        description: 'Simulates webhook',
        trigger: 'Task created',
        condition: 'always',
        action: 'Trigger external webhook: https://hooks.example.com/sync',
        enabled: true,
      };

      const result = processWorkspaceAutomation(
        [rule],
        { type: 'TASK_CREATED', task: dummyTask },
        [dummyTask],
        [dummyProject]
      );

      expect(result.newNotifications.length).toBeGreaterThan(0);
      const notif = result.newNotifications[0];
      // Must reflect honest local simulation, not claiming live remote dispatch
      expect(notif.title).toContain('Webhook Event Simulated');
      expect(notif.message).toContain('simulated locally');
    });
  });
});
