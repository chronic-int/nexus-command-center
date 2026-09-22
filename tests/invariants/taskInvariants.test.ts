import { describe, it, expect } from 'vitest';
import { createTestWorkspace, REFERENCE_DATE } from '../testUtils';
import {
  createTaskOp,
  updateTaskOp,
  moveTaskStatusOp,
  moveTaskProjectOp,
  deleteTaskOp,
} from '../../src/domain/workspaceDomain';
import { validateWorkspaceIntegrity } from '../../src/domain/workspaceIntegrity';
import { getNextTaskKey } from '../../src/utils/idGenerator';

describe('Task Domain Invariants', () => {
  it('guarantees baseline workspace passes all domain integrity invariants', () => {
    const ws = createTestWorkspace();
    const issues = validateWorkspaceIntegrity(ws);
    const errors = issues.filter((i) => i.severity === 'error');
    expect(errors).toHaveLength(0);
  });

  it('generates strictly monotonic and unique keys per project prefix', () => {
    const ws = createTestWorkspace();
    const prefix = 'AUR';
    const nextKey1 = getNextTaskKey(prefix, ws.tasks);
    expect(nextKey1).toMatch(/^AUR-\d+$/);

    const num1 = parseInt(nextKey1.replace('AUR-', ''), 10);
    // Add a task with this key
    const dummyTask = { ...ws.tasks[0], id: 'temp-1', key: nextKey1 };
    const nextKey2 = getNextTaskKey(prefix, [dummyTask, ...ws.tasks]);
    const num2 = parseInt(nextKey2.replace('AUR-', ''), 10);

    expect(num2).toBeGreaterThan(num1);
  });

  it('creating a task updates project progress and member workload atomically', () => {
    const ws = createTestWorkspace();
    const targetProject = ws.projects[0];
    const targetMember = ws.members[0];

    const initialTaskCount = ws.tasks.length;
    const initialMemberWorkload = targetMember.workload;

    const { state: nextState, task: created } = createTaskOp(
      ws,
      {
        projectId: targetProject.id,
        assigneeId: targetMember.id,
        title: 'New High Priority Worker',
        priority: 'High',
        status: 'Todo',
      },
      REFERENCE_DATE
    );

    // Invariant checks
    expect(nextState.tasks.length).toBe(initialTaskCount + 1);
    expect(created.id).toBeDefined();
    expect(created.key).toMatch(new RegExp(`^${targetProject.key}-\\d+$`));
    expect(created.projectId).toBe(targetProject.id);
    expect(created.assigneeId).toBe(targetMember.id);

    // Workload must have increased due to new active High priority task
    const updatedMember = nextState.members.find((m) => m.id === targetMember.id)!;
    expect(updatedMember.workload).toBeGreaterThan(initialMemberWorkload);

    // Workspace integrity must remain clean
    const issues = validateWorkspaceIntegrity(nextState);
    expect(issues.filter((i) => i.severity === 'error')).toHaveLength(0);
  });

  it('moving task status preserves all unrelated fields and updates progress', () => {
    const ws = createTestWorkspace();
    const task = ws.tasks.find((t) => t.status === 'In Progress' && t.subtasks.length > 0) || ws.tasks[0];

    const originalSubtasks = [...task.subtasks];
    const originalComments = [...task.comments];
    const originalAssignee = task.assigneeId;
    const originalPriority = task.priority;
    const originalProjectId = task.projectId;

    const { state: nextState, task: movedTask } = moveTaskStatusOp(
      ws,
      task.id,
      'Done',
      REFERENCE_DATE
    );

    expect(movedTask).toBeDefined();
    expect(movedTask?.status).toBe('Done');
    expect(movedTask?.subtasks).toEqual(originalSubtasks);
    expect(movedTask?.comments).toEqual(originalComments);
    expect(movedTask?.assigneeId).toBe(originalAssignee);
    expect(movedTask?.priority).toBe(originalPriority);
    expect(movedTask?.projectId).toBe(originalProjectId);

    // Activity log must record movement
    const latestActivity = nextState.activities[0];
    expect(latestActivity.action).toBe('moved task to Done');
    expect(latestActivity.targetId).toBe(task.id);

    // Invariants must hold
    const errors = validateWorkspaceIntegrity(nextState).filter((i) => i.severity === 'error');
    expect(errors).toHaveLength(0);
  });

  it('moving task between projects updates metrics across both projects', () => {
    const ws = createTestWorkspace();
    const sourceProject = ws.projects[0];
    const targetProject = ws.projects[1];
    const taskToMove = ws.tasks.find((t) => t.projectId === sourceProject.id)!;

    const sourceInitialTasks = ws.tasks.filter((t) => t.projectId === sourceProject.id).length;
    const targetInitialTasks = ws.tasks.filter((t) => t.projectId === targetProject.id).length;

    const { state: nextState, task: moved } = moveTaskProjectOp(
      ws,
      taskToMove.id,
      targetProject.id,
      REFERENCE_DATE
    );

    expect(moved?.projectId).toBe(targetProject.id);

    const sourceFinalTasks = nextState.tasks.filter((t) => t.projectId === sourceProject.id).length;
    const targetFinalTasks = nextState.tasks.filter((t) => t.projectId === targetProject.id).length;

    expect(sourceFinalTasks).toBe(sourceInitialTasks - 1);
    expect(targetFinalTasks).toBe(targetInitialTasks + 1);

    // Project progress calculations must be correct in both projects
    const errors = validateWorkspaceIntegrity(nextState).filter((i) => i.severity === 'error');
    expect(errors).toHaveLength(0);
  });

  it('deleting task cleans up notifications and recalculates member workload', () => {
    const ws = createTestWorkspace();
    const taskToDelete = ws.tasks.find((t) => t.status !== 'Done')!;
    const assigneeId = taskToDelete.assigneeId;
    const initialMemberWorkload = ws.members.find((m) => m.id === assigneeId)?.workload || 0;

    // Inject a notification targeting this task
    ws.notifications.push({
      id: 'notif-task-test',
      title: 'Targeted Notification',
      message: 'Testing task deletion cleanup',
      timestamp: 'Just now',
      read: false,
      type: 'assignment',
      targetId: taskToDelete.id,
    });

    const { state: nextState } = deleteTaskOp(ws, taskToDelete.id, REFERENCE_DATE);

    // Task must be gone
    expect(nextState.tasks.some((t) => t.id === taskToDelete.id)).toBe(false);

    // Targeted notification must be cleaned up
    expect(nextState.notifications.some((n) => n.targetId === taskToDelete.id)).toBe(false);

    // Member workload must be recalculated
    const updatedMember = nextState.members.find((m) => m.id === assigneeId);
    if (updatedMember) {
      expect(updatedMember.workload).toBeLessThanOrEqual(initialMemberWorkload);
    }

    const errors = validateWorkspaceIntegrity(nextState).filter((i) => i.severity === 'error');
    expect(errors).toHaveLength(0);
  });

  it('updating arbitrary fields preserves immutable properties', () => {
    const ws = createTestWorkspace();
    const task = ws.tasks[0];
    const originalKey = task.key;
    const originalCreatedAt = task.createdAt;

    const { state: nextState, task: updated } = updateTaskOp(
      ws,
      task.id,
      {
        title: 'Updated Title Only',
        estimatedHours: 12,
      },
      REFERENCE_DATE
    );

    expect(updated?.title).toBe('Updated Title Only');
    expect(updated?.estimatedHours).toBe(12);
    expect(updated?.key).toBe(originalKey);
    expect(updated?.createdAt).toBe(originalCreatedAt);

    const errors = validateWorkspaceIntegrity(nextState).filter((i) => i.severity === 'error');
    expect(errors).toHaveLength(0);
  });
});
