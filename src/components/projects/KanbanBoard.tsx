import React, { useState } from 'react';
import { Plus, MoreHorizontal, CheckCircle2 } from 'lucide-react';
import { Task, TaskStatus } from '../../types';
import { useApp } from '../../context/AppContext';
import { TaskCard } from './TaskCard';

interface KanbanBoardProps {
  tasks: Task[];
  projectId?: string;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, projectId }) => {
  const { moveTaskStatus, setSelectedTaskId, createTask } = useApp();
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [activeDropColumn, setActiveDropColumn] = useState<TaskStatus | null>(null);
  const [quickAddColumn, setQuickAddColumn] = useState<TaskStatus | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [mobileActiveColumn, setMobileActiveColumn] = useState<TaskStatus | 'ALL'>('ALL');

  const columns: { id: TaskStatus; title: string; color: string }[] = [
    { id: 'Backlog', title: 'Backlog', color: 'border-slate-400' },
    { id: 'Todo', title: 'To Do', color: 'border-sky-500' },
    { id: 'In Progress', title: 'In Progress', color: 'border-indigo-500' },
    { id: 'Review', title: 'Review', color: 'border-amber-500' },
    { id: 'Done', title: 'Done', color: 'border-emerald-500' },
  ];

  const visibleColumns = columns.filter(
    (col) => mobileActiveColumn === 'ALL' || col.id === mobileActiveColumn
  );

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(task.id);
  };

  const handleDragOver = (e: React.DragEvent, colStatus: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (activeDropColumn !== colStatus) {
      setActiveDropColumn(colStatus);
    }
  };

  const handleDragLeave = (e: React.DragEvent, colStatus: TaskStatus) => {
    // Only unset if we actually left the column element
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (activeDropColumn === colStatus) {
      setActiveDropColumn(null);
    }
  };

  const handleDrop = (e: React.DragEvent, colStatus: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (taskId) {
      moveTaskStatus(taskId, colStatus);
    }
    setDraggedTaskId(null);
    setActiveDropColumn(null);
  };

  const handleQuickAddSubmit = (e: React.FormEvent, status: TaskStatus) => {
    e.preventDefault();
    if (!quickAddTitle.trim()) return;

    const newTask = createTask({
      title: quickAddTitle.trim(),
      status,
      projectId: projectId || 'proj-1',
    });

    setQuickAddTitle('');
    setQuickAddColumn(null);
    setSelectedTaskId(newTask.id);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Mobile Column Switcher */}
      <div className="md:hidden flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none shrink-0">
        <button
          type="button"
          onClick={() => setMobileActiveColumn('ALL')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            mobileActiveColumn === 'ALL'
              ? 'bg-brand-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          All Columns ({tasks.length})
        </button>
        {columns.map((col) => {
          const count = tasks.filter((t) => t.status === col.id).length;
          return (
            <button
              key={col.id}
              type="button"
              onClick={() => setMobileActiveColumn(col.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                mobileActiveColumn === col.id
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {col.title} ({count})
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-x-auto pb-4 scrollbar-thin">
        <div
          className={`flex gap-4 ${
            mobileActiveColumn === 'ALL' ? 'min-w-[1100px]' : 'min-w-full'
          } h-full items-start px-1`}
        >
          {visibleColumns.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          const isDropActive = activeDropColumn === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={(e) => handleDragLeave(e, col.id)}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`flex-1 min-w-[240px] max-w-[320px] rounded-xl flex flex-col max-h-full transition-all duration-200 ${
                isDropActive
                  ? 'bg-brand-500/5 dark:bg-brand-500/10 ring-2 ring-brand-500/40'
                  : 'bg-slate-100/70 dark:bg-[#0e1320]/60'
              } border border-slate-200/80 dark:border-slate-800/80 p-3`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200/60 dark:border-slate-800/60">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full border ${col.color}`} />
                  <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {col.title}
                  </h3>
                  <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {colTasks.length}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setQuickAddColumn(quickAddColumn === col.id ? null : col.id);
                      setQuickAddTitle('');
                    }}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                    title="Add task to column"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Quick Add Form in Column */}
              {quickAddColumn === col.id && (
                <form
                  onSubmit={(e) => handleQuickAddSubmit(e, col.id)}
                  className="mb-3 p-2 rounded-lg bg-white dark:bg-[#131929] border border-brand-500/50 shadow-xs"
                >
                  <input
                    type="text"
                    value={quickAddTitle}
                    onChange={(e) => setQuickAddTitle(e.target.value)}
                    placeholder="Task name..."
                    autoFocus
                    className="w-full text-xs bg-transparent text-slate-900 dark:text-white placeholder-slate-400 outline-hidden mb-2"
                  />
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setQuickAddColumn(null)}
                      className="px-2 py-1 text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!quickAddTitle.trim()}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-brand-600 disabled:opacity-40 text-white rounded hover:bg-brand-500 shadow-xs"
                    >
                      Add
                    </button>
                  </div>
                </form>
              )}

              {/* Cards Container */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 min-h-[140px]">
                {colTasks.length === 0 ? (
                  <div className="h-28 border border-dashed border-slate-300/70 dark:border-slate-800/80 rounded-lg flex flex-col items-center justify-center p-3 text-center">
                    <span className="text-[11px] text-slate-400">No tasks in {col.title}</span>
                    <span className="text-[10px] text-slate-400/80 mt-0.5">Drop tasks here</span>
                  </div>
                ) : (
                  colTasks.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      onDragStart={handleDragStart}
                      onClick={() => setSelectedTaskId(t.id)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);
};
