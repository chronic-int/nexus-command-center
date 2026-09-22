import { describe, it, expect } from 'vitest';
import { createTestWorkspace, REFERENCE_DATE } from '../testUtils';
import {
  createTaskOp,
  updateTaskOp,
  moveTaskStatusOp,
  deleteTaskOp,
} from '../../src/domain/workspaceDomain';
import { calculateMemberWorkload } from '../../src/utils/metrics';
import { validateWorkspaceIntegrity } from '../../src/domain/workspaceIntegrity';

describe('Member Domain Invariants', () => {
  it('guarantees member workload matches assigned active tasks algorithmically', () => {
    const ws = createTestWorkspace();
    for (const member of ws.members) {
      const expectedWorkload = calculateMemberWorkload(ws.tasks, member.id);
      expect(member.workload).toBe(expectedWorkload);
    }
  });

  it('completed tasks do not count towards active member workload', () => {
    let ws = createTestWorkspace();
    const member = ws.members[0];

    // Create an urgent task assigned to member
    const { state: s1, task: urgentTask } = createTaskOp(
      ws,
      {
        projectId: ws.projects[0].id,
        assigneeId: member.id,
        priority: 'Urgent',
        status: 'Todo',
      },
      REFERENCE_DATE
    );
    ws = s1;

    const workloadWithUrgent = ws.members.find((m) => m.id === member.id)!.workload;

    // Mark task Done
    const { state: s2 } = moveTaskStatusOp(ws, urgentTask.id, 'Done', REFERENCE_DATE);
    ws = s2;

    const workloadAfterDone = ws.members.find((m) => m.id === member.id)!.workload;

    // Workload should decrease by 24 points when Urgent task is completed
    expect(workloadAfterDone).toBe(workloadWithUrgent - 24);
  });

  it('reassigning a task shifts workload between members accurately', () => {
    let ws = createTestWorkspace();
    const memberA = ws.members[0];
    const memberB = ws.members[1];

    const initialWorkloadA = memberA.workload;
    const initialWorkloadB = memberB.workload;

    // Create a High priority task assigned to Member A
    const { state: s1, task } = createTaskOp(
      ws,
      {
        projectId: ws.projects[0].id,
        assigneeId: memberA.id,
        priority: 'High',
        status: 'In Progress',
      },
      REFERENCE_DATE
    );
    ws = s1;

    expect(ws.members.find((m) => m.id === memberA.id)!.workload).toBe(initialWorkloadA + 18);

    // Reassign to Member B
    const { state: s2 } = updateTaskOp(
      ws,
      task.id,
      { assigneeId: memberB.id },
      REFERENCE_DATE
    );
    ws = s2;

    const finalWorkloadA = ws.members.find((m) => m.id === memberA.id)!.workload;
    const finalWorkloadB = ws.members.find((m) => m.id === memberB.id)!.workload;

    expect(finalWorkloadA).toBe(initialWorkloadA);
    expect(finalWorkloadB).toBe(initialWorkloadB + 18);

    const errors = validateWorkspaceIntegrity(ws).filter((i) => i.severity === 'error');
    expect(errors).toHaveLength(0);
  });

  it('deleting an assigned task decrements the member workload', () => {
    let ws = createTestWorkspace();
    const member = ws.members[0];

    const { state: s1, task } = createTaskOp(
      ws,
      {
        projectId: ws.projects[0].id,
        assigneeId: member.id,
        priority: 'Medium',
        status: 'In Progress',
      },
      REFERENCE_DATE
    );
    ws = s1;

    const workloadBeforeDelete = ws.members.find((m) => m.id === member.id)!.workload;

    const { state: s2 } = deleteTaskOp(ws, task.id, REFERENCE_DATE);
    ws = s2;

    const workloadAfterDelete = ws.members.find((m) => m.id === member.id)!.workload;
    expect(workloadAfterDelete).toBe(workloadBeforeDelete - 12);
  });
});
