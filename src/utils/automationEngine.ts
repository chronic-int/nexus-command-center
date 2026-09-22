import { Task, Project, AutomationRule, Notification, ActivityItem } from '../types';
import { isTaskOverdue } from './dateUtils';
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
export function taskMatchesCondition(
  task: Task,
  conditionStr: string,
  allTasks: Task[] = [],
  projects: Project[] = []
): boolean {
  if (typeof task === 'string' && typeof conditionStr === 'object') {
    const temp = task;
    task = conditionStr as unknown as Task;
    conditionStr = temp;
  }
  if (!conditionStr || typeof conditionStr !== 'string') return true;

  const cond = conditionStr.toLowerCase().trim();

  // 1. Always
  if (cond === 'always') {
    return true;
  }

  // 2. Status != Done
  if (cond.includes('status != done') || cond.includes('status is not done')) {
    return task.status !== 'Done';
  }

  // 3. Assignee is unassigned
  if (cond.includes('assignee is unassigned') || cond === 'unassigned') {
    return !task.assigneeId || task.assigneeId === 'unassigned' || task.assigneeId.trim() === '';
  }

  // 4. Priority == Urgent
  if (cond.includes('priority == urgent') || cond.includes('priority is urgent')) {
    return task.priority === 'Urgent';
  }

  // 5. Project == <Name/Key>
  if (cond.includes('project ==')) {
    const project = projects.find((p) => p.id === task.projectId);
    const targetNameMatch = cond.replace('project ==', '').trim();
    if (!project) return false;
    return (
      project.name.toLowerCase().includes(targetNameMatch) ||
      project.key.toLowerCase().includes(targetNameMatch)
    );
  }

  // 6. Subtasks completion < 100%
  if (cond.includes('subtasks completion < 100%')) {
    if (!task.subtasks || task.subtasks.length === 0) return false;
    return task.subtasks.some((s) => !s.completed);
  }

  // 7. All subtasks completed
  if (cond.includes('all subtasks completed')) {
    if (!task.subtasks || task.subtasks.length === 0) return false;
    return task.subtasks.every((s) => s.completed);
  }

  // 8. Urgent count > 3
  if (cond.includes('urgent count > 3')) {
    const projectUrgent = allTasks.filter(
      (t) => t.projectId === task.projectId && t.priority === 'Urgent' && t.status !== 'Done'
    ).length;
    return projectUrgent > 3;
  }

  // 9. DevOps / Infrastructure label
  if (cond.includes('devops') || cond.includes('infrastructure')) {
    return (task.labels || []).some((l) => {
      const lower = l.toLowerCase();
      return lower.includes('devops') || lower.includes('infra');
    });
  }

  // FAIL CLOSED: Return false for unknown, malformed, or unsupported condition semantics
  return false;
}

export function evaluateAutomationCondition(
  conditionStr: string,
  task: Task,
  allTasks: Task[] = [],
  projects: Project[] = []
): boolean {
  return taskMatchesCondition(task, conditionStr, allTasks, projects);
}

/**
 * Checks if a task event matches an automation rule's trigger.
 */
export function taskMatchesTrigger(
  rule: AutomationRule,
  event: AutomationEvent,
  referenceDate?: Date | string
): boolean {
  const tStr = rule.trigger.toLowerCase();

  if (event.type === 'DEADLINE_OVERDUE') {
    return tStr.includes('deadline') || tStr.includes('overdue');
  }

  if (event.type === 'PRIORITY_CHANGED') {
    if (tStr.includes('priority set to urgent') || tStr.includes('priority == urgent')) {
      return event.task.priority === 'Urgent';
    }
    return tStr.includes('priority');
  }

  if (event.type === 'STATUS_CHANGED') {
    if (tStr.includes('changes to done') || tStr.includes('to done')) {
      return event.task.status === 'Done';
    }
    if (tStr.includes('review')) {
      return event.task.status === 'Review' || (event.task.status as string) === 'In Review';
    }
    return tStr.includes('status');
  }

  if (event.type === 'TASK_CREATED') {
    if (tStr.includes('without assignee')) {
      return !event.task.assigneeId || event.task.assigneeId.trim() === '' || event.task.assigneeId === 'unassigned';
    }
    if (tStr.includes('security') || tStr.includes('compliance')) {
      return event.task.labels.some((l) => /security|compliance/i.test(l));
    }
    return tStr.includes('created') || tStr.includes('new task');
  }

  return false;
}

/**
 * Dry-run evaluation: returns the actual tasks in the workspace that match the rule without side effects.
 */
export function evaluateRuleDryRun(
  rule: AutomationRule,
  allTasks: Task[],
  projects: Project[],
  referenceDate?: Date | string
): Task[] {
  const triggerLower = rule.trigger.toLowerCase();

  return allTasks.filter((task) => {
    let triggerMatch = false;

    if (triggerLower.includes('deadline') || triggerLower.includes('overdue')) {
      triggerMatch = isTaskOverdue(task.dueDate, task.status, referenceDate);
    } else if (triggerLower.includes('urgent')) {
      triggerMatch = task.priority === 'Urgent';
    } else if (triggerLower.includes('review')) {
      triggerMatch = task.status === 'Review';
    } else if (triggerLower.includes('done')) {
      triggerMatch = task.status === 'Done';
    } else if (triggerLower.includes('without assignee')) {
      triggerMatch = !task.assigneeId || task.assigneeId.trim() === '' || task.assigneeId === 'unassigned';
    } else if (triggerLower.includes('security') || triggerLower.includes('compliance')) {
      triggerMatch = task.labels.some((l) => /security|compliance/i.test(l));
    } else {
      triggerMatch = true;
    }

    if (!triggerMatch) return false;

    return taskMatchesCondition(task, rule.condition, allTasks, projects);
  });
}

/**
 * Executes enabled automation rules against a workspace event with loop protection and mutation composition.
 */
export function processWorkspaceAutomation(
  rules: AutomationRule[],
  event: AutomationEvent,
  allTasks: Task[],
  projects: Project[],
  referenceDate?: Date | string,
  callDepth: number = 0,
  executedRuleIds: Set<string> = new Set()
): AutomationExecutionResult {
  const result: AutomationExecutionResult = {
    updatedTasks: [...allTasks],
    updatedProjects: [...projects],
    newNotifications: [],
    newActivities: [],
    triggeredRuleIds: [],
  };

  if (callDepth >= MAX_AUTOMATION_DEPTH) {
    return result;
  }

  const enabledRules = rules.filter((r) => r.enabled && !executedRuleIds.has(r.id));

  for (const rule of enabledRules) {
    if (!taskMatchesTrigger(rule, event, referenceDate)) {
      continue;
    }

    // Check condition against current task and updated state
    const currentTaskInState = result.updatedTasks.find((t) => t.id === event.task.id) || event.task;
    if (!taskMatchesCondition(currentTaskInState, rule.condition, result.updatedTasks, result.updatedProjects)) {
      continue;
    }

    // Rule matched! Record execution
    result.triggeredRuleIds.push(rule.id);
    executedRuleIds.add(rule.id);

    const actionOutcome = executeAutomationAction(
      rule.action,
      currentTaskInState,
      result.updatedTasks,
      result.updatedProjects,
      rule.name
    );

    result.updatedTasks = actionOutcome.updatedTasks;
    result.updatedProjects = actionOutcome.updatedProjects;
    result.newNotifications.push(...actionOutcome.notifications);
    result.newActivities.push(...actionOutcome.activities);
  }

  return result;
}

/**
 * Executes a single automation action string against state collections cleanly.
 */
export function executeAutomationAction(
  actionStr: string,
  task: Task,
  allTasks: Task[],
  projects: Project[],
  ruleName: string
): {
  updatedTasks: Task[];
  updatedProjects: Project[];
  notifications: Notification[];
  activities: ActivityItem[];
} {
  const actionLower = actionStr.toLowerCase();
  let updatedTasks = [...allTasks];
  let updatedProjects = [...projects];
  const notifications: Notification[] = [];
  const activities: ActivityItem[] = [];

  // Action 1: Set Priority = Urgent / Escalate to Urgent
  if (
    actionLower.includes('priority = urgent') ||
    actionLower.includes('escalate priority') ||
    actionLower.includes('set priority to urgent') ||
    actionLower === 'escalate to urgent'
  ) {
    updatedTasks = updatedTasks.map((t) =>
      t.id === task.id ? { ...t, priority: 'Urgent', updatedAt: new Date().toISOString() } : t
    );

    notifications.push({
      id: generateEntityId('notif'),
      title: 'Automation: Priority Escalation',
      message: `Task ${task.key} was automatically escalated to Urgent priority by rule "${ruleName}".`,
      category: 'System',
      timestamp: 'Just now',
      read: false,
      targetType: 'task',
      targetId: task.id,
    });

    activities.push({
      id: generateEntityId('act'),
      userId: 'system',
      action: `automatically escalated to Urgent by rule "${ruleName}"`,
      targetName: task.title,
      targetType: 'task',
      targetId: task.id,
      timestamp: 'Just now',
      projectId: task.projectId,
    });
  }

  // Action 2: Update Project Health = At Risk
  if (
    actionLower.includes('project health = at risk') ||
    actionLower.includes('health = at risk') ||
    actionLower.includes('health to at risk')
  ) {
    updatedProjects = updatedProjects.map((p) =>
      p.id === task.projectId ? { ...p, health: 'At Risk' } : p
    );

    notifications.push({
      id: generateEntityId('notif'),
      title: 'Project Health Alert',
      message: `Project health updated to At Risk due to critical blockers by automation rule "${ruleName}".`,
      category: 'Project updates',
      timestamp: 'Just now',
      read: false,
      targetType: 'project',
      targetId: task.projectId,
    });
  }

  // Action 3: Assign task to Alex Rivera
  if (
    actionLower.includes('assign task to alex rivera') ||
    actionLower.includes('assign to alex rivera')
  ) {
    updatedTasks = updatedTasks.map((t) =>
      t.id === task.id ? { ...t, assigneeId: 'user-1', updatedAt: new Date().toISOString() } : t
    );

    notifications.push({
      id: generateEntityId('notif'),
      title: 'Task Assigned',
      message: `Task ${task.key} was automatically assigned to Alex Rivera by rule "${ruleName}".`,
      category: 'Assignments',
      timestamp: 'Just now',
      read: false,
      targetType: 'task',
      targetId: task.id,
    });
  }

  // Action 4: Archive completed subtasks to audit history
  if (
    actionLower.includes('archive completed subtasks') ||
    actionLower.includes('archive subtasks')
  ) {
    const currentTask = updatedTasks.find((t) => t.id === task.id) || task;
    const activeSubs = currentTask.subtasks.filter((s) => !s.completed);
    const archivedCount = currentTask.subtasks.length - activeSubs.length;

    if (archivedCount > 0) {
      updatedTasks = updatedTasks.map((t) =>
        t.id === task.id ? { ...t, subtasks: activeSubs, updatedAt: new Date().toISOString() } : t
      );

      activities.push({
        id: generateEntityId('act'),
        userId: 'system',
        action: `archived ${archivedCount} completed subtask(s) via rule "${ruleName}"`,
        targetName: task.title,
        targetType: 'task',
        targetId: task.id,
        timestamp: 'Just now',
        projectId: task.projectId,
      });
    }
  }

  // Action 5: Dispatch Slack & email webhook (Honest local simulation)
  if (
    actionLower.includes('slack') ||
    actionLower.includes('webhook') ||
    actionLower.includes('dispatch webhook')
  ) {
    notifications.push({
      id: generateEntityId('notif'),
      title: 'Webhook Event Simulated',
      message: `External webhook simulated locally (audit logged) for task ${task.key}.`,
      category: 'System',
      timestamp: 'Just now',
      read: false,
      targetType: 'task',
      targetId: task.id,
    });

    activities.push({
      id: generateEntityId('act'),
      userId: 'system',
      action: `simulated webhook dispatch via rule "${ruleName}"`,
      targetName: task.title,
      targetType: 'task',
      targetId: task.id,
      timestamp: 'Just now',
      projectId: task.projectId,
    });
  }

  // Action 6: Review or generic notification
  if (
    actionLower.includes('assignment notification for elena') ||
    actionLower.includes('send review notification') ||
    actionLower.includes('notify tech lead') ||
    actionLower.startsWith('send notification') ||
    actionLower.startsWith('notify')
  ) {
    const customMessage = actionStr.includes(':')
      ? actionStr.substring(actionStr.indexOf(':') + 1).trim()
      : `Notification triggered for ${task.key} (${task.title}) via rule "${ruleName}".`;

    notifications.push({
      id: generateEntityId('notif'),
      title: actionLower.includes('review') ? 'Task Ready for Lead Review' : `Alert: ${ruleName}`,
      message: customMessage || `Elena Rostova was notified to review ${task.key} (${task.title}).`,
      category: 'Assignments',
      timestamp: 'Just now',
      read: false,
      targetType: 'task',
      targetId: task.id,
    });
  }

  return { updatedTasks, updatedProjects, notifications, activities };
}
