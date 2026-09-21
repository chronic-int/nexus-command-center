import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Calendar,
  Flag,
  User,
  FolderKanban,
  Tag,
  Plus,
  Trash2,
  Copy,
  MessageSquare,
  Paperclip,
  Clock,
  Send,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Drawer } from '../common/Drawer';
import { Avatar } from '../common/Avatar';
import { PriorityBadge, StatusBadge } from '../common/Badge';
import { TaskPriority, TaskStatus } from '../../types';

export const TaskDrawer: React.FC = () => {
  const {
    selectedTaskId,
    setSelectedTaskId,
    tasks,
    projects,
    members,
    updateTask,
    deleteTask,
    duplicateTask,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    addComment,
    moveTaskStatus,
  } = useApp();

  const task = tasks.find((t) => t.id === selectedTaskId);

  // Local editable states
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newCommentContent, setNewCommentContent] = useState('');
  const [newTagInput, setNewTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  useEffect(() => {
    if (task) {
      setTitleValue(task.title);
      setDescValue(task.description);
      setIsEditingTitle(false);
      setIsEditingDesc(false);
      setNewSubtaskTitle('');
      setNewCommentContent('');
    }
  }, [task]);

  if (!task) return null;

  const project = projects.find((p) => p.id === task.projectId);
  const assignee = members.find((m) => m.id === task.assigneeId);

  const handleSaveTitle = () => {
    if (titleValue.trim() && titleValue !== task.title) {
      updateTask(task.id, { title: titleValue.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleSaveDesc = () => {
    if (descValue !== task.description) {
      updateTask(task.id, { description: descValue.trim() });
    }
    setIsEditingDesc(false);
  };

  const handleAddSubtaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSubtaskTitle.trim()) {
      addSubtask(task.id, newSubtaskTitle.trim());
      setNewSubtaskTitle('');
    }
  };

  const handleAddCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCommentContent.trim()) {
      addComment(task.id, newCommentContent.trim());
      setNewCommentContent('');
    }
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTagInput.trim()) {
      e.preventDefault();
      const updatedLabels = [...new Set([...task.labels, newTagInput.trim()])];
      updateTask(task.id, { labels: updatedLabels });
      setNewTagInput('');
      setIsAddingTag(false);
    }
  };

  const handleRemoveTag = (labelToRemove: string) => {
    updateTask(task.id, {
      labels: task.labels.filter((l) => l !== labelToRemove),
    });
  };

  const completedSubtasksCount = task.subtasks.filter((s) => s.completed).length;

  return (
    <Drawer
      isOpen={!!selectedTaskId}
      onClose={() => setSelectedTaskId(null)}
      width="xl"
      title={
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
            {task.key}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[280px]">
            {project?.name || 'Project'}
          </span>
        </div>
      }
      subtitle={
        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
          <span>Created {new Date(task.createdAt).toLocaleDateString()}</span>
          <span>•</span>
          <span>Updated {new Date(task.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      }
      footer={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => duplicateTask(task.id)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Duplicate</span>
            </button>
            <button
              type="button"
              onClick={() => deleteTask(task.id)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Task</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setSelectedTaskId(null)}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Title Section (Inline Edit) */}
        <div>
          {isEditingTitle ? (
            <div className="space-y-2">
              <input
                type="text"
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                autoFocus
                className="w-full text-base font-semibold px-2.5 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800/80 border border-brand-500 text-slate-900 dark:text-white outline-hidden"
              />
              <p className="text-[11px] text-slate-400">Press Enter or click outside to save</p>
            </div>
          ) : (
            <h2
              onClick={() => setIsEditingTitle(true)}
              className="text-lg font-bold text-slate-900 dark:text-white cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 p-1.5 -ml-1.5 rounded-lg transition-colors leading-snug"
              title="Click to edit title"
            >
              {task.title}
            </h2>
          )}
        </div>

        {/* Task Attributes Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-[#131929] border border-slate-200 dark:border-slate-800">
          {/* Status */}
          <div>
            <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
              Status
            </span>
            <select
              value={task.status}
              onChange={(e) => moveTaskStatus(task.id, e.target.value as TaskStatus)}
              className="w-full text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-slate-800 dark:text-slate-200 outline-hidden"
            >
              <option value="Backlog">Backlog</option>
              <option value="Todo">Todo</option>
              <option value="In Progress">In Progress</option>
              <option value="Review">Review</option>
              <option value="Done">Done</option>
            </select>
          </div>

          {/* Priority */}
          <div>
            <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
              Priority
            </span>
            <select
              value={task.priority}
              onChange={(e) => updateTask(task.id, { priority: e.target.value as TaskPriority })}
              className="w-full text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-slate-800 dark:text-slate-200 outline-hidden"
            >
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Assignee */}
          <div>
            <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
              Assignee
            </span>
            <select
              value={task.assigneeId}
              onChange={(e) => updateTask(task.id, { assigneeId: e.target.value })}
              className="w-full text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-slate-800 dark:text-slate-200 outline-hidden"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Due Date */}
          <div>
            <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
              Due Date
            </span>
            <input
              type="date"
              value={task.dueDate}
              onChange={(e) => updateTask(task.id, { dueDate: e.target.value })}
              className="w-full text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-slate-800 dark:text-slate-200 outline-hidden"
            />
          </div>
        </div>

        {/* Labels & Tags */}
        <div>
          <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Labels & Tags
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {task.labels.map((label) => (
              <span
                key={label}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                {label}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(label)}
                  className="text-slate-400 hover:text-rose-500 ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {isAddingTag ? (
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                onBlur={() => setIsAddingTag(false)}
                placeholder="Press Enter..."
                autoFocus
                className="text-xs px-2 py-0.5 rounded border border-brand-500 bg-transparent text-slate-800 dark:text-slate-200 outline-hidden w-24"
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingTag(true)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700"
              >
                <Plus className="w-3 h-3" />
                <span>Add Tag</span>
              </button>
            )}
          </div>
        </div>

        {/* Description (Inline Markdown/Text Edit) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Description
            </span>
            {!isEditingDesc && (
              <button
                type="button"
                onClick={() => setIsEditingDesc(true)}
                className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
              >
                Edit
              </button>
            )}
          </div>
          {isEditingDesc ? (
            <div className="space-y-2">
              <textarea
                rows={4}
                value={descValue}
                onChange={(e) => setDescValue(e.target.value)}
                className="w-full text-xs p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 outline-hidden focus:border-brand-500 leading-relaxed"
                placeholder="Write detailed specifications..."
                autoFocus
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingDesc(false)}
                  className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveDesc}
                  className="px-3 py-1 text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white rounded-md shadow-xs"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => setIsEditingDesc(true)}
              className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed p-3 rounded-lg bg-slate-50/70 dark:bg-[#111726] border border-slate-200/80 dark:border-slate-800/80 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-colors whitespace-pre-wrap"
            >
              {task.description || (
                <span className="text-slate-400 italic">No description provided. Click to add details...</span>
              )}
            </div>
          )}
        </div>

        {/* Subtasks Checklist */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Subtasks ({completedSubtasksCount}/{task.subtasks.length})
            </span>
            {task.subtasks.length > 0 && (
              <span className="text-xs font-mono text-slate-400">
                {Math.round((completedSubtasksCount / task.subtasks.length) * 100)}%
              </span>
            )}
          </div>

          {/* Progress bar */}
          {task.subtasks.length > 0 && (
            <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 mb-3 overflow-hidden">
              <div
                className="bg-brand-500 h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: `${(completedSubtasksCount / task.subtasks.length) * 100}%`,
                }}
              />
            </div>
          )}

          {/* Subtask Items */}
          <div className="space-y-1.5">
            {task.subtasks.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800/40 group transition-colors"
              >
                <label className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={sub.completed}
                    onChange={() => toggleSubtask(task.id, sub.id)}
                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                  />
                  <span
                    className={`truncate ${
                      sub.completed
                        ? 'line-through text-slate-400 dark:text-slate-500'
                        : 'text-slate-700 dark:text-slate-200 font-medium'
                    }`}
                  >
                    {sub.title}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => deleteSubtask(task.id, sub.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition-opacity p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Add Subtask Input */}
          <form onSubmit={handleAddSubtaskSubmit} className="mt-2 flex items-center gap-2">
            <input
              type="text"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              placeholder="Add new subtask checklist item..."
              className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:border-brand-500 outline-hidden"
            />
            <button
              type="submit"
              disabled={!newSubtaskTitle.trim()}
              className="px-3 py-1.5 text-xs font-semibold bg-brand-600 disabled:opacity-40 text-white rounded-lg hover:bg-brand-500"
            >
              Add
            </button>
          </form>
        </div>

        {/* Attachments */}
        <div>
          <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <Paperclip className="w-3.5 h-3.5" />
            Attachments ({task.attachments.length})
          </span>
          {task.attachments.length === 0 ? (
            <div className="p-3 text-center rounded-lg border border-dashed border-slate-300 dark:border-slate-800 text-xs text-slate-400">
              No files attached to this task.
            </div>
          ) : (
            <div className="space-y-1.5">
              {task.attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-brand-500 shrink-0" />
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                      {att.name}
                    </span>
                    <span className="text-[10px] text-slate-400">({att.size})</span>
                  </div>
                  <span className="text-[10px] text-slate-400">{att.uploadedAt}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Discussion / Comments Feed */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
          <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            Discussion & Activity ({task.comments.length})
          </span>

          {/* Comments list */}
          <div className="space-y-3 mb-4">
            {task.comments.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No comments yet. Start the conversation below.</p>
            ) : (
              task.comments.map((comm) => {
                const author = members.find((m) => m.id === comm.authorId);
                return (
                  <div
                    key={comm.id}
                    className="p-3 rounded-lg bg-slate-50/70 dark:bg-[#121826] border border-slate-200/80 dark:border-slate-800/80 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar member={author} size="xs" />
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {author?.name || 'User'}
                        </span>
                        <span className="text-[10px] text-slate-400">{author?.role}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(comm.timestamp).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed pl-6">
                      {comm.content}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          {/* Comment input form */}
          <form onSubmit={handleAddCommentSubmit} className="space-y-2">
            <div className="relative">
              <textarea
                rows={2}
                value={newCommentContent}
                onChange={(e) => setNewCommentContent(e.target.value)}
                placeholder="Write a comment or mention @teammate (⌘+Enter to submit)..."
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    handleAddCommentSubmit(e);
                  }
                }}
                className="w-full text-xs p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 outline-hidden focus:border-brand-500 leading-relaxed resize-none"
              />
              <div className="absolute right-2.5 bottom-2.5">
                <button
                  type="submit"
                  disabled={!newCommentContent.trim()}
                  className="flex items-center gap-1 px-3 py-1 bg-brand-600 disabled:opacity-40 text-white rounded-md text-xs font-semibold hover:bg-brand-500 shadow-xs"
                >
                  <Send className="w-3 h-3" />
                  <span>Send</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Drawer>
  );
};
