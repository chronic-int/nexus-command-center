import { describe, it, expect } from 'vitest';
import { createTestWorkspace, REFERENCE_DATE } from '../testUtils';
import { createTaskOp, moveTaskStatusOp, createProjectOp } from '../../src/domain/workspaceDomain';

describe('Event Ordering & Audit Invariants', () => {
  it('guarantees activities are ordered with newest events first', () => {
    let ws = createTestWorkspace();
    const projectId = ws.projects[0].id;

    // Operation 1: Create Project
    const r1 = createProjectOp(ws, { name: 'Audit Project Alpha' }, REFERENCE_DATE);
    ws = r1.state;
    expect(ws.activities[0].targetName).toBe('Audit Project Alpha');

    // Operation 2: Create Task
    const r2 = createTaskOp(ws, { projectId, title: 'Audit Task Beta' }, REFERENCE_DATE);
    ws = r2.state;
    expect(ws.activities[0].targetName).toBe('Audit Task Beta');
    expect(ws.activities[1].targetName).toBe('Audit Project Alpha');

    // Operation 3: Move Task
    const r3 = moveTaskStatusOp(ws, r2.task.id, 'Done', REFERENCE_DATE);
    ws = r3.state;
    expect(ws.activities[0].action).toBe('moved task to Done');
    expect(ws.activities[0].targetId).toBe(r2.task.id);
  });

  it('guarantees all activities have unique IDs and valid target associations', () => {
    let ws = createTestWorkspace();
    const projectId = ws.projects[0].id;

    for (let i = 0; i < 5; i++) {
      const res = createTaskOp(ws, { projectId, title: `Load Task ${i}` }, REFERENCE_DATE);
      ws = res.state;
    }

    const activityIds = new Set<string>();
    for (const act of ws.activities) {
      expect(activityIds.has(act.id)).toBe(false);
      activityIds.add(act.id);
      expect(act.targetId).toBeDefined();
      expect(act.action).toBeDefined();
    }
  });
});
