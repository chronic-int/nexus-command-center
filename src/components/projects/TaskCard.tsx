import React from 'react';
import {
  Calendar,
  CheckSquare,
  MessageSquare,
  Paperclip,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { Task } from '../../types';
import { useApp } from '../../context/AppContext';
import { PriorityBadge } from '../common/Badge';
import { Avatar } from '../common/Avatar';

interface TaskCardProps {
  task: Task;
  onDragStart: (e: React.DragEvent, task: Task) => void;
  onClick: () => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onDragStart, onClick }) => {
  const { members } = useApp();
  const assignee = members.find((m) => m.id === task.assigneeId);

  // Check if overdue
  const isOverdue = task.status !== 'Done' && new Date(task.dueDate) < new Date('2026-09-22');
  const completedSubtasks = task.subtasks.filter((s) => s.completed).length;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onClick={onClick}
      className="group relative bg-white dark:bg-[#131929] hover:bg-slate-50 dark:hover:bg-[#172033] border border-slate-200/90 dark:border-slate-800/90 hover:border-brand-500/50 dark:hover:border-brand-500/50 rounded-xl p-3.5 shadow-xs hover:shadow-md transition-all duration-150 cursor-grab active:cursor-grabbing select-none"
    >
      {/* Top row: Key & Priority */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400">
          {task.key}
        </span>
        <PriorityBadge priority={task.priority} size="xs" />
      </div>

      {/* Task Title */}
      <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 mb-2.5 leading-snug group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
        {task.title}
      </h4>

      {/* Labels */}
      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {task.labels.slice(0, 2).map((label) => (
            <span
              key={label}
              className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60"
            >
              {label}
            </span>
          ))}
          {task.labels.length > 2 && (
            <span className="text-[10px] text-slate-400">+{task.labels.length - 2}</span>
          )}
        </div>
      )}

      {/* Bottom metadata: Due date, counts, and Assignee */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[11px]">
        <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400">
          {/* Due date */}
          <div
            className={`flex items-center gap-1 font-mono text-[10px] ${
              isOverdue
                ? 'text-rose-600 dark:text-rose-400 font-semibold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
            title={`Due: ${task.dueDate}${isOverdue ? ' (Overdue)' : ''}`}
          >
            <Clock className="w-3 h-3" />
            <span>{task.dueDate.slice(5)}</span>
          </div>

          {/* Subtasks count */}
          {task.subtasks.length > 0 && (
            <div
              className={`flex items-center gap-0.5 text-[10px] ${
                completedSubtasks === task.subtasks.length
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : ''
              }`}
              title={`Subtasks: ${completedSubtasks}/${task.subtasks.length}`}
            >
              <CheckSquare className="w-3 h-3" />
              <span>
                {completedSubtasks}/{task.subtasks.length}
              </span>
            </div>
          )}

          {/* Comments count */}
          {task.comments.length > 0 && (
            <div className="flex items-center gap-0.5 text-[10px]" title="Comments">
              <MessageSquare className="w-3 h-3" />
              <span>{task.comments.length}</span>
            </div>
          )}

          {/* Attachments */}
          {task.attachments.length > 0 && (
            <div className="flex items-center gap-0.5 text-[10px]" title="Attachments">
              <Paperclip className="w-3 h-3" />
              <span>{task.attachments.length}</span>
            </div>
          )}
        </div>

        {/* Assignee Avatar */}
        <Avatar member={assignee} size="xs" />
      </div>
    </div>
  );
};
