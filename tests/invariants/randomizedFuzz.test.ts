import { describe, it, expect } from 'vitest';
import { createTestWorkspace, createMulberry32, REFERENCE_DATE } from '../testUtils';
import {
  createTaskOp,
  updateTaskOp,
  moveTaskStatusOp,
  moveTaskProjectOp,
  deleteTaskOp,
  createProjectOp,
  deleteProjectCascadeOp,
  evaluateOverdueTasksOp,
} from '../../src/domain/workspaceDomain';
import { validateWorkspaceIntegrity } from '../../src/domain/workspaceIntegrity';
import { TaskStatus, Priority } from '../../src/types';

describe('Deterministic Property-Based Fuzz Testing (250+ Steps)', () => {
  it('maintains 100% domain integrity across 250 pseudo-random state mutations', () => {
    // Fixed seed for 100% deterministic reproducibility
    const SEED = 428913;
    const random = createMulberry32(SEED);

    let state = createTestWorkspace();
    const statuses: TaskStatus[] = ['Backlog', 'Todo', 'In Progress', 'In Review', 'Done'];
    const priorities: Priority[] = ['Low', 'Medium', 'High', 'Urgent'];

    const TOTAL_STEPS = 250;

    for (let step = 0; step < TOTAL_STEPS; step++) {
      const actionRoll = random();

      if (actionRoll < 0.30) {
        // 1. Create Task (30% probability)
        const targetProj = state.projects[Math.floor(random() * state.projects.length)] || state.projects[0];
        const targetMember = state.members[Math.floor(random() * state.members.length)] || state.members[0];
        const status = statuses[Math.floor(random() * statuses.length)];
        const priority = priorities[Math.floor(random() * priorities.length)];

        const res = createTaskOp(
          state,
          {
            projectId: targetProj.id,
            assigneeId: targetMember.id,
            title: `Fuzz Task Step ${step}`,
            status,
            priority,
          },
          REFERENCE_DATE
        );
        state = res.state;
      } else if (actionRoll < 0.55 && state.tasks.length > 0) {
        // 2. Move Task Status (25% probability)
        const targetTask = state.tasks[Math.floor(random() * state.tasks.length)];
        const newStatus = statuses[Math.floor(random() * statuses.length)];
        const res = moveTaskStatusOp(state, targetTask.id, newStatus, REFERENCE_DATE);
        state = res.state;
      } else if (actionRoll < 0.70 && state.tasks.length > 0) {
        // 3. Update Task Properties (15% probability)
        const targetTask = state.tasks[Math.floor(random() * state.tasks.length)];
        const newPriority = priorities[Math.floor(random() * priorities.length)];
        const newMember = state.members[Math.floor(random() * state.members.length)];
        const res = updateTaskOp(
          state,
          targetTask.id,
          { priority: newPriority, assigneeId: newMember.id },
          REFERENCE_DATE
        );
        state = res.state;
      } else if (actionRoll < 0.80 && state.tasks.length > 0 && state.projects.length > 1) {
        // 4. Move Task Between Projects (10% probability)
        const targetTask = state.tasks[Math.floor(random() * state.tasks.length)];
        const otherProjects = state.projects.filter((p) => p.id !== targetTask.projectId);
        if (otherProjects.length > 0) {
          const targetProj = otherProjects[Math.floor(random() * otherProjects.length)];
          const res = moveTaskProjectOp(state, targetTask.id, targetProj.id, REFERENCE_DATE);
          state = res.state;
        }
      } else if (actionRoll < 0.88 && state.tasks.length > 3) {
        // 5. Delete Task (8% probability, keeping at least 3 tasks)
        const targetTask = state.tasks[Math.floor(random() * state.tasks.length)];
        const res = deleteTaskOp(state, targetTask.id, REFERENCE_DATE);
        state = res.state;
      } else if (actionRoll < 0.94) {
        // 6. Create Project (6% probability)
        const res = createProjectOp(
          state,
          {
            name: `Fuzz Project ${step}`,
            key: `FZ${step}`,
          },
          REFERENCE_DATE
        );
        state = res.state;
      } else if (actionRoll < 0.97 && state.projects.length > 2) {
        // 7. Delete Project Cascade (3% probability, keeping at least 2 projects)
        const targetProj = state.projects[Math.floor(random() * state.projects.length)];
        const res = deleteProjectCascadeOp(state, targetProj.id, REFERENCE_DATE);
        state = res.state;
      } else {
        // 8. Evaluate Overdue Automations (3% probability)
        const res = evaluateOverdueTasksOp(state, REFERENCE_DATE);
        state = res.state;
      }

      // STRICT INVARIANT CHECK AT EVERY STEP
      const issues = validateWorkspaceIntegrity(state);
      const errors = issues.filter((i) => i.severity === 'error');

      if (errors.length > 0) {
        throw new Error(
          `Invariant violated at step ${step} (roll ${actionRoll.toFixed(3)}): ${JSON.stringify(errors[0])}`
        );
      }
    }

    // After 250 steps, final state must still be 100% valid
    const finalIssues = validateWorkspaceIntegrity(state);
    expect(finalIssues.filter((i) => i.severity === 'error')).toHaveLength(0);
  });
});
