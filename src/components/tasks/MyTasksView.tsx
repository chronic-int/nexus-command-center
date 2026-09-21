import React, { useState } from 'react';
import {
  CheckSquare,
  Plus,
  Clock,
  LayoutGrid,
  List as ListIcon,
  Filter,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { KanbanBoard } from '../projects/KanbanBoard';
import { TaskListView } from '../projects/TaskListView';

export const MyTasksView: React.FC = () => {
  const {
    tasks,
    setIsQuickCreateOpen,
    setQuickCreateDefaultTab,
  } = useApp();

  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [filterMode, setFilterMode] = useState<'all' | 'open' | 'urgent' | 'completed'>('open');

  // Filter tasks assigned to user-1
  const myTasks = tasks.filter((t) => t.assigneeId === 'user-1');

  const filteredTasks = myTasks.filter((t) => {
    if (filterMode === 'open') return t.status !== 'Done';
    if (filterMode === 'urgent') return t.priority === 'Urgent' && t.status !== 'Done';
    if (filterMode === 'completed') return t.status === 'Done';
    return true;
  });

  const openCount = myTasks.filter((t) => t.status !== 'Done').length;
  const completedCount = myTasks.filter((t) => t.status === 'Done').length;
  const urgentCount = myTasks.filter((t) => t.priority === 'Urgent' && t.status !== 'Done').length;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-50/50 dark:bg-[#0b0f19] p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800 shadow-xs shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CheckSquare className="w-4 h-4 text-brand-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
              Personal Queue
            </span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
            My Assigned Tasks
          </h1>
          <p className="text-xs text-slate-500">
            {openCount} active tasks requiring engineering attention across multiple repositories
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* List / Board Switcher */}
          <div className="flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-[#121826] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <ListIcon className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('board')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-colors ${
                viewMode === 'board'
                  ? 'bg-white dark:bg-[#121826] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setQuickCreateDefaultTab('task');
              setIsQuickCreateOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-all hover:scale-[1.02]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* Quick Filter Ribbon */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0 text-xs">
        {[
          { id: 'open', label: 'In Flight Tasks', count: openCount },
          { id: 'urgent', label: 'Urgent Blockers', count: urgentCount },
          { id: 'completed', label: 'Completed', count: completedCount },
          { id: 'all', label: 'All My Tasks', count: myTasks.length },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilterMode(f.id as any)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition-colors ${
              filterMode === f.id
                ? 'bg-brand-500 text-white shadow-xs'
                : 'bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>{f.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                filterMode === f.id
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}
            >
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Content View */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {viewMode === 'list' ? (
          <TaskListView tasks={filteredTasks} showProjectColumn={true} />
        ) : (
          <KanbanBoard tasks={filteredTasks} />
        )}
      </div>
    </div>
  );
};
