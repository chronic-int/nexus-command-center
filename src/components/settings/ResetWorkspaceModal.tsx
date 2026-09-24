import React, { useState } from 'react';
import { RotateCcw, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Modal } from '../common/Modal';

interface ResetWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ResetWorkspaceModal: React.FC<ResetWorkspaceModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = () => {
    setIsResetting(true);
    try {
      onConfirm();
      onClose();
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reset NEXUS Workspace?"
      description="Return your workspace to the clean baseline state. Read carefully before proceeding."
      maxWidth="md"
    >
      <div className="space-y-4 text-xs">
        {/* Calm Context Banner */}
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 flex items-start gap-3">
          <RotateCcw className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
          <p className="leading-relaxed">
            This action generates a fresh workspace epoch, clearing all locally persisted tasks, projects, comments, and customizations in this browser.
          </p>
        </div>

        {/* What will be reset vs what remains */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* What will be deleted */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5" /> Will Be Deleted
            </span>
            <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
              <li>• Custom created tasks & comments</li>
              <li>• New projects & RFC documents</li>
              <li>• Custom automation rules & edits</li>
              <li>• Local profile & avatar customizations</li>
            </ul>
          </div>

          {/* What will remain / be restored */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> What Will Remain
            </span>
            <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
              <li>• Original reference starter projects</li>
              <li>• Seed team members & roles</li>
              <li>• Standard automation templates</li>
              <li>• Core system schema & IDB structure</li>
            </ul>
          </div>
        </div>

        {/* Modal actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isResetting}
            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
          >
            Keep Workspace
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={isResetting}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl font-semibold text-white bg-rose-600 hover:bg-rose-500 shadow-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isResetting ? 'Resetting...' : 'Reset Workspace to Defaults'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
