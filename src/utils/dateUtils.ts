/**
 * Centralized Date & Time Utilities for NEXUS
 * Guarantees timezone-safe date-only calculations and replaces all hardcoded dates with live local date computations.
 */

/**
 * Returns today's date in local YYYY-MM-DD format.
 * Can optionally accept an explicit reference date for deterministic testing.
 */
export function getTodayString(referenceDate?: Date | string): string {
  const now = referenceDate
    ? typeof referenceDate === 'string'
      ? parseLocalDate(referenceDate)
      : referenceDate
    : new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Safely parses a YYYY-MM-DD date-only string at local midnight.
 */
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day, 0, 0, 0, 0);
  }
  return new Date(dateStr);
}

/**
 * Checks if a task is overdue relative to the actual local date or an injected reference date.
 */
export function isTaskOverdue(
  dueDateStr: string,
  status?: string,
  referenceDate?: Date | string
): boolean {
  if (!dueDateStr || status === 'Done') return false;
  const today = parseLocalDate(getTodayString(referenceDate));
  const dueDate = parseLocalDate(dueDateStr);
  return dueDate.getTime() < today.getTime();
}

/**
 * Checks if a given date string is today (or matches reference date).
 */
export function isTodayDate(dateStr: string, referenceDate?: Date | string): boolean {
  return dateStr === getTodayString(referenceDate);
}

/**
 * Calculates remaining days until deadline (negative if overdue).
 */
export function getDaysUntilDeadline(
  deadlineStr: string,
  referenceDate?: Date | string
): number {
  const today = parseLocalDate(getTodayString(referenceDate));
  const deadline = parseLocalDate(deadlineStr);
  const diffMs = deadline.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Formats relative timestamp for comments, activities, and audit logs.
 */
export function formatRelativeTime(
  isoOrDateStr: string,
  referenceDate?: Date | string
): string {
  if (!isoOrDateStr) return '';
  const date = new Date(isoOrDateStr);
  if (isNaN(date.getTime())) {
    return isoOrDateStr;
  }

  const now = referenceDate
    ? typeof referenceDate === 'string'
      ? new Date(referenceDate)
      : referenceDate
    : new Date();
  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSeconds < 60) return 'Just now';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  if (diffSeconds < 172800) return 'Yesterday';
  if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Formats a date string cleanly for headers and cards.
 */
export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
