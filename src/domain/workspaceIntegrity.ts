import { WorkspaceState } from './workspaceDomain';
import { calculateProjectProgress, calculateMemberWorkload } from '../utils/metrics';
import { TaskStatus, TaskPriority, ProjectHealth } from '../types';

export interface ValidationIssue {
  severity: 'error' | 'warning';
  entity: 'task' | 'project' | 'member' | 'document' | 'automation' | 'notification' | 'activity';
  entityId: string;
  message: string;
}

const VALID_STATUSES = new Set<string>(['Backlog', 'Todo', 'In Progress', 'Review', 'Done']);
const VALID_PRIORITIES = new Set<string>(['Urgent', 'High', 'Medium', 'Low']);
const VALID_PROJECT_HEALTHS = new Set<string>(['On Track', 'At Risk', 'Delayed']);

/**
 * Validates a YYYY-MM-DD or ISO date string for semantic validity.
 */
export function isValidDateString(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  // Check format: YYYY-MM-DD or ISO
  if (!/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  // Year check reasonable range (e.g. 2000-2100)
  const year = parseInt(dateStr.slice(0, 4), 10);
  const month = parseInt(dateStr.slice(5, 7), 10);
  const day = parseInt(dateStr.slice(8, 10), 10);
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  return year >= 2000 && year <= 2100;
}

/**
 * Validates the core domain invariants of the NEXUS workspace state.
 * Returns an array of structured issues (empty if 100% valid).
 */
export function validateWorkspaceIntegrity(state: WorkspaceState): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const projectIds = new Set<string>();
  const projectKeys = new Set<string>();
  const memberIds = new Set(state.members.map((m) => m.id));
  const taskIds = new Set<string>();
  const taskKeys = new Set<string>();
  const docIds = new Set<string>();
  const automationIds = new Set<string>();
  const notificationIds = new Set<string>();
  const activityIds = new Set<string>();

  // 1. Project Invariants
  for (const project of state.projects) {
    // Unique ID
    if (projectIds.has(project.id)) {
      issues.push({
        severity: 'error',
        entity: 'project',
        entityId: project.id,
        message: `Duplicate project ID detected: ${project.id}`,
      });
    }
    projectIds.add(project.id);

    // Unique Key
    if (projectKeys.has(project.key)) {
      issues.push({
        severity: 'error',
        entity: 'project',
        entityId: project.id,
        message: `Duplicate project key detected: ${project.key}`,
      });
    }
    projectKeys.add(project.key);

    // Project Health enum
    if (!VALID_PROJECT_HEALTHS.has(project.health)) {
      issues.push({
        severity: 'error',
        entity: 'project',
        entityId: project.id,
        message: `Invalid project health: "${project.health}"`,
      });
    }

    // Progress Range [0, 100]
    if (typeof project.progress !== 'number' || project.progress < 0 || project.progress > 100) {
      issues.push({
        severity: 'error',
        entity: 'project',
        entityId: project.id,
        message: `Project progress out of range [0-100]: ${project.progress}`,
      });
    }

    // Date validation
    if (!isValidDateString(project.deadline)) {
      issues.push({
        severity: 'error',
        entity: 'project',
        entityId: project.id,
        message: `Project ${project.key} has malformed deadline date: ${project.deadline}`,
      });
    }
    if (project.startDate && !isValidDateString(project.startDate)) {
      issues.push({
        severity: 'error',
        entity: 'project',
        entityId: project.id,
        message: `Project ${project.key} has malformed start date: ${project.startDate}`,
      });
    }

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
        severity: 'error',
        entity: 'project',
        entityId: project.id,
        message: `Project ${project.name} references non-existent lead: ${project.leadId}`,
      });
    }

    // Verify memberIds all exist
    if (project.memberIds) {
      for (const mId of project.memberIds) {
        if (!memberIds.has(mId)) {
          issues.push({
            severity: 'error',
            entity: 'project',
            entityId: project.id,
            message: `Project ${project.name} references non-existent memberId: ${mId}`,
          });
        }
      }
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

    // Status enum
    if (!VALID_STATUSES.has(task.status)) {
      issues.push({
        severity: 'error',
        entity: 'task',
        entityId: task.id,
        message: `Invalid task status for ${task.key}: "${task.status}"`,
      });
    }

    // Priority enum
    if (!VALID_PRIORITIES.has(task.priority)) {
      issues.push({
        severity: 'error',
        entity: 'task',
        entityId: task.id,
        message: `Invalid task priority for ${task.key}: "${task.priority}"`,
      });
    }

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

    // Date validation
    if (!isValidDateString(task.dueDate)) {
      issues.push({
        severity: 'error',
        entity: 'task',
        entityId: task.id,
        message: `Task ${task.key} has malformed due date: ${task.dueDate}`,
      });
    }
    if (task.startDate && !isValidDateString(task.startDate)) {
      issues.push({
        severity: 'error',
        entity: 'task',
        entityId: task.id,
        message: `Task ${task.key} has malformed start date: ${task.startDate}`,
      });
    }
  }

  // 3. Member Invariants
  for (const member of state.members) {
    // Workload Range [0, 100]
    if (typeof member.workload !== 'number' || member.workload < 0 || member.workload > 100) {
      issues.push({
        severity: 'error',
        entity: 'member',
        entityId: member.id,
        message: `Member workload out of range [0-100] for ${member.name}: ${member.workload}`,
      });
    }

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
    if (docIds.has(doc.id)) {
      issues.push({
        severity: 'error',
        entity: 'document',
        entityId: doc.id,
        message: `Duplicate document ID detected: ${doc.id}`,
      });
    }
    docIds.add(doc.id);

    if (!projectIds.has(doc.projectId)) {
      issues.push({
        severity: 'error',
        entity: 'document',
        entityId: doc.id,
        message: `Document "${doc.title}" references non-existent project: ${doc.projectId}`,
      });
    }
  }

  // 5. Automation Rule Invariants
  for (const rule of state.automations) {
    if (automationIds.has(rule.id)) {
      issues.push({
        severity: 'error',
        entity: 'automation',
        entityId: rule.id,
        message: `Duplicate automation rule ID detected: ${rule.id}`,
      });
    }
    automationIds.add(rule.id);
  }

  // 6. Notification Invariants
  for (const notif of state.notifications) {
    if (notificationIds.has(notif.id)) {
      issues.push({
        severity: 'error',
        entity: 'notification',
        entityId: notif.id,
        message: `Duplicate notification ID detected: ${notif.id}`,
      });
    }
    notificationIds.add(notif.id);

    // If notification targets a task, does task exist?
    if (notif.targetType === 'task' && notif.targetId && !taskIds.has(notif.targetId)) {
      issues.push({
        severity: 'error',
        entity: 'notification',
        entityId: notif.id,
        message: `Notification "${notif.title}" targets non-existent task: ${notif.targetId}`,
      });
    }

    // If notification targets a project, does project exist?
    if (notif.targetType === 'project' && notif.targetId && !projectIds.has(notif.targetId)) {
      issues.push({
        severity: 'error',
        entity: 'notification',
        entityId: notif.id,
        message: `Notification "${notif.title}" targets non-existent project: ${notif.targetId}`,
      });
    }
  }

  // 7. Activity Invariants
  for (const act of state.activities) {
    if (activityIds.has(act.id)) {
      issues.push({
        severity: 'error',
        entity: 'activity',
        entityId: act.id,
        message: `Duplicate activity ID detected: ${act.id}`,
      });
    }
    activityIds.add(act.id);
  }

  return issues;
}
