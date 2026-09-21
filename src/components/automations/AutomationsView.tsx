import React, { useState } from 'react';
import {
  Zap,
  Plus,
  Play,
  Copy,
  Trash2,
  CheckCircle2,
  ArrowRight,
  Clock,
  Settings2,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';

export const AutomationsView: React.FC = () => {
  const {
    automations,
    toggleAutomationRule,
    createAutomationRule,
    deleteAutomationRule,
    duplicateAutomationRule,
    addToast,
  } = useApp();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [ruleDesc, setRuleDesc] = useState('');
  const [ruleTrigger, setRuleTrigger] = useState('Task deadline expires');
  const [ruleCondition, setRuleCondition] = useState('Status != Done');
  const [ruleAction, setRuleAction] = useState('Set Priority = Urgent & Send Notification');

  const triggers = [
    'Task deadline expires',
    'Task status changes to Done',
    'Task priority set to Urgent',
    'New task created without assignee',
    'Label added includes Security or Compliance',
  ];

  const conditions = [
    'Status != Done',
    'Assignee is unassigned',
    'Priority == Urgent',
    'Project == Sentinel Security Gateway',
    'Subtasks completion < 100%',
  ];

  const actions = [
    'Set Priority = Urgent & Send Notification',
    'Update Project Health = At Risk',
    'Assign task to Alex Rivera',
    'Archive completed subtasks to audit history',
    'Dispatch Slack & email webhook dispatch',
  ];

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) return;

    createAutomationRule({
      name: ruleName.trim(),
      description: ruleDesc.trim() || 'Custom workflow rule',
      trigger: ruleTrigger,
      condition: ruleCondition,
      action: ruleAction,
    });

    setRuleName('');
    setRuleDesc('');
    setIsCreateModalOpen(false);
  };

  const handleTestRun = (ruleName: string) => {
    addToast({
      type: 'success',
      title: 'Rule Executed (Dry Run)',
      message: `Simulated "${ruleName}" against current workspace state. 2 tasks matched.`,
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 bg-slate-50/50 dark:bg-[#0b0f19]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Workflow Engine
            </span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Workspace Automations & Triggers
          </h1>
          <p className="text-xs text-slate-500">
            Automate routine escalations, status cascades, and security compliance rules
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-all hover:scale-[1.02]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Automation Rule</span>
        </button>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {automations.map((rule) => (
          <div
            key={rule.id}
            className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
              rule.enabled
                ? 'bg-white dark:bg-[#121826] border-slate-200 dark:border-slate-800 shadow-xs'
                : 'bg-slate-100/50 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/40 opacity-75'
            }`}
          >
            <div>
              {/* Header with toggle */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`p-1.5 rounded-lg ${
                      rule.enabled
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      {rule.name}
                    </h3>
                    <span className="text-[10px] text-slate-400">
                      Last fired: {rule.lastTriggered || 'Never'}
                    </span>
                  </div>
                </div>

                {/* Enable toggle switch */}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={() => toggleAutomationRule(rule.id)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600" />
                </label>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                {rule.description}
              </p>

              {/* Logic Flow Block (When -> If -> Then) */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0c101a] border border-slate-200/80 dark:border-slate-800/80 space-y-2 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 w-12 text-center">
                    WHEN
                  </span>
                  <span className="text-slate-700 dark:text-slate-300 truncate">
                    {rule.trigger}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 w-12 text-center">
                    IF
                  </span>
                  <span className="text-slate-700 dark:text-slate-300 truncate">
                    {rule.condition}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 w-12 text-center">
                    THEN
                  </span>
                  <span className="text-slate-700 dark:text-slate-300 truncate">
                    {rule.action}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
              <button
                type="button"
                onClick={() => handleTestRun(rule.name)}
                className="flex items-center gap-1 text-[11px] font-medium text-brand-600 dark:text-brand-400 hover:underline"
              >
                <Play className="w-3 h-3" />
                <span>Dry Run Test</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => duplicateAutomationRule(rule.id)}
                  className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  title="Duplicate rule"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => deleteAutomationRule(rule.id)}
                  className="p-1 rounded text-slate-400 hover:text-rose-500"
                  title="Delete rule"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Automation Rule Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Automation Rule"
        description="Configure event triggers, conditional guards, and automated responses"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateRule} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Rule Name *
            </label>
            <input
              type="text"
              required
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              placeholder="e.g. Auto-escalate security tasks to Liam Chen"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 outline-hidden focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={ruleDesc}
              onChange={(e) => setRuleDesc(e.target.value)}
              placeholder="Explain the intent and scope of this workflow rule..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 outline-hidden focus:border-brand-500 resize-none"
            />
          </div>

          <div className="space-y-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <div>
              <label className="block font-bold text-sky-600 dark:text-sky-400 uppercase text-[10px] mb-1">
                WHEN (Event Trigger)
              </label>
              <select
                value={ruleTrigger}
                onChange={(e) => setRuleTrigger(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 outline-hidden"
              >
                {triggers.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-amber-600 dark:text-amber-400 uppercase text-[10px] mb-1">
                IF (Filter Condition)
              </label>
              <select
                value={ruleCondition}
                onChange={(e) => setRuleCondition(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 outline-hidden"
              >
                {conditions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-emerald-600 dark:text-emerald-400 uppercase text-[10px] mb-1">
                THEN (Execute Action)
              </label>
              <select
                value={ruleAction}
                onChange={(e) => setRuleAction(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 outline-hidden"
              >
                {actions.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-semibold shadow-xs"
            >
              Save Automation Rule
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
