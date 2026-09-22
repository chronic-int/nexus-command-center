import { describe, it, expect } from 'vitest';
import { createTestWorkspace, REFERENCE_DATE } from '../testUtils';
import {
  createTaskOp,
  updateTaskOp,
  moveTaskStatusOp,
  moveTaskProjectOp,
  deleteTaskOp,
  createProjectOp,
  deleteProjectCascadeOp,
} from '../../src/domain/workspaceDomain';

function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    const val = (obj as any)[key];
    if (val !== null && typeof val === 'object' && !Object.isFrozen(val)) {
      deepFreeze(val);
    }
  }
  return obj;
}

describe('Immutability & Idempotency Domain Invariants', () => {
  it('guarantees pure operations never mutate input state (Object.freeze check)', () => {
    const ws = createTestWorkspace();
    deepFreeze(ws);

    // All operations should run without throwing TypeError (attempt to assign to read-only property)
    expect(() => {
      createTaskOp(ws, { title: 'Frozen Test Task' }, REFERENCE_DATE);
    }).not.toThrow();

    expect(() => {
      updateTaskOp(ws, ws.tasks[0].id, { title: 'Updated Title' }, REFERENCE_DATE);
    }).not.toThrow();

    expect(() => {
      moveTaskStatusOp(ws, ws.tasks[0].id, 'Done', REFERENCE_DATE);
    }).not.toThrow();

    expect(() => {
      moveTaskProjectOp(ws, ws.tasks[0].id, ws.projects[1].id, REFERENCE_DATE);
    }).not.toThrow();

    expect(() => {
      deleteTaskOp(ws, ws.tasks[0].id, REFERENCE_DATE);
    }).not.toThrow();

    expect(() => {
      createProjectOp(ws, { name: 'Frozen Project' }, REFERENCE_DATE);
    }).not.toThrow();

    expect(() => {
      deleteProjectCascadeOp(ws, ws.projects[0].id, REFERENCE_DATE);
    }).not.toThrow();
  });

  it('moving a task to its current status is an idempotent no-op', () => {
    const ws = createTestWorkspace();
    const task = ws.tasks[0];

    const res = moveTaskStatusOp(ws, task.id, task.status, REFERENCE_DATE);
    expect(res.state).toBe(ws); // exact reference equality: no new state created
    expect(res.task).toBe(task);
  });

  it('moving a task to its current project is an idempotent no-op', () => {
    const ws = createTestWorkspace();
    const task = ws.tasks[0];

    const res = moveTaskProjectOp(ws, task.id, task.projectId, REFERENCE_DATE);
    expect(res.state).toBe(ws);
    expect(res.task).toBe(task);
  });

  it('deleting a non-existent task returns original state cleanly', () => {
    const ws = createTestWorkspace();
    const res = deleteTaskOp(ws, 'non-existent-task-id', REFERENCE_DATE);

    expect(res.state).toBe(ws);
    expect(res.deletedTask).toBeNull();
  });

  it('deleting a non-existent project returns original state cleanly', () => {
    const ws = createTestWorkspace();
    const res = deleteProjectCascadeOp(ws, 'non-existent-project-id', REFERENCE_DATE);

    expect(res.state).toBe(ws);
    expect(res.deletedProject).toBeNull();
  });
});
