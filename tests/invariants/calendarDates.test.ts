import { describe, it, expect } from 'vitest';
import {
  getTodayString,
  parseLocalDate,
  isTaskOverdue,
  isTodayDate,
  getDaysUntilDeadline,
  formatRelativeTime,
} from '../../src/utils/dateUtils';

describe('Calendar, Leap Year & Timezone-Safe Date Invariants', () => {
  it('correctly handles leap day (Feb 29) on a leap year', () => {
    const leapDay = new Date(2024, 1, 29, 12, 0, 0); // 2024-02-29
    expect(getTodayString(leapDay)).toBe('2024-02-29');

    const parsed = parseLocalDate('2024-02-29');
    expect(parsed.getFullYear()).toBe(2024);
    expect(parsed.getMonth()).toBe(1); // February (0-indexed)
    expect(parsed.getDate()).toBe(29);
  });

  it('correctly calculates overdue tasks across month boundaries', () => {
    // Reference date: September 1, 2026
    const refDate = '2026-09-01';

    // Due date: August 31, 2026 -> Overdue by 1 day
    expect(isTaskOverdue('2026-08-31', 'In Progress', refDate)).toBe(true);

    // Due date: September 1, 2026 -> Due today, NOT overdue yet
    expect(isTaskOverdue('2026-09-01', 'In Progress', refDate)).toBe(false);

    // Due date: September 2, 2026 -> Future, NOT overdue
    expect(isTaskOverdue('2026-09-02', 'In Progress', refDate)).toBe(false);
  });

  it('correctly calculates year rollover boundaries (Dec 31 to Jan 1)', () => {
    const newYearsEve = '2026-12-31';
    const newYearsDay = '2027-01-01';

    // On Dec 31, Jan 1 is 1 day away
    expect(getDaysUntilDeadline(newYearsDay, newYearsEve)).toBe(1);

    // On Jan 1, Dec 31 is -1 days away (overdue)
    expect(getDaysUntilDeadline(newYearsEve, newYearsDay)).toBe(-1);
    expect(isTaskOverdue(newYearsEve, 'In Progress', newYearsDay)).toBe(true);
  });

  it('behaves consistently across near-midnight local times', () => {
    const nightBefore = new Date(2026, 8, 21, 23, 59, 59, 999);
    const morningAfter = new Date(2026, 8, 22, 0, 0, 1, 0);

    expect(getTodayString(nightBefore)).toBe('2026-09-21');
    expect(getTodayString(morningAfter)).toBe('2026-09-22');

    // A task due on 2026-09-21 is not overdue at 23:59:59 on the 21st
    expect(isTaskOverdue('2026-09-21', 'In Progress', nightBefore)).toBe(false);

    // But is overdue at 00:00:01 on the 22nd
    expect(isTaskOverdue('2026-09-21', 'In Progress', morningAfter)).toBe(true);
  });

  it('formats relative times deterministically with reference timestamps', () => {
    const now = new Date('2026-09-22T12:00:00.000Z');

    const justNowDate = new Date('2026-09-22T11:59:30.000Z').toISOString();
    expect(formatRelativeTime(justNowDate, now)).toBe('Just now');

    const fiveMinAgo = new Date('2026-09-22T11:55:00.000Z').toISOString();
    expect(formatRelativeTime(fiveMinAgo, now)).toBe('5m ago');

    const twoHoursAgo = new Date('2026-09-22T10:00:00.000Z').toISOString();
    expect(formatRelativeTime(twoHoursAgo, now)).toBe('2h ago');

    const yesterday = new Date('2026-09-21T10:00:00.000Z').toISOString();
    expect(formatRelativeTime(yesterday, now)).toBe('Yesterday');
  });
});
