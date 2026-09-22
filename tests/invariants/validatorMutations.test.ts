import { describe, it, expect } from 'vitest';
import { createTestWorkspace } from '../testUtils';
import { validateWorkspaceIntegrity } from '../../src/domain/workspaceIntegrity';

describe('Validator Mutation Testing (Red-Teaming the Invariant Checker)', () => {
  it('detects invalid TaskStatus literal', () => {
    const ws = createTestWorkspace();
    (ws.tasks[0] as any).status = 'In Review'; // common prototype near-miss
    const errors = validateWorkspaceIntegrity(ws).filter((i) => i.severity === 'error');
    expect(errors.some((e) => e.entity === 'task' && e.message.includes('Invalid task status'))).toBe(true);
  });

  it('detects invalid TaskPriority literal', () => {
    const ws = createTestWorkspace();
    (ws.tasks[0] as any).priority = 'Crucial';
    const errors = validateWorkspaceIntegrity(ws).filter((i) => i.severity === 'error');
    expect(errors.some((e) => e.entity === 'task' && e.message.includes('Invalid task priority'))).toBe(true);
  });

  it('detects invalid ProjectHealth literal', () => {
    const ws = createTestWorkspace();
    (ws.projects[0] as any).health = 'Critical';
    const errors = validateWorkspaceIntegrity(ws).filter((i) => i.severity === 'error');
    expect(errors.some((e) => e.entity === 'project' && e.message.includes('Invalid project health'))).toBe(true);
  });

  it('detects duplicate project IDs', () => {
    const ws = createTestWorkspace();
    ws.projects.push({ ...ws.projects[0], key: 'UNIQUE_KEY_99' });
    const errors = validateWorkspaceIntegrity(ws).filter((i) => i.severity === 'error');
    expect(errors.some((e) => e.entity === 'project' && e.message.includes('Duplicate project ID'))).toBe(true);
  });

  it('detects duplicate project keys', () => {
    const ws = createTestWorkspace();
    ws.projects.push({ ...ws.projects[0], id: 'unique_proj_99' });
    const errors = validateWorkspaceIntegrity(ws).filter((i) => i.severity === 'error');
    expect(errors.some((e) => e.entity === 'project' && e.message.includes('Duplicate project key'))).toBe(true);
  });

  it('detects project progress outside [0, 100]', () => {
    const ws = createTestWorkspace();
    ws.projects[0].progress = 140;
    const errors = validateWorkspaceIntegrity(ws).filter((i) => i.severity === 'error');
    expect(errors.some((e) => e.entity === 'project' && e.message.includes('out of range'))).toBe(true);

    ws.projects[0].progress = -5;
    const errors2 = validateWorkspaceIntegrity(ws).filter((i) => i.severity === 'error');
    expect(errors2.some((e) => e.entity === 'project' && e.message.includes('out of range'))).toBe(true);
  });

  it('detects member workload outside [0, 100]', () => {
    const ws = createTestWorkspace();
    ws.members[0].workload = 115;
    const errors = validateWorkspaceIntegrity(ws).filter((i) => i.severity === 'error');
    expect(errors.some((e) => e.entity === 'member' && e.message.includes('out of range'))).toBe(true);

    ws.members[0].workload = -10;
    const errors2 = validateWorkspaceIntegrity(ws).filter((i) => i.severity === 'error');
    expect(errors2.some((e) => e.entity === 'member' && e.message.includes('out of range'))).toBe(true);
  });

  it('detects project lead referencing non-existent member', () => {
    const ws = createTestWorkspace();
    ws.projects[0].leadId = 'non-existent-user-999';
    const errors = validateWorkspaceIntegrity(ws).filter((i) => i.severity === 'error');
    expect(errors.some((e) => e.entity === 'project' && e.message.includes('non-existent lead'))).toBe(true);
  });

  it('detects project memberIds referencing non-existent member', () => {
    const ws = createTestWorkspace();
    ws.projects[0].memberIds = ['ghost-user-404'];
    const errors = validateWorkspaceIntegrity(ws).filter((i) => i.severity === 'error');
    expect(errors.some((e) => e.entity === 'project' && e.message.includes('non-existent memberId'))).toBe(true);
  });

  it('detects notification targeting non-existent task', () => {
    const ws = createTestWorkspace();
    ws.notifications.push({
      id: 'notif-mut-1',
      title: 'Ghost Notification',
      message: 'Testing',
      category: 'System',
      timestamp: 'Just now',
      read: false,
      targetType: 'task',
      targetId: 'ghost-task-12345',
    });
    const errors = validateWorkspaceIntegrity(ws).filter((i) => i.severity === 'error');
    expect(errors.some((e) => e.entity === 'notification' && e.message.includes('targets non-existent task'))).toBe(true);
  });

  it('detects notification targeting non-existent project', () => {
    const ws = createTestWorkspace();
    ws.notifications.push({
      id: 'notif-mut-2',
      title: 'Ghost Project Notif',
      message: 'Testing',
      category: 'Project updates',
      timestamp: 'Just now',
      read: false,
      targetType: 'project',
      targetId: 'ghost-project-999',
    });
    const errors = validateWorkspaceIntegrity(ws).filter((i) => i.severity === 'error');
    expect(errors.some((e) => e.entity === 'notification' && e.message.includes('targets non-existent project'))).toBe(true);
  });

  it('detects malformed date strings on tasks and projects', () => {
    const ws = createTestWorkspace();
    ws.tasks[0].dueDate = 'malformed-date-string';
    const errors = validateWorkspaceIntegrity(ws).filter((i) => i.severity === 'error');
    expect(errors.some((e) => e.entity === 'task' && e.message.includes('malformed due date'))).toBe(true);

    const ws2 = createTestWorkspace();
    ws2.projects[0].deadline = '2026-99-99';
    const errors2 = validateWorkspaceIntegrity(ws2).filter((i) => i.severity === 'error');
    expect(errors2.some((e) => e.entity === 'project' && e.message.includes('malformed deadline date'))).toBe(true);
  });

  it('detects duplicate automation rule IDs', () => {
    const ws = createTestWorkspace();
    ws.automations.push({ ...ws.automations[0] });
    const errors = validateWorkspaceIntegrity(ws).filter((i) => i.severity === 'error');
    expect(errors.some((e) => e.entity === 'automation' && e.message.includes('Duplicate automation rule ID'))).toBe(true);
  });

  it('detects duplicate activity IDs', () => {
    const ws = createTestWorkspace();
    ws.activities.push({ ...ws.activities[0] });
    const errors = validateWorkspaceIntegrity(ws).filter((i) => i.severity === 'error');
    expect(errors.some((e) => e.entity === 'activity' && e.message.includes('Duplicate activity ID'))).toBe(true);
  });
});
