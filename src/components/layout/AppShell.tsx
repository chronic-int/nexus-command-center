import React from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Calendar,
  BarChart3,
  Users,
  FileText,
  Inbox,
  Zap,
  Settings,
  Plus,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { CommandPalette } from './CommandPalette';
import { NotificationDrawer } from './NotificationDrawer';
import { QuickCreateModal } from './QuickCreateModal';
import { ShortcutsModal } from './ShortcutsModal';
import { ToastContainer } from '../common/ToastContainer';
import { TaskDrawer } from '../projects/TaskDrawer';

import { OverviewDashboard } from '../dashboard/OverviewDashboard';
import { ProjectWorkspace } from '../projects/ProjectWorkspace';
import { ProjectsDirectory } from '../projects/ProjectsDirectory';
import { MyTasksView } from '../tasks/MyTasksView';
import { CalendarView } from '../calendar/CalendarView';
import { AnalyticsView } from '../analytics/AnalyticsView';
import { TeamView } from '../team/TeamView';
import { DocumentsView } from '../documents/DocumentsView';
import { InboxView } from '../inbox/InboxView';
import { AutomationsView } from '../automations/AutomationsView';
import { SettingsView } from '../settings/SettingsView';
import { ProfileView } from '../profile/ProfileView';

export const AppShell: React.FC = () => {
  const {
    activeView,
    activeProjectId,
    setActiveView,
    setActiveProjectId,
    setIsQuickCreateOpen,
    setQuickCreateDefaultTab,
    unreadNotificationsCount,
  } = useApp();

  const renderMainContent = () => {
    switch (activeView) {
      case 'overview':
        return <OverviewDashboard />;
      case 'projects':
        return activeProjectId ? <ProjectWorkspace /> : <ProjectsDirectory />;
      case 'my-tasks':
        return <MyTasksView />;
      case 'calendar':
        return <CalendarView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'team':
        return <TeamView />;
      case 'documents':
        return <DocumentsView />;
      case 'inbox':
        return <InboxView />;
      case 'automations':
        return <AutomationsView />;
      case 'settings':
        return <SettingsView />;
      case 'profile':
        return <ProfileView />;
      default:
        return <OverviewDashboard />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100">
      {/* Left Collapsible Sidebar */}
      <Sidebar />

      {/* Main App Canvas */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Global Navigation Bar */}
        <Topbar />

        {/* Dynamic Route Content */}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          {renderMainContent()}
        </main>

        {/* Mobile Bottom Quick Bar (< sm screen sizes) */}
        <nav
          className="sm:hidden h-14 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0b0f19]/95 backdrop-blur-md flex items-center justify-around px-2 shrink-0 z-20"
          aria-label="Mobile Navigation"
        >
          {[
            { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
            { id: 'projects', icon: FolderKanban, label: 'Projects' },
            { id: 'my-tasks', icon: CheckSquare, label: 'Tasks' },
            { id: 'calendar', icon: Calendar, label: 'Calendar' },
            { id: 'inbox', icon: Inbox, label: 'Inbox', badge: unreadNotificationsCount },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveView(item.id);
                  if (item.id !== 'projects') setActiveProjectId(null);
                }}
                className={`relative flex flex-col items-center justify-center p-1 rounded-lg text-[10px] font-medium transition-colors ${
                  isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-rose-500" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Global Overlays & Modals */}
      <CommandPalette />
      <NotificationDrawer />
      <QuickCreateModal />
      <TaskDrawer />
      <ShortcutsModal />
      <ToastContainer />
    </div>
  );
};
