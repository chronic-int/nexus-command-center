import { describe, it, expect } from 'vitest';
import { createLargeWorkspace } from '../../src/data/largeWorkspaceGenerator';
import {
  calculateProjectProgress,
  calculateProjectHealth,
  calculateMemberWorkload,
  recomputeWorkspaceMetricsFast,
} from '../../src/utils/metrics';

describe('Metrics Calculation Equivalence', () => {
  it('guarantees that recomputeWorkspaceMetricsFast produces 100% identical outputs to brute-force recalculation', () => {
    // Generate medium workspace
    const ws = createLargeWorkspace({
      seed: 554433,
      projects: 50,
      tasks: 1000,
      members: 30,
    });

    const refDate = '2026-09-22';

    // 1. Reference Brute-Force Calculation
    const refProjects = ws.projects.map((p) => ({
      ...p,
      progress: calculateProjectProgress(ws.tasks, p.id),
      health: calculateProjectHealth(ws.tasks, p.id, p.health, refDate),
    }));

    const refMembers = ws.members.map((m) => ({
      ...m,
      workload: calculateMemberWorkload(ws.tasks, m.id),
    }));

    // 2. High-Performance Single-Pass Calculation
    const fastResult = recomputeWorkspaceMetricsFast(
      ws.tasks,
      ws.projects,
      ws.members,
      undefined,
      undefined,
      refDate
    );

    // 3. Strict bit-for-bit equivalence comparison
    for (let i = 0; i < ws.projects.length; i++) {
      const ref = refProjects[i];
      const fast = fastResult.projects[i];
      expect(fast.progress).toBe(ref.progress);
      expect(fast.health).toBe(ref.health);
    }

    for (let i = 0; i < ws.members.length; i++) {
      const ref = refMembers[i];
      const fast = fastResult.members[i];
      expect(fast.workload).toBe(ref.workload);
    }
  });

  it('guarantees equivalence for targeted incremental updates', () => {
    const ws = createLargeWorkspace({
      seed: 887766,
      projects: 20,
      tasks: 500,
      members: 15,
    });

    const targetProjectId = ws.projects[3].id;
    const targetMemberId = ws.members[2].id;

    // Mutate a task
    const modifiedTasks = ws.tasks.map((t, idx) =>
      idx === 0
        ? { ...t, projectId: targetProjectId, assigneeId: targetMemberId, status: 'Done' as const }
        : t
    );

    const fast = recomputeWorkspaceMetricsFast(
      modifiedTasks,
      ws.projects,
      ws.members,
      [targetProjectId],
      [targetMemberId]
    );

    expect(fast.projects.find((p) => p.id === targetProjectId)!.progress).toBe(
      calculateProjectProgress(modifiedTasks, targetProjectId)
    );
    expect(fast.members.find((m) => m.id === targetMemberId)!.workload).toBe(
      calculateMemberWorkload(modifiedTasks, targetMemberId)
    );
  });
});
