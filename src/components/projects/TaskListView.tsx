import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowUpDown,
  Filter,
  Search,
  Trash2,
  CheckCircle,
  Flag,
  User,
  MoreHorizontal,
  Clock,
  X,
} from 'lucide-react';
import { Task, TaskPriority, TaskStatus } from '../../types';
import { useApp } from '../../context/AppContext';
import { PriorityBadge, StatusBadge } from '../common/Badge';
import { Avatar } from '../common/Avatar';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { isTaskOverdue } from '../../utils/dateUtils';

interface TaskListViewProps {
  tasks: Task[];
  showProjectColumn?: boolean;
}

const PAGE_SIZE = 50;

export const TaskListView: React.FC<TaskListViewProps> = ({ tasks, showProjectColumn = true }) => {
  const {
    projects,
    members,
    setSelectedTaskId,
    bulkUpdateTasks,
    bulkDeleteTasks,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'title' | 'dueDate' | 'priority' | 'status'>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Reset pagination to page 1 on filter or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, priorityFilter, assigneeFilter, searchQuery, sortField, sortOrder]);

  // Filtering & Sorting
  const filteredTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        if (statusFilter !== 'all' && t.status !== statusFilter) return false;
        if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
        if (assigneeFilter !== 'all' && t.assigneeId !== assigneeFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = t.title.toLowerCase().includes(q);
          const matchKey = t.key.toLowerCase().includes(q);
          if (!matchTitle && !matchKey) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let valA: string = a[sortField] || '';
        let valB: string = b[sortField] || '';

        if (sortField === 'priority') {
          const priorityWeights = { Urgent: 4, High: 3, Medium: 2, Low: 1 };
          const weightA = priorityWeights[a.priority] || 0;
          const weightB = priorityWeights[b.priority] || 0;
          return sortOrder === 'asc' ? weightA - weightB : weightB - weightA;
        }

        const cmp = valA.localeCompare(valB);
        return sortOrder === 'asc' ? cmp : -cmp;
      });
  }, [tasks, statusFilter, priorityFilter, assigneeFilter, searchQuery, sortField, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginatedTasks = useMemo(() => {
    return filteredTasks.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredTasks, startIndex]);

  const toggleSort = (field: 'title' | 'dueDate' | 'priority' | 'status') => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleSelectAll = () => {
    if (selectedTaskIds.length === filteredTasks.length) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(filteredTasks.map((t) => t.id));
    }
  };

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTaskIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#0e1320] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
      {/* Filters Ribbon */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter tasks..."
              className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 text-xs outline-hidden focus:border-brand-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 text-xs outline-hidden"
          >
            <option value="all">All Statuses</option>
            <option value="Backlog">Backlog</option>
            <option value="Todo">Todo</option>
            <option value="In Progress">In Progress</option>
            <option value="Review">Review</option>
            <option value="Done">Done</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 text-xs outline-hidden"
          >
            <option value="all">All Priorities</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {/* Assignee Filter */}
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 text-xs outline-hidden"
          >
            <option value="all">All Assignees</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Showing {filteredTasks.length} of {tasks.length} tasks
        </div>
      </div>

      {/* Task Table */}
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 bg-slate-100/90 dark:bg-[#121826]/90 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider select-none z-10">
            <tr>
              <th className="p-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={selectedTaskIds.length > 0 && selectedTaskIds.length === filteredTasks.length}
                  onChange={handleSelectAll}
                  className="rounded text-brand-600 focus:ring-brand-500 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                />
              </th>
              <th
                onClick={() => toggleSort('title')}
                className="p-3 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Task</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => toggleSort('status')}
                className="p-3 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Status</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => toggleSort('priority')}
                className="p-3 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Priority</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="p-3">Assignee</th>
              {showProjectColumn && <th className="p-3">Project</th>}
              <th
                onClick={() => toggleSort('dueDate')}
                className="p-3 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Due Date</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-10 text-center text-slate-400">
                  No matching tasks found. Adjust your search or filters.
                </td>
              </tr>
            ) : (
              paginatedTasks.map((t) => {
                const isSelected = selectedTaskIds.includes(t.id);
                const project = projects.find((p) => p.id === t.projectId);
                const assignee = members.find((m) => m.id === t.assigneeId);
                const isOverdue = isTaskOverdue(t.dueDate, t.status);

                return (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedTaskId(t.id)}
                    className={`cursor-pointer transition-colors group ${
                      isSelected
                        ? 'bg-brand-500/10 dark:bg-brand-500/15'
                        : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="p-3 text-center" onClick={(e) => handleToggleSelect(t.id, e)}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded text-brand-600 focus:ring-brand-500 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2 max-w-md">
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
                          {t.key}
                        </span>
                        <span className="font-medium text-slate-900 dark:text-slate-100 truncate group-hover:text-brand-600 dark:group-hover:text-brand-400">
                          {t.title}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <StatusBadge status={t.status} size="xs" />
                    </td>
                    <td className="p-3">
                      <PriorityBadge priority={t.priority} size="xs" />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Avatar member={assignee} size="xs" />
                        <span className="text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                          {assignee?.name || 'Unassigned'}
                        </span>
                      </div>
                    </td>
                    {showProjectColumn && (
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: project?.color || '#6366f1' }}
                          />
                          <span className="truncate max-w-[130px]">{project?.name || 'Project'}</span>
                        </div>
                      </td>
                    )}
                    <td className="p-3">
                      <span
                        className={`font-mono text-[11px] ${
                          isOverdue
                            ? 'text-rose-600 dark:text-rose-400 font-semibold'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {t.dueDate}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {filteredTasks.length > PAGE_SIZE && (
        <div className="px-4 py-2.5 bg-white dark:bg-[#0c1017] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0 select-none">
          <div className="font-mono text-[11px]">
            Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{startIndex + 1}</span>–<span className="font-semibold text-slate-700 dark:text-slate-300">{Math.min(startIndex + PAGE_SIZE, filteredTasks.length)}</span> of <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredTasks.length.toLocaleString()}</span> tasks
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium text-slate-700 dark:text-slate-300"
            >
              Previous
            </button>
            <span className="px-1.5 text-xs font-mono">
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium text-slate-700 dark:text-slate-300"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Floating Sticky Bulk Actions Bar */}
      {selectedTaskIds.length > 0 && (
        <div className="p-3 bg-slate-900 text-white dark:bg-[#151c2e] border-t border-slate-700 flex items-center justify-between gap-4 animate-slide-down shadow-2xl z-20">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-brand-500 text-white">
              {selectedTaskIds.length} Selected
            </span>
            <button
              type="button"
              onClick={() => setSelectedTaskIds([])}
              className="text-xs text-slate-400 hover:text-white"
            >
              Deselect all
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {/* Bulk Status */}
            <select
              onChange={(e) => {
                if (e.target.value) {
                  bulkUpdateTasks(selectedTaskIds, { status: e.target.value as TaskStatus });
                  setSelectedTaskIds([]);
                }
              }}
              defaultValue=""
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs outline-hidden"
            >
              <option value="" disabled>
                Change Status...
              </option>
              <option value="Backlog">Set to Backlog</option>
              <option value="Todo">Set to Todo</option>
              <option value="In Progress">Set to In Progress</option>
              <option value="Review">Set to Review</option>
              <option value="Done">Set to Done</option>
            </select>

            {/* Bulk Priority */}
            <select
              onChange={(e) => {
                if (e.target.value) {
                  bulkUpdateTasks(selectedTaskIds, { priority: e.target.value as TaskPriority });
                  setSelectedTaskIds([]);
                }
              }}
              defaultValue=""
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs outline-hidden"
            >
              <option value="" disabled>
                Set Priority...
              </option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            {/* Bulk Assign */}
            <select
              onChange={(e) => {
                if (e.target.value) {
                  bulkUpdateTasks(selectedTaskIds, { assigneeId: e.target.value });
                  setSelectedTaskIds([]);
                }
              }}
              defaultValue=""
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs outline-hidden"
            >
              <option value="" disabled>
                Reassign to...
              </option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>

            {/* Bulk Delete */}
            <button
              type="button"
              onClick={() => setIsBulkDeleteConfirmOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={isBulkDeleteConfirmOpen}
        onClose={() => setIsBulkDeleteConfirmOpen(false)}
        onConfirm={() => {
          bulkDeleteTasks(selectedTaskIds);
          setSelectedTaskIds([]);
          setIsBulkDeleteConfirmOpen(false);
        }}
        title={`Delete ${selectedTaskIds.length} Tasks`}
        description={`Are you sure you want to delete ${selectedTaskIds.length} selected tasks? This action will remove them from the project and update member workloads.`}
        confirmLabel="Delete Tasks"
        variant="danger"
        icon="trash"
      />
    </div>
  );
};
