/**
 * Immutable historical telemetry records for engineering velocity, burnup, and throughput.
 * These records represent frozen past intervals that NEVER rewrite history when live tasks
 * change in the workspace today.
 */

export interface TelemetryPoint {
  sprint: string;
  planned: number;
  completed: number;
  isLive?: boolean;
}

export const FROZEN_WEEK_HISTORICAL: ReadonlyArray<TelemetryPoint> = Object.freeze([
  { sprint: 'Mon', planned: 38, completed: 8 },
  { sprint: 'Tue', planned: 40, completed: 14 },
  { sprint: 'Wed', planned: 42, completed: 21 },
  { sprint: 'Thu', planned: 45, completed: 27 },
  { sprint: 'Fri', planned: 46, completed: 33 },
]);

export const FROZEN_MONTH_HISTORICAL: ReadonlyArray<TelemetryPoint> = Object.freeze([
  { sprint: 'Week 1', planned: 32, completed: 12 },
  { sprint: 'Week 2', planned: 38, completed: 22 },
  { sprint: 'Week 3', planned: 44, completed: 31 },
]);

export const FROZEN_QUARTER_HISTORICAL: ReadonlyArray<TelemetryPoint> = Object.freeze([
  { sprint: 'Sprint 28', planned: 30, completed: 28 },
  { sprint: 'Sprint 29', planned: 34, completed: 32 },
  { sprint: 'Sprint 30', planned: 40, completed: 36 },
  { sprint: 'Sprint 31', planned: 42, completed: 38 },
  { sprint: 'Sprint 32', planned: 45, completed: 41 },
]);

export const FROZEN_YEAR_HISTORICAL: ReadonlyArray<TelemetryPoint> = Object.freeze([
  { sprint: 'Q1', planned: 110, completed: 104 },
  { sprint: 'Q2', planned: 125, completed: 118 },
  { sprint: 'Q3', planned: 138, completed: 130 },
]);

/**
 * Builds the composite trend series combining frozen immutable past intervals
 * with the current live workspace interval.
 */
export function buildCompositeTelemetrySeries(
  timeRange: 'week' | 'month' | 'quarter' | 'year',
  liveTotalTasks: number,
  liveCompletedTasks: number
): TelemetryPoint[] {
  switch (timeRange) {
    case 'week':
      return [
        ...FROZEN_WEEK_HISTORICAL,
        { sprint: 'Today (Live)', planned: liveTotalTasks, completed: liveCompletedTasks, isLive: true },
      ];
    case 'quarter':
      return [
        ...FROZEN_QUARTER_HISTORICAL,
        { sprint: 'Current (Live)', planned: liveTotalTasks, completed: liveCompletedTasks, isLive: true },
      ];
    case 'year':
      return [
        ...FROZEN_YEAR_HISTORICAL,
        { sprint: 'Q4 (Live)', planned: liveTotalTasks, completed: liveCompletedTasks, isLive: true },
      ];
    case 'month':
    default:
      return [
        ...FROZEN_MONTH_HISTORICAL,
        { sprint: 'Week 4 (Live)', planned: liveTotalTasks, completed: liveCompletedTasks, isLive: true },
      ];
  }
}
