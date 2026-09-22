import { Task, Project, TeamMember, ProjectHealth } from '../types';
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
  currentHealth: ProjectHealth = 'On Track',
  referenceDate?: Date | string
): ProjectHealth {
  const projectTasks = tasks.filter((t) => t.projectId === projectId);
  if (projectTasks.length === 0) return currentHealth;

  const urgentUnresolved = projectTasks.filter(
    (t) => t.priority === 'Urgent' && t.status !== 'Done'
  ).length;

  const overdueUnresolved = projectTasks.filter(
    (t) => t.status !== 'Done' && isTaskOverdue(t.dueDate, t.status, referenceDate)
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

/**
 * High-performance O(T) single-pass or targeted incremental workspace metrics recomputation.
 * Replaces O(P * T + M * T) quadratic scans with linear O(T + P + M) aggregations,
 * or O(affected) micro-updates for single-task transitions.
 */
export function recomputeWorkspaceMetricsFast(
  tasks: Task[],
  projects: Project[],
  members: TeamMember[],
  affectedProjectIds?: string[],
  affectedMemberIds?: string[],
  referenceDate?: Date | string
): { projects: Project[]; members: TeamMember[] } {
  // Fast path: targeted incremental update for small affected entity sets (<= 5 entities)
  if (
    affectedProjectIds &&
    affectedProjectIds.length > 0 &&
    affectedProjectIds.length <= 5 &&
    affectedMemberIds &&
    affectedMemberIds.length <= 5
  ) {
    const updatedProjects = projects.map((p) => {
      if (!affectedProjectIds.includes(p.id)) return p;
      const progress = calculateProjectProgress(tasks, p.id);
      const health = calculateProjectHealth(tasks, p.id, p.health, referenceDate);
      return { ...p, progress, health };
    });

    const updatedMembers = members.map((m) => {
      if (!affectedMemberIds.includes(m.id)) return m;
      const workload = calculateMemberWorkload(tasks, m.id);
      return { ...m, workload };
    });

    return { projects: updatedProjects, members: updatedMembers };
  }

  // Linear O(T) single-pass aggregation across all tasks
  const projectStats = new Map<
    string,
    { total: number; done: number; urgentUnresolved: number; overdueUnresolved: number }
  >();
  const memberScores = new Map<string, number>();

  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];

    // 1. Tally Project stats
    let pStat = projectStats.get(t.projectId);
    if (!pStat) {
      pStat = { total: 0, done: 0, urgentUnresolved: 0, overdueUnresolved: 0 };
      projectStats.set(t.projectId, pStat);
    }
    pStat.total++;

    const isDone = t.status === 'Done';
    if (isDone) {
      pStat.done++;
    } else {
      if (t.priority === 'Urgent') pStat.urgentUnresolved++;
      if (isTaskOverdue(t.dueDate, t.status, referenceDate)) pStat.overdueUnresolved++;

      // 2. Tally Member Workload
      if (t.assigneeId && t.assigneeId !== 'unassigned') {
        let currentScore = memberScores.get(t.assigneeId) ?? 20; // 20 baseline availability
        if (t.priority === 'Urgent') currentScore += 24;
        else if (t.priority === 'High') currentScore += 18;
        else if (t.priority === 'Medium') currentScore += 12;
        else currentScore += 8;
        memberScores.set(t.assigneeId, currentScore);
      }
    }
  }

  // Update projects
  const updatedProjects = projects.map((p) => {
    if (affectedProjectIds && !affectedProjectIds.includes(p.id)) return p;
    const stat = projectStats.get(p.id);
    if (!stat || stat.total === 0) {
      return { ...p, progress: 0, health: 'On Track' as const };
    }
    const progress = Math.round((stat.done / stat.total) * 100);
    let health: ProjectHealth = 'On Track';
    if (stat.urgentUnresolved >= 3 || stat.overdueUnresolved >= 2) {
      health = 'Delayed';
    } else if (stat.urgentUnresolved >= 1 || stat.overdueUnresolved >= 1) {
      health = 'At Risk';
    }
    return { ...p, progress, health };
  });

  // Update members
  const updatedMembers = members.map((m) => {
    if (affectedMemberIds && !affectedMemberIds.includes(m.id)) return m;
    const rawScore = memberScores.get(m.id) ?? 20;
    const workload = Math.min(100, rawScore);
    return { ...m, workload };
  });

  return { projects: updatedProjects, members: updatedMembers };
}
