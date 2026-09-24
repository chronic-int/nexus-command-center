import React, { useState } from 'react';
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
  User,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  Command,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Sidebar: React.FC = () => {
  const {
    activeView,
    setActiveView,
    workspaceSettings,
    activeProjectId,
    setActiveProjectId,
    projects,
    tasks,
    unreadNotificationsCount,
    sidebarCollapsed,
    setSidebarCollapsed,
    setIsQuickCreateOpen,
    setQuickCreateDefaultTab,
    setIsCommandPaletteOpen,
  } = useApp();

  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState('Acme Core Platform');

  const workspaces = [
    { name: 'Acme Core Platform', tier: 'Enterprise Plan', members: 42 },
    { name: 'Hyperion Labs', tier: 'Pro Plan', members: 12 },
    { name: 'Apex AI Ventures', tier: 'Team Plan', members: 8 },
  ];

  // My open tasks count
  const myOpenTasksCount = tasks.filter(t => t.assigneeId === 'user-1' && t.status !== 'Done').length;

  const mainNav = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'projects', label: 'Projects', icon: FolderKanban, badge: projects.length },
    { id: 'my-tasks', label: 'My Tasks', icon: CheckSquare, badge: myOpenTasksCount },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'documents', label: 'Documents', icon: FileText },
  ];

  const secondaryNav = [
    { id: 'inbox', label: 'Inbox', icon: Inbox, badge: unreadNotificationsCount },
    { id: 'automations', label: 'Automations', icon: Zap },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (viewId: string) => {
    setActiveView(viewId);
    if (viewId !== 'projects') {
      setActiveProjectId(null);
    }
  };

  const handleProjectClick = (projectId: string) => {
    setActiveProjectId(projectId);
    setActiveView('projects');
  };

  return (
    <aside
      className={`relative flex flex-col border-r border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#0b0f19] transition-all duration-300 ease-in-out shrink-0 select-none z-30 ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand & Workspace Switcher */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800/80">
        <div className="flex items-center justify-between">
          <div
            onClick={() => handleNavClick('overview')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            {!sidebarCollapsed && (
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                  NEXUS
                  <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded">
                    v2.5
                  </span>
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">Command Center</span>
              </div>
            )}
          </div>

          {!sidebarCollapsed && (
            <button
              type="button"
              onClick={() => setSidebarCollapsed(true)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Workspace Dropdown */}
        {!sidebarCollapsed && (
          <div className="relative mt-3">
            <button
              type="button"
              onClick={() => setWorkspaceOpen(!workspaceOpen)}
              className="w-full flex items-center justify-between p-2 rounded-lg bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800 text-left hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-xs"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {workspaceSettings?.name || activeWorkspace}
                </p>
                <p className="text-[10px] text-slate-400">Enterprise Workspace</p>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${workspaceOpen ? 'rotate-180' : ''}`} />
            </button>

            {workspaceOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 p-1.5 rounded-lg bg-white dark:bg-[#151c2d] border border-slate-200 dark:border-slate-700/80 shadow-xl z-50 animate-slide-down">
                <div className="text-[10px] font-semibold uppercase text-slate-400 px-2 py-1">
                  Switch Workspace
                </div>
                {workspaces.map((ws) => (
                  <button
                    key={ws.name}
                    type="button"
                    onClick={() => {
                      setActiveWorkspace(ws.name);
                      setWorkspaceOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs flex items-center justify-between transition-colors ${
                      activeWorkspace === ws.name
                        ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 font-medium'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{ws.name}</span>
                    <span className="text-[10px] text-slate-400">{ws.tier}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-5">
        <div>
          {!sidebarCollapsed && (
            <div className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Workspace
            </div>
          )}
          <nav className="space-y-0.5" aria-label="Main Navigation">
            {mainNav.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id && (item.id !== 'projects' || activeProjectId === null);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-800/60'
                  } ${sidebarCollapsed ? 'justify-center px-2' : ''}`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span className="truncate flex-1 text-left">{item.label}</span>}
                  {!sidebarCollapsed && item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Recent Projects */}
        <div>
          {!sidebarCollapsed && (
            <div className="flex items-center justify-between px-2 mb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Projects
              </span>
              <button
                type="button"
                onClick={() => {
                  setQuickCreateDefaultTab('project');
                  setIsQuickCreateOpen(true);
                }}
                className="text-slate-400 hover:text-brand-500 transition-colors p-0.5"
                title="New Project"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <div className="space-y-0.5">
            {projects.map((proj) => {
              const isSelected = activeProjectId === proj.id;
              return (
                <button
                  key={proj.id}
                  type="button"
                  onClick={() => handleProjectClick(proj.id)}
                  title={sidebarCollapsed ? proj.name : undefined}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-brand-500/15 text-brand-600 dark:text-brand-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-800/60'
                  } ${sidebarCollapsed ? 'justify-center px-2' : ''}`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: proj.color }}
                  />
                  {!sidebarCollapsed && (
                    <span className="truncate flex-1 text-left">{proj.name}</span>
                  )}
                  {!sidebarCollapsed && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      {proj.progress}%
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary Navigation */}
        <div>
          {!sidebarCollapsed && (
            <div className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              System
            </div>
          )}
          <nav className="space-y-0.5" aria-label="System Navigation">
            {secondaryNav.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-800/60'
                  } ${sidebarCollapsed ? 'justify-center px-2' : ''}`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span className="truncate flex-1 text-left">{item.label}</span>}
                  {!sidebarCollapsed && item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full ${
                        item.id === 'inbox'
                          ? 'bg-rose-500 text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer / Expand Button / Command helper */}
      <div className="p-2 border-t border-slate-200 dark:border-slate-800/80 bg-slate-100/50 dark:bg-slate-900/40">
        {sidebarCollapsed ? (
          <button
            type="button"
            onClick={() => setSidebarCollapsed(false)}
            className="w-full flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
            title="Expand sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex items-center justify-between px-2 py-1 text-[11px] text-slate-400">
            <button
              type="button"
              onClick={() => setIsCommandPaletteOpen(true)}
              className="flex items-center gap-1.5 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <Command className="w-3.5 h-3.5 text-slate-400" />
              <span>Command Palette</span>
            </button>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-2xs">
              ⌘K
            </kbd>
          </div>
        )}
      </div>
    </aside>
  );
};
