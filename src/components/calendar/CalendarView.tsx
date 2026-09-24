import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Plus,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Task } from '../../types';
import { PriorityBadge } from '../common/Badge';
import { isTodayDate } from '../../utils/dateUtils';

export const CalendarView: React.FC = () => {
  const {
    tasks,
    projects,
    setSelectedTaskId,
    setIsQuickCreateOpen,
    setQuickCreateDefaultTab,
    productivitySettings,
    workspaceSettings,
  } = useApp();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarMode, setCalendarMode] = useState<'month' | 'week'>('month');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const startOfWeek = productivitySettings?.startOfWeek || 'monday';
  const workingDays = workspaceSettings?.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  // Navigation handlers
  const prevPeriod = () => {
    if (calendarMode === 'month') {
      setCurrentDate(new Date(year, month - 1, 1));
    } else {
      const nextD = new Date(currentDate);
      nextD.setDate(currentDate.getDate() - 7);
      setCurrentDate(nextD);
    }
  };

  const nextPeriod = () => {
    if (calendarMode === 'month') {
      setCurrentDate(new Date(year, month + 1, 1));
    } else {
      const nextD = new Date(currentDate);
      nextD.setDate(currentDate.getDate() + 7);
      setCurrentDate(nextD);
    }
  };

  const jumpToToday = () => {
    setCurrentDate(new Date());
  };

  // Month days generation
  const monthDays = useMemo(() => {
    const rawFirstDayIndex = new Date(year, month, 1).getDay();
    const firstDayIndex = startOfWeek === 'monday' ? (rawFirstDayIndex + 6) % 7 : rawFirstDayIndex;
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days: {
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isWorkingDay: boolean;
    }[] = [];

    // Preceding month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const m = month === 0 ? 12 : month;
      const y = month === 0 ? year - 1 : year;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayDate = new Date(y, m - 1, d);
      const dayFullName = dayDate.toLocaleDateString('en-US', { weekday: 'long' });
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: isTodayDate(dateStr),
        isWorkingDay: workingDays.includes(dayFullName),
      });
    }

    // Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayDate = new Date(year, month, d);
      const dayFullName = dayDate.toLocaleDateString('en-US', { weekday: 'long' });
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: isTodayDate(dateStr),
        isWorkingDay: workingDays.includes(dayFullName),
      });
    }

    // Following month padding (to fill 35 or 42 grid cells)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const m = month === 11 ? 1 : month + 2;
      const y = month === 11 ? year + 1 : year;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayDate = new Date(y, m - 1, d);
      const dayFullName = dayDate.toLocaleDateString('en-US', { weekday: 'long' });
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: isTodayDate(dateStr),
        isWorkingDay: workingDays.includes(dayFullName),
      });
    }

    return days;
  }, [year, month, startOfWeek, workingDays]);

  const monthName = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Week days generation
  const weekDays = useMemo(() => {
    const currentDayOfWeek = currentDate.getDay();
    const offset = startOfWeek === 'monday' ? (currentDayOfWeek + 6) % 7 : currentDayOfWeek;
    const startPeriod = new Date(currentDate);
    startPeriod.setDate(currentDate.getDate() - offset);

    const days: {
      dateStr: string;
      dayNumber: number;
      dayName: string;
      isToday: boolean;
      isWorkingDay: boolean;
    }[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(startPeriod);
      d.setDate(startPeriod.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dayFullName = d.toLocaleDateString('en-US', { weekday: 'long' });
      days.push({
        dateStr,
        dayNumber: d.getDate(),
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        isToday: isTodayDate(dateStr),
        isWorkingDay: workingDays.includes(dayFullName),
      });
    }
    return days;
  }, [currentDate, startOfWeek, workingDays]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50 dark:bg-[#0b0f19] p-5 space-y-4">
      {/* Calendar Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {monthName}
            </h2>
            <p className="text-xs text-slate-400">Deadlines & Deliverable Milestones</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex text-xs">
            <button
              type="button"
              onClick={() => setCalendarMode('month')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                calendarMode === 'month'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setCalendarMode('week')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                calendarMode === 'week'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Week
            </button>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

          {/* Today Button */}
          <button
            type="button"
            onClick={jumpToToday}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
          >
            Today
          </button>

          {/* Previous / Next */}
          <button
            type="button"
            onClick={prevPeriod}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            title="Previous period"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={nextPeriod}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            title="Next period"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              setQuickCreateDefaultTab('task');
              setIsQuickCreateOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Month View Grid */}
      {calendarMode === 'month' && (
        <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#111726] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0e1320] text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 py-2.5">
            {(startOfWeek === 'monday'
              ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
              : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
            ).map((dayName) => (
              <div key={dayName}>{dayName}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="flex-1 grid grid-cols-7 grid-rows-5 divide-x divide-y divide-slate-200 dark:divide-slate-800/70 overflow-y-auto">
            {monthDays.map((day) => {
              const dayTasks = tasks.filter((t) => t.dueDate === day.dateStr);

              return (
                <div
                  key={day.dateStr}
                  className={`p-1.5 min-h-[95px] flex flex-col justify-between transition-colors ${
                    day.isCurrentMonth
                      ? day.isWorkingDay
                        ? 'bg-transparent'
                        : 'bg-slate-50/60 dark:bg-slate-900/40'
                      : 'bg-slate-50/40 dark:bg-slate-900/30 opacity-40'
                  } ${day.isToday ? 'bg-brand-500/5 dark:bg-brand-500/10' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-mono font-medium rounded-full w-6 h-6 flex items-center justify-center ${
                        day.isToday
                          ? 'bg-brand-600 text-white font-bold'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {day.dayNumber}
                    </span>
                    {dayTasks.length > 0 && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {dayTasks.length} {dayTasks.length === 1 ? 'task' : 'tasks'}
                      </span>
                    )}
                  </div>

                  {/* Tasks on this day */}
                  <div className="flex-1 space-y-1 overflow-y-auto max-h-20 scrollbar-none">
                    {dayTasks.map((t) => {
                      const proj = projects.find((p) => p.id === t.projectId);
                      return (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTaskId(t.id)}
                          className="px-1.5 py-0.5 rounded text-[10px] font-medium truncate cursor-pointer bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-l-2 flex items-center gap-1 shadow-2xs transition-transform hover:scale-[1.01]"
                          style={{ borderLeftColor: proj?.color || '#6366f1' }}
                          title={`${t.key}: ${t.title}`}
                        >
                          <span className="truncate">{t.title}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Week View */}
      {calendarMode === 'week' && (
        <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#111726] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="grid grid-cols-7 divide-x divide-slate-200 dark:divide-slate-800/70 h-full">
            {weekDays.map((day) => {
              const dayTasks = tasks.filter((t) => t.dueDate === day.dateStr);

              return (
                <div
                  key={day.dateStr}
                  className={`flex flex-col p-3 ${
                    !day.isWorkingDay ? 'bg-slate-50/60 dark:bg-slate-900/40' : ''
                  } ${
                    day.isToday ? 'bg-brand-500/5 dark:bg-brand-500/10' : ''
                  }`}
                >
                  <div className="pb-2 mb-2 border-b border-slate-200 dark:border-slate-800/80 text-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                      {day.dayName}
                    </span>
                    <span
                      className={`text-lg font-mono font-bold inline-block mt-0.5 ${
                        day.isToday ? 'text-brand-600 dark:text-brand-400' : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {day.dayNumber}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2">
                    {dayTasks.length === 0 ? (
                      <p className="text-[11px] text-slate-400 text-center mt-4 italic">
                        No deadlines
                      </p>
                    ) : (
                      dayTasks.map((t) => {
                        const proj = projects.find((p) => p.id === t.projectId);
                        return (
                          <div
                            key={t.id}
                            onClick={() => setSelectedTaskId(t.id)}
                            className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 hover:border-brand-500/50 cursor-pointer shadow-xs transition-all"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-mono text-slate-400">{t.key}</span>
                              <PriorityBadge priority={t.priority} size="xs" />
                            </div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-2">
                              {t.title}
                            </p>
                            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-400">
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: proj?.color }}
                              />
                              <span className="truncate">{proj?.name}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
