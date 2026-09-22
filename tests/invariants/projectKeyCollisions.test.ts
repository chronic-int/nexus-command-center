import { describe, it, expect } from 'vitest';
import { createTestWorkspace, REFERENCE_DATE } from '../testUtils';
import { createProjectOp, deleteProjectCascadeOp } from '../../src/domain/workspaceDomain';
import { generateUniqueProjectKey } from '../../src/utils/idGenerator';
import { validateWorkspaceIntegrity } from '../../src/domain/workspaceIntegrity';

describe('Project Key Monotonicity & Collision Prevention', () => {
  it('prevents key duplication when intermediate projects are deleted (PRJ-7, PRJ-8, delete PRJ-3, next is PRJ-9)', () => {
    let ws = createTestWorkspace();
    // Wipe projects to test controlled numbering
    ws.projects = [];
    ws.tasks = [];
    ws.documents = [];
    ws.notifications = [];
    ws.activities = [];

    // Create PRJ-1, PRJ-2, PRJ-3
    const p1 = createProjectOp(ws, { key: 'PRJ-1', name: 'Project 1' }, REFERENCE_DATE);
    ws = p1.state;
    const p2 = createProjectOp(ws, { key: 'PRJ-2', name: 'Project 2' }, REFERENCE_DATE);
    ws = p2.state;
    const p3 = createProjectOp(ws, { key: 'PRJ-3', name: 'Project 3' }, REFERENCE_DATE);
    ws = p3.state;
    const p7 = createProjectOp(ws, { key: 'PRJ-7', name: 'Project 7' }, REFERENCE_DATE);
    ws = p7.state;
    const p8 = createProjectOp(ws, { key: 'PRJ-8', name: 'Project 8' }, REFERENCE_DATE);
    ws = p8.state;

    // Delete PRJ-3
    const deleted = deleteProjectCascadeOp(ws, p3.project.id, REFERENCE_DATE);
    ws = deleted.state;

    // Create new project with auto-assigned key
    const pNext = createProjectOp(ws, { name: 'Next Auto Project' }, REFERENCE_DATE);
    ws = pNext.state;

    // Must NOT duplicate PRJ-8 (e.g. from length heuristic: 4 + 1 = 5)
    // It must strictly be greater than max existing suffix (PRJ-9)
    expect(pNext.project.key).toBe('PRJ-9');

    const errors = validateWorkspaceIntegrity(ws).filter((i) => i.severity === 'error');
    expect(errors).toHaveLength(0);
  });

  it('deterministically resolves custom duplicate keys by appending incremented suffix', () => {
    let ws = createTestWorkspace();

    // Create project with custom key "OMEGA"
    const p1 = createProjectOp(ws, { key: 'OMEGA', name: 'Omega 1' }, REFERENCE_DATE);
    ws = p1.state;
    expect(p1.project.key).toBe('OMEGA');

    // Create second project with requested key "OMEGA"
    const p2 = createProjectOp(ws, { key: 'OMEGA', name: 'Omega 2' }, REFERENCE_DATE);
    ws = p2.state;
    expect(p2.project.key).toBe('OMEGA-2');

    // Create third project with requested key "OMEGA"
    const p3 = createProjectOp(ws, { key: 'OMEGA', name: 'Omega 3' }, REFERENCE_DATE);
    ws = p3.state;
    expect(p3.project.key).toBe('OMEGA-3');

    // Invariant check
    const errors = validateWorkspaceIntegrity(ws).filter((i) => i.severity === 'error');
    expect(errors).toHaveLength(0);
  });
});
