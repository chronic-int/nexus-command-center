import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  Settings,
  Keyboard,
  Moon,
  Sun,
  Laptop,
  Check,
  Shield,
  Clock,
  Sparkles,
  Edit3,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../common/Avatar';
import { MemberAvailability, ThemeMode } from '../../types';

interface UserMenuProps {
  onOpenEditProfile?: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({ onOpenEditProfile }) => {
  const {
    userProfile,
    updateUserProfile,
    setActiveView,
    setIsShortcutsModalOpen,
    theme,
    setTheme,
    setSettingsTab,
  } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const availabilityOptions: { label: MemberAvailability; color: string; desc: string }[] = [
    { label: 'Active', color: 'bg-emerald-500', desc: 'Available for discussions' },
    { label: 'In a meeting', color: 'bg-amber-500', desc: 'Focusing / in a call' },
    { label: 'Away', color: 'bg-amber-400', desc: 'Stepped away momentarily' },
    { label: 'Offline', color: 'bg-slate-400', desc: 'Not currently working' },
  ];

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`User menu for ${userProfile.name}`}
        className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:ring-2 focus:ring-brand-500/50 outline-hidden"
      >
        <Avatar
          name={userProfile.name}
          avatarUrl={userProfile.avatar}
          status={userProfile.availability}
          size="sm"
          showStatus={true}
        />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="User navigation and availability menu"
          className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800 shadow-2xl py-2 z-50 animate-slide-down text-xs"
        >
          {/* User Identity Header */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-3">
              <Avatar
                name={userProfile.name}
                avatarUrl={userProfile.avatar}
                status={userProfile.availability}
                size="md"
                showStatus={true}
              />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-900 dark:text-white truncate">
                  {userProfile.name}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {userProfile.email}
                </p>
                <p className="text-[10px] text-brand-600 dark:text-brand-400 font-medium truncate mt-0.5">
                  {userProfile.role} • {userProfile.department}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Availability Selector */}
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/80">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-1.5 flex items-center justify-between">
              <span>Set Availability</span>
              <span className="text-[9px] font-normal text-slate-400">Live sync</span>
            </div>
            <div className="space-y-0.5">
              {availabilityOptions.map((opt) => {
                const isSelected = userProfile.availability === opt.label;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    role="menuitemradio"
                    aria-checked={isSelected}
                    onClick={() => {
                      updateUserProfile({ availability: opt.label });
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors text-left ${
                      isSelected
                        ? 'bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-white font-medium'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${opt.color}`} />
                      <span className="truncate">{opt.label}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-brand-500 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Links */}
          <div className="px-2 py-1.5 space-y-0.5 border-b border-slate-100 dark:border-slate-800/80">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setActiveView('profile');
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors text-left"
            >
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <span>View Profile</span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setActiveView('profile');
                if (onOpenEditProfile) onOpenEditProfile();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors text-left"
            >
              <Edit3 className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Edit Profile</span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setSettingsTab('workspace');
                setActiveView('settings');
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors text-left"
            >
              <Settings className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Workspace Settings</span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsShortcutsModalOpen(true);
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5">
                <Keyboard className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Keyboard Shortcuts</span>
              </div>
              <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-slate-500">
                ?
              </kbd>
            </button>
          </div>

          {/* Quick Theme Switcher */}
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/80">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Theme Mode
            </div>
            <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl">
              {[
                { id: 'dark' as ThemeMode, label: 'Dark', icon: Moon },
                { id: 'light' as ThemeMode, label: 'Light', icon: Sun },
                { id: 'system' as ThemeMode, label: 'Auto', icon: Laptop },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTheme(item.id)}
                  className={`flex items-center justify-center gap-1.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                    theme === item.id
                      ? 'bg-white dark:bg-[#121826] text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <item.icon className="w-3 h-3" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Local-First Session Footer (Honest: No fake sign-out!) */}
          <div className="px-4 py-2 bg-slate-50/60 dark:bg-slate-900/40 rounded-b-2xl flex items-center justify-between text-[10px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-emerald-500" />
              <span>Local-First Workspace</span>
            </div>
            <span className="font-mono text-[9px] text-slate-400">v2.5 Local</span>
          </div>
        </div>
      )}
    </div>
  );
};
