import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Command,
  Plus,
  Bell,
  Sun,
  Moon,
  Laptop,
  ChevronRight,
  Sparkles,
  SlidersHorizontal,
  X,
  FileText,
  CheckSquare,
  FolderKanban,
  User as UserIcon,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../common/Avatar';

export const Topbar: React.FC = () => {
  const {
    activeView,
    activeProjectId,
    projects,
    tasks,
    members,
    documents,
    unreadNotificationsCount,
    setIsNotificationDrawerOpen,
    setIsCommandPaletteOpen,
    setIsQuickCreateOpen,
    setQuickCreateDefaultTab,
    theme,
    setTheme,
    density,
    setDensity,
    setActiveView,
    setActiveProjectId,
    setSelectedTaskId,
    setSelectedDocId,
    setSelectedMemberId,
  } = useApp();

  // Search popup state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search query to prevent typing latency under 10k items
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.toLowerCase().trim());
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filtered search results with early exit caps
  const searchResults = React.useMemo(() => {
    if (!debouncedQuery) return null;
    const q = debouncedQuery;

    const matchedProjects = [];
    for (let i = 0; i < projects.length && matchedProjects.length < 8; i++) {
      const p = projects[i];
      if (
        p.name.toLowerCase().includes(q) ||
        p.key.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      ) {
        matchedProjects.push(p);
      }
    }

    const matchedTasks = [];
    for (let i = 0; i < tasks.length && matchedTasks.length < 10; i++) {
      const t = tasks[i];
      if (
        t.title.toLowerCase().includes(q) ||
        t.key.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      ) {
        matchedTasks.push(t);
      }
    }

    const matchedMembers = [];
    for (let i = 0; i < members.length && matchedMembers.length < 6; i++) {
      const m = members[i];
      if (
        m.name.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q)
      ) {
        matchedMembers.push(m);
      }
    }

    const matchedDocs = [];
    for (let i = 0; i < documents.length && matchedDocs.length < 6; i++) {
      const d = documents[i];
      if (d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q)) {
        matchedDocs.push(d);
      }
    }

    return {
      projects: matchedProjects,
      tasks: matchedTasks,
      members: matchedMembers,
      documents: matchedDocs,
      total: matchedProjects.length + matchedTasks.length + matchedMembers.length + matchedDocs.length,
    };
  }, [debouncedQuery, projects, tasks, members, documents]);

  // Breadcrumbs text
  const currentProject = projects.find(p => p.id === activeProjectId);

  const getBreadcrumbs = () => {
    if (activeProjectId && currentProject) {
      return (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <button
            type="button"
            onClick={() => {
              setActiveView('projects');
              setActiveProjectId(null);
            }}
            className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            Projects
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
            {currentProject.name}
          </span>
        </div>
      );
    }

    const viewNames: Record<string, string> = {
      overview: 'Executive Overview',
      projects: 'Projects Directory',
      'my-tasks': 'My Tasks',
      calendar: 'Project Calendar',
      analytics: 'Operational Analytics',
      team: 'Team & Workload',
      documents: 'Documents & RFCs',
      inbox: 'Inbox & Notifications',
      automations: 'Automations Engine',
      settings: 'Settings & Workspace',
    };

    return (
      <div className="flex items-center gap-1.5 text-xs">
        <span className="text-slate-400 font-medium">NEXUS</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          {viewNames[activeView] || 'Overview'}
        </span>
      </div>
    );
  };

  return (
    <header className="h-14 border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-[#0b0f19]/90 backdrop-blur-md px-4 flex items-center justify-between gap-4 shrink-0 z-20">
      {/* Breadcrumbs */}
      <div className="flex items-center min-w-0">{getBreadcrumbs()}</div>

      {/* Global Search & Command Trigger */}
      <div ref={searchContainerRef} className="relative flex-1 max-w-md hidden sm:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            placeholder="Search projects, tasks, people, docs... (or Press /)"
            className="w-full pl-9 pr-20 py-1.5 text-xs bg-slate-100 dark:bg-[#121826] border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:bg-white dark:focus:bg-[#151c2e] focus:border-brand-500/80 focus:ring-1 focus:ring-brand-500/30 transition-all outline-hidden"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsCommandPaletteOpen(true)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 rounded flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100"
              title="Open Command Palette"
            >
              <Command className="w-2.5 h-2.5" />K
            </button>
          )}
        </div>

        {/* Live Search Results Dropdown */}
        {searchFocused && searchQuery.trim() && searchResults && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden max-h-96 overflow-y-auto z-50 animate-slide-down">
            {searchResults.total === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No matching results for "{searchQuery}"
              </div>
            ) : (
              <div className="p-2 space-y-3">
                {/* Projects */}
                {searchResults.projects.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1 flex items-center gap-1.5">
                      <FolderKanban className="w-3 h-3" /> Projects
                    </div>
                    {searchResults.projects.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setActiveProjectId(p.id);
                          setActiveView('projects');
                          setSearchFocused(false);
                          setSearchQuery('');
                        }}
                        className="px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/70 cursor-pointer flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                          <span className="font-medium text-slate-800 dark:text-slate-200">{p.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{p.key}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tasks */}
                {searchResults.tasks.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1 flex items-center gap-1.5">
                      <CheckSquare className="w-3 h-3" /> Tasks
                    </div>
                    {searchResults.tasks.slice(0, 5).map((t) => (
                      <div
                        key={t.id}
                        onClick={() => {
                          setSelectedTaskId(t.id);
                          setSearchFocused(false);
                          setSearchQuery('');
                        }}
                        className="px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/70 cursor-pointer flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                            {t.key}
                          </span>
                          <span className="text-slate-800 dark:text-slate-200 truncate">{t.title}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">{t.status}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* People */}
                {searchResults.members.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1 flex items-center gap-1.5">
                      <UserIcon className="w-3 h-3" /> People
                    </div>
                    {searchResults.members.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => {
                          setSelectedMemberId(m.id);
                          setSearchFocused(false);
                          setSearchQuery('');
                        }}
                        className="px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/70 cursor-pointer flex items-center gap-2.5 text-xs"
                      >
                        <Avatar member={m} size="xs" />
                        <div>
                          <p className="font-medium text-slate-800 dark:text-slate-200">{m.name}</p>
                          <p className="text-[10px] text-slate-400">{m.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Documents */}
                {searchResults.documents.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1 flex items-center gap-1.5">
                      <FileText className="w-3 h-3" /> Documents
                    </div>
                    {searchResults.documents.map((d) => (
                      <div
                        key={d.id}
                        onClick={() => {
                          setSelectedDocId(d.id);
                          setActiveView('documents');
                          setSearchFocused(false);
                          setSearchQuery('');
                        }}
                        className="px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/70 cursor-pointer flex items-center justify-between text-xs"
                      >
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate">{d.title}</span>
                        <span className="text-[10px] text-slate-400">{d.type}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Quick-Create Button */}
        <button
          type="button"
          onClick={() => {
            setQuickCreateDefaultTab('task');
            setIsQuickCreateOpen(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold shadow-xs shadow-brand-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New</span>
        </button>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={() => {
            const nextTheme = theme === 'dark' ? 'light' : 'dark';
            setTheme(nextTheme);
          }}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={`Theme: currently ${theme} (click to toggle)`}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Density Toggle */}
        <button
          type="button"
          onClick={() => {
            const nextDensity = density === 'comfortable' ? 'compact' : 'comfortable';
            setDensity(nextDensity);
          }}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors hidden sm:inline-flex"
          title={`Density: ${density} (click to switch)`}
          aria-label="Toggle interface density"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>

        {/* Notifications Bell */}
        <button
          type="button"
          onClick={() => setIsNotificationDrawerOpen(true)}
          className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Open notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-[#0b0f19] animate-pulse" />
          )}
        </button>

        {/* User Profile Avatar */}
        <div
          onClick={() => setActiveView('settings')}
          className="cursor-pointer pl-1 flex items-center gap-2 group"
          title="Alex Rivera (Settings)"
        >
          <Avatar
            name="Alex Rivera"
            avatarUrl="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
            size="sm"
            showStatus={true}
          />
        </div>
      </div>
    </header>
  );
};
