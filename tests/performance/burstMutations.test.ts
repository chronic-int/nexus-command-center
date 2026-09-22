import { describe, it, expect } from 'vitest';
import {
  WorkspaceState,
  createTaskOp,
  updateTaskOp,
  moveTaskStatusOp,
  deleteTaskOp,
  restoreTaskOp,
  bulkUpdateTasksOp,
} from '../../src/domain/workspaceDomain';
import { createLargeWorkspace } from '../../src/data/largeWorkspaceGenerator';
import { validateWorkspaceIntegrity } from '../../src/domain/workspaceIntegrity';

describe('Burst Mutations & Same-Tick State Consistency', () => {
  it('executes 100 rapid consecutive mutations in the same tick without losing any updates', () => {
    // Start with a clean medium-sized workspace (20 projects, 200 tasks)
    let state = createLargeWorkspace({
      projects: 20,
      tasks: 200,
      members: 20,
      notifications: 50,
      activities: 100,
      documents: 20,
      automations: 10,
    });

    const initialTaskCount = state.tasks.length;
    const initialActivityCount = state.activities.length;
    const createdTaskIds: string[] = [];

    // Simulate 100 consecutive synchronous mutations on the authoritative state reference
    for (let i = 0; i < 40; i++) {
      // 1. Create task
      const { state: s1, task } = createTaskOp(state, {
        title: `Burst Task ${i}`,
        projectId: state.projects[i % state.projects.length].id,
        status: 'Todo',
        priority: i % 2 === 0 ? 'Urgent' : 'Medium',
      });
      state = s1;
      createdTaskIds.push(task.id);

      // 2. Immediate update on the newly created task in the same tick
      const { state: s2 } = updateTaskOp(state, task.id, {
        description: `Burst description for ${task.key} - updated in same tick`,
        priority: 'High',
      });
      state = s2;

      // 3. Move another existing task's status
      const existingTask = state.tasks[state.tasks.length - 1 - (i % 50)];
      const nextStatus = i % 3 === 0 ? 'Done' : i % 3 === 1 ? 'In Progress' : 'Review';
      const { state: s3 } = moveTaskStatusOp(state, existingTask.id, nextStatus);
      state = s3;
    }

    // After 40 * 3 = 120 rapid mutations:
    expect(state.tasks.length).toBe(initialTaskCount + 40);
    expect(createdTaskIds.length).toBe(40);

    // Verify all 40 created tasks exist in the final state with their second-step update applied
    for (const id of createdTaskIds) {
      const found = state.tasks.find((t) => t.id === id);
      expect(found).toBeDefined();
      expect(found?.priority).toBe('High');
      expect(found?.description).toContain('Burst description');
    }

    // Now execute a burst of deletions and undos
    const tasksToDelete = createdTaskIds.slice(0, 15);
    const deletedTasks = [];
    for (const id of tasksToDelete) {
      const { state: sDel, deletedTask } = deleteTaskOp(state, id);
      state = sDel;
      if (deletedTask) deletedTasks.push(deletedTask);
    }

    expect(state.tasks.length).toBe(initialTaskCount + 40 - 15);

    // Immediately restore 5 of them in the same tick
    for (let i = 0; i < 5; i++) {
      const { state: sRest } = restoreTaskOp(state, deletedTasks[i]);
      state = sRest;
    }

    expect(state.tasks.length).toBe(initialTaskCount + 40 - 15 + 5);

    // Execute a bulk update on the remaining 25 created tasks
    const remainingCreated = createdTaskIds.slice(15);
    const { state: sBulk } = bulkUpdateTasksOp(state, remainingCreated, {
      status: 'Done',
    });
    state = sBulk;

    for (const id of remainingCreated) {
      const task = state.tasks.find((t) => t.id === id);
      expect(task?.status).toBe('Done');
    }

    // Verify complete workspace relational integrity
    const audit = validateWorkspaceIntegrity(state);
    expect(audit).toHaveLength(0);
    expect(state.activities.length).toBeGreaterThan(initialActivityCount);
  });

  it('maintains strict transactional atomicity during high-frequency status cycles', () => {
    let state = createLargeWorkspace({
      projects: 5,
      tasks: 50,
      members: 10,
    });

    const targetTaskId = state.tasks[0].id;
    const statuses = ['In Progress', 'Review', 'Done', 'Todo', 'In Progress', 'Done'] as const;

    for (const status of statuses) {
      const { state: nextState, task } = moveTaskStatusOp(state, targetTaskId, status);
      state = nextState;
      expect(task?.status).toBe(status);
      expect(state.tasks.find((t) => t.id === targetTaskId)?.status).toBe(status);
    }

    const audit = validateWorkspaceIntegrity(state);
    expect(audit).toHaveLength(0);
  });
});
