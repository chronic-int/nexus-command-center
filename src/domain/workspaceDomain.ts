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
import { getNextTaskKey, generateEntityId, generateUniqueProjectKey } from '../utils/idGenerator';
import { getTodayString, isTaskOverdue } from '../utils/dateUtils';
import {
  calculateProjectProgress,
  calculateProjectHealth,
  calculateMemberWorkload,
  recomputeWorkspaceMetricsFast,
} from '../utils/metrics';
import {
  processWorkspaceAutomation,
  AutomationEvent,
} from '../utils/automationEngine';

export const MAX_ACTIVITIES_RETAINED = 5000;
export const MAX_NOTIFICATIONS_RETAINED = 2000;

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
 * Uses O(affected) fast incremental recomputation or O(T) single-pass linear scans.
 * Fully backwards-compatible with existing callers.
 */
export function recomputeWorkspaceMetrics(
  state: WorkspaceState,
  affectedProjectIds?: string[],
  affectedMemberIdsOrRefDate?: string[] | Date | string,
  referenceDate?: Date | string
): WorkspaceState {
  let memberIds: string[] | undefined;
  let refDate: Date | string | undefined = referenceDate;

  if (typeof affectedMemberIdsOrRefDate === 'string' || affectedMemberIdsOrRefDate instanceof Date) {
    refDate = affectedMemberIdsOrRefDate;
    memberIds = undefined;
  } else if (Array.isArray(affectedMemberIdsOrRefDate)) {
    memberIds = affectedMemberIdsOrRefDate;
  }

  const { projects, members } = recomputeWorkspaceMetricsFast(
    state.tasks,
    state.projects,
    state.members,
    affectedProjectIds,
    memberIds,
    refDate
  );

  return {
    ...state,
    projects,
    members,
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
    notifications: [...result.newNotifications, ...state.notifications].slice(0, MAX_NOTIFICATIONS_RETAINED),
    activities: [...result.newActivities, ...state.activities].slice(0, MAX_ACTIVITIES_RETAINED),
    automations: updatedAutomations,
  };

  // Recompute relational metrics if tasks or projects changed
  nextState = recomputeWorkspaceMetrics(nextState, undefined, undefined, referenceDate);
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
    activities: [newActivity, ...state.activities].slice(0, MAX_ACTIVITIES_RETAINED),
  };

  nextState = recomputeWorkspaceMetrics(
    nextState,
    [newTask.projectId],
    newTask.assigneeId ? [newTask.assigneeId] : undefined,
    referenceDate
  );

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

  const affectedMemberIds: string[] = [];
  if (previousTask.assigneeId) affectedMemberIds.push(previousTask.assigneeId);
  if (updatedTask.assigneeId && updatedTask.assigneeId !== previousTask.assigneeId) {
    affectedMemberIds.push(updatedTask.assigneeId);
  }

  let nextState: WorkspaceState = {
    ...state,
    tasks: nextTasks,
  };

  nextState = recomputeWorkspaceMetrics(nextState, affectedProjectIds, affectedMemberIds, referenceDate);

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
    activities: [newActivity, ...state.activities].slice(0, MAX_ACTIVITIES_RETAINED),
  };

  nextState = recomputeWorkspaceMetrics(
    nextState,
    [updatedTask.projectId],
    updatedTask.assigneeId ? [updatedTask.assigneeId] : undefined,
    referenceDate
  );

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
    activities: [newActivity, ...state.activities].slice(0, MAX_ACTIVITIES_RETAINED),
  };

  // Both previous and new project must have metrics recalculated
  nextState = recomputeWorkspaceMetrics(
    nextState,
    [previousTask.projectId, newProjectId],
    updatedTask.assigneeId ? [updatedTask.assigneeId] : undefined,
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

  nextState = recomputeWorkspaceMetrics(
    nextState,
    [target.projectId],
    target.assigneeId ? [target.assigneeId] : undefined,
    referenceDate
  );
  return { state: nextState, deletedTask: target };
}

/**
 * Pure domain operation: Restore / Undo Deleted Task
 * Restores the exact entity identity, keys, timestamps, subtasks, and comments without firing creation automations.
 */
export function restoreTaskOp(
  state: WorkspaceState,
  taskToRestore: Task,
  referenceDate?: Date | string
): { state: WorkspaceState; restoredTask: Task } {
  // If task already exists in state, idempotent return
  if (state.tasks.some((t) => t.id === taskToRestore.id)) {
    return { state, restoredTask: taskToRestore };
  }

  // 1. Verify project existence. If original project was deleted in the interim,
  // reassign task to the first available project.
  let targetProjectId = taskToRestore.projectId;
  const projectExists = state.projects.some((p) => p.id === targetProjectId);
  if (!projectExists && state.projects.length > 0) {
    targetProjectId = state.projects[0].id;
  }

  const project = state.projects.find((p) => p.id === targetProjectId);
  const projectKey = project ? project.key : 'NEX';

  // 2. Verify key uniqueness. If another task claimed this key while deleted,
  // allocate the next monotonic unique key to eliminate collisions.
  let targetKey = taskToRestore.key;
  if (state.tasks.some((t) => t.key === targetKey)) {
    targetKey = getNextTaskKey(projectKey, state.tasks);
  }

  const restoredTask: Task = {
    ...taskToRestore,
    projectId: targetProjectId,
    key: targetKey,
  };

  const restorationActivity: ActivityItem = {
    id: generateEntityId('act'),
    userId: 'user-1',
    action: 'restored deleted task',
    targetName: restoredTask.title,
    targetType: 'task',
    targetId: restoredTask.id,
    timestamp: 'Just now',
    projectId: restoredTask.projectId,
  };

  let nextState: WorkspaceState = {
    ...state,
    tasks: [restoredTask, ...state.tasks],
    activities: [restorationActivity, ...state.activities].slice(0, MAX_ACTIVITIES_RETAINED),
  };

  nextState = recomputeWorkspaceMetrics(
    nextState,
    [restoredTask.projectId],
    restoredTask.assigneeId ? [restoredTask.assigneeId] : undefined,
    referenceDate
  );
  return { state: nextState, restoredTask };
}

/**
 * Pure domain operation: Bulk Update Tasks
 */
export function bulkUpdateTasksOp(
  state: WorkspaceState,
  taskIds: string[],
  updates: Partial<Task>,
  referenceDate?: Date | string
): { state: WorkspaceState; updatedTasks: Task[] } {
  if (taskIds.length === 0) {
    return { state, updatedTasks: [] };
  }

  const targetIdSet = new Set(taskIds);
  const now = referenceDate ? new Date(referenceDate).toISOString() : new Date().toISOString();
  const affectedProjectIds = new Set<string>();
  const affectedMemberIds = new Set<string>();
  const updatedTasks: Task[] = [];
  const statusChangedPairs: Array<{ updated: Task; previous: Task }> = [];
  const priorityChangedPairs: Array<{ updated: Task; previous: Task }> = [];

  const nextTasks = state.tasks.map((task) => {
    if (!targetIdSet.has(task.id)) {
      return task;
    }

    const updatedTask: Task = {
      ...task,
      ...updates,
      updatedAt: now,
    };

    affectedProjectIds.add(task.projectId);
    if (updatedTask.projectId !== task.projectId) {
      affectedProjectIds.add(updatedTask.projectId);
    }
    if (task.assigneeId) affectedMemberIds.add(task.assigneeId);
    if (updatedTask.assigneeId) affectedMemberIds.add(updatedTask.assigneeId);

    if (updates.status && updates.status !== task.status) {
      statusChangedPairs.push({ updated: updatedTask, previous: task });
    }
    if (updates.priority && updates.priority !== task.priority) {
      priorityChangedPairs.push({ updated: updatedTask, previous: task });
    }

    updatedTasks.push(updatedTask);
    return updatedTask;
  });

  if (updatedTasks.length === 0) {
    return { state, updatedTasks: [] };
  }

  const activity: ActivityItem = {
    id: generateEntityId('act'),
    userId: 'user-1',
    action: `bulk updated ${updatedTasks.length} tasks`,
    targetName: `${updatedTasks.length} tasks`,
    targetType: 'task',
    targetId: updatedTasks[0]?.id || 'bulk-task',
    timestamp: 'Just now',
  };

  let nextState: WorkspaceState = {
    ...state,
    tasks: nextTasks,
    activities: [activity, ...state.activities].slice(0, MAX_ACTIVITIES_RETAINED),
  };

  // Recompute metrics for affected projects & members
  nextState = recomputeWorkspaceMetrics(
    nextState,
    Array.from(affectedProjectIds),
    Array.from(affectedMemberIds),
    referenceDate
  );

  // Apply automations for status / priority changes
  for (const pair of statusChangedPairs) {
    nextState = applyAutomationEvent(
      nextState,
      { type: 'STATUS_CHANGED', task: pair.updated, previousTask: pair.previous },
      referenceDate
    );
  }
  for (const pair of priorityChangedPairs) {
    nextState = applyAutomationEvent(
      nextState,
      { type: 'PRIORITY_CHANGED', task: pair.updated, previousTask: pair.previous },
      referenceDate
    );
  }

  return { state: nextState, updatedTasks };
}

/**
 * Pure domain operation: Bulk Delete Tasks with Cascading Notification Cleanup
 */
export function bulkDeleteTasksOp(
  state: WorkspaceState,
  taskIds: string[],
  referenceDate?: Date | string
): { state: WorkspaceState; deletedTasks: Task[] } {
  if (taskIds.length === 0) {
    return { state, deletedTasks: [] };
  }

  const targetIdSet = new Set(taskIds);
  const deletedTasks: Task[] = [];
  const affectedProjectIds = new Set<string>();
  const affectedMemberIds = new Set<string>();

  const nextTasks: Task[] = [];
  for (let i = 0; i < state.tasks.length; i++) {
    const t = state.tasks[i];
    if (targetIdSet.has(t.id)) {
      deletedTasks.push(t);
      affectedProjectIds.add(t.projectId);
      if (t.assigneeId) affectedMemberIds.add(t.assigneeId);
    } else {
      nextTasks.push(t);
    }
  }

  if (deletedTasks.length === 0) {
    return { state, deletedTasks: [] };
  }

  const nextNotifications = state.notifications.filter(
    (n) => !n.targetId || !targetIdSet.has(n.targetId)
  );

  const activity: ActivityItem = {
    id: generateEntityId('act'),
    userId: 'user-1',
    action: `bulk deleted ${deletedTasks.length} tasks`,
    targetName: `${deletedTasks.length} tasks`,
    targetType: 'task',
    targetId: deletedTasks[0]?.id || 'bulk-task',
    timestamp: 'Just now',
  };

  let nextState: WorkspaceState = {
    ...state,
    tasks: nextTasks,
    notifications: nextNotifications,
    activities: [activity, ...state.activities].slice(0, MAX_ACTIVITIES_RETAINED),
  };

  nextState = recomputeWorkspaceMetrics(
    nextState,
    Array.from(affectedProjectIds),
    Array.from(affectedMemberIds),
    referenceDate
  );

  return { state: nextState, deletedTasks };
}

/**
 * Pure domain operation: Bulk Restore Tasks
 */
export function bulkRestoreTasksOp(
  state: WorkspaceState,
  tasksToRestore: Task[],
  referenceDate?: Date | string
): { state: WorkspaceState; restoredTasks: Task[] } {
  if (tasksToRestore.length === 0) {
    return { state, restoredTasks: [] };
  }

  const existingIds = new Set(state.tasks.map((t) => t.id));
  const existingKeys = new Set(state.tasks.map((t) => t.key));
  const validProjectIds = new Set(state.projects.map((p) => p.id));
  const fallbackProjectId = state.projects[0]?.id || 'proj-1';
  const projectMap = new Map(state.projects.map((p) => [p.id, p]));

  const restoredTasks: Task[] = [];
  const affectedProjectIds = new Set<string>();
  const affectedMemberIds = new Set<string>();

  for (const task of tasksToRestore) {
    if (existingIds.has(task.id)) continue;

    let targetProjectId = task.projectId;
    if (!validProjectIds.has(targetProjectId)) {
      targetProjectId = fallbackProjectId;
    }

    let targetKey = task.key;
    if (existingKeys.has(targetKey)) {
      const p = projectMap.get(targetProjectId);
      const pKey = p?.key || 'NEX';
      targetKey = getNextTaskKey(pKey, [...state.tasks, ...restoredTasks]);
    }
    existingKeys.add(targetKey);

    const restored: Task = {
      ...task,
      projectId: targetProjectId,
      key: targetKey,
    };

    restoredTasks.push(restored);
    affectedProjectIds.add(restored.projectId);
    if (restored.assigneeId) affectedMemberIds.add(restored.assigneeId);
  }

  if (restoredTasks.length === 0) {
    return { state, restoredTasks: [] };
  }

  const activity: ActivityItem = {
    id: generateEntityId('act'),
    userId: 'user-1',
    action: `restored ${restoredTasks.length} deleted tasks`,
    targetName: `${restoredTasks.length} tasks`,
    targetType: 'task',
    targetId: restoredTasks[0]?.id || 'bulk-task',
    timestamp: 'Just now',
  };

  let nextState: WorkspaceState = {
    ...state,
    tasks: [...restoredTasks, ...state.tasks],
    activities: [activity, ...state.activities].slice(0, MAX_ACTIVITIES_RETAINED),
  };

  nextState = recomputeWorkspaceMetrics(
    nextState,
    Array.from(affectedProjectIds),
    Array.from(affectedMemberIds),
    referenceDate
  );

  return { state: nextState, restoredTasks };
}

/**
 * Pure domain operation: Create Project
 */
export function createProjectOp(
  state: WorkspaceState,
  data: Partial<Project>,
  referenceDate?: Date | string
): { state: WorkspaceState; project: Project } {
  const key = generateUniqueProjectKey(data.key, state.projects);
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
    activities: [newActivity, ...state.activities].slice(0, MAX_ACTIVITIES_RETAINED),
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
    notifications: nextNotifications.slice(0, MAX_NOTIFICATIONS_RETAINED),
    activities: nextActivities.slice(0, MAX_ACTIVITIES_RETAINED),
  };

  // Recompute member workloads since assigned tasks were removed (full fast O(T) pass)
  nextState = recomputeWorkspaceMetrics(nextState, undefined, undefined, referenceDate);
  return { state: nextState, deletedProject: target };
}

/**
 * Pure domain operation: Evaluate Overdue Tasks and fire automations idempotently.
 * Batches overdue tasks in a single pass and performs a single metric recomputation pass at the end.
 */
export function evaluateOverdueTasksOp(
  state: WorkspaceState,
  referenceDate?: Date | string
): { state: WorkspaceState; triggeredCount: number } {
  const overdueTasks: Task[] = [];
  const affectedProjectIds = new Set<string>();
  const affectedMemberIds = new Set<string>();
  const now = referenceDate ? new Date(referenceDate).toISOString() : new Date().toISOString();

  // 1. Identify all overdue tasks in a single pass
  for (let i = 0; i < state.tasks.length; i++) {
    const task = state.tasks[i];
    if (
      task.status !== 'Done' &&
      isTaskOverdue(task.dueDate, task.status, referenceDate) &&
      task.lastOverdueHandledDeadline !== task.dueDate
    ) {
      overdueTasks.push(task);
      affectedProjectIds.add(task.projectId);
      if (task.assigneeId) affectedMemberIds.add(task.assigneeId);
    }
  }

  if (overdueTasks.length === 0) {
    return { state, triggeredCount: 0 };
  }

  const updatedTasksMap = new Map<string, Task>();
  for (const task of overdueTasks) {
    updatedTasksMap.set(task.id, {
      ...task,
      lastOverdueHandledDeadline: task.dueDate,
      updatedAt: now,
    });
  }

  let nextTasks = state.tasks.map((t) => updatedTasksMap.get(t.id) || t);
  let nextProjects = state.projects;
  let nextNotifications = state.notifications;
  let nextActivities = state.activities;
  let nextAutomations = state.automations;
  let triggeredCount = 0;

  // 2. Process automations with batch composition
  for (const task of overdueTasks) {
    const updatedTask = updatedTasksMap.get(task.id)!;
    const result = processWorkspaceAutomation(
      nextAutomations,
      { type: 'DEADLINE_OVERDUE', task: updatedTask },
      nextTasks,
      nextProjects,
      referenceDate
    );

    if (result.triggeredRuleIds.length > 0) {
      triggeredCount++;
      nextTasks = result.updatedTasks;
      nextProjects = result.updatedProjects;
      nextNotifications = [...result.newNotifications, ...nextNotifications].slice(0, MAX_NOTIFICATIONS_RETAINED);
      nextActivities = [...result.newActivities, ...nextActivities].slice(0, MAX_ACTIVITIES_RETAINED);
      nextAutomations = nextAutomations.map((r) =>
        result.triggeredRuleIds.includes(r.id) ? { ...r, lastTriggered: 'Just now' } : r
      );
    }
  }

  let nextState: WorkspaceState = {
    ...state,
    tasks: nextTasks,
    projects: nextProjects,
    notifications: nextNotifications,
    activities: nextActivities,
    automations: nextAutomations,
  };

  // 3. Recompute metrics ONCE at the end for affected projects & members
  nextState = recomputeWorkspaceMetrics(
    nextState,
    Array.from(affectedProjectIds),
    Array.from(affectedMemberIds),
    referenceDate
  );

  return { state: nextState, triggeredCount };
}
