import React, { useState } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  ExternalLink,
  Filter,
  Layers,
  Clock,
  MessageSquare,
  AlertCircle,
  FolderKanban,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Drawer } from '../common/Drawer';
import { NotificationCategory } from '../../types';

export const NotificationDrawer: React.FC = () => {
  const {
    isNotificationDrawerOpen,
    setIsNotificationDrawerOpen,
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

  const categories: (NotificationCategory | 'All')[] = [
    'All',
    'Assignments',
    'Mentions',
    'Deadlines',
    'System',
    'Project updates',
  ];

  const filtered = notifications.filter((n) => {
    if (selectedCategory === 'All') return true;
    return n.category === selectedCategory;
  });

  const handleNotificationClick = (n: typeof notifications[0]) => {
    markNotificationRead(n.id);
    if (n.targetType === 'task' && n.targetId) {
      setSelectedTaskId(n.targetId);
      setIsNotificationDrawerOpen(false);
    } else if (n.targetType === 'project' && n.targetId) {
      setActiveProjectId(n.targetId);
      setActiveView('projects');
      setIsNotificationDrawerOpen(false);
    } else if (n.targetType === 'document' && n.targetId) {
      setSelectedDocId(n.targetId);
      setActiveView('documents');
      setIsNotificationDrawerOpen(false);
    } else if (n.targetType === 'team') {
      setActiveView('team');
      setIsNotificationDrawerOpen(false);
    }
  };

  const getCategoryIcon = (category: NotificationCategory) => {
    switch (category) {
      case 'Assignments':
        return <Layers className="w-3.5 h-3.5 text-sky-500" />;
      case 'Mentions':
        return <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />;
      case 'Deadlines':
        return <Clock className="w-3.5 h-3.5 text-amber-500" />;
      case 'Project updates':
        return <FolderKanban className="w-3.5 h-3.5 text-emerald-500" />;
      case 'System':
      default:
        return <AlertCircle className="w-3.5 h-3.5 text-purple-500" />;
    }
  };

  return (
    <Drawer
      isOpen={isNotificationDrawerOpen}
      onClose={() => setIsNotificationDrawerOpen(false)}
      width="md"
      title={
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-brand-500" />
          <span>Notification Center</span>
        </div>
      }
      subtitle="Stay updated on assignments, mentions, and delivery risks"
      footer={
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={markAllNotificationsRead}
            className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all as read
          </button>
          <span className="text-xs text-slate-400">
            {notifications.filter((n) => !n.read).length} unread
          </span>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-brand-500 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* List of Notifications */}
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No notifications found in {selectedCategory}.
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((n) => (
              <div
                key={n.id}
                className={`group relative p-3 rounded-lg border transition-all ${
                  n.read
                    ? 'bg-white/40 dark:bg-slate-900/30 border-slate-200/60 dark:border-slate-800/50 text-slate-600 dark:text-slate-400'
                    : 'bg-white dark:bg-[#131929] border-brand-500/20 shadow-xs text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0 p-1.5 rounded-md bg-slate-100 dark:bg-slate-800">
                    {getCategoryIcon(n.category)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-semibold truncate flex items-center gap-1.5">
                        {n.title}
                        {!n.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
                        )}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0">{n.timestamp}</span>
                    </div>
                    <p className="text-xs mt-1 leading-relaxed text-slate-600 dark:text-slate-300">
                      {n.message}
                    </p>

                    {/* Action buttons */}
                    <div className="mt-2.5 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/50">
                      <button
                        type="button"
                        onClick={() => handleNotificationClick(n)}
                        className="text-[11px] font-medium text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                      >
                        <span>View details</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>

                      <div className="flex items-center gap-1">
                        {!n.read && (
                          <button
                            type="button"
                            onClick={() => markNotificationRead(n.id)}
                            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
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
            ))}
          </div>
        )}
      </div>
    </Drawer>
  );
};
