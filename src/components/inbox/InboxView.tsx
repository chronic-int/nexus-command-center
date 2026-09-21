import React, { useState } from 'react';
import {
  Inbox,
  CheckCheck,
  Check,
  Trash2,
  ExternalLink,
  Layers,
  MessageSquare,
  Clock,
  FolderKanban,
  AlertCircle,
  Filter,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NotificationCategory } from '../../types';

export const InboxView: React.FC = () => {
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    setSelectedTaskId,
    setActiveProjectId,
    setActiveView,
    setSelectedDocId,
  } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [unreadOnly, setUnreadOnly] = useState(false);

  const categories: (NotificationCategory | 'All')[] = [
    'All',
    'Assignments',
    'Mentions',
    'Deadlines',
    'System',
    'Project updates',
  ];

  const filtered = notifications.filter((n) => {
    if (unreadOnly && n.read) return false;
    if (selectedCategory === 'All') return true;
    return n.category === selectedCategory;
  });

  const handleNotificationClick = (n: typeof notifications[0]) => {
    markNotificationRead(n.id);
    if (n.targetType === 'task' && n.targetId) {
      setSelectedTaskId(n.targetId);
    } else if (n.targetType === 'project' && n.targetId) {
      setActiveProjectId(n.targetId);
      setActiveView('projects');
    } else if (n.targetType === 'document' && n.targetId) {
      setSelectedDocId(n.targetId);
      setActiveView('documents');
    } else if (n.targetType === 'team') {
      setActiveView('team');
    }
  };

  const getCategoryIcon = (category: NotificationCategory) => {
    switch (category) {
      case 'Assignments':
        return <Layers className="w-4 h-4 text-sky-500" />;
      case 'Mentions':
        return <MessageSquare className="w-4 h-4 text-indigo-500" />;
      case 'Deadlines':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'Project updates':
        return <FolderKanban className="w-4 h-4 text-emerald-500" />;
      case 'System':
      default:
        return <AlertCircle className="w-4 h-4 text-purple-500" />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 bg-slate-50/50 dark:bg-[#0b0f19]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Inbox className="w-4 h-4 text-brand-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
              Notification Hub
            </span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Workspace Inbox
          </h1>
          <p className="text-xs text-slate-500">
            Audit feed of mentions, task assignments, milestone deadlines, and system events
          </p>
        </div>

        <button
          type="button"
          onClick={markAllNotificationsRead}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold shadow-xs transition-colors"
        >
          <CheckCheck className="w-3.5 h-3.5 text-brand-500" />
          <span>Mark All as Read</span>
        </button>
      </div>

      {/* Filter Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800 text-xs shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 text-xs rounded-lg font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-brand-500 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => setUnreadOnly(e.target.checked)}
            className="rounded text-brand-600 focus:ring-brand-500 dark:bg-slate-800"
          />
          <span>Unread items only</span>
        </label>
      </div>

      {/* Feed List */}
      <div className="space-y-2.5 max-w-4xl">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 bg-white dark:bg-[#121826] rounded-2xl border border-slate-200 dark:border-slate-800">
            No notifications found in {selectedCategory}.
          </div>
        ) : (
          filtered.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-xl border transition-all ${
                n.read
                  ? 'bg-white/60 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/60 text-slate-600 dark:text-slate-400'
                  : 'bg-white dark:bg-[#121826] border-brand-500/30 shadow-xs text-slate-800 dark:text-slate-200 ring-1 ring-brand-500/10'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0 mt-0.5">
                  {getCategoryIcon(n.category)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {n.title}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {n.category}
                      </span>
                      {!n.read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse shrink-0" />
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono shrink-0">
                      {n.timestamp}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    {n.message}
                  </p>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                    <button
                      type="button"
                      onClick={() => handleNotificationClick(n)}
                      className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                    >
                      <span>Jump to target object</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>

                    <div className="flex items-center gap-1">
                      {!n.read && (
                        <button
                          type="button"
                          onClick={() => markNotificationRead(n.id)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                          title="Mark as read"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteNotification(n.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-500"
                        title="Delete notification"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
