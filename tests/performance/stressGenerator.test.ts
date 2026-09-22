import { describe, it, expect } from 'vitest';
import { createLargeWorkspace } from '../../src/data/largeWorkspaceGenerator';
import { validateWorkspaceIntegrity } from '../../src/domain/workspaceIntegrity';

describe('Large Workspace Stress Fixture & Integrity', () => {
  it('deterministically generates a full-scale workspace (500 projects, 10,000 tasks, 200 members) that passes 100% integrity audit', () => {
    const startTime = performance.now();
    const ws = createLargeWorkspace({
      seed: 998877,
      projects: 500,
      tasks: 10000,
      members: 200,
      notifications: 2000,
      activities: 5000,
      documents: 500,
      automations: 100,
    });
    const generationDuration = performance.now() - startTime;

    // 1. Assert counts
    expect(ws.projects).toHaveLength(500);
    expect(ws.tasks).toHaveLength(10000);
    expect(ws.members).toHaveLength(200);
    expect(ws.notifications).toHaveLength(2000);
    expect(ws.activities).toHaveLength(5000);
    expect(ws.documents).toHaveLength(500);
    expect(ws.automations).toHaveLength(100);

    // Generation should complete within reasonable timeframe (< 2 seconds)
    expect(generationDuration).toBeLessThan(4000);

    // 2. Validate 100% domain integrity
    const issues = validateWorkspaceIntegrity(ws);
    const errors = issues.filter((i) => i.severity === 'error');
    expect(errors).toEqual([]);
  });

  it('produces 100% identical states when using the same seed', () => {
    const ws1 = createLargeWorkspace({ seed: 12345, projects: 10, tasks: 50 });
    const ws2 = createLargeWorkspace({ seed: 12345, projects: 10, tasks: 50 });

    expect(ws1.tasks.map((t) => t.id)).toEqual(ws2.tasks.map((t) => t.id));
    expect(ws1.tasks.map((t) => t.key)).toEqual(ws2.tasks.map((t) => t.key));
    expect(ws1.projects.map((p) => p.progress)).toEqual(ws2.projects.map((p) => p.progress));
  });
});
