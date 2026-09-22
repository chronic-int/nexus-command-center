import { WorkspaceState } from '../src/domain/workspaceDomain';
import {
  INITIAL_MEMBERS,
  INITIAL_PROJECTS,
  INITIAL_TASKS,
  INITIAL_DOCUMENTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUTOMATIONS,
  INITIAL_ACTIVITIES,
} from '../src/data/seedData';
import { recomputeWorkspaceMetrics } from '../src/domain/workspaceDomain';

export const REFERENCE_DATE = '2026-09-22';

/**
 * Creates a fully validated, deeply cloned test workspace fixture.
 */
export function createTestWorkspace(overrides?: Partial<WorkspaceState>): WorkspaceState {
  const base: WorkspaceState = {
    projects: JSON.parse(JSON.stringify(INITIAL_PROJECTS)),
    tasks: JSON.parse(JSON.stringify(INITIAL_TASKS)),
    members: JSON.parse(JSON.stringify(INITIAL_MEMBERS)),
    pendingInvitations: [
      {
        id: 'inv_1',
        email: 'test@nexus.io',
        name: 'Test Invite',
        role: 'Staff Engineer',
        department: 'Engineering',
        invitedAt: 'Yesterday',
        status: 'Pending',
      },
    ],
    documents: JSON.parse(JSON.stringify(INITIAL_DOCUMENTS)),
    notifications: JSON.parse(JSON.stringify(INITIAL_NOTIFICATIONS)),
    automations: JSON.parse(JSON.stringify(INITIAL_AUTOMATIONS)),
    activities: JSON.parse(JSON.stringify(INITIAL_ACTIVITIES)),
    ...overrides,
  };

  // Recompute metrics with the reference date so progress and workload match exactly
  return recomputeWorkspaceMetrics(base, undefined, REFERENCE_DATE);
}

/**
 * Seedable pseudo-random number generator (Mulberry32).
 * Allows 100% reproducible randomized property & fuzz testing.
 */
export function createMulberry32(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
