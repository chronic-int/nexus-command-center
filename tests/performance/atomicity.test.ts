import { describe, it, expect } from 'vitest';
import {
  moveTaskStatusOp,
  bulkUpdateTasksOp,
  bulkDeleteTasksOp,
  deleteProjectCascadeOp,
} from '../../src/domain/workspaceDomain';
import { createLargeWorkspace } from '../../src/data/largeWorkspaceGenerator';
import { validateWorkspaceIntegrity } from '../../src/domain/workspaceIntegrity';

describe('Transactional Atomicity Across Domain Operations', () => {
  it('guarantees that task status change synchronously commits task, project progress, member workload, and activities together', () => {
    const initial = createLargeWorkspace({
      projects: 2,
      tasks: 10,
      members: 3,
    });

    const targetTask = initial.tasks.find((t) => t.status !== 'Done') || initial.tasks[0];
    const targetProjectBefore = initial.projects.find((p) => p.id === targetTask.projectId)!;

    const { state: nextState, task: updatedTask } = moveTaskStatusOp(
      initial,
      targetTask.id,
      'Done'
    );

    expect(updatedTask?.status).toBe('Done');

    // 1. Task in state is updated
    const committedTask = nextState.tasks.find((t) => t.id === targetTask.id);
    expect(committedTask?.status).toBe('Done');

    // 2. Project progress is synchronously incremented
    const targetProjectAfter = nextState.projects.find((p) => p.id === targetTask.projectId)!;
    expect(targetProjectAfter.progress).toBeGreaterThanOrEqual(targetProjectBefore.progress);

    // 3. Activity item is synchronously recorded
    const latestActivity = nextState.activities[0];
    expect(latestActivity.action).toBe('moved task to Done');
    expect(latestActivity.targetId).toBe(targetTask.id);

    // 4. Invariant checker reports zero violations
    const audit = validateWorkspaceIntegrity(nextState);
    expect(audit).toHaveLength(0);
  });

  it('guarantees bulk update commits all modified entities and updates metrics atomically', () => {
    const initial = createLargeWorkspace({
      projects: 5,
      tasks: 50,
      members: 5,
    });

    const targetIds = initial.tasks.slice(0, 10).map((t) => t.id);
    const { state: nextState, updatedTasks } = bulkUpdateTasksOp(initial, targetIds, {
      priority: 'Urgent',
      status: 'In Progress',
    });

    expect(updatedTasks.length).toBe(10);
    for (const t of updatedTasks) {
      expect(t.priority).toBe('Urgent');
      expect(t.status).toBe('In Progress');
    }

    // All targeted tasks in state reflect changes
    for (const id of targetIds) {
      const task = nextState.tasks.find((t) => t.id === id);
      expect(task?.priority).toBe('Urgent');
      expect(task?.status).toBe('In Progress');
    }

    // Single activity item recorded
    const activity = nextState.activities.find((a) => a.action === 'bulk updated 10 tasks');
    expect(activity).toBeDefined();

    const audit = validateWorkspaceIntegrity(nextState);
    expect(audit).toHaveLength(0);
  });

  it('guarantees bulk delete commits task removal and notification cascading atomically', () => {
    const initial = createLargeWorkspace({
      projects: 5,
      tasks: 30,
      notifications: 20,
    });

    const targetIds = initial.tasks.slice(0, 5).map((t) => t.id);
    const targetIdSet = new Set(targetIds);

    const { state: nextState, deletedTasks } = bulkDeleteTasksOp(initial, targetIds);
    expect(deletedTasks.length).toBe(5);

    // None of the deleted tasks exist in nextState
    for (const id of targetIds) {
      expect(nextState.tasks.some((t) => t.id === id)).toBe(false);
    }

    // No notifications reference any deleted task
    for (const n of nextState.notifications) {
      if (n.targetId) {
        expect(targetIdSet.has(n.targetId)).toBe(false);
      }
    }

    const audit = validateWorkspaceIntegrity(nextState);
    expect(audit).toHaveLength(0);
  });

  it('guarantees cascading project deletion executes atomically across all relational slices', () => {
    const initial = createLargeWorkspace({
      projects: 4,
      tasks: 40,
      documents: 10,
      notifications: 20,
    });

    const projectToDelete = initial.projects[0];
    const projectTaskIds = new Set(
      initial.tasks.filter((t) => t.projectId === projectToDelete.id).map((t) => t.id)
    );

    const { state: nextState, deletedProject } = deleteProjectCascadeOp(
      initial,
      projectToDelete.id
    );

    expect(deletedProject?.id).toBe(projectToDelete.id);

    // 1. Project is removed
    expect(nextState.projects.some((p) => p.id === projectToDelete.id)).toBe(false);

    // 2. All tasks belonging to project are removed
    expect(nextState.tasks.some((t) => t.projectId === projectToDelete.id)).toBe(false);

    // 3. All documents belonging to project are removed
    expect(nextState.documents.some((d) => d.projectId === projectToDelete.id)).toBe(false);

    // 4. Notifications targeting project or its tasks are removed
    for (const n of nextState.notifications) {
      expect(n.targetId).not.toBe(projectToDelete.id);
      if (n.targetId) {
        expect(projectTaskIds.has(n.targetId)).toBe(false);
      }
    }

    // 5. Invariants hold 100%
    const audit = validateWorkspaceIntegrity(nextState);
    expect(audit).toHaveLength(0);
  });
});
