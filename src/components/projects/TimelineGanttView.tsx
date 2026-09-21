import React, { useMemo } from 'react';
import { Clock, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Task } from '../../types';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../common/Avatar';
import { getTodayString, isTodayDate, parseLocalDate } from '../../utils/dateUtils';

interface TimelineGanttViewProps {
  tasks: Task[];
}

export const TimelineGanttView: React.FC<TimelineGanttViewProps> = ({ tasks }) => {
  const { setSelectedTaskId, members } = useApp();

  // Reference base date for timeline window (anchored to 7 days prior to today, spanning 30 days)
  const timelineStartObj = useMemo(() => {
    const today = parseLocalDate(getTodayString());
    const base = new Date(today);
    base.setDate(today.getDate() - 7);
    return base;
  }, []);

  const timelineDates = useMemo(() => {
    const dates: { dateStr: string; dayNum: number; dayName: string; isToday: boolean }[] = [];
    const base = new Date(timelineStartObj);

    for (let i = 0; i < 30; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const dayNum = d.getDate();
      const dayName = d.toLocaleDateString('en-US', { weekday: 'narrow' });
      dates.push({
        dateStr,
        dayNum,
        dayName,
        isToday: isTodayDate(dateStr),
      });
    }
    return dates;
  }, [timelineStartObj]);

  const timelineStart = timelineStartObj.getTime();
  const oneDayMs = 86400000;

  const getTaskBarSpan = (task: Task) => {
    const dueTime = new Date(task.dueDate).getTime();
    const startTime = task.startDate ? new Date(task.startDate).getTime() : dueTime - 4 * oneDayMs;

    const startOffsetDays = Math.max(0, Math.floor((startTime - timelineStart) / oneDayMs));
    const durationDays = Math.max(2, Math.floor((dueTime - startTime) / oneDayMs));

    return {
      startOffsetDays: Math.min(28, startOffsetDays),
      durationDays: Math.min(10, Math.max(2, durationDays)),
    };
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'Done':
        return 'bg-emerald-500/80 hover:bg-emerald-500 text-white';
      case 'In Progress':
        return 'bg-indigo-500/80 hover:bg-indigo-500 text-white';
      case 'Review':
        return 'bg-amber-500/80 hover:bg-amber-500 text-white';
      case 'Backlog':
        return 'bg-slate-500/70 hover:bg-slate-500 text-white';
      case 'Todo':
      default:
        return 'bg-sky-500/80 hover:bg-sky-500 text-white';
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#0e1320] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
      {/* Header bar */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-brand-500" />
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            Sprint Timeline (September – October 2026)
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-brand-500" /> Today (Sep 22)
          </span>
        </div>
      </div>

      {/* Timeline Grid Container */}
      <div className="flex-1 overflow-auto scrollbar-thin">
        <div className="min-w-[1200px] flex flex-col">
          {/* Calendar Header Columns */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-[#121826] sticky top-0 z-10 text-[10px]">
            <div className="w-64 p-2.5 font-bold uppercase tracking-wider text-slate-400 shrink-0 border-r border-slate-200 dark:border-slate-800">
              Task Item
            </div>
            <div className="flex-1 grid grid-cols-30 divide-x divide-slate-200 dark:divide-slate-800/60">
              {timelineDates.map((d) => (
                <div
                  key={d.dateStr}
                  className={`p-1 text-center flex flex-col items-center ${
                    d.isToday ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold' : 'text-slate-400'
                  }`}
                >
                  <span className="text-[9px] uppercase">{d.dayName}</span>
                  <span className="text-[11px] font-mono">{d.dayNum}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Task Rows */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800/40">
            {tasks.map((t) => {
              const { startOffsetDays, durationDays } = getTaskBarSpan(t);
              const assignee = members.find((m) => m.id === t.assigneeId);

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTaskId(t.id)}
                  className="flex items-center hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group h-11"
                >
                  {/* Task Name Column */}
                  <div className="w-64 px-3 flex items-center justify-between border-r border-slate-200 dark:border-slate-800 shrink-0 min-w-0">
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">{t.key}</span>
                      <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-brand-500 transition-colors">
                        {t.title}
                      </span>
                    </div>
                    <Avatar member={assignee} size="xs" />
                  </div>

                  {/* Timeline Bar Space */}
                  <div className="flex-1 relative h-full flex items-center px-1">
                    {/* Today indicator vertical line */}
                    <div
                      className="absolute top-0 bottom-0 w-px bg-brand-500/40 z-0 pointer-events-none"
                      style={{ left: `${(7 / 30) * 100}%` }}
                    />

                    {/* Task Bar */}
                    <div
                      className={`relative z-1 h-7 rounded-md px-2.5 flex items-center justify-between shadow-2xs transition-all ${getStatusBg(
                        t.status
                      )}`}
                      style={{
                        marginLeft: `${(startOffsetDays / 30) * 100}%`,
                        width: `${Math.max(4, (durationDays / 30) * 100)}%`,
                      }}
                      title={`${t.key}: ${t.title} (${t.status})`}
                    >
                      <span className="text-[10px] font-medium truncate drop-shadow-xs">
                        {t.title}
                      </span>
                      <span className="text-[9px] font-mono opacity-90 shrink-0 ml-1">
                        {durationDays}d
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
