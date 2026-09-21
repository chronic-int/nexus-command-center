import React, { useState } from 'react';
import {
  Settings,
  User,
  SlidersHorizontal,
  Bell,
  Keyboard,
  Share2,
  RotateCcw,
  Sun,
  Moon,
  Laptop,
  Check,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../common/Avatar';
import { ThemeMode, DensityMode } from '../../types';

export const SettingsView: React.FC = () => {
  const {
    theme,
    setTheme,
    density,
    setDensity,
    resetDemoData,
    addToast,
    setIsShortcutsModalOpen,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'appearance' | 'profile' | 'workspace' | 'notifications' | 'integrations'>('appearance');

  // Profile Form state
  const [name, setName] = useState('Alex Rivera');
  const [email, setEmail] = useState('alex.rivera@nexus.io');
  const [role, setRole] = useState('Staff Product Engineer');

  // Integrations state
  const [integrations, setIntegrations] = useState([
    { id: 'github', name: 'GitHub Enterprise', desc: 'Sync PR branches and commits to tasks', connected: true },
    { id: 'slack', name: 'Slack Workspaces', desc: 'Channel alert dispatch for urgent blockers', connected: true },
    { id: 'figma', name: 'Figma Token Sync', desc: 'Auto-sync design tokens to repository CSS', connected: false },
    { id: 'sentry', name: 'Sentry Error Telemetry', desc: 'Auto-create tasks on regression anomalies', connected: true },
  ]);

  const toggleIntegration = (id: string) => {
    setIntegrations(prev =>
      prev.map(item => {
        if (item.id !== id) return item;
        const connected = !item.connected;
        addToast({
          type: 'info',
          title: `${item.name} ${connected ? 'Connected' : 'Disconnected'}`,
          duration: 2000,
        });
        return { ...item, connected };
      })
    );
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    addToast({
      type: 'success',
      title: 'Profile Updated',
      message: 'Your personal information was saved successfully.',
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 bg-slate-50/50 dark:bg-[#0b0f19]">
      {/* Settings Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Settings className="w-4 h-4 text-brand-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
              System Configuration
            </span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Workspace Preferences & Settings
          </h1>
          <p className="text-xs text-slate-500">
            Control appearance theming, interface density, personal profile, and external integrations
          </p>
        </div>

        {/* Reset Demo Data Button */}
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Reset all demo data (projects, tasks, automations) back to original state?')) {
              resetDemoData();
            }
          }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded-lg text-xs font-semibold shadow-xs transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Demo Data</span>
        </button>
      </div>

      {/* Main Settings Body */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Navigation Sidebar */}
        <div className="w-full md:w-56 space-y-1 shrink-0">
          {[
            { id: 'appearance', label: 'Appearance & Density', icon: SlidersHorizontal },
            { id: 'profile', label: 'Personal Profile', icon: User },
            { id: 'workspace', label: 'Workspace Details', icon: Layers },
            { id: 'notifications', label: 'Notification Rules', icon: Bell },
            { id: 'integrations', label: 'Connected Apps', icon: Share2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-brand-500 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-[#121826] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}

          <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsShortcutsModalOpen(true)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Keyboard className="w-4 h-4" />
                <span>Hotkeys Guide</span>
              </div>
              <kbd className="px-1.5 py-0.2 bg-slate-200 dark:bg-slate-800 rounded font-mono text-[10px]">
                ?
              </kbd>
            </button>
          </div>
        </div>

        {/* Content Pane */}
        <div className="flex-1 min-w-0 bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  Interface Theme
                </h3>
                <p className="text-xs text-slate-500 mb-3">
                  Choose your preferred contrast mode. Dark theme uses surgical obsidian tones.
                </p>

                <div className="grid grid-cols-3 gap-3 max-w-md">
                  {[
                    { id: 'dark', label: 'Dark Mode', icon: Moon, desc: 'Deep slate' },
                    { id: 'light', label: 'Light Mode', icon: Sun, desc: 'Clean paper' },
                    { id: 'system', label: 'System', icon: Laptop, desc: 'Match OS' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTheme(item.id as ThemeMode)}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                        theme === item.id
                          ? 'border-brand-500 bg-brand-500/5 ring-2 ring-brand-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <item.icon className="w-5 h-5 text-brand-500 mb-2" />
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {item.label}
                        </p>
                        <p className="text-[10px] text-slate-400">{item.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  Information Density
                </h3>
                <p className="text-xs text-slate-500 mb-3">
                  Adjust row padding and spacing between elements across boards and tables.
                </p>

                <div className="grid grid-cols-2 gap-3 max-w-md">
                  {[
                    { id: 'comfortable', label: 'Comfortable', desc: 'Standard 8px spacing, relaxed reading' },
                    { id: 'compact', label: 'Compact', desc: 'High-density 4px spacing for power users' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setDensity(item.id as DensityMode)}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                        density === item.id
                          ? 'border-brand-500 bg-brand-500/5 ring-2 ring-brand-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {item.label}
                      </span>
                      <span className="text-[11px] text-slate-400 mt-1">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4 max-w-md text-xs">
              <div className="flex items-center gap-4 mb-4">
                <Avatar
                  name={name}
                  avatarUrl="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                  size="xl"
                />
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{name}</h4>
                  <p className="text-xs text-slate-400">{role}</p>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 outline-hidden focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 outline-hidden focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Primary Role
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 outline-hidden focus:border-brand-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-lg shadow-xs"
                >
                  Save Profile Changes
                </button>
              </div>
            </form>
          )}

          {/* Workspace Tab */}
          {activeTab === 'workspace' && (
            <div className="space-y-4 max-w-lg text-xs">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  Acme Core Platform
                </h3>
                <p className="text-xs text-slate-400">
                  Tenant ID: <code className="font-mono text-brand-500">acme-core-us-east-1</code>
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Subscription Tier</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Enterprise Dedicated
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Active Seats</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    42 / 50 Allocated
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Data Residency</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    EU (Frankfurt) & US (N. Virginia)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-4 max-w-md text-xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                Notification Delivery Rules
              </h3>

              <div className="space-y-3">
                {[
                  { title: 'Direct Mentions & Assignments', desc: 'Instant desktop and browser notifications' },
                  { title: 'Deadline Expiration Alerts', desc: 'Warn 48 hours prior to milestone target' },
                  { title: 'Automated AI Insights Dispatch', desc: 'Weekly digest on team capacity risks' },
                ].map((item, idx) => (
                  <label
                    key={idx}
                    className="flex items-start justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 cursor-pointer"
                  >
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{item.title}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="rounded text-brand-600 focus:ring-brand-500 mt-1"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Integrations Tab */}
          {activeTab === 'integrations' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                Third-Party Developer Integrations
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {integrations.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3 text-xs"
                  >
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">{item.name}</h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleIntegration(item.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                        item.connected
                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-rose-500/10 hover:text-rose-500'
                          : 'bg-brand-600 hover:bg-brand-500 text-white'
                      }`}
                    >
                      {item.connected ? 'Disconnect' : 'Connect'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
