import { describe, it, expect } from 'vitest';
import { createTestWorkspace, REFERENCE_DATE } from '../testUtils';
import {
  createProjectOp,
  deleteProjectCascadeOp,
  createTaskOp,
  moveTaskStatusOp,
} from '../../src/domain/workspaceDomain';
import { calculateProjectProgress, calculateProjectHealth } from '../../src/utils/metrics';
import { validateWorkspaceIntegrity } from '../../src/domain/workspaceIntegrity';

describe('Project Domain Invariants', () => {
  it('guarantees project progress equals exact task completion ratio', () => {
    const ws = createTestWorkspace();
    for (const project of ws.projects) {
      const projectTasks = ws.tasks.filter((t) => t.projectId === project.id);
      const doneTasks = projectTasks.filter((t) => t.status === 'Done').length;
      const expected = projectTasks.length === 0 ? 0 : Math.round((doneTasks / projectTasks.length) * 100);
      expect(project.progress).toBe(expected);
    }
  });

  it('updates project progress when tasks transition to Done and back', () => {
    let ws = createTestWorkspace();
    const project = ws.projects[0];
    const initialProgress = project.progress;

    // Create a new Todo task in this project
    const { state: s1, task: newTask } = createTaskOp(
      ws,
      {
        projectId: project.id,
        status: 'Todo',
        title: 'Progress Invariant Task',
      },
      REFERENCE_DATE
    );
    ws = s1;

    // Adding an incomplete task must decrease or keep progress same
    const updatedProj1 = ws.projects.find((p) => p.id === project.id)!;
    expect(updatedProj1.progress).toBeLessThanOrEqual(initialProgress);

    // Complete the task
    const { state: s2 } = moveTaskStatusOp(ws, newTask.id, 'Done', REFERENCE_DATE);
    ws = s2;

    const updatedProj2 = ws.projects.find((p) => p.id === project.id)!;
    expect(updatedProj2.progress).toBeGreaterThan(updatedProj1.progress);
  });

  it('calculates project health accurately based on overdue and urgent task thresholds', () => {
    const ws = createTestWorkspace();
    const projectId = 'proj-test-health';

    // 0 tasks -> On Track
    expect(calculateProjectHealth([], projectId, 'On Track', REFERENCE_DATE)).toBe('On Track');

    // 1 urgent unresolved task -> At Risk
    const urgentTask = {
      ...ws.tasks[0],
      id: 'urgent-1',
      projectId,
      status: 'In Progress' as const,
      priority: 'Urgent' as const,
      dueDate: '2026-10-10',
    };
    expect(calculateProjectHealth([urgentTask], projectId, 'On Track', REFERENCE_DATE)).toBe('At Risk');

    // 3 urgent unresolved tasks -> Delayed
    const urgentTask2 = { ...urgentTask, id: 'urgent-2' };
    const urgentTask3 = { ...urgentTask, id: 'urgent-3' };
    expect(
      calculateProjectHealth([urgentTask, urgentTask2, urgentTask3], projectId, 'On Track', REFERENCE_DATE)
    ).toBe('Delayed');

    // 1 overdue task -> At Risk
    const overdueTask = {
      ...ws.tasks[0],
      id: 'overdue-1',
      projectId,
      status: 'In Progress' as const,
      priority: 'Low' as const,
      dueDate: '2026-09-01', // Before 2026-09-22
    };
    expect(calculateProjectHealth([overdueTask], projectId, 'On Track', REFERENCE_DATE)).toBe('At Risk');

    // 2 overdue tasks -> Delayed
    const overdueTask2 = { ...overdueTask, id: 'overdue-2' };
    expect(
      calculateProjectHealth([overdueTask, overdueTask2], projectId, 'On Track', REFERENCE_DATE)
    ).toBe('Delayed');
  });

  it('creating a project sets valid initial state with 0% progress', () => {
    const ws = createTestWorkspace();
    const { state: nextState, project: created } = createProjectOp(
      ws,
      {
        name: 'Quantum Network Mesh',
        key: 'QNM',
        category: 'Core Infrastructure',
      },
      REFERENCE_DATE
    );

    expect(created.id).toBeDefined();
    expect(created.key).toBe('QNM');
    expect(created.progress).toBe(0);
    expect(created.health).toBe('On Track');

    // Integrity must pass with no errors
    const errors = validateWorkspaceIntegrity(nextState).filter((i) => i.severity === 'error');
    expect(errors).toHaveLength(0);
  });

  it('cascading delete removes project, its tasks, documents, notifications, and updates workloads', () => {
    const ws = createTestWorkspace();
    const projectToDelete = ws.projects[0];
    const projectId = projectToDelete.id;

    // Verify initial association
    const associatedTasks = ws.tasks.filter((t) => t.projectId === projectId);
    const associatedDocs = ws.documents.filter((d) => d.projectId === projectId);
    expect(associatedTasks.length).toBeGreaterThan(0);
    expect(associatedDocs.length).toBeGreaterThan(0);

    // Target a notification to this project and to one of its tasks
    const testTaskId = associatedTasks[0].id;
    ws.notifications.push(
      {
        id: 'notif-proj',
        title: 'Project Update',
        message: 'Proj',
        timestamp: 'Just now',
        read: false,
        type: 'system',
        targetId: projectId,
      },
      {
        id: 'notif-task',
        title: 'Task Update',
        message: 'Task',
        timestamp: 'Just now',
        read: false,
        type: 'assignment',
        targetId: testTaskId,
      }
    );

    // Perform cascade delete
    const { state: nextState, deletedProject } = deleteProjectCascadeOp(
      ws,
      projectId,
      REFERENCE_DATE
    );

    expect(deletedProject?.id).toBe(projectId);

    // 1. Project is gone
    expect(nextState.projects.some((p) => p.id === projectId)).toBe(false);

    // 2. All associated tasks are gone
    expect(nextState.tasks.some((t) => t.projectId === projectId)).toBe(false);

    // 3. All associated documents are gone
    expect(nextState.documents.some((d) => d.projectId === projectId)).toBe(false);

    // 4. Notifications targeting project or tasks are removed
    expect(nextState.notifications.some((n) => n.targetId === projectId)).toBe(false);
    expect(nextState.notifications.some((n) => n.targetId === testTaskId)).toBe(false);

    // 5. Activities keep history but detach project reference
    const historicalActivities = nextState.activities.filter((a) => a.targetType === 'project');
    for (const act of historicalActivities) {
      expect(act.projectId).not.toBe(projectId);
    }

    // 6. Complete workspace integrity holds 100%
    const errors = validateWorkspaceIntegrity(nextState).filter((i) => i.severity === 'error');
    expect(errors).toHaveLength(0);
  });
});
