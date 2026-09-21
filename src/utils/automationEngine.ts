import { Task, Project, AutomationRule, Notification, ActivityItem } from '../types';
import { isTaskOverdue, getTodayString } from './dateUtils';
import { generateEntityId } from './idGenerator';

export type AutomationEventType =
  | 'TASK_CREATED'
  | 'STATUS_CHANGED'
  | 'PRIORITY_CHANGED'
  | 'DEADLINE_OVERDUE';

export interface AutomationEvent {
  type: AutomationEventType;
  task: Task;
  previousTask?: Task;
}

export interface AutomationExecutionResult {
  updatedTasks: Task[];
  updatedProjects: Project[];
  newNotifications: Notification[];
  newActivities: ActivityItem[];
  triggeredRuleIds: string[];
}

// Loop guard recursion limit
const MAX_AUTOMATION_DEPTH = 3;

/**
 * Checks if a task matches the condition clause of an automation rule.
 */
function taskMatchesCondition(task: Task, conditionStr: string, allTasks: Task[]): boolean {
  const cond = conditionStr.toLowerCase();

  if (cond.includes('status != done')) {
    if (task.status === 'Done') return false;
  }
  if (cond.includes('urgent count > 3')) {
    const projectUrgent = allTasks.filter(
      (t) => t.projectId === task.projectId && t.priority === 'Urgent' && t.status !== 'Done'
    ).length;
    if (projectUrgent <= 3) return false;
  }
  if (cond.includes('devops') || cond.includes('infrastructure')) {
    const hasMatch = task.labels.some((l) => {
      const lower = l.toLowerCase();
      return lower.includes('devops') || lower.includes('infra');
    });
    if (!hasMatch) return false;
  }
  if (cond.includes('all subtasks completed')) {
    if (task.subtasks.length === 0 || task.subtasks.some((s) => !s.completed)) return false;
  }
  if (cond.includes('priority == urgent')) {
    if (task.priority !== 'Urgent') return false;
  }

  return true;
}

/**
 * Dry-run evaluation: returns the actual tasks in the workspace that match the rule.
 */
export function evaluateRuleDryRun(
  rule: AutomationRule,
  allTasks: Task[],
  projects: Project[]
): Task[] {
  const triggerLower = rule.trigger.toLowerCase();

  return allTasks.filter((task) => {
    // Check trigger filter
    let triggerMatch = false;

    if (triggerLower.includes('deadline') || triggerLower.includes('overdue')) {
      triggerMatch = isTaskOverdue(task.dueDate, task.status);
    } else if (triggerLower.includes('urgent')) {
      triggerMatch = task.priority === 'Urgent';
    } else if (triggerLower.includes('review')) {
      triggerMatch = task.status === 'Review';
    } else if (triggerLower.includes('done')) {
      triggerMatch = task.status === 'Done';
    } else {
      // General task event
      triggerMatch = true;
    }

    if (!triggerMatch) return false;

    // Check condition filter
    return taskMatchesCondition(task, rule.condition, allTasks);
  });
}

/**
 * Executes enabled automation rules against a workspace event with loop protection.
 */
export function processWorkspaceAutomation(
  rules: AutomationRule[],
  event: AutomationEvent,
  allTasks: Task[],
  projects: Project[],
  callDepth: number = 0
): AutomationExecutionResult {
  const result: AutomationExecutionResult = {
    updatedTasks: [...allTasks],
    updatedProjects: [...projects],
    newNotifications: [],
    newActivities: [],
    triggeredRuleIds: [],
  };

  if (callDepth >= MAX_AUTOMATION_DEPTH) {
    console.warn('[NEXUS Automations] Max execution depth reached, stopping recursion to prevent infinite loops.');
    return result;
  }

  const enabledRules = rules.filter((r) => r.enabled);
  const triggerLower = (t: string) => t.toLowerCase();

  for (const rule of enabledRules) {
    const tStr = triggerLower(rule.trigger);
    let eventMatchesTrigger = false;

    if (event.type === 'DEADLINE_OVERDUE' && (tStr.includes('deadline') || tStr.includes('overdue'))) {
      eventMatchesTrigger = true;
    } else if (event.type === 'PRIORITY_CHANGED' && tStr.includes('priority')) {
      eventMatchesTrigger = true;
    } else if (event.type === 'STATUS_CHANGED' && (tStr.includes('status') || tStr.includes(event.task.status.toLowerCase()))) {
      eventMatchesTrigger = true;
    } else if (event.type === 'TASK_CREATED' && (tStr.includes('created') || tStr.includes('new task'))) {
      eventMatchesTrigger = true;
    }

    if (!eventMatchesTrigger) continue;

    // Check condition against current task
    if (!taskMatchesCondition(event.task, rule.condition, result.updatedTasks)) {
      continue;
    }

    // Rule matched! Apply action
    result.triggeredRuleIds.push(rule.id);
    const actionLower = rule.action.toLowerCase();

    // Action 1: Set Priority = Urgent & Send Notification
    if (actionLower.includes('set priority = urgent')) {
      result.updatedTasks = result.updatedTasks.map((t) =>
        t.id === event.task.id ? { ...t, priority: 'Urgent', updatedAt: new Date().toISOString() } : t
      );

      result.newNotifications.push({
        id: generateEntityId('notif'),
        title: 'Automation: Priority Escalation',
        message: `Task ${event.task.key} was automatically escalated to Urgent priority by rule "${rule.name}".`,
        category: 'System',
        timestamp: 'Just now',
        read: false,
        targetType: 'task',
        targetId: event.task.id,
      });

      result.newActivities.push({
        id: generateEntityId('act'),
        userId: 'system',
        action: `automatically escalated to Urgent by rule "${rule.name}"`,
        targetName: event.task.title,
        targetType: 'task',
        targetId: event.task.id,
        timestamp: 'Just now',
        projectId: event.task.projectId,
      });
    }

    // Action 2: Update Project Health = At Risk
    if (actionLower.includes('project health = at risk')) {
      result.updatedProjects = result.updatedProjects.map((p) =>
        p.id === event.task.projectId ? { ...p, health: 'At Risk' } : p
      );

      result.newNotifications.push({
        id: generateEntityId('notif'),
        title: 'Project Health Alert',
        message: `Project health updated to At Risk due to critical blockers by automation rule "${rule.name}".`,
        category: 'Project updates',
        timestamp: 'Just now',
        read: false,
        targetType: 'project',
        targetId: event.task.projectId,
      });
    }

    // Action 3: Create assignment notification for Elena
    if (actionLower.includes('assignment notification for elena')) {
      result.newNotifications.push({
        id: generateEntityId('notif'),
        title: 'Review Requested',
        message: `Elena Rostova was notified to review ${event.task.key} (${event.task.title}).`,
        category: 'Assignments',
        timestamp: 'Just now',
        read: false,
        targetType: 'task',
        targetId: event.task.id,
      });
    }
  }

  return result;
}
