import { describe, it, expect } from 'vitest';
import { hydrateAndValidateWorkspace, WorkspaceDefaults } from '../../src/domain/workspaceHydration';
import { validateWorkspaceIntegrity } from '../../src/domain/workspaceIntegrity';
import {
  INITIAL_PROJECTS,
  INITIAL_TASKS,
  INITIAL_MEMBERS,
  INITIAL_DOCUMENTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUTOMATIONS,
  INITIAL_ACTIVITIES,
} from '../../src/data/seedData';

describe('Persisted Data Validation & Runtime Repair Invariants', () => {
  const defaults: WorkspaceDefaults = {
    projects: INITIAL_PROJECTS,
    tasks: INITIAL_TASKS,
    members: INITIAL_MEMBERS,
    pendingInvitations: [],
    documents: INITIAL_DOCUMENTS,
    notifications: INITIAL_NOTIFICATIONS,
    automations: INITIAL_AUTOMATIONS,
    activities: INITIAL_ACTIVITIES,
  };

  it('safely recovers to defaults when storage contains null or non-array primitives', () => {
    const corruptStorage = {
      projects: 'invalid-string',
      tasks: null,
      members: 12345,
      documents: undefined,
    };

    const result = hydrateAndValidateWorkspace(corruptStorage, defaults);
    expect(result.repaired).toBe(true);
    expect(result.workspace.projects.length).toBeGreaterThan(0);
    expect(result.workspace.tasks.length).toBeGreaterThan(0);
    expect(result.workspace.members.length).toBeGreaterThan(0);

    const issues = validateWorkspaceIntegrity(result.workspace);
    expect(issues).toEqual([]);
  });

  it('repairs dangling foreign keys and orphan tasks referencing deleted projects', () => {
    const rawStorage = {
      projects: [
        {
          id: 'prj-valid-1',
          key: 'VAL',
          name: 'Valid Project',
          description: 'Desc',
          category: 'General',
          health: 'On Track',
          progress: 0,
          startDate: '2026-01-01',
          deadline: '2026-12-31',
          leadId: 'usr-valid-1',
          memberIds: ['usr-valid-1'],
          color: '#6366f1',
          tags: [],
        },
      ],
      members: [
        {
          id: 'usr-valid-1',
          name: 'Valid User',
          email: 'valid@example.com',
          role: 'Lead',
          department: 'Engineering',
          avatar: '',
          workload: 10,
          availability: 'Active',
          currentProjectId: 'prj-valid-1',
        },
      ],
      tasks: [
        {
          id: 'task-orphan-1',
          key: 'ORPH-1',
          title: 'Orphan Task',
          description: '',
          status: 'Todo',
          priority: 'Medium',
          projectId: 'deleted-project-999', // Dangling reference
          assigneeId: 'ghost-user-888', // Dangling reference
          dueDate: '2026-11-11',
          subtasks: [],
          comments: [],
          attachments: [],
          labels: [],
        },
      ],
    };

    const result = hydrateAndValidateWorkspace(rawStorage, defaults);
    expect(result.repaired).toBe(true);

    const repairedTask = result.workspace.tasks.find((t) => t.id === 'task-orphan-1');
    expect(repairedTask).toBeDefined();
    // Must be reassigned to valid project and unassigned member
    expect(repairedTask!.projectId).toBe('prj-valid-1');
    expect(repairedTask!.assigneeId).toBe('unassigned');

    const issues = validateWorkspaceIntegrity(result.workspace);
    expect(issues).toEqual([]);
  });

  it('normalizes legacy or corrupted enum values without throwing', () => {
    const rawStorage = {
      projects: defaults.projects,
      members: defaults.members,
      tasks: [
        {
          id: 'task-legacy-status',
          key: 'LEG-1',
          title: 'Legacy Status Task',
          description: '',
          status: 'In Review', // Legacy 3-word status
          priority: 'SuperUrgent', // Invalid enum
          projectId: defaults.projects[0].id,
          assigneeId: defaults.members[0].id,
          dueDate: '2026-11-11',
          subtasks: [],
          comments: [],
          attachments: [],
          labels: [],
        },
      ],
    };

    const result = hydrateAndValidateWorkspace(rawStorage, defaults);
    expect(result.repaired).toBe(true);

    const repairedTask = result.workspace.tasks.find((t) => t.id === 'task-legacy-status')!;
    expect(repairedTask.status).toBe('Review');
    expect(repairedTask.priority).toBe('Medium'); // Fell back to valid default

    const issues = validateWorkspaceIntegrity(result.workspace);
    expect(issues).toEqual([]);
  });

  it('clamps out-of-range numerical metrics (progress, workload, NaN)', () => {
    const rawStorage = {
      projects: [
        {
          ...defaults.projects[0],
          progress: 5555, // Out of range
        },
      ],
      members: [
        {
          ...defaults.members[0],
          workload: -99, // Out of range
        },
      ],
      tasks: [],
    };

    const result = hydrateAndValidateWorkspace(rawStorage, defaults);
    expect(result.repaired).toBe(true);

    const member = result.workspace.members.find((m) => m.id === defaults.members[0].id)!;
    expect(member.workload).toBeGreaterThanOrEqual(0);
    expect(member.workload).toBeLessThanOrEqual(100);

    const project = result.workspace.projects.find((p) => p.id === defaults.projects[0].id)!;
    expect(project.progress).toBeGreaterThanOrEqual(0);
    expect(project.progress).toBeLessThanOrEqual(100);

    const issues = validateWorkspaceIntegrity(result.workspace);
    expect(issues).toEqual([]);
  });

  it('deduplicates ID collisions and resolves key conflicts in persisted collections', () => {
    const rawStorage = {
      projects: [
        defaults.projects[0],
        { ...defaults.projects[0] }, // Exact duplicate ID
      ],
      members: defaults.members,
      tasks: [
        {
          id: 'tsk-dup',
          key: 'TSK-100',
          title: 'Task A',
          projectId: defaults.projects[0].id,
          assigneeId: defaults.members[0].id,
          status: 'Todo',
          priority: 'High',
          dueDate: '2026-10-10',
          subtasks: [],
          comments: [],
          attachments: [],
          labels: [],
        },
        {
          id: 'tsk-dup', // Duplicate ID
          key: 'TSK-100', // Duplicate Key
          title: 'Task B',
          projectId: defaults.projects[0].id,
          assigneeId: defaults.members[0].id,
          status: 'Todo',
          priority: 'High',
          dueDate: '2026-10-10',
          subtasks: [],
          comments: [],
          attachments: [],
          labels: [],
        },
      ],
    };

    const result = hydrateAndValidateWorkspace(rawStorage, defaults);
    expect(result.repaired).toBe(true);

    // Should only have 1 project with that ID
    const projectOccurrences = result.workspace.projects.filter(
      (p) => p.id === defaults.projects[0].id
    );
    expect(projectOccurrences.length).toBe(1);

    // Tasks should be deduplicated
    const taskOccurrences = result.workspace.tasks.filter((t) => t.id === 'tsk-dup');
    expect(taskOccurrences.length).toBe(1);

    const issues = validateWorkspaceIntegrity(result.workspace);
    expect(issues).toEqual([]);
  });
});
