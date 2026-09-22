import { WorkspaceState } from './workspaceDomain';
import { calculateProjectProgress, calculateMemberWorkload } from '../utils/metrics';

export interface ValidationIssue {
  severity: 'error' | 'warning';
  entity: 'task' | 'project' | 'member' | 'document' | 'automation' | 'notification';
  entityId: string;
  message: string;
}

/**
 * Validates the core domain invariants of the NEXUS workspace state.
 * Returns an array of structured issues (empty if 100% valid).
 */
export function validateWorkspaceIntegrity(state: WorkspaceState): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const projectIds = new Set(state.projects.map((p) => p.id));
  const memberIds = new Set(state.members.map((m) => m.id));
  const taskIds = new Set<string>();
  const taskKeys = new Set<string>();
  const projectKeys = new Set<string>();

  // 1. Project Invariants
  for (const project of state.projects) {
    if (projectKeys.has(project.key)) {
      issues.push({
        severity: 'error',
        entity: 'project',
        entityId: project.id,
        message: `Duplicate project key detected: ${project.key}`,
      });
    }
    projectKeys.add(project.key);

    // Verify progress accuracy
    const expectedProgress = calculateProjectProgress(state.tasks, project.id);
    if (project.progress !== expectedProgress) {
      issues.push({
        severity: 'error',
        entity: 'project',
        entityId: project.id,
        message: `Project progress mismatch for ${project.name}: expected ${expectedProgress}%, found ${project.progress}%`,
      });
    }

    // Verify lead exists
    if (project.leadId && !memberIds.has(project.leadId)) {
      issues.push({
        severity: 'warning',
        entity: 'project',
        entityId: project.id,
        message: `Project ${project.name} references non-existent lead: ${project.leadId}`,
      });
    }
  }

  // 2. Task Invariants
  for (const task of state.tasks) {
    // Unique ID
    if (taskIds.has(task.id)) {
      issues.push({
        severity: 'error',
        entity: 'task',
        entityId: task.id,
        message: `Duplicate task ID detected: ${task.id}`,
      });
    }
    taskIds.add(task.id);

    // Unique Human-readable Key
    if (taskKeys.has(task.key)) {
      issues.push({
        severity: 'error',
        entity: 'task',
        entityId: task.id,
        message: `Duplicate task key detected: ${task.key}`,
      });
    }
    taskKeys.add(task.key);

    // Reference existing project
    if (!projectIds.has(task.projectId)) {
      issues.push({
        severity: 'error',
        entity: 'task',
        entityId: task.id,
        message: `Task ${task.key} references non-existent project: ${task.projectId}`,
      });
    }

    // Reference existing member
    if (task.assigneeId && task.assigneeId !== 'unassigned' && !memberIds.has(task.assigneeId)) {
      issues.push({
        severity: 'error',
        entity: 'task',
        entityId: task.id,
        message: `Task ${task.key} assigned to non-existent member: ${task.assigneeId}`,
      });
    }
  }

  // 3. Member Invariants
  for (const member of state.members) {
    const expectedWorkload = calculateMemberWorkload(state.tasks, member.id);
    if (member.workload !== expectedWorkload) {
      issues.push({
        severity: 'error',
        entity: 'member',
        entityId: member.id,
        message: `Workload mismatch for ${member.name}: expected ${expectedWorkload}%, found ${member.workload}%`,
      });
    }
  }

  // 4. Document Invariants
  for (const doc of state.documents) {
    if (!projectIds.has(doc.projectId)) {
      issues.push({
        severity: 'error',
        entity: 'document',
        entityId: doc.id,
        message: `Document "${doc.title}" references non-existent project: ${doc.projectId}`,
      });
    }
  }

  return issues;
}
