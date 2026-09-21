import { Task, ProjectHealth } from '../types';
import { isTaskOverdue } from './dateUtils';

/**
 * Calculates project completion percentage deterministically from associated tasks.
 */
export function calculateProjectProgress(tasks: Task[], projectId: string): number {
  const projectTasks = tasks.filter((t) => t.projectId === projectId);
  if (projectTasks.length === 0) return 0;
  const doneTasks = projectTasks.filter((t) => t.status === 'Done').length;
  return Math.round((doneTasks / projectTasks.length) * 100);
}

/**
 * Evaluates project health based on unresolved urgent tasks and overdue tasks.
 */
export function calculateProjectHealth(
  tasks: Task[],
  projectId: string,
  currentHealth: ProjectHealth = 'On Track'
): ProjectHealth {
  const projectTasks = tasks.filter((t) => t.projectId === projectId);
  if (projectTasks.length === 0) return currentHealth;

  const urgentUnresolved = projectTasks.filter(
    (t) => t.priority === 'Urgent' && t.status !== 'Done'
  ).length;

  const overdueUnresolved = projectTasks.filter(
    (t) => t.status !== 'Done' && isTaskOverdue(t.dueDate, t.status)
  ).length;

  if (urgentUnresolved >= 3 || overdueUnresolved >= 2) {
    return 'Delayed';
  }
  if (urgentUnresolved >= 1 || overdueUnresolved >= 1) {
    return 'At Risk';
  }
  return 'On Track';
}

/**
 * Calculates an engineer's capacity utilization (0-100%) based on assigned active tasks and complexity.
 */
export function calculateMemberWorkload(tasks: Task[], memberId: string): number {
  const assignedActive = tasks.filter(
    (t) => t.assigneeId === memberId && t.status !== 'Done'
  );

  let score = 20; // baseline availability overhead
  for (const t of assignedActive) {
    if (t.priority === 'Urgent') score += 24;
    else if (t.priority === 'High') score += 18;
    else if (t.priority === 'Medium') score += 12;
    else score += 8;
  }

  return Math.min(100, score);
}

/**
 * Calculates average cycle time in days for completed tasks.
 */
export function calculateAverageCycleTimeDays(tasks: Task[]): number {
  const completedWithDates = tasks.filter(
    (t) => t.status === 'Done' && t.startDate && t.updatedAt
  );

  if (completedWithDates.length === 0) return 3.2;

  const totalDays = completedWithDates.reduce((acc, t) => {
    const start = new Date(t.startDate!).getTime();
    const end = new Date(t.updatedAt).getTime();
    const days = Math.max(1, (end - start) / (1000 * 60 * 60 * 24));
    return acc + days;
  }, 0);

  return Math.round((totalDays / completedWithDates.length) * 10) / 10;
}
