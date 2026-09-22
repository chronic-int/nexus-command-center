import {
  Task,
  Project,
  TeamMember,
  PendingInvitation,
  Document,
  Notification,
  AutomationRule,
  ActivityItem,
  TaskStatus,
} from '../types';
import { getNextTaskKey, generateEntityId } from '../utils/idGenerator';
import { getTodayString, isTaskOverdue } from '../utils/dateUtils';
import {
  calculateProjectProgress,
  calculateProjectHealth,
  calculateMemberWorkload,
} from '../utils/metrics';
import {
  processWorkspaceAutomation,
  AutomationEvent,
} from '../utils/automationEngine';

export interface WorkspaceState {
  projects: Project[];
  tasks: Task[];
  members: TeamMember[];
  pendingInvitations: PendingInvitation[];
  documents: Document[];
  notifications: Notification[];
  automations: AutomationRule[];
  activities: ActivityItem[];
}

/**
 * Recomputes derived project progress, project health, and member workloads.
 * Returns a new immutably updated WorkspaceState.
 */
export function recomputeWorkspaceMetrics(
  state: WorkspaceState,
  affectedProjectIds?: string[],
  referenceDate?: Date | string
): WorkspaceState {
  const updatedProjects = state.projects.map((p) => {
    if (affectedProjectIds && !affectedProjectIds.includes(p.id)) {
      return p;
    }
    const progress = calculateProjectProgress(state.tasks, p.id);
    const health = calculateProjectHealth(state.tasks, p.id, p.health, referenceDate);
    return { ...p, progress, health };
  });

  const updatedMembers = state.members.map((m) => {
    const workload = calculateMemberWorkload(state.tasks, m.id);
    return { ...m, workload };
  });

  return {
    ...state,
    projects: updatedProjects,
    members: updatedMembers,
  };
}

/**
 * Applies an automation event to the state, composing updates to tasks, projects,
 * notifications, activities, and rule lastTriggered metadata.
 */
export function applyAutomationEvent(
  state: WorkspaceState,
  event: AutomationEvent,
  referenceDate?: Date | string
): WorkspaceState {
  const result = processWorkspaceAutomation(
    state.automations,
    event,
    state.tasks,
    state.projects,
    referenceDate
  );

  if (result.triggeredRuleIds.length === 0) {
    return state;
  }

  const updatedAutomations = state.automations.map((r) =>
    result.triggeredRuleIds.includes(r.id)
      ? { ...r, lastTriggered: 'Just now' }
      : r
  );

  let nextState: WorkspaceState = {
    ...state,
    tasks: result.updatedTasks,
    projects: result.updatedProjects,
    notifications: [...result.newNotifications, ...state.notifications],
    activities: [...result.newActivities, ...state.activities],
    automations: updatedAutomations,
  };

  // Recompute relational metrics if tasks or projects changed
  nextState = recomputeWorkspaceMetrics(nextState, undefined, referenceDate);
  return nextState;
}

/**
 * Pure domain operation: Create Task
 */
export function createTaskOp(
  state: WorkspaceState,
  data: Partial<Task>,
  referenceDate?: Date | string
): { state: WorkspaceState; task: Task } {
  const project = state.projects.find((p) => p.id === data.projectId) || state.projects[0];
  const projectKey = project?.key || 'TSK';
  const key = getNextTaskKey(projectKey, state.tasks);
  const now = referenceDate ? new Date(referenceDate).toISOString() : new Date().toISOString();
  const todayStr = getTodayString(referenceDate);

  const newTask: Task = {
    id: generateEntityId('task'),
    key,
    title: data.title?.trim() || 'Untitled Task',
    description: data.description?.trim() || '',
    status: data.status || 'Todo',
    priority: data.priority || 'Medium',
    projectId: project ? project.id : 'proj-1',
    assigneeId: data.assigneeId || (state.members[0]?.id || 'user-1'),
    dueDate: data.dueDate || todayStr,
    startDate: data.startDate || todayStr,
    estimatedHours: data.estimatedHours || 4,
    labels: data.labels && data.labels.length > 0 ? data.labels : ['Core'],
    subtasks: data.subtasks || [],
    comments: data.comments || [],
    attachments: data.attachments || [],
    createdAt: now,
    updatedAt: now,
  };

  const newActivity: ActivityItem = {
    id: generateEntityId('act'),
    userId: 'user-1',
    action: 'created task',
    targetName: newTask.title,
    targetType: 'task',
    targetId: newTask.id,
    timestamp: 'Just now',
    projectId: newTask.projectId,
  };

  let nextState: WorkspaceState = {
    ...state,
    tasks: [newTask, ...state.tasks],
    activities: [newActivity, ...state.activities],
  };

  nextState = recomputeWorkspaceMetrics(nextState, [newTask.projectId], referenceDate);

  // Trigger automation on newly composed state
  nextState = applyAutomationEvent(nextState, { type: 'TASK_CREATED', task: newTask }, referenceDate);

  const finalTask = nextState.tasks.find((t) => t.id === newTask.id) || newTask;
  return { state: nextState, task: finalTask };
}

/**
 * Pure domain operation: Update Task (with safe state composition)
 */
export function updateTaskOp(
  state: WorkspaceState,
  taskId: string,
  updates: Partial<Task>,
  referenceDate?: Date | string
): { state: WorkspaceState; task: Task | null } {
  const previousTask = state.tasks.find((t) => t.id === taskId);
  if (!previousTask) {
    return { state, task: null };
  }

  const now = referenceDate ? new Date(referenceDate).toISOString() : new Date().toISOString();
  const updatedTask: Task = {
    ...previousTask,
    ...updates,
    updatedAt: now,
  };

  const nextTasks = state.tasks.map((t) => (t.id === taskId ? updatedTask : t));

  const affectedProjectIds = [previousTask.projectId];
  if (updatedTask.projectId !== previousTask.projectId) {
    affectedProjectIds.push(updatedTask.projectId);
  }

  let nextState: WorkspaceState = {
    ...state,
    tasks: nextTasks,
  };

  nextState = recomputeWorkspaceMetrics(nextState, affectedProjectIds, referenceDate);

  // Check automation triggers
  if (updates.priority && updates.priority !== previousTask.priority) {
    nextState = applyAutomationEvent(
      nextState,
      { type: 'PRIORITY_CHANGED', task: updatedTask, previousTask },
      referenceDate
    );
  } else if (updates.status && updates.status !== previousTask.status) {
    nextState = applyAutomationEvent(
      nextState,
      { type: 'STATUS_CHANGED', task: updatedTask, previousTask },
      referenceDate
    );
  }

  const finalTask = nextState.tasks.find((t) => t.id === taskId) || updatedTask;
  return { state: nextState, task: finalTask };
}

/**
 * Pure domain operation: Move Task Status
 */
export function moveTaskStatusOp(
  state: WorkspaceState,
  taskId: string,
  newStatus: TaskStatus,
  referenceDate?: Date | string
): { state: WorkspaceState; task: Task | null } {
  const previousTask = state.tasks.find((t) => t.id === taskId);
  if (!previousTask || previousTask.status === newStatus) {
    return { state, task: previousTask || null };
  }

  const now = referenceDate ? new Date(referenceDate).toISOString() : new Date().toISOString();
  const updatedTask: Task = {
    ...previousTask,
    status: newStatus,
    updatedAt: now,
  };

  const nextTasks = state.tasks.map((t) => (t.id === taskId ? updatedTask : t));

  const newActivity: ActivityItem = {
    id: generateEntityId('act'),
    userId: 'user-1',
    action: `moved task to ${newStatus}`,
    targetName: updatedTask.title,
    targetType: 'task',
    targetId: updatedTask.id,
    timestamp: 'Just now',
    projectId: updatedTask.projectId,
  };

  let nextState: WorkspaceState = {
    ...state,
    tasks: nextTasks,
    activities: [newActivity, ...state.activities],
  };

  nextState = recomputeWorkspaceMetrics(nextState, [updatedTask.projectId], referenceDate);

  // Trigger automation
  nextState = applyAutomationEvent(
    nextState,
    { type: 'STATUS_CHANGED', task: updatedTask, previousTask },
    referenceDate
  );

  const finalTask = nextState.tasks.find((t) => t.id === taskId) || updatedTask;
  return { state: nextState, task: finalTask };
}

/**
 * Pure domain operation: Move Task Project
 */
export function moveTaskProjectOp(
  state: WorkspaceState,
  taskId: string,
  newProjectId: string,
  referenceDate?: Date | string
): { state: WorkspaceState; task: Task | null } {
  const previousTask = state.tasks.find((t) => t.id === taskId);
  const targetProject = state.projects.find((p) => p.id === newProjectId);

  if (!previousTask || !targetProject || previousTask.projectId === newProjectId) {
    return { state, task: previousTask || null };
  }

  const now = referenceDate ? new Date(referenceDate).toISOString() : new Date().toISOString();
  const updatedTask: Task = {
    ...previousTask,
    projectId: newProjectId,
    updatedAt: now,
  };

  const nextTasks = state.tasks.map((t) => (t.id === taskId ? updatedTask : t));

  const newActivity: ActivityItem = {
    id: generateEntityId('act'),
    userId: 'user-1',
    action: `moved task to project ${targetProject.name}`,
    targetName: updatedTask.title,
    targetType: 'task',
    targetId: updatedTask.id,
    timestamp: 'Just now',
    projectId: newProjectId,
  };

  let nextState: WorkspaceState = {
    ...state,
    tasks: nextTasks,
    activities: [newActivity, ...state.activities],
  };

  // Both previous and new project must have metrics recalculated
  nextState = recomputeWorkspaceMetrics(
    nextState,
    [previousTask.projectId, newProjectId],
    referenceDate
  );

  const finalTask = nextState.tasks.find((t) => t.id === taskId) || updatedTask;
  return { state: nextState, task: finalTask };
}

/**
 * Pure domain operation: Delete Task
 */
export function deleteTaskOp(
  state: WorkspaceState,
  taskId: string,
  referenceDate?: Date | string
): { state: WorkspaceState; deletedTask: Task | null } {
  const target = state.tasks.find((t) => t.id === taskId);
  if (!target) {
    return { state, deletedTask: null };
  }

  const nextTasks = state.tasks.filter((t) => t.id !== taskId);
  const nextNotifications = state.notifications.filter((n) => n.targetId !== taskId);

  let nextState: WorkspaceState = {
    ...state,
    tasks: nextTasks,
    notifications: nextNotifications,
  };

  nextState = recomputeWorkspaceMetrics(nextState, [target.projectId], referenceDate);
  return { state: nextState, deletedTask: target };
}

/**
 * Pure domain operation: Create Project
 */
export function createProjectOp(
  state: WorkspaceState,
  data: Partial<Project>,
  referenceDate?: Date | string
): { state: WorkspaceState; project: Project } {
  const key = data.key?.toUpperCase().trim() || `PRJ-${state.projects.length + 1}`;
  const todayStr = getTodayString(referenceDate);

  const newProject: Project = {
    id: generateEntityId('proj'),
    key,
    name: data.name?.trim() || 'Untitled Project',
    description: data.description?.trim() || '',
    category: data.category || 'Core Infrastructure',
    health: 'On Track',
    progress: 0,
    deadline: data.deadline || todayStr,
    startDate: data.startDate || todayStr,
    leadId: data.leadId || (state.members[0]?.id || 'user-1'),
    memberIds: data.memberIds || [state.members[0]?.id || 'user-1'],
    color: data.color || '#6366f1',
    tags: data.tags || ['Active'],
  };

  const newActivity: ActivityItem = {
    id: generateEntityId('act'),
    userId: 'user-1',
    action: 'created project',
    targetName: newProject.name,
    targetType: 'project',
    targetId: newProject.id,
    timestamp: 'Just now',
    projectId: newProject.id,
  };

  const nextState: WorkspaceState = {
    ...state,
    projects: [newProject, ...state.projects],
    activities: [newActivity, ...state.activities],
  };

  return { state: nextState, project: newProject };
}

/**
 * Pure domain operation: Delete Project with Cascading Relational Cleanup
 */
export function deleteProjectCascadeOp(
  state: WorkspaceState,
  projectId: string,
  referenceDate?: Date | string
): { state: WorkspaceState; deletedProject: Project | null } {
  const target = state.projects.find((p) => p.id === projectId);
  if (!target) {
    return { state, deletedProject: null };
  }

  // Find all task IDs belonging to this project
  const projectTaskIds = new Set(state.tasks.filter((t) => t.projectId === projectId).map((t) => t.id));

  const nextProjects = state.projects.filter((p) => p.id !== projectId);
  const nextTasks = state.tasks.filter((t) => t.projectId !== projectId);
  const nextDocuments = state.documents.filter((d) => d.projectId !== projectId);

  // Clean notifications targeting the deleted project or its tasks
  const nextNotifications = state.notifications.filter(
    (n) => n.targetId !== projectId && !(n.targetId && projectTaskIds.has(n.targetId))
  );

  // Detach project reference from historical activities so they remain understandable
  const nextActivities = state.activities.map((act) =>
    act.projectId === projectId
      ? { ...act, projectId: undefined, targetName: `${act.targetName} (Archived ${target.key})` }
      : act
  );

  let nextState: WorkspaceState = {
    ...state,
    projects: nextProjects,
    tasks: nextTasks,
    documents: nextDocuments,
    notifications: nextNotifications,
    activities: nextActivities,
  };

  // Recompute member workloads since assigned tasks were removed
  nextState = recomputeWorkspaceMetrics(nextState, undefined, referenceDate);
  return { state: nextState, deletedProject: target };
}

/**
 * Pure domain operation: Evaluate Overdue Tasks and fire automations
 */
export function evaluateOverdueTasksOp(
  state: WorkspaceState,
  referenceDate?: Date | string
): { state: WorkspaceState; triggeredCount: number } {
  let currentState = state;
  let triggeredCount = 0;

  for (const task of currentState.tasks) {
    if (task.status !== 'Done' && isTaskOverdue(task.dueDate, task.status, referenceDate)) {
      const beforeRules = currentState.automations;
      currentState = applyAutomationEvent(
        currentState,
        { type: 'DEADLINE_OVERDUE', task },
        referenceDate
      );
      triggeredCount++;
    }
  }

  return { state: currentState, triggeredCount };
}
