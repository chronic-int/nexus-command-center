import React, { useState, useRef, useMemo } from 'react';
import {
  Settings,
  User,
  SlidersHorizontal,
  Bell,
  Keyboard,
  RotateCcw,
  Sun,
  Moon,
  Laptop,
  Layers,
  Download,
  Upload,
  HardDrive,
  Info,
  Search,
  CheckSquare,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../common/Avatar';
import { ThemeMode, DensityMode, ReducedMotionMode, ViewTab, TaskPriority } from '../../types';
import { ResetWorkspaceModal } from './ResetWorkspaceModal';
import { ImportPreviewModal } from './ImportPreviewModal';

type SettingsTabId =
  | 'profile'
  | 'appearance'
  | 'workspace'
  | 'notifications'
  | 'productivity'
  | 'data'
  | 'about';

interface TabDefinition {
  id: SettingsTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  keywords: string[];
}

const SETTINGS_TABS: TabDefinition[] = [
  {
    id: 'profile',
    label: 'Personal Profile',
    icon: User,
    description: 'Identity, professional role, working hours, and availability',
    keywords: ['name', 'email', 'avatar', 'photo', 'role', 'bio', 'title', 'availability', 'working hours', 'schedule'],
  },
  {
    id: 'appearance',
    label: 'Appearance & Density',
    icon: SlidersHorizontal,
    description: 'Interface theming, row density, motion, and sidebar layout',
    keywords: ['dark', 'light', 'theme', 'density', 'comfortable', 'compact', 'contrast', 'motion', 'animation', 'sidebar'],
  },
  {
    id: 'workspace',
    label: 'Workspace Configuration',
    icon: Layers,
    description: 'Workspace identity, key conventions, working days, and default behaviors',
    keywords: ['workspace', 'tenant', 'name', 'prefix', 'key', 'working days', 'timezone', 'priority'],
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    description: 'In-app alert categories, desktop notifications, and delivery rules',
    keywords: ['notifications', 'alerts', 'browser', 'mentions', 'deadlines', 'assignments', 'inbox', 'activity'],
  },
  {
    id: 'productivity',
    label: 'Productivity & Views',
    icon: CheckSquare,
    description: 'Default landing pages, project views, start of week, and hotkeys',
    keywords: ['landing page', 'view', 'board', 'list', 'calendar', 'start of week', 'monday', 'sunday', 'shortcuts', 'hotkeys'],
  },
  {
    id: 'data',
    label: 'Data & Storage',
    icon: HardDrive,
    description: 'Storage health, JSON export, schema-validated import, and reset',
    keywords: ['data', 'storage', 'indexeddb', 'export', 'import', 'backup', 'restore', 'reset', 'size', 'save'],
  },
  {
    id: 'about',
    label: 'About NEXUS',
    icon: Info,
    description: 'Local-first architecture, system guarantees, and build version',
    keywords: ['about', 'version', 'architecture', 'offline', 'privacy', 'local-first'],
  },
];

export const SettingsView: React.FC = () => {
  const {
    theme,
    setTheme,
    density,
    setDensity,
    reducedMotion,
    setReducedMotion,
    sidebarCollapsed,
    setSidebarCollapsed,
    userProfile,
    updateUserProfile,
    workspaceSettings,
    updateWorkspaceSettings,
    productivitySettings,
    updateProductivitySettings,
    notificationPreferences,
    updateNotificationPreferences,
    settingsTab,
    setSettingsTab,
    resetDemoData,
    exportWorkspaceData,
    validateImportPayload,
    importWorkspaceData,
    persistenceStatus,
    projects,
    tasks,
    members,
    documents,
    automations,
    activities,
    setActiveView,
    setIsShortcutsModalOpen,
    addToast,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importCounts, setImportCounts] = useState<Record<string, number>>({});
  const [importPayload, setImportPayload] = useState<any>(null);
  const [importFileName, setImportFileName] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const importFileInputRef = useRef<HTMLInputElement>(null);

  // Filter tabs when user searches
  const filteredTabs = useMemo(() => {
    if (!searchQuery.trim()) return SETTINGS_TABS;
    const q = searchQuery.toLowerCase();
    return SETTINGS_TABS.filter(
      (t) =>
        t.label.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.keywords.some((k) => k.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  // Approximate storage footprint in KB
  const storageFootprintKB = useMemo(() => {
    try {
      const serialized = JSON.stringify({
        projects,
        tasks,
        members,
        documents,
        automations,
        activities,
        userProfile,
        workspaceSettings,
      });
      return (serialized.length / 1024).toFixed(1);
    } catch {
      return '48.2';
    }
  }, [projects, tasks, members, documents, automations, activities, userProfile, workspaceSettings]);

  // Handle Import File Selection
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const validation = validateImportPayload(content);

      if (!validation.valid) {
        setImportError(validation.error || 'Failed to validate workspace schema.');
        return;
      }

      setImportCounts(validation.counts || {});
      setImportPayload(validation.payload);
      setIsImportModalOpen(true);
    };

    reader.onerror = () => {
      setImportError('Failed to read file from disk.');
    };

    reader.readAsText(file);
    // Reset file input so re-selecting the same file fires onChange
    e.target.value = '';
  };

  const handleConfirmImport = async () => {
    if (!importPayload) return;
    const res = await importWorkspaceData(importPayload);
    if (!res.success) {
      setImportError(res.error || 'Import failed.');
    }
  };

  // Browser Notifications Permission Trigger
  const handleRequestBrowserNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      addToast({
        type: 'warning',
        title: 'Unsupported Feature',
        message: 'Your browser does not support desktop notifications.',
      });
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        updateNotificationPreferences({ browserNotifications: true });
        addToast({
          type: 'success',
          title: 'Notifications Enabled',
          message: 'Browser desktop notifications are now active.',
        });
      } else {
        updateNotificationPreferences({ browserNotifications: false });
        addToast({
          type: 'info',
          title: 'Permission Denied',
          message: 'Browser notification permission was not granted.',
        });
      }
    } catch (err) {
      console.warn('Notification permission error:', err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 bg-slate-50/50 dark:bg-[#0b0f19]">
      {/* Hidden File Input for Workspace Import */}
      <input
        ref={importFileInputRef}
        type="file"
        accept="application/json,.json"
        onChange={handleFileSelected}
        className="hidden"
        aria-hidden="true"
      />

      {/* Settings Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Settings className="w-4 h-4 text-brand-500" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
              System Configuration & Preferences
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Settings & Workspace
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your personal profile, theming, workspace defaults, and local data persistence.
          </p>
        </div>

        {/* Global Quick Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={exportWorkspaceData}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Download workspace JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            type="button"
            onClick={() => setIsResetModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Workspace</span>
          </button>
        </div>
      </div>

      {/* Settings Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search settings (e.g. dark mode, timezone, export)..."
          className="w-full pl-10 pr-4 py-2 text-xs bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-hidden transition-all shadow-xs"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
          >
            Clear
          </button>
        )}
      </div>

      {/* Main Settings Body */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Navigation Sidebar (Desktop) / Segmented Tabs (Mobile) */}
        <div className="w-full md:w-64 space-y-1 shrink-0">
          {/* Mobile Tab Scroll / Selector */}
          <div className="md:hidden flex overflow-x-auto gap-1 pb-2">
            {filteredTabs.map((t) => {
              const Icon = t.icon;
              const isActive = settingsTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSettingsTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                    isActive
                      ? 'bg-brand-600 text-white'
                      : 'bg-white dark:bg-[#121826] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Desktop Tab List */}
          <div className="hidden md:block space-y-1 bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-xs">
            {filteredTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = settingsTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSettingsTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{tab.label}</p>
                  </div>
                </button>
              );
            })}

            <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800/80">
              <button
                type="button"
                onClick={() => setIsShortcutsModalOpen(true)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Keyboard className="w-4 h-4" />
                  <span>Keyboard Hotkeys</span>
                </div>
                <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[10px] border border-slate-200 dark:border-slate-700">
                  ?
                </kbd>
              </button>
            </div>
          </div>
        </div>

        {/* Content Pane */}
        <div className="flex-1 min-w-0 bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xs">
          {/* TAB 1: PERSONAL PROFILE */}
          {settingsTab === 'profile' && (
            <div className="space-y-6 max-w-2xl text-xs">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  Personal Profile & Workspace Identity
                </h2>
                <p className="text-slate-500">
                  Manage how you appear to teammates across assigned initiatives, task cards, and comments.
                </p>
              </div>

              {/* Profile Card Summary */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Avatar
                    name={userProfile.name}
                    avatarUrl={userProfile.avatar}
                    status={userProfile.availability}
                    size="xl"
                    showStatus={true}
                  />
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      {userProfile.name}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400">
                      {userProfile.role} • {userProfile.department}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 font-mono">
                      {userProfile.email}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveView('profile')}
                  className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl shadow-xs transition-colors shrink-0"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Open Full Profile View</span>
                </button>
              </div>

              {/* Quick Profile Attribute Editor */}
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={userProfile.name}
                      onChange={(e) => updateUserProfile({ name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white outline-hidden focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={userProfile.email}
                      onChange={(e) => updateUserProfile({ email: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white outline-hidden focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Primary Role / Title
                    </label>
                    <input
                      type="text"
                      value={userProfile.role}
                      onChange={(e) => updateUserProfile({ role: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white outline-hidden focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      value={userProfile.department}
                      onChange={(e) => updateUserProfile({ department: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white outline-hidden focus:border-brand-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Short Bio
                  </label>
                  <textarea
                    rows={2}
                    value={userProfile.bio}
                    onChange={(e) => updateUserProfile({ bio: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white outline-hidden focus:border-brand-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: APPEARANCE & DENSITY */}
          {settingsTab === 'appearance' && (
            <div className="space-y-6 max-w-xl text-xs">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  Interface Theme & Density
                </h2>
                <p className="text-slate-500">
                  Customizations take effect immediately across all workspace views without requiring a page reload.
                </p>
              </div>

              {/* Theme Mode Selector */}
              <div>
                <label className="block font-bold text-slate-900 dark:text-white mb-2">
                  Color Contrast & Theme
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'dark' as ThemeMode, label: 'Dark Mode', icon: Moon, desc: 'High-contrast obsidian' },
                    { id: 'light' as ThemeMode, label: 'Light Mode', icon: Sun, desc: 'Clean editorial paper' },
                    { id: 'system' as ThemeMode, label: 'Match System', icon: Laptop, desc: 'Follows OS preference' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTheme(item.id)}
                      className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                        theme === item.id
                          ? 'border-brand-500 bg-brand-500/5 ring-2 ring-brand-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30'
                      }`}
                    >
                      <item.icon className="w-5 h-5 text-brand-500 mb-2" />
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{item.label}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{item.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Density Mode Selector */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <label className="block font-bold text-slate-900 dark:text-white mb-2">
                  Information Density
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'comfortable' as DensityMode, label: 'Comfortable', desc: 'Standard 8px padding, relaxed reading' },
                    { id: 'compact' as DensityMode, label: 'Compact', desc: 'High-density 4px padding for maximum viewport data' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setDensity(item.id)}
                      className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                        density === item.id
                          ? 'border-brand-500 bg-brand-500/5 ring-2 ring-brand-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30'
                      }`}
                    >
                      <p className="font-bold text-slate-900 dark:text-white">{item.label}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{item.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reduced Motion Setting */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <label className="block font-bold text-slate-900 dark:text-white mb-2">
                  Motion & Animation
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'system' as ReducedMotionMode, label: 'Follow OS', desc: 'Automatic' },
                    { id: 'always' as ReducedMotionMode, label: 'Reduce Motion', desc: 'Minimal transitions' },
                    { id: 'never' as ReducedMotionMode, label: 'Standard Motion', desc: 'Fluid animations' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setReducedMotion(item.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        reducedMotion === item.id
                          ? 'border-brand-500 bg-brand-500/5 ring-2 ring-brand-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30'
                      }`}
                    >
                      <p className="font-bold text-slate-900 dark:text-white">{item.label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{item.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sidebar Default Behavior */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 cursor-pointer">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Collapse Sidebar by Default</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Starts navigation in compact icon-only mode to maximize board area.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={sidebarCollapsed}
                    onChange={(e) => setSidebarCollapsed(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB 3: WORKSPACE CONFIGURATION */}
          {settingsTab === 'workspace' && (
            <div className="space-y-5 max-w-xl text-xs">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  Workspace Identity & Defaults
                </h2>
                <p className="text-slate-500">
                  Configure workspace name, prefix conventions, and project scheduling boundaries.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Workspace Display Name
                </label>
                <input
                  type="text"
                  value={workspaceSettings.name}
                  onChange={(e) => updateWorkspaceSettings({ name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white outline-hidden focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Workspace Description
                </label>
                <textarea
                  rows={2}
                  value={workspaceSettings.description}
                  onChange={(e) => updateWorkspaceSettings({ description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white outline-hidden focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Default Project Key Prefix
                  </label>
                  <input
                    type="text"
                    value={workspaceSettings.projectKeyPrefix}
                    onChange={(e) =>
                      updateWorkspaceSettings({ projectKeyPrefix: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono uppercase outline-hidden focus:border-brand-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Used for newly created initiatives.</p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Default Task Priority
                  </label>
                  <select
                    value={workspaceSettings.defaultTaskPriority}
                    onChange={(e) =>
                      updateWorkspaceSettings({ defaultTaskPriority: e.target.value as TaskPriority })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white outline-hidden focus:border-brand-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Workspace Base Timezone
                </label>
                <select
                  value={workspaceSettings.timezone}
                  onChange={(e) => updateWorkspaceSettings({ timezone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white outline-hidden focus:border-brand-500"
                >
                  <option value="America/New_York (UTC-5)">America/New_York (UTC-5 Eastern)</option>
                  <option value="America/Chicago (UTC-6)">America/Chicago (UTC-6 Central)</option>
                  <option value="America/Los_Angeles (UTC-8)">America/Los_Angeles (UTC-8 Pacific)</option>
                  <option value="Europe/London (UTC+0)">Europe/London (UTC+0 GMT/BST)</option>
                  <option value="Europe/Berlin (UTC+1)">Europe/Berlin (UTC+1 CET)</option>
                  <option value="Asia/Tokyo (UTC+9)">Asia/Tokyo (UTC+9 JST)</option>
                </select>
              </div>

              <div className="pt-2">
                <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 cursor-pointer">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Auto-Assign New Tasks to Creator</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Automatically assigns newly created items to your personal account by default.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={workspaceSettings.autoAssignCreator}
                    onChange={(e) =>
                      updateWorkspaceSettings({ autoAssignCreator: e.target.checked })
                    }
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB 4: NOTIFICATIONS */}
          {settingsTab === 'notifications' && (
            <div className="space-y-6 max-w-xl text-xs">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  Notification Preferences & Alert Dispatch
                </h2>
                <p className="text-slate-500">
                  Control which category events trigger in-app alert badges and browser notifications.
                </p>
              </div>

              {/* Master Toggles */}
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 cursor-pointer">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">In-App Notification Drawer</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Enable notification badges and alert log in the top bar.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationPreferences.inAppNotifications}
                    onChange={(e) =>
                      updateNotificationPreferences({ inAppNotifications: e.target.checked })
                    }
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                </label>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Browser Desktop Notifications</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      OS-level desktop notifications when important tasks change while tab is hidden.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRequestBrowserNotifications}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0 ${
                      notificationPreferences.browserNotifications
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-brand-600 hover:bg-brand-500 text-white'
                    }`}
                  >
                    {notificationPreferences.browserNotifications ? 'Permission Active' : 'Request Permission'}
                  </button>
                </div>
              </div>

              {/* Category Preferences */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <label className="block font-bold text-slate-900 dark:text-white">
                  Event Category Subscriptions
                </label>

                {[
                  { key: 'assignments', label: 'Task Assignments', desc: 'Notify when tasks are assigned to you' },
                  { key: 'mentions', label: 'Direct Mentions', desc: 'Notify when your name is tagged in comments' },
                  { key: 'deadlines', label: 'Deadline Warnings', desc: 'Warn 48 hours prior to milestone expiration' },
                  { key: 'projectUpdates', label: 'Project Health Changes', desc: 'Alert when project status flips to At Risk' },
                  { key: 'automationEvents', label: 'Automation Rules', desc: 'Triggered when background automations execute' },
                  { key: 'workspaceActivity', label: 'General Workspace Stream', desc: 'Audit log of invitations and doc edits' },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#151c2e] border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{item.label}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={
                        notificationPreferences.categories[
                          item.key as keyof typeof notificationPreferences.categories
                        ]
                      }
                      onChange={(e) =>
                        updateNotificationPreferences({
                          categories: {
                            ...notificationPreferences.categories,
                            [item.key]: e.target.checked,
                          },
                        })
                      }
                      className="rounded text-brand-600 focus:ring-brand-500"
                    />
                  </label>
                ))}
              </div>

              {/* Honest Delivery Disclaimer */}
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0 text-slate-400" />
                <span>
                  <strong>Honest Notice:</strong> NEXUS runs local-first. SMS and external SMTP email delivery are not active without a custom webhook gateway.
                </span>
              </div>
            </div>
          )}

          {/* TAB 5: PRODUCTIVITY */}
          {settingsTab === 'productivity' && (
            <div className="space-y-6 max-w-xl text-xs">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  Productivity & Workspace Workflow
                </h2>
                <p className="text-slate-500">
                  Configure default views, calendar behaviors, and keyboard navigation.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Default Landing View
                  </label>
                  <select
                    value={productivitySettings.defaultLandingPage}
                    onChange={(e) =>
                      updateProductivitySettings({ defaultLandingPage: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white outline-hidden focus:border-brand-500"
                  >
                    <option value="overview">Executive Overview</option>
                    <option value="my-tasks">My Tasks</option>
                    <option value="projects">Projects Directory</option>
                    <option value="calendar">Project Calendar</option>
                    <option value="team">Team & Workload</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Default Project Tab
                  </label>
                  <select
                    value={productivitySettings.defaultProjectTab}
                    onChange={(e) =>
                      updateProductivitySettings({ defaultProjectTab: e.target.value as ViewTab })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white outline-hidden focus:border-brand-500"
                  >
                    <option value="Board">Kanban Board</option>
                    <option value="List">Task List View</option>
                    <option value="Timeline">Timeline / Gantt</option>
                    <option value="Overview">Initiative Overview</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Start of Week
                  </label>
                  <select
                    value={productivitySettings.startOfWeek}
                    onChange={(e) =>
                      updateProductivitySettings({
                        startOfWeek: e.target.value as 'monday' | 'sunday',
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white outline-hidden focus:border-brand-500"
                  >
                    <option value="monday">Monday (ISO standard)</option>
                    <option value="sunday">Sunday</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Quick Create Action
                  </label>
                  <select
                    value={productivitySettings.quickCreateAutoOpen ? 'open' : 'toast'}
                    onChange={(e) =>
                      updateProductivitySettings({
                        quickCreateAutoOpen: e.target.value === 'open',
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white outline-hidden focus:border-brand-500"
                  >
                    <option value="open">Open task drawer on creation</option>
                    <option value="toast">Close and show confirmation toast</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 cursor-pointer">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Enable Global Keyboard Shortcuts</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Hotkeys like ⌘K, /, C, and ? for power navigation.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={productivitySettings.keyboardShortcutsEnabled}
                    onChange={(e) =>
                      updateProductivitySettings({
                        keyboardShortcutsEnabled: e.target.checked,
                      })
                    }
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB 6: DATA & STORAGE */}
          {settingsTab === 'data' && (
            <div className="space-y-6 max-w-2xl text-xs">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  Local Storage & Data Portability
                </h2>
                <p className="text-slate-500">
                  NEXUS uses local client storage with no third-party cloud database required.
                </p>
              </div>

              {/* Storage Overview Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Storage Model
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">IndexedDB</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">+ LocalStorage sync</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Sync Status
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    {persistenceStatus === 'saved' ? 'Healthy & Saved' : persistenceStatus}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">Dual persistence</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Workspace Size
                  </span>
                  <span className="font-bold font-mono text-slate-900 dark:text-white">
                    ~{storageFootprintKB} KB
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">Serialized payload</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Total Records
                  </span>
                  <span className="font-bold font-mono text-slate-900 dark:text-white">
                    {projects.length + tasks.length + members.length + documents.length}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">Across all models</p>
                </div>
              </div>

              {/* Data Portability: Export & Import */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Export Card */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Download className="w-4 h-4 text-brand-500" /> Export Workspace Data
                    </h3>
                    <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                      Download a structured, versioned JSON backup containing all projects, tasks, comments, settings, and personal profiles.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={exportWorkspaceData}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-semibold shadow-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Backup (.json)</span>
                  </button>
                </div>

                {/* Import Card */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Upload className="w-4 h-4 text-emerald-500" /> Import Workspace Backup
                    </h3>
                    <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                      Restore a previously exported NEXUS JSON dataset. Files are verified for structural integrity before applying.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => importFileInputRef.current?.click()}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-semibold transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Select File to Restore...</span>
                  </button>
                </div>
              </div>

              {/* Import Error Banner if invalid JSON */}
              {importError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Import Verification Failed</p>
                      <p className="text-[11px] mt-0.5">{importError}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setImportError(null)}
                    className="p-1 hover:text-rose-700"
                  >
                    Clear
                  </button>
                </div>
              )}

              {/* Danger Zone: Reset Workspace */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-rose-600 dark:text-rose-400">
                      Reset Workspace to Defaults
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      Erase local custom modifications and return to the reference starter dataset.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsResetModalOpen(true)}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl shadow-xs transition-colors shrink-0"
                  >
                    Reset Workspace
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: ABOUT */}
          {settingsTab === 'about' && (
            <div className="space-y-5 max-w-xl text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  About NEXUS Command Center
                </h2>
                <p className="text-slate-500">
                  Version 2.5 • Engineering & Operational Command Environment
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-2">
                <h3 className="font-bold text-slate-900 dark:text-white">Local-First Architecture</h3>
                <p>
                  NEXUS is engineered as a zero-cloud dependency, local-first mission control system. Data resides in client IndexedDB and synchronized browser memory. No telemetry or proprietary tracking packages are loaded.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="font-bold text-slate-900 dark:text-white">Core Technology Stack</h3>
                <ul className="space-y-1 list-disc pl-4 text-slate-500 dark:text-slate-400 text-[11px]">
                  <li>React 19 & TypeScript strict architecture</li>
                  <li>Transactional Monotonic Domain State Engine</li>
                  <li>Multi-Tab synchronization via BroadcastChannel</li>
                  <li>IndexedDB with graceful in-memory localStorage fallback</li>
                  <li>Tailwind CSS design token system</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Structured Reset Workspace Modal */}
      <ResetWorkspaceModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={resetDemoData}
      />

      {/* Safe Import Verification & Preview Modal */}
      <ImportPreviewModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onConfirm={handleConfirmImport}
        counts={importCounts}
        fileName={importFileName}
        sourceClient={importPayload?.client}
        exportedAt={importPayload?.exportedAt}
      />
    </div>
  );
};
