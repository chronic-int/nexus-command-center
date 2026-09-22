import { describe, it, expect } from 'vitest';
import { createTestWorkspace, createMulberry32, REFERENCE_DATE } from '../testUtils';
import {
  createTaskOp,
  updateTaskOp,
  moveTaskStatusOp,
  moveTaskProjectOp,
  deleteTaskOp,
  restoreTaskOp,
  createProjectOp,
  deleteProjectCascadeOp,
  evaluateOverdueTasksOp,
} from '../../src/domain/workspaceDomain';
import { validateWorkspaceIntegrity, ValidationIssue } from '../../src/domain/workspaceIntegrity';
import { TaskStatus, TaskPriority, Task } from '../../src/types';

describe('Deterministic Property-Based Multi-Seed Fuzz Testing', () => {
  const SEED_CORPUS = [428913, 1337, 2026, 99999];
  const STEPS_PER_SEED = 150;

  const statuses: TaskStatus[] = ['Backlog', 'Todo', 'In Progress', 'Review', 'Done'];
  const priorities: TaskPriority[] = ['Low', 'Medium', 'High', 'Urgent'];

  it.each(SEED_CORPUS)(
    'maintains 100% domain integrity across 150 mutations under seed %i',
    (seed) => {
      const random = createMulberry32(seed);
      let state = createTestWorkspace();
      let lastDeletedTask: Task | null = null;

      for (let step = 0; step < STEPS_PER_SEED; step++) {
        const actionRoll = random();
        let actionName = 'unknown';
        let actionPayload: unknown = null;

        try {
          if (actionRoll < 0.20) {
            // 1. Create Task
            actionName = 'createTask';
            const targetProj = state.projects[Math.floor(random() * state.projects.length)] || state.projects[0];
            const targetMember = state.members[Math.floor(random() * state.members.length)] || state.members[0];
            const status = statuses[Math.floor(random() * statuses.length)];
            const priority = priorities[Math.floor(random() * priorities.length)];
            actionPayload = { projectId: targetProj.id, assigneeId: targetMember.id, status, priority };

            const res = createTaskOp(
              state,
              {
                projectId: targetProj.id,
                assigneeId: targetMember.id,
                title: `Fuzz Task s${seed}-step${step}`,
                status,
                priority,
                dueDate: '2026-11-20',
              },
              REFERENCE_DATE
            );
            state = res.state;
          } else if (actionRoll < 0.35 && state.tasks.length > 0) {
            // 2. Move Task Status
            actionName = 'moveTaskStatus';
            const targetTask = state.tasks[Math.floor(random() * state.tasks.length)];
            const newStatus = statuses[Math.floor(random() * statuses.length)];
            actionPayload = { taskId: targetTask.id, newStatus };

            const res = moveTaskStatusOp(state, targetTask.id, newStatus, REFERENCE_DATE);
            state = res.state;
          } else if (actionRoll < 0.50 && state.tasks.length > 0) {
            // 3. Update Task Properties
            actionName = 'updateTask';
            const targetTask = state.tasks[Math.floor(random() * state.tasks.length)];
            const newPriority = priorities[Math.floor(random() * priorities.length)];
            const newMember = state.members[Math.floor(random() * state.members.length)];
            actionPayload = { taskId: targetTask.id, priority: newPriority, assigneeId: newMember.id };

            const res = updateTaskOp(
              state,
              targetTask.id,
              { priority: newPriority, assigneeId: newMember.id },
              REFERENCE_DATE
            );
            state = res.state;
          } else if (actionRoll < 0.60 && state.tasks.length > 0 && state.projects.length > 1) {
            // 4. Move Task Project
            actionName = 'moveTaskProject';
            const targetTask = state.tasks[Math.floor(random() * state.tasks.length)];
            const otherProjects = state.projects.filter((p) => p.id !== targetTask.projectId);
            if (otherProjects.length > 0) {
              const targetProj = otherProjects[Math.floor(random() * otherProjects.length)];
              actionPayload = { taskId: targetTask.id, newProjectId: targetProj.id };
              const res = moveTaskProjectOp(state, targetTask.id, targetProj.id, REFERENCE_DATE);
              state = res.state;
            }
          } else if (actionRoll < 0.70 && state.tasks.length > 3) {
            // 5. Delete Task (and capture for potential undo)
            actionName = 'deleteTask';
            const targetTask = state.tasks[Math.floor(random() * state.tasks.length)];
            lastDeletedTask = targetTask;
            actionPayload = { taskId: targetTask.id };
            const res = deleteTaskOp(state, targetTask.id, REFERENCE_DATE);
            state = res.state;
          } else if (actionRoll < 0.78 && lastDeletedTask) {
            // 6. Restore / Undo Deleted Task
            actionName = 'restoreTask';
            actionPayload = { taskId: lastDeletedTask.id };
            const res = restoreTaskOp(state, lastDeletedTask, REFERENCE_DATE);
            state = res.state;
            lastDeletedTask = null; // restored
          } else if (actionRoll < 0.85) {
            // 7. Create Project
            actionName = 'createProject';
            const res = createProjectOp(
              state,
              {
                name: `Fuzz Project s${seed}-${step}`,
                key: `FP${seed % 100}-${step}`,
              },
              REFERENCE_DATE
            );
            state = res.state;
          } else if (actionRoll < 0.90 && state.projects.length > 2) {
            // 8. Delete Project Cascade
            actionName = 'deleteProjectCascade';
            const targetProj = state.projects[Math.floor(random() * state.projects.length)];
            actionPayload = { projectId: targetProj.id };
            const res = deleteProjectCascadeOp(state, targetProj.id, REFERENCE_DATE);
            state = res.state;
          } else if (actionRoll < 0.95 && state.tasks.length > 0) {
            // 9. Subtask Mutation
            actionName = 'subtaskMutation';
            const targetTask = state.tasks[Math.floor(random() * state.tasks.length)];
            const updatedSubtasks = [
              ...(targetTask.subtasks || []),
              { id: `sub-${step}`, title: `Subtask ${step}`, completed: random() > 0.5 },
            ];
            const res = updateTaskOp(
              state,
              targetTask.id,
              { subtasks: updatedSubtasks },
              REFERENCE_DATE
            );
            state = res.state;
          } else {
            // 10. Evaluate Overdue Automations
            actionName = 'evaluateOverdueTasks';
            const res = evaluateOverdueTasksOp(state, REFERENCE_DATE);
            state = res.state;
          }
        } catch (err: unknown) {
          throw new Error(
            `Fuzzing exception at Seed: ${seed}, Step: ${step}, Action: ${actionName}, Payload: ${JSON.stringify(actionPayload)} -> Error: ${String(err)}`
          );
        }

        // Invariant Validation Check at each step
        const issues: ValidationIssue[] = validateWorkspaceIntegrity(state);
        if (issues.length > 0) {
          const diagnostics = issues.map((i) => `[${i.severity}] ${i.entity}:${i.entityId} -> ${i.message}`).join('\n');
          throw new Error(
            `Workspace invariant corruption at Seed: ${seed}, Step: ${step}, Action: ${actionName}, Payload: ${JSON.stringify(actionPayload)}\nDiagnostics:\n${diagnostics}`
          );
        }
      }

      // Final post-fuzz assertions
      expect(state.projects.length).toBeGreaterThan(0);
      expect(state.members.length).toBeGreaterThan(0);
      expect(validateWorkspaceIntegrity(state)).toEqual([]);
    }
  );
});
