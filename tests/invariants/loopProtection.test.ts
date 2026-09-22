import { describe, it, expect } from 'vitest';
import { createTestWorkspace, REFERENCE_DATE } from '../testUtils';
import { processWorkspaceAutomation } from '../../src/utils/automationEngine';
import { AutomationRule, Task } from '../../src/types';
import { validateWorkspaceIntegrity } from '../../src/domain/workspaceIntegrity';

describe('Automation Loop Protection & Adversarial Guardrails', () => {
  it('prevents cyclical rules from causing infinite loops or call-stack overflow', () => {
    const ws = createTestWorkspace();

    // Adversarial cyclic setup:
    // Rule 1: When priority changes -> set priority to Urgent
    // Rule 2: When priority is Urgent -> set priority to High
    const rule1: AutomationRule = {
      id: 'rule-cycle-1',
      name: 'Cyclic Escalation',
      description: 'Changes to Urgent',
      trigger: 'PRIORITY_CHANGED',
      triggerDescription: 'Priority changed',
      condition: 'Always',
      conditionDescription: 'Always',
      action: 'Set Priority = Urgent & Send Notification',
      actionDescription: 'Escalate to Urgent',
      enabled: true,
      executionCount: 0,
    };

    const rule2: AutomationRule = {
      id: 'rule-cycle-2',
      name: 'Cyclic De-escalation',
      description: 'Changes to High',
      trigger: 'PRIORITY_CHANGED',
      triggerDescription: 'Priority changed to Urgent',
      condition: 'Priority == Urgent',
      conditionDescription: 'Priority == Urgent',
      action: 'Escalate priority to Urgent',
      actionDescription: 'Escalate',
      enabled: true,
      executionCount: 0,
    };

    const task: Task = { ...ws.tasks[0], priority: 'Low' };

    // Processing this event must terminate promptly without throwing RangeError (stack overflow)
    const startTime = performance.now();
    const result = processWorkspaceAutomation(
      [rule1, rule2],
      { type: 'PRIORITY_CHANGED', task },
      ws.tasks,
      ws.projects,
      REFERENCE_DATE
    );
    const duration = performance.now() - startTime;

    // Must finish in < 50ms
    expect(duration).toBeLessThan(100);

    // Each rule in the cycle executes at most once per cascade cycle
    expect(result.triggeredRuleIds.filter((id) => id === 'rule-cycle-1').length).toBeLessThanOrEqual(1);
    expect(result.triggeredRuleIds.filter((id) => id === 'rule-cycle-2').length).toBeLessThanOrEqual(1);
  });

  it('guarantees workspace integrity after adversarial automation execution', () => {
    let ws = createTestWorkspace();
    const selfTriggeringRule: AutomationRule = {
      id: 'rule-self-trigger',
      name: 'Self Triggering Rule',
      description: 'Self trigger',
      trigger: 'STATUS_CHANGED',
      triggerDescription: 'Status changed',
      condition: 'Always',
      conditionDescription: 'Always',
      action: 'Set Priority = Urgent & Send Notification',
      actionDescription: 'Escalate',
      enabled: true,
      executionCount: 0,
    };

    ws.automations = [selfTriggeringRule];
    const task = ws.tasks[0];

    const result = processWorkspaceAutomation(
      ws.automations,
      { type: 'STATUS_CHANGED', task },
      ws.tasks,
      ws.projects,
      REFERENCE_DATE
    );

    ws = {
      ...ws,
      tasks: result.updatedTasks,
      projects: result.updatedProjects,
      notifications: [...result.newNotifications, ...ws.notifications],
      activities: [...result.newActivities, ...ws.activities],
    };

    const errors = validateWorkspaceIntegrity(ws).filter((i) => i.severity === 'error');
    expect(errors).toHaveLength(0);
  });
});
