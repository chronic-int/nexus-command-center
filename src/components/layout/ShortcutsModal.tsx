import React, { useEffect } from 'react';
import { Keyboard } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';

export const ShortcutsModal: React.FC = () => {
  const { isShortcutsModalOpen, setIsShortcutsModalOpen } = useApp();

  // Listen for '?' key to open shortcut help
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        setIsShortcutsModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsShortcutsModalOpen]);

  const shortcutGroups = [
    {
      group: 'General & Navigation',
      items: [
        { key: '⌘ K / Ctrl K', desc: 'Open Command Palette' },
        { key: '/', desc: 'Global Search' },
        { key: '?', desc: 'Open Keyboard Shortcuts' },
        { key: 'Esc', desc: 'Close open modal, drawer or dropdown' },
      ],
    },
    {
      group: 'Actions & Creation',
      items: [
        { key: 'C', desc: 'Quick create new task' },
        { key: '⌘ ↵ / Ctrl Enter', desc: 'Submit comment or form' },
        { key: 'Delete / Backspace', desc: 'Remove selected task in drawer' },
      ],
    },
    {
      group: 'Board & Views',
      items: [
        { key: 'Drag & Drop', desc: 'Move tasks between Kanban columns' },
        { key: 'Click Task', desc: 'Open task inspection drawer' },
        { key: 'Click Member', desc: 'Open member workload profile' },
      ],
    },
  ];

  return (
    <Modal
      isOpen={isShortcutsModalOpen}
      onClose={() => setIsShortcutsModalOpen(false)}
      title="Keyboard Shortcuts"
      description="Accelerate your workflow with NEXUS hotkeys"
      maxWidth="md"
    >
      <div className="space-y-4">
        {shortcutGroups.map((g) => (
          <div key={g.group}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              {g.group}
            </div>
            <div className="space-y-2">
              {g.items.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800/60"
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
      </div>
    </Modal>
  );
};
