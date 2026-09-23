import { MutationBroadcastPayload, SyncMessage, Task } from '../types';
import {
  WorkspaceState,
  mergeTaskFields,
  recomputeWorkspaceMetrics,
} from '../domain/workspaceDomain';

export const SYNC_CHANNEL_NAME = 'nexus_workspace_sync';
export const FALLBACK_STORAGE_KEY = 'nexus_sync_event';
const MAX_SEEN_MUTATIONS = 1000;

export interface TabSyncHandlers {
  onRemoteMutation: (payload: MutationBroadcastPayload) => void;
  onRemoteReset: (payload: MutationBroadcastPayload) => void;
  onConflictDetected?: (task: Task) => void;
}

/**
 * Validates inbound sync payload fail-closed.
 */
export function isValidPayload(payload: unknown): payload is MutationBroadcastPayload {
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as Record<string, unknown>;
  return (
    typeof p.sourceTabId === 'string' &&
    typeof p.epoch === 'number' &&
    typeof p.revision === 'number' &&
    typeof p.mutationId === 'string' &&
    typeof p.mutationType === 'string' &&
    typeof p.timestamp === 'string'
  );
}

/**
 * Represents an isolated multi-tab synchronization session (one per browser tab / test context).
 */
export class TabSyncSession {
  public tabId: string;
  private channel: BroadcastChannel | null = null;
  private seenMutationIds = new Set<string>();
  private mutationIdQueue: string[] = [];
  private handlers: TabSyncHandlers | null = null;
  private storageListener: ((event: StorageEvent) => void) | null = null;

  constructor(tabId?: string) {
    this.tabId =
      tabId ||
      (typeof window !== 'undefined'
        ? `tab_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`
        : 'tab_default');
  }

  public recordMutationId(id: string): void {
    if (this.seenMutationIds.has(id)) return;
    this.seenMutationIds.add(id);
    this.mutationIdQueue.push(id);
    if (this.mutationIdQueue.length > MAX_SEEN_MUTATIONS) {
      const oldest = this.mutationIdQueue.shift();
      if (oldest) this.seenMutationIds.delete(oldest);
    }
  }

  public hasSeenMutation(id: string): boolean {
    return this.seenMutationIds.has(id);
  }

  public dispatchSyncMessage(syncMsg: unknown): void {
    if (!this.handlers || !syncMsg || typeof syncMsg !== 'object') return;
    const msg = syncMsg as Partial<SyncMessage>;
    if (!msg.type || !msg.payload || !isValidPayload(msg.payload)) return;

    const { payload } = msg;

    // Reject self-originating messages
    if (payload.sourceTabId === this.tabId) return;

    // Deduplicate identical mutation events on this tab
    if (this.hasSeenMutation(payload.mutationId)) return;
    this.recordMutationId(payload.mutationId);

    if (msg.type === 'WORKSPACE_RESET') {
      this.handlers.onRemoteReset(payload);
    } else if (msg.type === 'MUTATION_BROADCAST') {
      this.handlers.onRemoteMutation(payload);
    }
  }

  public init(handlers: TabSyncHandlers): () => void {
    this.handlers = handlers;

    // 1. BroadcastChannel connection
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
        this.channel.onmessage = (event) => {
          this.dispatchSyncMessage(event.data);
        };
      } catch (err) {
        console.warn('[NEXUS TabSync] BroadcastChannel unsupported:', err);
      }
    }

    // 2. Storage event fallback
    this.storageListener = (event: StorageEvent) => {
      if (event.key !== FALLBACK_STORAGE_KEY || !event.newValue) return;
      try {
        const parsed = JSON.parse(event.newValue);
        this.dispatchSyncMessage(parsed);
      } catch {
        // ignore malformed JSON
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.storageListener);
    }

    return () => {
      this.close();
    };
  }

  public broadcastMutation(
    payload: Omit<MutationBroadcastPayload, 'sourceTabId'>
  ): void {
    const fullPayload: MutationBroadcastPayload = {
      ...payload,
      sourceTabId: this.tabId,
    };

    // Mark as seen on sending tab
    this.recordMutationId(fullPayload.mutationId);

    const message: SyncMessage = {
      type: 'MUTATION_BROADCAST',
      payload: fullPayload,
    };

    if (this.channel) {
      try {
        this.channel.postMessage(message);
      } catch (err) {
        console.warn('[NEXUS TabSync] BroadcastChannel error:', err);
      }
    }

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(message));
      } catch {
        // ignore
      }
    }
  }

  public broadcastWorkspaceReset(epoch: number, revision: number): void {
    const fullPayload: MutationBroadcastPayload = {
      sourceTabId: this.tabId,
      epoch,
      revision,
      mutationId: `reset_${Date.now()}_${Math.random()}`,
      mutationType: 'WORKSPACE_RESET',
      timestamp: new Date().toISOString(),
    };

    this.recordMutationId(fullPayload.mutationId);

    const message: SyncMessage = {
      type: 'WORKSPACE_RESET',
      payload: fullPayload,
    };

    if (this.channel) {
      try {
        this.channel.postMessage(message);
      } catch (err) {
        console.warn('[NEXUS TabSync] BroadcastChannel error:', err);
      }
    }

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(message));
      } catch {
        // ignore
      }
    }
  }

  public close(): void {
    if (this.channel) {
      try {
        this.channel.close();
      } catch {
        // ignore
      }
      this.channel = null;
    }
    if (typeof window !== 'undefined' && this.storageListener) {
      window.removeEventListener('storage', this.storageListener);
      this.storageListener = null;
    }
    this.handlers = null;
  }

  public reset(): void {
    this.close();
    this.seenMutationIds.clear();
    this.mutationIdQueue.length = 0;
  }
}

/**
 * Singleton tab session for normal application execution.
 */
let defaultSession = new TabSyncSession();

export function createTabSyncSession(tabId?: string): TabSyncSession {
  return new TabSyncSession(tabId);
}

export function getCurrentTabId(): string {
  return defaultSession.tabId;
}

export function setCurrentTabId(tabId: string): void {
  defaultSession.tabId = tabId;
}

export function hasSeenMutation(id: string): boolean {
  return defaultSession.hasSeenMutation(id);
}

export function initTabSync(handlers: TabSyncHandlers): () => void {
  return defaultSession.init(handlers);
}

export function broadcastMutation(
  payload: Omit<MutationBroadcastPayload, 'sourceTabId'>
): void {
  defaultSession.broadcastMutation(payload);
}

export function broadcastWorkspaceReset(epoch: number, revision: number): void {
  defaultSession.broadcastWorkspaceReset(epoch, revision);
}

export function resetTabSyncForTesting(): void {
  defaultSession.reset();
  defaultSession = new TabSyncSession('tab_test');
}

/**
 * Applies a remote task mutation delta to a local WorkspaceState cleanly without re-running automations.
 * Returns the updated workspace state and whether a concurrent edit conflict occurred.
 */
export function applyRemoteTaskDelta(
  state: WorkspaceState,
  remoteTask: Task,
  remoteEpoch: number,
  remoteRevision: number,
  baselineTask?: Task
): { nextState: WorkspaceState; hadConflict: boolean } {
  let hadConflict = false;
  const existingIndex = state.tasks.findIndex((t) => t.id === remoteTask.id);

  let updatedTasks: Task[];
  const affectedProjectIds = [remoteTask.projectId];
  const affectedMemberIds: string[] = [];
  if (remoteTask.assigneeId) affectedMemberIds.push(remoteTask.assigneeId);

  if (existingIndex === -1) {
    // Task created on remote tab
    updatedTasks = [remoteTask, ...state.tasks];
  } else {
    const localTask = state.tasks[existingIndex];
    affectedProjectIds.push(localTask.projectId);
    if (localTask.assigneeId) affectedMemberIds.push(localTask.assigneeId);

    // Merge task fields with 3-way baseline if available
    const mergeResult = mergeTaskFields(localTask, remoteTask, baselineTask);
    hadConflict = mergeResult.hadConflict;

    updatedTasks = state.tasks.map((t, idx) => (idx === existingIndex ? mergeResult.merged : t));
  }

  let nextState: WorkspaceState = {
    ...state,
    epoch: Math.max(state.epoch ?? 1, remoteEpoch),
    revision: Math.max(state.revision ?? 1, remoteRevision),
    tasks: updatedTasks,
  };

  // Recompute derived metrics without firing automations
  nextState = recomputeWorkspaceMetrics(
    nextState,
    Array.from(new Set(affectedProjectIds)),
    Array.from(new Set(affectedMemberIds))
  );

  return { nextState, hadConflict };
}
