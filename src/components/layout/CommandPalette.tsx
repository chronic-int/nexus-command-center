import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  CheckSquare,
  FolderKanban,
  FileText,
  UserPlus,
  BarChart3,
  Calendar,
  LayoutDashboard,
  Users,
  Moon,
  Sun,
  Bell,
  Sparkles,
  Zap,
  SlidersHorizontal,
  RotateCcw,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface CommandItem {
  id: string;
  title: string;
  category: 'Navigation' | 'Actions' | 'Preferences' | 'Quick Access';
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  action: () => void;
}

export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    setActiveView,
    setActiveProjectId,
    setIsQuickCreateOpen,
    setQuickCreateDefaultTab,
    setIsNotificationDrawerOpen,
    theme,
    setTheme,
    density,
    setDensity,
    resetDemoData,
    projects,
  } = useApp();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global Keyboard Listener for ⌘K and /
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(!isCommandPaletteOpen);
      }
      if (e.key === '/' && !isCommandPaletteOpen && (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA')) {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, setIsCommandPaletteOpen]);

  // Focus input on open
  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isCommandPaletteOpen]);

  // Command Registry
  const commands: CommandItem[] = [
    // Actions
    {
      id: 'create-task',
      title: 'Create Task',
      category: 'Actions',
      icon: CheckSquare,
      shortcut: 'C',
      action: () => {
        setQuickCreateDefaultTab('task');
        setIsQuickCreateOpen(true);
      },
    },
    {
      id: 'create-project',
      title: 'Create Project',
      category: 'Actions',
      icon: FolderKanban,
      action: () => {
        setQuickCreateDefaultTab('project');
        setIsQuickCreateOpen(true);
      },
    },
    {
      id: 'create-doc',
      title: 'Create Document',
      category: 'Actions',
      icon: FileText,
      action: () => {
        setQuickCreateDefaultTab('document');
        setIsQuickCreateOpen(true);
      },
    },
    {
      id: 'invite-member',
      title: 'Invite Team Member',
      category: 'Actions',
      icon: UserPlus,
      action: () => {
        setQuickCreateDefaultTab('invite');
        setIsQuickCreateOpen(true);
      },
    },

    // Navigation
    {
      id: 'nav-overview',
      title: 'Go to Overview',
      category: 'Navigation',
      icon: LayoutDashboard,
      action: () => {
        setActiveView('overview');
        setActiveProjectId(null);
      },
    },
    {
      id: 'nav-projects',
      title: 'Go to Projects',
      category: 'Navigation',
      icon: FolderKanban,
      action: () => {
        setActiveView('projects');
        setActiveProjectId(null);
      },
    },
    {
      id: 'nav-calendar',
      title: 'Go to Calendar',
      category: 'Navigation',
      icon: Calendar,
      action: () => {
        setActiveView('calendar');
        setActiveProjectId(null);
      },
    },
    {
      id: 'nav-analytics',
      title: 'Go to Analytics',
      category: 'Navigation',
      icon: BarChart3,
      action: () => {
        setActiveView('analytics');
        setActiveProjectId(null);
      },
    },
    {
      id: 'nav-team',
      title: 'Go to Team',
      category: 'Navigation',
      icon: Users,
      action: () => {
        setActiveView('team');
        setActiveProjectId(null);
      },
    },
    {
      id: 'nav-docs',
      title: 'Go to Documents',
      category: 'Navigation',
      icon: FileText,
      action: () => {
        setActiveView('documents');
        setActiveProjectId(null);
      },
    },
    {
      id: 'nav-automations',
      title: 'Go to Automations',
      category: 'Navigation',
      icon: Zap,
      action: () => {
        setActiveView('automations');
        setActiveProjectId(null);
      },
    },

    // Preferences
    {
      id: 'toggle-theme',
      title: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`,
      category: 'Preferences',
      icon: theme === 'dark' ? Sun : Moon,
      action: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
    },
    {
      id: 'toggle-density',
      title: `Switch to ${density === 'comfortable' ? 'Compact' : 'Comfortable'} Density`,
      category: 'Preferences',
      icon: SlidersHorizontal,
      action: () => setDensity(density === 'comfortable' ? 'compact' : 'comfortable'),
    },
    {
      id: 'open-notifications',
      title: 'Open Notifications Drawer',
      category: 'Preferences',
      icon: Bell,
      action: () => setIsNotificationDrawerOpen(true),
    },
    {
      id: 'reset-demo',
      title: 'Reset Demo Data to Defaults',
      category: 'Preferences',
      icon: RotateCcw,
      action: () => resetDemoData(),
    },
  ];

  // Also include direct project jump commands
  projects.forEach((proj) => {
    commands.push({
      id: `project-${proj.id}`,
      title: `Open Project: ${proj.name} (${proj.key})`,
      category: 'Quick Access',
      icon: FolderKanban,
      action: () => {
        setActiveProjectId(proj.id);
        setActiveView('projects');
      },
    });
  });

  const filteredCommands = commands.filter((cmd) =>
    cmd.title.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  // Keyboard navigation inside palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
        setIsCommandPaletteOpen(false);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsCommandPaletteOpen(false);
    }
  };

  if (!isCommandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
        onClick={() => setIsCommandPaletteOpen(false)}
      />

      {/* Palette Container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
        className="relative w-full max-w-xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-2xl overflow-hidden z-10 animate-slide-down"
      >
        {/* Search Header */}
        <div className="flex items-center px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-4 h-4 text-slate-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search workspace..."
            className="w-full text-sm bg-transparent text-slate-900 dark:text-white placeholder-slate-400 outline-hidden"
          />
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 rounded">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No matching commands for "{query}"
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    setIsCommandPaletteOpen(false);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs ${
                    isSelected
                      ? 'bg-brand-500 text-white font-medium shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                    <span className="truncate">{cmd.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] uppercase font-semibold tracking-wider ${
                        isSelected ? 'text-white/80' : 'text-slate-400'
                      }`}
                    >
                      {cmd.category}
                    </span>
                    {cmd.shortcut && (
                      <kbd
                        className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {cmd.shortcut}
                      </kbd>
                    )}
                    {isSelected && <ArrowRight className="w-3 h-3 text-white" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Navigate with ↑ / ↓</span>
          <span>Select with ↵ Enter</span>
        </div>
      </div>
    </div>
  );
};
