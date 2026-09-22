import { describe, it, expect } from 'vitest';
import { createTestWorkspace, REFERENCE_DATE } from '../testUtils';
import { deleteTaskOp, restoreTaskOp, recomputeWorkspaceMetrics } from '../../src/domain/workspaceDomain';
import { Task, AutomationRule } from '../../src/types';
import { validateWorkspaceIntegrity } from '../../src/domain/workspaceIntegrity';

describe('Delete -> Undo Domain Semantics', () => {
  it('strictly restores exact original entity identity without creation side-effects', () => {
    let ws = createTestWorkspace();

    // Set up an automation that fires on TASK_CREATED
    const autoAssignRule: AutomationRule = {
      id: 'rule-create-alert',
      name: 'Alert on Task Created',
      description: 'Alert on create',
      trigger: 'Task created',
      condition: 'Always',
      action: 'Set Priority = Urgent & Send Notification',
      enabled: true,
    };
    ws.automations = [autoAssignRule];

    // Create complex task
    const complexTask: Task = {
      id: 'task-exact-undo-test',
      key: 'AUR-999',
      title: 'Preserve My Entity Identity',
      description: 'Must remain identical after undo',
      status: 'In Progress',
      priority: 'Low',
      projectId: ws.projects[0].id,
      assigneeId: ws.members[0].id,
      dueDate: '2026-10-30',
      startDate: '2026-09-01',
      estimatedHours: 8,
      labels: ['Backend', 'Security'],
      subtasks: [
        { id: 'sub-1', title: 'Subtask 1', completed: true },
        { id: 'sub-2', title: 'Subtask 2', completed: false },
      ],
      comments: [
        { id: 'comm-1', authorId: 'user-1', content: 'Vital note', timestamp: '2026-09-10T10:00:00Z' },
      ],
      attachments: [
        { id: 'att-1', name: 'diagram.png', size: '1.2MB', type: 'image/png', uploadedAt: '2026-09-10' },
      ],
      createdAt: '2026-09-01T08:00:00.000Z',
      updatedAt: '2026-09-10T12:00:00.000Z',
    };

    // Add to state and snapshot metrics
    ws.tasks = [complexTask, ...ws.tasks];
    ws = recomputeWorkspaceMetrics(ws, [complexTask.projectId]);
    const preDeleteProgress = ws.projects.find((p) => p.id === complexTask.projectId)!.progress;
    const preDeleteWorkload = ws.members.find((m) => m.id === complexTask.assigneeId)!.workload;
    const preDeleteActivitiesCount = ws.activities.length;
    const preDeleteNotificationsCount = ws.notifications.length;

    // 1. DELETE
    const { state: stateAfterDelete, deletedTask } = deleteTaskOp(ws, complexTask.id, REFERENCE_DATE);
    expect(deletedTask).toBeDefined();
    expect(stateAfterDelete.tasks.some((t) => t.id === complexTask.id)).toBe(false);

    // 2. UNDO RESTORE
    const { state: stateAfterUndo, restoredTask } = restoreTaskOp(stateAfterDelete, deletedTask!, REFERENCE_DATE);

    // Assert exact semantic identity:
    expect(restoredTask.id).toBe(complexTask.id);
    expect(restoredTask.key).toBe(complexTask.key);
    expect(restoredTask.title).toBe(complexTask.title);
    expect(restoredTask.createdAt).toBe(complexTask.createdAt);
    expect(restoredTask.status).toBe(complexTask.status);
    expect(restoredTask.priority).toBe(complexTask.priority); // NOT escalated to Urgent by create rule!
    expect(restoredTask.subtasks).toEqual(complexTask.subtasks);
    expect(restoredTask.comments).toEqual(complexTask.comments);
    expect(restoredTask.attachments).toEqual(complexTask.attachments);

    // Assert NO "task created" automation fired:
    // Notifications count should NOT have grown from autoAssignRule
    expect(stateAfterUndo.notifications.length).toBe(stateAfterDelete.notifications.length);

    // Assert activity is "restored deleted task", NOT "created task"
    const latestActivity = stateAfterUndo.activities[0];
    expect(latestActivity.action).toBe('restored deleted task');
    expect(latestActivity.targetId).toBe(complexTask.id);

    // Assert metrics returned to pre-delete values
    const postUndoProgress = stateAfterUndo.projects.find((p) => p.id === complexTask.projectId)!.progress;
    const postUndoWorkload = stateAfterUndo.members.find((m) => m.id === complexTask.assigneeId)!.workload;
    expect(postUndoProgress).toBe(preDeleteProgress);
    expect(postUndoWorkload).toBe(preDeleteWorkload);

    // Complete invariant integrity check
    const errors = validateWorkspaceIntegrity(stateAfterUndo).filter((i) => i.severity === 'error');
    expect(errors).toHaveLength(0);
  });
});
