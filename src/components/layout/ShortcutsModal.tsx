import React, { useEffect, useMemo } from 'react';
import { Keyboard } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';

export const ShortcutsModal: React.FC = () => {
  const {
    isShortcutsModalOpen,
    setIsShortcutsModalOpen,
    setActiveView,
    setActiveProjectId,
    openProjectsDirectory,
    setIsQuickCreateOpen,
    setQuickCreateDefaultTab,
    productivitySettings,
  } = useApp();

  // Platform awareness
  const isMac = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
  }, []);

  const modKey = isMac ? '⌘' : 'Ctrl';

  // Global Keyboard Listener for shortcuts that are displayed
  useEffect(() => {
    if (!productivitySettings.keyboardShortcutsEnabled) return;

    let pendingG = false;
    let gTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      // '?' opens shortcuts
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setIsShortcutsModalOpen(true);
        return;
      }

      // 'c' or 'C' quick creates task
      if ((e.key === 'c' || e.key === 'C') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setQuickCreateDefaultTab('task');
        setIsQuickCreateOpen(true);
        return;
      }

      // Two-key navigation sequences: G + key
      if ((e.key === 'g' || e.key === 'G') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        pendingG = true;
        if (gTimeout) clearTimeout(gTimeout);
        gTimeout = setTimeout(() => {
          pendingG = false;
        }, 1200);
        return;
      }

      if (pendingG) {
        pendingG = false;
        if (gTimeout) clearTimeout(gTimeout);
        const k = e.key.toLowerCase();
        if (k === 'p') {
          e.preventDefault();
          openProjectsDirectory();
        } else if (k === 't') {
          e.preventDefault();
          setActiveProjectId(null);
          setActiveView('my-tasks');
        } else if (k === 'd') {
          e.preventDefault();
          setActiveProjectId(null);
          setActiveView('documents');
        } else if (k === 's') {
          e.preventDefault();
          setActiveProjectId(null);
          setActiveView('settings');
        } else if (k === 'u') {
          e.preventDefault();
          setActiveProjectId(null);
          setActiveView('profile');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (gTimeout) clearTimeout(gTimeout);
    };
  }, [
    productivitySettings.keyboardShortcutsEnabled,
    setIsShortcutsModalOpen,
    setActiveView,
    setActiveProjectId,
    setIsQuickCreateOpen,
    setQuickCreateDefaultTab,
  ]);

  const shortcutGroups = [
    {
      group: 'General & Search',
      items: [
        { key: `${modKey} K`, desc: 'Open Command Palette' },
        { key: '/', desc: 'Focus Global Search' },
        { key: '?', desc: 'Open Keyboard Shortcuts Help' },
        { key: 'Esc', desc: 'Close open dialogs, drawers or menus' },
      ],
    },
    {
      group: 'Creation & Actions',
      items: [
        { key: 'C', desc: 'Quick create new task' },
        { key: `${modKey} ↵`, desc: 'Submit task / comment forms' },
      ],
    },
    {
      group: 'Quick Navigation (Press G then letter)',
      items: [
        { key: 'G then P', desc: 'Jump to Projects Directory' },
        { key: 'G then T', desc: 'Jump to My Tasks' },
        { key: 'G then D', desc: 'Jump to Documents' },
        { key: 'G then U', desc: 'Jump to User Profile' },
        { key: 'G then S', desc: 'Jump to Workspace Settings' },
      ],
    },
  ];

  return (
    <Modal
      isOpen={isShortcutsModalOpen}
      onClose={() => setIsShortcutsModalOpen(false)}
      title="Keyboard Shortcuts"
      description={`Accelerate your workflow with NEXUS hotkeys (${isMac ? 'macOS' : 'Windows / Linux'})`}
      maxWidth="md"
    >
      <div className="space-y-4">
        {shortcutGroups.map((g) => (
          <div key={g.group}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              {g.group}
            </div>
            <div className="space-y-1.5">
              {g.items.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 dark:border-slate-800/60"
                >
                  <span className="text-slate-600 dark:text-slate-300">{item.desc}</span>
                  <kbd className="px-2 py-0.5 text-[11px] font-mono font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded shadow-2xs">
                    {item.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        ))}

        {!productivitySettings.keyboardShortcutsEnabled && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs mt-2">
            Notice: Global keyboard shortcuts are currently disabled in Productivity Settings.
          </div>
        )}
      </div>
    </Modal>
  );
};
