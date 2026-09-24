import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import type {
  Task,
  Project,
  TeamMember,
  PendingInvitation,
  Document,
  Notification,
  AutomationRule,
  ActivityItem,
  AIInsight,
  TaskStatus,
  ViewTab,
  ThemeMode,
  DensityMode,
  ReducedMotionMode,
  ToastMessage,
  PersistenceStatus,
  UserProfile,
  WorkspaceSettings,
  ProductivitySettings,
  NotificationPreferences,
} from '../types';
import {
  INITIAL_MEMBERS,
  INITIAL_PROJECTS,
  INITIAL_TASKS,
  INITIAL_DOCUMENTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUTOMATIONS,
  INITIAL_ACTIVITIES,
} from '../data/seedData';
import {
  STORAGE_KEYS,
  getStoredItem,
  setStoredItem,
  clearNexusStorage,
} from '../utils/storage';
import { isTaskOverdue } from '../utils/dateUtils';
import { generateEntityId } from '../utils/idGenerator';
import {
  WorkspaceState,
  createTaskOp,
  updateTaskOp,
  moveTaskStatusOp,
  deleteTaskOp,
  createProjectOp,
  deleteProjectCascadeOp,
  evaluateOverdueTasksOp,
  restoreTaskOp,
  bulkUpdateTasksOp,
  bulkDeleteTasksOp,
  bulkRestoreTasksOp,
  compareVersions,
  createResetWorkspaceState,
  advanceWorkspaceVersion,
} from '../domain/workspaceDomain';
import { hydrateAndValidateWorkspace } from '../domain/workspaceHydration';
import {
  scheduleWorkspacePersistence,
  loadUnifiedWorkspace,
  loadEnvelopeFromLocalStorage,
  clearWorkspaceFromIDB,
  onPersistenceStatusChange,
  getPersistenceStatus,
  setPersistenceStatus,
  retryFailedPersistence,
} from '../utils/idbStorage';
import {
  initTabSync,
  broadcastMutation,
  broadcastWorkspaceReset,
  applyRemoteTaskDelta,
} from '../utils/tabSync';

interface AppContextType {
  // Collections
  projects: Project[];
  tasks: Task[];
  members: TeamMember[];
  pendingInvitations: PendingInvitation[];
  documents: Document[];
  notifications: Notification[];
  automations: AutomationRule[];
  activities: ActivityItem[];
  insights: AIInsight[];

  // Navigation & View State
  activeView: string;
  setActiveView: (view: string) => void;
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  projectTab: ViewTab;
  setProjectTab: (tab: ViewTab) => void;
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;
  selectedMemberId: string | null;
  setSelectedMemberId: (id: string | null) => void;
  selectedDocId: string | null;
  setSelectedDocId: (id: string | null) => void;

  // Coherent Navigation & Context Preservation
  openProject: (projectId: string, tab?: ViewTab) => void;
  openProjectsDirectory: () => void;
  lastActiveProjectId: string | null;
  previousView: string | null;
  returnToPreviousView: () => void;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (open: boolean) => void;
  dispatchBrowserNotification: (title: string, options?: NotificationOptions) => void;

  // Overlays
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  isQuickCreateOpen: boolean;
  setIsQuickCreateOpen: (open: boolean) => void;
  quickCreateDefaultTab: 'task' | 'project' | 'document' | 'invite';
  setQuickCreateDefaultTab: (tab: 'task' | 'project' | 'document' | 'invite') => void;
  isNotificationDrawerOpen: boolean;
  setIsNotificationDrawerOpen: (open: boolean) => void;
  isShortcutsModalOpen: boolean;
  setIsShortcutsModalOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;

  // Preferences & Theming
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  density: DensityMode;
  setDensity: (density: DensityMode) => void;
  reducedMotion: ReducedMotionMode;
  setReducedMotion: (mode: ReducedMotionMode) => void;

  // Profile & Personalization
  userProfile: UserProfile;
  updateUserProfile: (updates: Partial<UserProfile>) => void;

  // Workspace Settings
  workspaceSettings: WorkspaceSettings;
  updateWorkspaceSettings: (updates: Partial<WorkspaceSettings>) => void;

  // Productivity Settings
  productivitySettings: ProductivitySettings;
  updateProductivitySettings: (updates: Partial<ProductivitySettings>) => void;

  // Notification Preferences
  notificationPreferences: NotificationPreferences;
  updateNotificationPreferences: (updates: Partial<NotificationPreferences>) => void;

  // Settings subtab navigation
  settingsTab: string;
  setSettingsTab: (tab: string) => void;

  // Export / Import
  exportWorkspaceData: () => void;
  validateImportPayload: (jsonString: string) => {
    valid: boolean;
    error?: string;
    counts?: Record<string, number>;
    payload?: any;
  };
  importWorkspaceData: (payload: any) => Promise<{ success: boolean; error?: string }>;

  // Toasts
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;

  // Notification stats
  unreadNotificationsCount: number;

  // Task Actions
  createTask: (data: Partial<Task>) => Task;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  duplicateTask: (id: string) => void;
  moveTaskStatus: (id: string, status: TaskStatus) => void;
  addSubtask: (taskId: string, title: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  deleteSubtask: (taskId: string, subtaskId: string) => void;
  addComment: (taskId: string, content: string) => void;
  bulkUpdateTasks: (ids: string[], updates: Partial<Task>) => void;
  bulkDeleteTasks: (ids: string[]) => void;

  // Project Actions
  createProject: (data: Partial<Project>) => Project;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  // Invitation Actions
  createInvitation: (invitation: Omit<PendingInvitation, 'id' | 'invitedAt' | 'status'>) => PendingInvitation;
  cancelInvitation: (id: string) => void;

  // Document Actions
  createDocument: (data: Partial<Document>) => Document;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  deleteDocument: (id: string) => void;
  toggleFavoriteDocument: (id: string) => void;

  // Notification Actions
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  deleteNotification: (id: string) => void;

  // Automation Actions
  toggleAutomationRule: (id: string) => void;
  createAutomationRule: (data: Partial<AutomationRule>) => void;
  deleteAutomationRule: (id: string) => void;
  duplicateAutomationRule: (id: string) => void;

  // AI Insights
  dismissInsight: (id: string) => void;
  markInsightUseful: (id: string) => void;

  // Reset
  resetDemoData: () => void;

  // Persistence & Multi-Tab Synchronization
  persistenceStatus: PersistenceStatus;
  retryPersistence: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const DEFAULT_USER_PROFILE: UserProfile = {
  id: 'user-1',
  name: 'Alex Rivera',
  email: 'alex.rivera@nexus.io',
  role: 'Staff Product Engineer',
  department: 'Engineering',
  bio: 'Lead architect for core infrastructure and real-time distributed state engines.',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  availability: 'Active',
  timezone: 'America/New_York (UTC-5)',
  workingHours: '09:00 - 17:00 EST',
  language: 'English (US)',
};

export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = {
  name: 'Acme Core Platform',
  description: 'Mission-critical enterprise services and distributed state command center',
  projectKeyPrefix: 'CORE',
  workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  timezone: 'America/New_York (UTC-5)',
  defaultTaskPriority: 'Medium',
  autoAssignCreator: false,
};

export const DEFAULT_PRODUCTIVITY_SETTINGS: ProductivitySettings = {
  defaultLandingPage: 'overview',
  defaultProjectTab: 'Board',
  startOfWeek: 'monday',
  quickCreateAutoOpen: true,
  keyboardShortcutsEnabled: true,
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  inAppNotifications: true,
  browserNotifications: false,
  categories: {
    assignments: true,
    mentions: true,
    deadlines: true,
    projectUpdates: true,
    automationEvents: true,
    workspaceActivity: false,
  },
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Initial State Hydration with Scoped Storage & Runtime Sanitization
  const initialWorkspace = useMemo<WorkspaceState>(() => {
    const envelope = loadEnvelopeFromLocalStorage();
    if (envelope && envelope.data && envelope.data.projects && envelope.data.tasks) {
      return hydrateAndValidateWorkspace(envelope.data, {
        projects: INITIAL_PROJECTS,
        tasks: INITIAL_TASKS,
        members: INITIAL_MEMBERS,
        pendingInvitations: [],
        documents: INITIAL_DOCUMENTS,
        notifications: INITIAL_NOTIFICATIONS,
        automations: INITIAL_AUTOMATIONS,
        activities: INITIAL_ACTIVITIES,
      }).workspace;
    }

    const raw = {
      projects: getStoredItem(STORAGE_KEYS.PROJECTS, INITIAL_PROJECTS),
      tasks: getStoredItem(STORAGE_KEYS.TASKS, INITIAL_TASKS),
      members: getStoredItem(STORAGE_KEYS.MEMBERS, INITIAL_MEMBERS),
      pendingInvitations: getStoredItem(STORAGE_KEYS.INVITATIONS, [
        {
          id: 'inv_init_1',
          email: 'jordan.zhao@nexus.io',
          name: 'Jordan Zhao',
          role: 'Staff Frontend Engineer',
          department: 'Engineering',
          invitedAt: 'Yesterday',
          status: 'Pending',
        },
      ]),
      documents: getStoredItem(STORAGE_KEYS.DOCUMENTS, INITIAL_DOCUMENTS),
      notifications: getStoredItem(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS),
      automations: getStoredItem(STORAGE_KEYS.AUTOMATIONS, INITIAL_AUTOMATIONS),
      activities: getStoredItem(STORAGE_KEYS.ACTIVITIES, INITIAL_ACTIVITIES),
    };

    return hydrateAndValidateWorkspace(raw, {
      projects: INITIAL_PROJECTS,
      tasks: INITIAL_TASKS,
      members: INITIAL_MEMBERS,
      pendingInvitations: [],
      documents: INITIAL_DOCUMENTS,
      notifications: INITIAL_NOTIFICATIONS,
      automations: INITIAL_AUTOMATIONS,
      activities: INITIAL_ACTIVITIES,
    }).workspace;
  }, []);

  // Authoritative transactional workspace state
  const [workspace, setWorkspace] = useState<WorkspaceState>(initialWorkspace);

  // Synchronous mutable ref to eliminate stale closure updates and same-tick state loss
  const workspaceRef = useRef<WorkspaceState>(workspace);
  useEffect(() => {
    workspaceRef.current = workspace;
  }, [workspace]);

  // Theming & Density
  const [theme, setThemeState] = useState<ThemeMode>(() =>
    getStoredItem(STORAGE_KEYS.THEME, 'dark')
  );
  const [density, setDensityState] = useState<DensityMode>(() =>
    getStoredItem(STORAGE_KEYS.DENSITY, 'comfortable')
  );
  const [reducedMotion, setReducedMotionState] = useState<ReducedMotionMode>(() =>
    getStoredItem(STORAGE_KEYS.REDUCED_MOTION, 'system')
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() =>
    getStoredItem(STORAGE_KEYS.SIDEBAR, false)
  );

  // Profile & Personalization
  const [userProfile, setUserProfileState] = useState<UserProfile>(() =>
    getStoredItem(STORAGE_KEYS.USER_PROFILE, DEFAULT_USER_PROFILE)
  );

  // Workspace Settings
  const [workspaceSettings, setWorkspaceSettingsState] = useState<WorkspaceSettings>(() =>
    getStoredItem(STORAGE_KEYS.WORKSPACE_SETTINGS, DEFAULT_WORKSPACE_SETTINGS)
  );

  // Productivity Settings
  const [productivitySettings, setProductivitySettingsState] = useState<ProductivitySettings>(() =>
    getStoredItem(STORAGE_KEYS.PRODUCTIVITY_SETTINGS, DEFAULT_PRODUCTIVITY_SETTINGS)
  );

  // Notification Preferences
  const [notificationPreferences, setNotificationPreferencesState] = useState<NotificationPreferences>(() =>
    getStoredItem(STORAGE_KEYS.NOTIFICATION_PREFERENCES, DEFAULT_NOTIFICATION_PREFERENCES)
  );

  // Settings active tab
  const [settingsTab, setSettingsTab] = useState<string>('profile');

  // Navigation & context preservation state
  const [activeView, setActiveViewState] = useState<string>(() => {
    const prod = getStoredItem(STORAGE_KEYS.PRODUCTIVITY_SETTINGS, DEFAULT_PRODUCTIVITY_SETTINGS);
    return prod.defaultLandingPage || 'overview';
  });
  const [previousView, setPreviousView] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [lastActiveProjectId, setLastActiveProjectId] = useState<string | null>(null);
  const [projectTab, setProjectTab] = useState<ViewTab>(() => {
    const prod = getStoredItem(STORAGE_KEYS.PRODUCTIVITY_SETTINGS, DEFAULT_PRODUCTIVITY_SETTINGS);
    return prod.defaultProjectTab || 'Board';
  });
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Wrapped setActiveView with context tracking
  const setActiveView = useCallback((newView: string) => {
    setActiveViewState((current) => {
      if (current !== newView) {
        setPreviousView(current);
      }
      return newView;
    });
  }, []);

  // Coherent project opener
  const openProject = useCallback(
    (projectId: string, tab?: ViewTab) => {
      setActiveProjectId(projectId);
      setLastActiveProjectId(projectId);
      setActiveViewState((current) => {
        if (current !== 'projects') {
          setPreviousView(current);
        }
        return 'projects';
      });
      setProjectTab(tab || productivitySettings.defaultProjectTab || 'Board');
    },
    [productivitySettings.defaultProjectTab]
  );

  // Coherent projects directory opener
  const openProjectsDirectory = useCallback(() => {
    setActiveProjectId(null);
    setActiveViewState((current) => {
      if (current !== 'projects') {
        setPreviousView(current);
      }
      return 'projects';
    });
  }, []);

  // Return to previous view
  const returnToPreviousView = useCallback(() => {
    if (previousView) {
      setActiveViewState(previousView);
      if (previousView === 'projects' && lastActiveProjectId) {
        setActiveProjectId(lastActiveProjectId);
      }
    } else {
      setActiveViewState(productivitySettings.defaultLandingPage || 'overview');
    }
  }, [previousView, lastActiveProjectId, productivitySettings.defaultLandingPage]);

  // Browser notification dispatcher
  const dispatchBrowserNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (!notificationPreferences.browserNotifications) return;
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;
      if (document.visibilityState === 'hidden') {
        try {
          new Notification(title, {
            icon: '/favicon.ico',
            ...options,
          });
        } catch {
          // Ignore sandboxed errors
        }
      }
    },
    [notificationPreferences.browserNotifications]
  );

  // Overlays
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState<boolean>(false);
  const [quickCreateDefaultTab, setQuickCreateDefaultTab] = useState<'task' | 'project' | 'document' | 'invite'>('task');
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState<boolean>(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState<boolean>(false);

  // Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  // Insights tracked metadata
  const [dismissedInsightIds, setDismissedInsightIds] = useState<string[]>(() =>
    getStoredItem(STORAGE_KEYS.DISMISSED_INSIGHTS, [])
  );
  const [usefulInsightCounts, setUsefulInsightCounts] = useState<Record<string, number>>(() =>
    getStoredItem(STORAGE_KEYS.USEFUL_INSIGHTS, {})
  );

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Persistence status tracking
  const [persistenceStatus, setPersistenceStatusState] = useState<PersistenceStatus>(getPersistenceStatus());
  useEffect(() => {
    return onPersistenceStatusChange(setPersistenceStatusState);
  }, []);

  // Track whether any local mutation has occurred since component mounted
  const hasLocalMutatedSinceMountRef = useRef<boolean>(false);

  // Async hydration from IndexedDB on startup with race protection
  useEffect(() => {
    let isMounted = true;
    loadUnifiedWorkspace().then((persisted) => {
      if (!isMounted) return;
      if (persisted && persisted.projects && persisted.tasks) {
        // If local state was already mutated by the user before hydration completed,
        // do not overwrite the user's edits with an older storage snapshot!
        if (hasLocalMutatedSinceMountRef.current) {
          console.warn('[NEXUS Hydration] Preserving in-memory state; local mutations occurred prior to hydration completion');
          return;
        }

        if (compareVersions(persisted, workspaceRef.current) > 0) {
          const sanitized = hydrateAndValidateWorkspace(persisted, initialWorkspace).workspace;
          workspaceRef.current = sanitized;
          setWorkspace(sanitized);
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, [initialWorkspace]);

  // Multi-tab coordination effect
  useEffect(() => {
    return initTabSync({
      onRemoteMutation: (payload) => {
        const current = workspaceRef.current;
        // Ignore mutations from older epochs
        if (payload.epoch < (current.epoch ?? 1)) {
          return;
        }

        let updated = current;
        let hadAnyConflict = false;

        // 1. Task deltas with 3-way baseline merging
        if (payload.taskDeltas && payload.taskDeltas.length > 0) {
          for (const delta of payload.taskDeltas) {
            const baseline = payload.taskBaselines?.find((b) => b.id === delta.id);
            const res = applyRemoteTaskDelta(updated, delta, payload.epoch, payload.revision, baseline);
            updated = res.nextState;
            if (res.hadConflict) hadAnyConflict = true;
          }
        }

        // 2. Task deletions
        if (payload.deletedTaskIds && payload.deletedTaskIds.length > 0) {
          const toDelete = new Set(payload.deletedTaskIds);
          updated = {
            ...updated,
            tasks: updated.tasks.filter((t) => !toDelete.has(t.id)),
            epoch: Math.max(updated.epoch ?? 1, payload.epoch),
            revision: Math.max(updated.revision ?? 1, payload.revision),
          };
        }

        // 3. Project deltas
        if (payload.projectDeltas && payload.projectDeltas.length > 0) {
          const pMap = new Map(updated.projects.map((p) => [p.id, p]));
          for (const p of payload.projectDeltas) {
            pMap.set(p.id, p);
          }
          updated = {
            ...updated,
            projects: Array.from(pMap.values()),
            epoch: Math.max(updated.epoch ?? 1, payload.epoch),
            revision: Math.max(updated.revision ?? 1, payload.revision),
          };
        }

        // 4. Project deletions
        if (payload.deletedProjectIds && payload.deletedProjectIds.length > 0) {
          const toDelete = new Set(payload.deletedProjectIds);
          updated = {
            ...updated,
            projects: updated.projects.filter((p) => !toDelete.has(p.id)),
            tasks: updated.tasks.filter((t) => !toDelete.has(t.projectId)),
            epoch: Math.max(updated.epoch ?? 1, payload.epoch),
            revision: Math.max(updated.revision ?? 1, payload.revision),
          };
        }

        // 5. Document deltas
        if (payload.documentDeltas && payload.documentDeltas.length > 0) {
          const dMap = new Map(updated.documents.map((d) => [d.id, d]));
          for (const d of payload.documentDeltas) {
            dMap.set(d.id, d);
          }
          updated = {
            ...updated,
            documents: Array.from(dMap.values()),
            epoch: Math.max(updated.epoch ?? 1, payload.epoch),
            revision: Math.max(updated.revision ?? 1, payload.revision),
          };
        }

        // 6. Document deletions
        if (payload.deletedDocumentIds && payload.deletedDocumentIds.length > 0) {
          const toDelete = new Set(payload.deletedDocumentIds);
          updated = {
            ...updated,
            documents: updated.documents.filter((d) => !toDelete.has(d.id)),
            epoch: Math.max(updated.epoch ?? 1, payload.epoch),
            revision: Math.max(updated.revision ?? 1, payload.revision),
          };
        }

        if (updated !== current) {
          workspaceRef.current = updated;
          setWorkspace(updated);
          setPersistenceStatus(hadAnyConflict ? 'conflict' : 'remote_update');
          setTimeout(() => {
            if (getPersistenceStatus() === 'remote_update' || getPersistenceStatus() === 'conflict') {
              setPersistenceStatus('saved');
            }
          }, 3000);
        } else {
          // If no deltas provided (or full reload event), load from storage if newer
          loadUnifiedWorkspace().then((persisted) => {
            if (persisted && compareVersions(persisted, workspaceRef.current) > 0) {
              const sanitized = hydrateAndValidateWorkspace(persisted, workspaceRef.current).workspace;
              workspaceRef.current = sanitized;
              setWorkspace(sanitized);
              setPersistenceStatus('remote_update');
              setTimeout(() => {
                if (getPersistenceStatus() === 'remote_update') {
                  setPersistenceStatus('saved');
                }
              }, 3000);
            }
          });
        }
      },
      onRemoteReset: (payload) => {
        if (payload.epoch >= (workspaceRef.current.epoch ?? 1)) {
          const resetState = createResetWorkspaceState(
            { ...workspaceRef.current, epoch: payload.epoch - 1 },
            initialWorkspace
          );
          workspaceRef.current = resetState;
          setWorkspace(resetState);
          setPersistenceStatus('remote_update');
          setTimeout(() => {
            if (getPersistenceStatus() === 'remote_update') {
              setPersistenceStatus('saved');
            }
          }, 3000);
        }
      },
    });
  }, [initialWorkspace]);

  // Preference persistence
  useEffect(() => setStoredItem(STORAGE_KEYS.SIDEBAR, sidebarCollapsed), [sidebarCollapsed]);
  useEffect(() => setStoredItem(STORAGE_KEYS.DISMISSED_INSIGHTS, dismissedInsightIds), [dismissedInsightIds]);
  useEffect(() => setStoredItem(STORAGE_KEYS.USEFUL_INSIGHTS, usefulInsightCounts), [usefulInsightCounts]);

  // Apply Theme
  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    setStoredItem(STORAGE_KEYS.THEME, newTheme);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

  // Apply Density
  const setDensity = useCallback((newDensity: DensityMode) => {
    setDensityState(newDensity);
    setStoredItem(STORAGE_KEYS.DENSITY, newDensity);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('density-compact', 'density-comfortable');
    root.classList.add(`density-${density}`);
  }, [density]);

  // Toast Dispatcher
  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = generateEntityId('toast');
    const newToast: ToastMessage = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    const duration = toast.duration ?? 4500;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Reduced Motion
  const setReducedMotion = useCallback((mode: ReducedMotionMode) => {
    setReducedMotionState(mode);
    setStoredItem(STORAGE_KEYS.REDUCED_MOTION, mode);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (reducedMotion === 'always') {
      root.classList.add('reduce-motion');
    } else if (reducedMotion === 'never') {
      root.classList.remove('reduce-motion');
    } else {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      root.classList.toggle('reduce-motion', prefersReduced);
    }
  }, [reducedMotion]);

  // Profile management & member synchronization
  const updateUserProfile = useCallback((updates: Partial<UserProfile>) => {
    setUserProfileState((prev) => {
      const nextProfile: UserProfile = { ...prev, ...updates };
      setStoredItem(STORAGE_KEYS.USER_PROFILE, nextProfile);

      // Synchronize with members in WorkspaceState if matching member exists
      const targetMemberId = nextProfile.id || 'user-1';
      setWorkspace((prevWs) => {
        const memberIdx = prevWs.members.findIndex((m) => m.id === targetMemberId);
        if (memberIdx === -1) return prevWs;

        const updatedMembers = [...prevWs.members];
        const existing = updatedMembers[memberIdx];
        updatedMembers[memberIdx] = {
          ...existing,
          name: nextProfile.name,
          email: nextProfile.email,
          role: nextProfile.role,
          department: nextProfile.department,
          avatar: nextProfile.avatar,
          availability: nextProfile.availability,
          bio: nextProfile.bio,
          timezone: nextProfile.timezone,
          workingHours: nextProfile.workingHours,
          language: nextProfile.language,
        };

        const nextWs = advanceWorkspaceVersion(prevWs, {
          members: updatedMembers,
        });
        workspaceRef.current = nextWs;
        scheduleWorkspacePersistence(nextWs, 150);
        return nextWs;
      });

      return nextProfile;
    });
  }, []);

  // Workspace Settings
  const updateWorkspaceSettings = useCallback((updates: Partial<WorkspaceSettings>) => {
    setWorkspaceSettingsState((prev) => {
      const next = { ...prev, ...updates };
      setStoredItem(STORAGE_KEYS.WORKSPACE_SETTINGS, next);
      return next;
    });
  }, []);

  // Productivity Settings
  const updateProductivitySettings = useCallback((updates: Partial<ProductivitySettings>) => {
    setProductivitySettingsState((prev) => {
      const next = { ...prev, ...updates };
      setStoredItem(STORAGE_KEYS.PRODUCTIVITY_SETTINGS, next);
      return next;
    });
  }, []);

  // Notification Preferences
  const updateNotificationPreferences = useCallback((updates: Partial<NotificationPreferences>) => {
    setNotificationPreferencesState((prev) => {
      const next = {
        ...prev,
        ...updates,
        categories: {
          ...prev.categories,
          ...(updates.categories || {}),
        },
      };
      setStoredItem(STORAGE_KEYS.NOTIFICATION_PREFERENCES, next);
      return next;
    });
  }, []);

  // Export workspace as structured JSON
  const exportWorkspaceData = useCallback(() => {
    const currentWs = workspaceRef.current;
    const exportEnvelope = {
      schemaVersion: 2,
      exportedAt: new Date().toISOString(),
      client: 'NEXUS Command Center v2.5',
      workspace: {
        projects: currentWs.projects,
        tasks: currentWs.tasks,
        members: currentWs.members,
        documents: currentWs.documents,
        notifications: currentWs.notifications,
        automations: currentWs.automations,
        activities: currentWs.activities,
        pendingInvitations: currentWs.pendingInvitations,
      },
      userProfile,
      workspaceSettings,
      productivitySettings,
      notificationPreferences,
      appearanceSettings: {
        theme,
        density,
        sidebarDefaultCollapsed: sidebarCollapsed,
        reducedMotion,
      },
    };

    const jsonStr = JSON.stringify(exportEnvelope, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `nexus-workspace-${dateStamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addToast({
      type: 'success',
      title: 'Workspace Exported',
      message: `Exported ${currentWs.projects.length} projects and ${currentWs.tasks.length} tasks to JSON.`,
      duration: 3500,
    });
  }, [userProfile, workspaceSettings, productivitySettings, notificationPreferences, theme, density, sidebarCollapsed, reducedMotion, addToast]);

  // Validate import payload
  const validateImportPayload = useCallback((jsonString: string): {
    valid: boolean;
    error?: string;
    counts?: Record<string, number>;
    payload?: any;
  } => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || typeof parsed !== 'object') {
        return { valid: false, error: 'The uploaded file is not a valid JSON object.' };
      }

      const wsData = parsed.workspace || parsed.data || parsed;
      if (!wsData || typeof wsData !== 'object') {
        return { valid: false, error: 'No workspace dataset found in the uploaded file.' };
      }

      const projects = Array.isArray(wsData.projects) ? wsData.projects : null;
      const tasks = Array.isArray(wsData.tasks) ? wsData.tasks : null;

      if (!projects && !tasks) {
        return {
          valid: false,
          error: 'Required workspace collections ("projects" or "tasks") are missing.',
        };
      }

      const members = Array.isArray(wsData.members) ? wsData.members : [];
      const documents = Array.isArray(wsData.documents) ? wsData.documents : [];
      const automations = Array.isArray(wsData.automations) ? wsData.automations : [];
      const activities = Array.isArray(wsData.activities) ? wsData.activities : [];

      return {
        valid: true,
        counts: {
          projects: (projects || []).length,
          tasks: (tasks || []).length,
          members: members.length,
          documents: documents.length,
          automations: automations.length,
          activities: activities.length,
        },
        payload: parsed,
      };
    } catch (err: any) {
      return {
        valid: false,
        error: `JSON parsing error: ${err?.message || 'Invalid syntax'}`,
      };
    }
  }, []);

  // Import workspace data
  const importWorkspaceData = useCallback(async (payload: any): Promise<{ success: boolean; error?: string }> => {
    try {
      const wsData = payload.workspace || payload.data || payload;

      const hydration = hydrateAndValidateWorkspace(wsData, {
        projects: INITIAL_PROJECTS,
        tasks: INITIAL_TASKS,
        members: INITIAL_MEMBERS,
        pendingInvitations: [],
        documents: INITIAL_DOCUMENTS,
        notifications: INITIAL_NOTIFICATIONS,
        automations: INITIAL_AUTOMATIONS,
        activities: INITIAL_ACTIVITIES,
      });

      const currentEpoch = workspaceRef.current.epoch ?? 1;
      const importedWs: WorkspaceState = {
        ...hydration.workspace,
        schemaVersion: 1,
        epoch: currentEpoch + 1,
        revision: 1,
        lastSavedAt: new Date().toISOString(),
      };

      workspaceRef.current = importedWs;
      setWorkspace(importedWs);
      scheduleWorkspacePersistence(importedWs, 0);
      broadcastWorkspaceReset(importedWs.epoch ?? 2, importedWs.revision ?? 1);

      if (payload.userProfile && typeof payload.userProfile === 'object') {
        const restoredProfile: UserProfile = {
          ...DEFAULT_USER_PROFILE,
          ...payload.userProfile,
        };
        setUserProfileState(restoredProfile);
        setStoredItem(STORAGE_KEYS.USER_PROFILE, restoredProfile);
      }

      if (payload.workspaceSettings && typeof payload.workspaceSettings === 'object') {
        const restoredWsSettings: WorkspaceSettings = {
          ...DEFAULT_WORKSPACE_SETTINGS,
          ...payload.workspaceSettings,
        };
        setWorkspaceSettingsState(restoredWsSettings);
        setStoredItem(STORAGE_KEYS.WORKSPACE_SETTINGS, restoredWsSettings);
      }

      if (payload.productivitySettings && typeof payload.productivitySettings === 'object') {
        const restoredProd: ProductivitySettings = {
          ...DEFAULT_PRODUCTIVITY_SETTINGS,
          ...payload.productivitySettings,
        };
        setProductivitySettingsState(restoredProd);
        setStoredItem(STORAGE_KEYS.PRODUCTIVITY_SETTINGS, restoredProd);
      }

      if (payload.notificationPreferences && typeof payload.notificationPreferences === 'object') {
        const restoredNotifs: NotificationPreferences = {
          ...DEFAULT_NOTIFICATION_PREFERENCES,
          ...payload.notificationPreferences,
        };
        setNotificationPreferencesState(restoredNotifs);
        setStoredItem(STORAGE_KEYS.NOTIFICATION_PREFERENCES, restoredNotifs);
      }

      if (payload.appearanceSettings && typeof payload.appearanceSettings === 'object') {
        if (payload.appearanceSettings.theme) setTheme(payload.appearanceSettings.theme);
        if (payload.appearanceSettings.density) setDensity(payload.appearanceSettings.density);
        if (payload.appearanceSettings.reducedMotion) setReducedMotion(payload.appearanceSettings.reducedMotion);
      }

      addToast({
        type: 'success',
        title: 'Workspace Restored',
        message: 'Successfully imported and verified workspace data.',
        duration: 3500,
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to import workspace data' };
    }
  }, [addToast, setDensity, setReducedMotion, setTheme]);

  /**
   * Transactional transition engine:
   * Synchronously mutates workspaceRef.current before scheduling React re-render,
   * guaranteeing that rapid same-tick consecutive mutations execute against the latest state
   * without losing data to stale closures.
   */
  interface TransactionOperationResult<R> {
    nextState: WorkspaceState;
    result: R;
    taskDeltas?: Task[];
    taskBaselines?: Task[];
    deletedTaskIds?: string[];
    projectDeltas?: Project[];
    deletedProjectIds?: string[];
    documentDeltas?: Document[];
    deletedDocumentIds?: string[];
  }

  /**
   * Transactional transition engine:
   * Synchronously mutates workspaceRef.current before scheduling React re-render,
   * guaranteeing that rapid same-tick consecutive mutations execute against the latest state
   * without losing data to stale closures.
   * Enforces strict monotonic revision advancement across all domain and UI mutations.
   */
  const executeTransaction = useCallback(
    <R,>(
      op: (state: WorkspaceState) => TransactionOperationResult<R>,
      options?: { mutationType?: string; skipBroadcast?: boolean }
    ): R => {
      hasLocalMutatedSinceMountRef.current = true;
      const currentState = workspaceRef.current;
      const opResult = op(currentState);
      const rawNextState = opResult.nextState;
      const result = opResult.result;

      // Invariant: Monotonically advance revision for ANY mutation executed through executeTransaction
      const nextState =
        rawNextState.revision !== undefined && rawNextState.revision > (currentState.revision ?? 0)
          ? rawNextState
          : advanceWorkspaceVersion(currentState, rawNextState);

      workspaceRef.current = nextState;
      setWorkspace(nextState);
      scheduleWorkspacePersistence(nextState);

      if (!options?.skipBroadcast) {
        broadcastMutation({
          epoch: nextState.epoch ?? 1,
          revision: nextState.revision ?? 1,
          mutationId: generateEntityId('mut'),
          mutationType: options?.mutationType || 'STATE_MUTATION',
          timestamp: new Date().toISOString(),
          taskDeltas: opResult.taskDeltas,
          taskBaselines: opResult.taskBaselines,
          deletedTaskIds: opResult.deletedTaskIds,
          projectDeltas: opResult.projectDeltas,
          deletedProjectIds: opResult.deletedProjectIds,
          documentDeltas: opResult.documentDeltas,
          deletedDocumentIds: opResult.deletedDocumentIds,
        });
      }

      return result;
    },
    []
  );

  // Time-based Overdue Task automation evaluation (Initialization + Tab focus)
  useEffect(() => {
    const checkOverdue = () => {
      executeTransaction((state) => {
        const { state: nextState, triggeredCount } = evaluateOverdueTasksOp(state);
        return { nextState, result: triggeredCount };
      });
    };

    checkOverdue();
    window.addEventListener('focus', checkOverdue);
    return () => window.removeEventListener('focus', checkOverdue);
  }, [executeTransaction]);

  // ---------------------------------------------------------------------------
  // Task Actions
  // ---------------------------------------------------------------------------
  const createTask = useCallback(
    (data: Partial<Task>): Task => {
      const priority = data.priority || workspaceSettings.defaultTaskPriority || 'Medium';
      const assigneeId =
        data.assigneeId ||
        (workspaceSettings.autoAssignCreator ? (userProfile.id || 'user-1') : undefined);

      const payload: Partial<Task> = {
        ...data,
        priority,
        ...(assigneeId ? { assigneeId } : {}),
      };

      const newTask = executeTransaction(
        (state) => {
          const { state: nextState, task } = createTaskOp(state, payload);
          return { nextState, result: task, taskDeltas: [task] };
        },
        { mutationType: 'CREATE_TASK' }
      );

      if (newTask.priority === 'Urgent') {
        dispatchBrowserNotification(`Urgent Task: ${newTask.title}`, {
          body: `High-priority item ${newTask.key} was added to the workspace.`,
        });
      }

      addToast({
        type: 'success',
        title: 'Task Created',
        message: `${newTask.key}: ${newTask.title}`,
      });

      return newTask;
    },
    [executeTransaction, addToast, workspaceSettings, userProfile.id, dispatchBrowserNotification]
  );

  const updateTask = useCallback(
    (id: string, updates: Partial<Task>) => {
      executeTransaction(
        (state) => {
          const previousTask = state.tasks.find((t) => t.id === id);
          const { state: nextState, task } = updateTaskOp(state, id, updates);
          return {
            nextState,
            result: task,
            taskDeltas: task ? [task] : undefined,
            taskBaselines: previousTask ? [previousTask] : undefined,
          };
        },
        { mutationType: 'UPDATE_TASK' }
      );

      addToast({
        type: 'info',
        title: 'Task Updated',
        message: 'Task updated',
        duration: 2000,
      });
    },
    [executeTransaction, addToast]
  );

  const moveTaskStatus = useCallback(
    (id: string, status: TaskStatus) => {
      const task = executeTransaction(
        (state) => {
          const previousTask = state.tasks.find((t) => t.id === id);
          const { state: nextState, task } = moveTaskStatusOp(state, id, status);
          return {
            nextState,
            result: task,
            taskDeltas: task ? [task] : undefined,
            taskBaselines: previousTask ? [previousTask] : undefined,
          };
        },
        { mutationType: 'MOVE_TASK_STATUS' }
      );

      if (!task) return;

      if (status === 'Done') {
        confetti({
          particleCount: 60,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#6366f1', '#10b981', '#38bdf8'],
        });
        addToast({
          type: 'success',
          title: 'Task Completed! 🎉',
          message: `${task.title} marked as Done`,
        });
      }
    },
    [executeTransaction, addToast]
  );

  const deleteTask = useCallback(
    (id: string) => {
      const deletedTask = executeTransaction(
        (state) => {
          const { state: nextState, deletedTask } = deleteTaskOp(state, id);
          return {
            nextState,
            result: deletedTask,
            deletedTaskIds: deletedTask ? [deletedTask.id] : undefined,
          };
        },
        { mutationType: 'DELETE_TASK' }
      );

      if (!deletedTask) return;
      if (selectedTaskId === id) setSelectedTaskId(null);

      // Toast with Transactional Undo
      addToast({
        type: 'warning',
        title: 'Task Deleted',
        message: `${deletedTask.key} was removed`,
        action: {
          label: 'Undo',
          onClick: () => {
            executeTransaction(
              (state) => {
                const { state: restoredState, restoredTask } = restoreTaskOp(state, deletedTask);
                return { nextState: restoredState, result: undefined, taskDeltas: [restoredTask] };
              },
              { mutationType: 'RESTORE_TASK' }
            );
          },
        },
        duration: 6000,
      });
    },
    [executeTransaction, selectedTaskId, addToast]
  );

  const duplicateTask = useCallback(
    (id: string) => {
      const target = workspaceRef.current.tasks.find((t) => t.id === id);
      if (!target) return;

      createTask({
        ...target,
        title: `${target.title} (Copy)`,
        status: 'Todo',
        subtasks: target.subtasks.map((s) => ({
          id: generateEntityId('sub'),
          title: s.title,
          completed: false,
        })),
        comments: [],
      });
    },
    [createTask]
  );

  const addSubtask = useCallback(
    (taskId: string, title: string) => {
      if (!title.trim()) return;
      const newSub = {
        id: generateEntityId('sub'),
        title: title.trim(),
        completed: false,
      };

      executeTransaction(
        (state) => {
          const previousTask = state.tasks.find((t) => t.id === taskId);
          const nextTasks = state.tasks.map((t) =>
            t.id === taskId
              ? { ...t, subtasks: [...t.subtasks, newSub], updatedAt: new Date().toISOString() }
              : t
          );
          const updatedTask = nextTasks.find((t) => t.id === taskId);
          return {
            nextState: { ...state, tasks: nextTasks },
            result: undefined,
            taskDeltas: updatedTask ? [updatedTask] : undefined,
            taskBaselines: previousTask ? [previousTask] : undefined,
          };
        },
        { mutationType: 'UPDATE_TASK' }
      );
    },
    [executeTransaction]
  );

  const toggleSubtask = useCallback(
    (taskId: string, subtaskId: string) => {
      executeTransaction(
        (state) => {
          const previousTask = state.tasks.find((t) => t.id === taskId);
          const nextTasks = state.tasks.map((t) => {
            if (t.id !== taskId) return t;
            return {
              ...t,
              subtasks: t.subtasks.map((s) =>
                s.id === subtaskId ? { ...s, completed: !s.completed } : s
              ),
              updatedAt: new Date().toISOString(),
            };
          });
          const updatedTask = nextTasks.find((t) => t.id === taskId);
          return {
            nextState: { ...state, tasks: nextTasks },
            result: undefined,
            taskDeltas: updatedTask ? [updatedTask] : undefined,
            taskBaselines: previousTask ? [previousTask] : undefined,
          };
        },
        { mutationType: 'UPDATE_TASK' }
      );
    },
    [executeTransaction]
  );

  const deleteSubtask = useCallback(
    (taskId: string, subtaskId: string) => {
      executeTransaction(
        (state) => {
          const previousTask = state.tasks.find((t) => t.id === taskId);
          const nextTasks = state.tasks.map((t) => {
            if (t.id !== taskId) return t;
            return {
              ...t,
              subtasks: t.subtasks.filter((s) => s.id !== subtaskId),
              updatedAt: new Date().toISOString(),
            };
          });
          const updatedTask = nextTasks.find((t) => t.id === taskId);
          return {
            nextState: { ...state, tasks: nextTasks },
            result: undefined,
            taskDeltas: updatedTask ? [updatedTask] : undefined,
            taskBaselines: previousTask ? [previousTask] : undefined,
          };
        },
        { mutationType: 'UPDATE_TASK' }
      );
    },
    [executeTransaction]
  );

  const addComment = useCallback(
    (taskId: string, content: string) => {
      if (!content.trim()) return;
      const comment = {
        id: generateEntityId('comm'),
        authorId: 'user-1',
        content: content.trim(),
        timestamp: new Date().toISOString(),
      };

      executeTransaction(
        (state) => {
          const previousTask = state.tasks.find((t) => t.id === taskId);
          const nextTasks = state.tasks.map((t) =>
            t.id === taskId
              ? { ...t, comments: [...t.comments, comment], updatedAt: new Date().toISOString() }
              : t
          );
          const updatedTask = nextTasks.find((t) => t.id === taskId);
          return {
            nextState: { ...state, tasks: nextTasks },
            result: undefined,
            taskDeltas: updatedTask ? [updatedTask] : undefined,
            taskBaselines: previousTask ? [previousTask] : undefined,
          };
        },
        { mutationType: 'UPDATE_TASK' }
      );

      addToast({
        type: 'success',
        title: 'Comment posted',
        duration: 2000,
      });
    },
    [executeTransaction, addToast]
  );

  const bulkUpdateTasks = useCallback(
    (ids: string[], updates: Partial<Task>) => {
      executeTransaction(
        (state) => {
          const previousTasks = state.tasks.filter((t) => ids.includes(t.id));
          const { state: nextState, updatedTasks } = bulkUpdateTasksOp(state, ids, updates);
          return {
            nextState,
            result: updatedTasks,
            taskDeltas: updatedTasks,
            taskBaselines: previousTasks,
          };
        },
        { mutationType: 'BULK_UPDATE_TASKS' }
      );

      addToast({
        type: 'info',
        title: 'Bulk Update Applied',
        message: `Updated ${ids.length} tasks`,
      });
    },
    [executeTransaction, addToast]
  );

  const bulkDeleteTasks = useCallback(
    (ids: string[]) => {
      const deletedTasks = executeTransaction(
        (state) => {
          const { state: nextState, deletedTasks } = bulkDeleteTasksOp(state, ids);
          return {
            nextState,
            result: deletedTasks,
            deletedTaskIds: deletedTasks.map((t) => t.id),
          };
        },
        { mutationType: 'BULK_DELETE_TASKS' }
      );

      addToast({
        type: 'warning',
        title: 'Bulk Tasks Deleted',
        message: `Removed ${deletedTasks.length} tasks`,
        action: {
          label: 'Undo',
          onClick: () => {
            executeTransaction(
              (state) => {
                const { state: nextState, restoredTasks } = bulkRestoreTasksOp(state, deletedTasks);
                return { nextState, result: undefined, taskDeltas: restoredTasks };
              },
              { mutationType: 'BULK_RESTORE_TASKS' }
            );
          },
        },
        duration: 6000,
      });
    },
    [executeTransaction, addToast]
  );

  // ---------------------------------------------------------------------------
  // Project Actions
  // ---------------------------------------------------------------------------
  const createProject = useCallback(
    (data: Partial<Project>): Project => {
      let key = data.key?.trim();
      if (!key && workspaceSettings.projectKeyPrefix) {
        const base = (data.name?.trim() || 'PRJ').slice(0, 3).toUpperCase();
        key = `${workspaceSettings.projectKeyPrefix.toUpperCase()}-${base}`;
      }

      const payload: Partial<Project> = {
        ...data,
        key: key || data.key,
      };

      const newProject = executeTransaction(
        (state) => {
          const { state: nextState, project } = createProjectOp(state, payload);
          return { nextState, result: project, projectDeltas: [project] };
        },
        { mutationType: 'CREATE_PROJECT' }
      );

      setLastActiveProjectId(newProject.id);

      addToast({
        type: 'success',
        title: 'Project Created',
        message: newProject.name,
      });

      return newProject;
    },
    [executeTransaction, addToast, workspaceSettings.projectKeyPrefix]
  );

  const updateProject = useCallback(
    (id: string, updates: Partial<Project>) => {
      executeTransaction(
        (state) => {
          const nextProjects = state.projects.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          );
          const updated = nextProjects.find((p) => p.id === id);
          return {
            nextState: { ...state, projects: nextProjects },
            result: undefined,
            projectDeltas: updated ? [updated] : undefined,
          };
        },
        { mutationType: 'UPDATE_PROJECT' }
      );

      addToast({
        type: 'info',
        title: 'Project Updated',
        duration: 2000,
      });
    },
    [executeTransaction, addToast]
  );

  const deleteProject = useCallback(
    (id: string) => {
      const deleted = executeTransaction(
        (state) => {
          const { state: nextState, deletedProject } = deleteProjectCascadeOp(state, id);
          return {
            nextState,
            result: deletedProject,
            deletedProjectIds: deletedProject ? [deletedProject.id] : undefined,
          };
        },
        { mutationType: 'DELETE_PROJECT' }
      );

      if (!deleted) return;
      if (activeProjectId === id) setActiveProjectId(null);

      addToast({
        type: 'warning',
        title: 'Project & Associated Records Deleted',
        message: `${deleted.name} was cleanly removed.`,
      });
    },
    [executeTransaction, activeProjectId, addToast]
  );

  // ---------------------------------------------------------------------------
  // Invitation Actions
  // ---------------------------------------------------------------------------
  const createInvitation = useCallback(
    (invitationData: Omit<PendingInvitation, 'id' | 'invitedAt' | 'status'>): PendingInvitation => {
      const newInv: PendingInvitation = {
        ...invitationData,
        id: generateEntityId('inv'),
        invitedAt: 'Just now',
        status: 'Pending',
      };

      executeTransaction((state) => ({
        nextState: { ...state, pendingInvitations: [newInv, ...state.pendingInvitations] },
        result: undefined,
      }));

      addToast({
        type: 'success',
        title: 'Workspace Invitation Created',
        message: `Registered local invite for ${newInv.name} (${newInv.email}). Ready to join upon auth.`,
      });

      return newInv;
    },
    [executeTransaction, addToast]
  );

  const cancelInvitation = useCallback(
    (id: string) => {
      executeTransaction((state) => ({
        nextState: {
          ...state,
          pendingInvitations: state.pendingInvitations.filter((i) => i.id !== id),
        },
        result: undefined,
      }));

      addToast({
        type: 'info',
        title: 'Invitation Revoked',
        duration: 2000,
      });
    },
    [executeTransaction, addToast]
  );

  // ---------------------------------------------------------------------------
  // Document Actions
  // ---------------------------------------------------------------------------
  const createDocument = useCallback(
    (data: Partial<Document>): Document => {
      const defaultProjectId = workspaceRef.current.projects[0]?.id || 'proj-1';
      const newDoc: Document = {
        id: generateEntityId('doc'),
        title: data.title?.trim() || 'Untitled Specification',
        type: data.type || 'Spec',
        projectId: data.projectId || defaultProjectId,
        authorId: data.authorId || 'user-1',
        lastEdited: new Date().toISOString(),
        content:
          data.content?.trim() ||
          `# ${data.title?.trim() || 'Untitled Specification'}\n\nStart writing technical requirements...`,
        isFavorite: false,
        tags: data.tags || ['General'],
      };

      executeTransaction(
        (state) => ({
          nextState: { ...state, documents: [newDoc, ...state.documents] },
          result: undefined,
          documentDeltas: [newDoc],
        }),
        { mutationType: 'CREATE_DOCUMENT' }
      );

      addToast({
        type: 'success',
        title: 'Document Created',
        message: newDoc.title,
      });
      return newDoc;
    },
    [executeTransaction, addToast]
  );

  const updateDocument = useCallback(
    (id: string, updates: Partial<Document>) => {
      executeTransaction(
        (state) => {
          const nextDocs = state.documents.map((d) =>
            d.id === id ? { ...d, ...updates, lastEdited: new Date().toISOString() } : d
          );
          const updated = nextDocs.find((d) => d.id === id);
          return {
            nextState: { ...state, documents: nextDocs },
            result: undefined,
            documentDeltas: updated ? [updated] : undefined,
          };
        },
        { mutationType: 'UPDATE_DOCUMENT' }
      );
    },
    [executeTransaction]
  );

  const deleteDocument = useCallback(
    (id: string) => {
      executeTransaction(
        (state) => ({
          nextState: {
            ...state,
            documents: state.documents.filter((d) => d.id !== id),
          },
          result: undefined,
          deletedDocumentIds: [id],
        }),
        { mutationType: 'DELETE_DOCUMENT' }
      );

      if (selectedDocId === id) setSelectedDocId(null);
      addToast({
        type: 'info',
        title: 'Document Deleted',
      });
    },
    [executeTransaction, selectedDocId, addToast]
  );

  const toggleFavoriteDocument = useCallback(
    (id: string) => {
      executeTransaction(
        (state) => {
          const nextDocs = state.documents.map((d) =>
            d.id === id ? { ...d, isFavorite: !d.isFavorite } : d
          );
          const updated = nextDocs.find((d) => d.id === id);
          return {
            nextState: {
              ...state,
              documents: nextDocs,
            },
            result: undefined,
            documentDeltas: updated ? [updated] : undefined,
          };
        },
        { mutationType: 'UPDATE_DOCUMENT' }
      );
    },
    [executeTransaction]
  );

  // ---------------------------------------------------------------------------
  // Notification Actions
  // ---------------------------------------------------------------------------
  const markNotificationRead = useCallback(
    (id: string) => {
      executeTransaction((state) => ({
        nextState: {
          ...state,
          notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        },
        result: undefined,
      }));
    },
    [executeTransaction]
  );

  const markAllNotificationsRead = useCallback(() => {
    executeTransaction((state) => ({
      nextState: {
        ...state,
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
      },
      result: undefined,
    }));

    addToast({
      type: 'info',
      title: 'All notifications marked as read',
      duration: 2000,
    });
  }, [executeTransaction, addToast]);

  const deleteNotification = useCallback(
    (id: string) => {
      executeTransaction((state) => ({
        nextState: {
          ...state,
          notifications: state.notifications.filter((n) => n.id !== id),
        },
        result: undefined,
      }));
    },
    [executeTransaction]
  );

  const unreadNotificationsCount = useMemo(() => {
    if (!notificationPreferences.inAppNotifications) {
      return 0;
    }
    return workspace.notifications.filter((n) => {
      if (n.read) return false;
      if (n.category) {
        const cat = n.category.toLowerCase();
        if (cat.includes('assign') && !notificationPreferences.categories.assignments) return false;
        if (cat.includes('mention') && !notificationPreferences.categories.mentions) return false;
        if (cat.includes('deadline') && !notificationPreferences.categories.deadlines) return false;
        if (cat.includes('project') && !notificationPreferences.categories.projectUpdates) return false;
        if ((cat.includes('system') || cat.includes('rule') || cat.includes('auto')) && !notificationPreferences.categories.automationEvents) return false;
        if (cat.includes('activity') && !notificationPreferences.categories.workspaceActivity) return false;
      }
      return true;
    }).length;
  }, [workspace.notifications, notificationPreferences]);

  // ---------------------------------------------------------------------------
  // Automation Actions
  // ---------------------------------------------------------------------------
  const toggleAutomationRule = useCallback(
    (id: string) => {
      executeTransaction((state) => {
        let ruleName = '';
        let isNowEnabled = false;

        const nextAutomations = state.automations.map((r) => {
          if (r.id !== id) return r;
          isNowEnabled = !r.enabled;
          ruleName = r.name;
          return { ...r, enabled: isNowEnabled };
        });

        if (ruleName) {
          addToast({
            type: 'info',
            title: `Rule ${isNowEnabled ? 'Enabled' : 'Disabled'}`,
            message: ruleName,
            duration: 2000,
          });
        }

        return { nextState: { ...state, automations: nextAutomations }, result: undefined };
      });
    },
    [executeTransaction, addToast]
  );

  const createAutomationRule = useCallback(
    (data: Partial<AutomationRule>) => {
      const newRule: AutomationRule = {
        id: generateEntityId('auto'),
        name: data.name?.trim() || 'New Automation Rule',
        description: data.description?.trim() || 'Custom workflow rule',
        enabled: true,
        trigger: data.trigger || 'Task status changes to Done',
        condition: data.condition || 'Status != Done',
        action: data.action || 'Set Priority = Urgent & Send Notification',
        lastTriggered: 'Never',
      };

      executeTransaction((state) => ({
        nextState: { ...state, automations: [newRule, ...state.automations] },
        result: undefined,
      }));

      addToast({
        type: 'success',
        title: 'Automation Rule Created',
        message: newRule.name,
      });
    },
    [executeTransaction, addToast]
  );

  const deleteAutomationRule = useCallback(
    (id: string) => {
      executeTransaction((state) => ({
        nextState: {
          ...state,
          automations: state.automations.filter((r) => r.id !== id),
        },
        result: undefined,
      }));

      addToast({
        type: 'info',
        title: 'Rule Removed',
      });
    },
    [executeTransaction, addToast]
  );

  const duplicateAutomationRule = useCallback(
    (id: string) => {
      const rule = workspaceRef.current.automations.find((r) => r.id === id);
      if (!rule) return;
      createAutomationRule({
        ...rule,
        name: `${rule.name} (Copy)`,
      });
    },
    [createAutomationRule]
  );

  // ---------------------------------------------------------------------------
  // High-Performance Derived AI Insights (O(T) Single Pass)
  // ---------------------------------------------------------------------------
  const insights: AIInsight[] = useMemo(() => {
    const { projects, tasks, members } = workspace;
    const generated: AIInsight[] = [];

    // Pre-aggregate task stats in a single linear pass across all tasks
    const projectRiskMap = new Map<string, { urgentUnresolved: number; overdueCount: number }>();
    const memberActiveMap = new Map<string, number>();
    let doneCount = 0;

    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      if (t.status === 'Done') {
        doneCount++;
        continue;
      }

      // Tally active member count
      if (t.assigneeId && t.assigneeId !== 'unassigned') {
        memberActiveMap.set(t.assigneeId, (memberActiveMap.get(t.assigneeId) || 0) + 1);
      }

      // Tally project risk stats
      let pStats = projectRiskMap.get(t.projectId);
      if (!pStats) {
        pStats = { urgentUnresolved: 0, overdueCount: 0 };
        projectRiskMap.set(t.projectId, pStats);
      }
      if (t.priority === 'Urgent') pStats.urgentUnresolved++;
      if (isTaskOverdue(t.dueDate, t.status)) pStats.overdueCount++;
    }

    // 1. Project delivery risk assessment (O(P))
    for (let i = 0; i < projects.length; i++) {
      const p = projects[i];
      const pStats = projectRiskMap.get(p.id) || { urgentUnresolved: 0, overdueCount: 0 };

      if (pStats.urgentUnresolved >= 2 || pStats.overdueCount >= 2) {
        generated.push({
          id: `insight_proj_${p.id}`,
          type: 'risk',
          title: `Delivery Risk in ${p.name}`,
          summary: `${p.name} has ${pStats.urgentUnresolved} urgent tasks and ${pStats.overdueCount} overdue milestones.`,
          detail: `Critical path analysis indicates schedule slippage toward target deadline (${p.deadline}). Consider re-allocating engineering capacity from on-track sprints.`,
          impact: 'High',
          usefulCount: usefulInsightCounts[`insight_proj_${p.id}`] || 14,
          isDismissed: dismissedInsightIds.includes(`insight_proj_${p.id}`),
          actionLabel: 'Review Board',
          relatedProjectId: p.id,
        });
      }
    }

    // 2. Engineer capacity saturation (O(M))
    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      const activeCount = memberActiveMap.get(m.id) || 0;
      if (activeCount >= 5 || m.workload > 80) {
        generated.push({
          id: `insight_workload_${m.id}`,
          type: 'workload',
          title: `Capacity Saturation: ${m.name}`,
          summary: `${m.name} has ${activeCount} active work items (${m.workload}% load), exceeding recommended sustainability thresholds.`,
          detail: `Load skew is 38% above team median. High workload increases code review turnaround latency. Consider task rebalancing.`,
          impact: 'Medium',
          usefulCount: usefulInsightCounts[`insight_workload_${m.id}`] || 9,
          isDismissed: dismissedInsightIds.includes(`insight_workload_${m.id}`),
          actionLabel: 'Rebalance Tasks',
          relatedMemberId: m.id,
        });
      }
    }

    // 3. Throughput acceleration
    generated.push({
      id: 'insight_velocity_aggregate',
      type: 'velocity',
      title: 'Engineering Throughput Metrics',
      summary: `Team completed ${doneCount} tasks across ${projects.length} initiatives with steady cycle time.`,
      detail: `Average task turnaround is currently 3.4 days with zero critical deployment regressions logged this sprint.`,
      impact: 'Low',
      usefulCount: usefulInsightCounts['insight_velocity_aggregate'] || 27,
      isDismissed: dismissedInsightIds.includes('insight_velocity_aggregate'),
      actionLabel: 'Telemetry',
    });

    return generated;
  }, [workspace, dismissedInsightIds, usefulInsightCounts]);

  const dismissInsight = useCallback(
    (id: string) => {
      setDismissedInsightIds((prev) => [...prev, id]);
      addToast({
        type: 'info',
        title: 'Insight Dismissed',
        duration: 2000,
      });
    },
    [addToast]
  );

  const markInsightUseful = useCallback(
    (id: string) => {
      setUsefulInsightCounts((prev) => ({
        ...prev,
        [id]: (prev[id] || 0) + 1,
      }));
      addToast({
        type: 'success',
        title: 'Feedback Recorded',
        message: 'Insight helpfulness score updated.',
        duration: 2500,
      });
    },
    [addToast]
  );

  const resetDemoData = useCallback(() => {
    // Only clears keys prefixed with 'nexus_'!
    clearNexusStorage();
    clearWorkspaceFromIDB();

    const resetState = createResetWorkspaceState(workspaceRef.current, initialWorkspace);
    workspaceRef.current = resetState;
    setWorkspace(resetState);
    scheduleWorkspacePersistence(resetState, 0);
    broadcastWorkspaceReset(resetState.epoch ?? 2, resetState.revision ?? 1);
    setDismissedInsightIds([]);
    setUsefulInsightCounts({});

    setUserProfileState(DEFAULT_USER_PROFILE);
    setWorkspaceSettingsState(DEFAULT_WORKSPACE_SETTINGS);
    setProductivitySettingsState(DEFAULT_PRODUCTIVITY_SETTINGS);
    setNotificationPreferencesState(DEFAULT_NOTIFICATION_PREFERENCES);
    setReducedMotionState('system');
    setActiveViewState('overview');
    setActiveProjectId(null);
    setLastActiveProjectId(null);
    setPreviousView(null);
    setProjectTab('Board');

    addToast({
      type: 'success',
      title: 'Workspace Reset Complete',
      message: 'Restored original demo data without touching other local storage.',
    });
  }, [initialWorkspace, addToast]);

  const value = useMemo<AppContextType>(
    () => ({
      projects: workspace.projects,
      tasks: workspace.tasks,
      members: workspace.members,
      pendingInvitations: workspace.pendingInvitations,
      documents: workspace.documents,
      notifications: workspace.notifications,
      automations: workspace.automations,
      activities: workspace.activities,
      insights,

      activeView,
      setActiveView,
      activeProjectId,
      setActiveProjectId,
      openProject,
      openProjectsDirectory,
      lastActiveProjectId,
      previousView,
      returnToPreviousView,
      isMobileSidebarOpen,
      setIsMobileSidebarOpen,
      dispatchBrowserNotification,
      projectTab,
      setProjectTab,
      selectedTaskId,
      setSelectedTaskId,
      selectedMemberId,
      setSelectedMemberId,
      selectedDocId,
      setSelectedDocId,

      isCommandPaletteOpen,
      setIsCommandPaletteOpen,
      isQuickCreateOpen,
      setIsQuickCreateOpen,
      quickCreateDefaultTab,
      setQuickCreateDefaultTab,
      isNotificationDrawerOpen,
      setIsNotificationDrawerOpen,
      isShortcutsModalOpen,
      setIsShortcutsModalOpen,
      sidebarCollapsed,
      setSidebarCollapsed,

      searchQuery,
      setSearchQuery,
      isSearchOpen,
      setIsSearchOpen,

      theme,
      setTheme,
      density,
      setDensity,
      reducedMotion,
      setReducedMotion,

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

      exportWorkspaceData,
      validateImportPayload,
      importWorkspaceData,

      toasts,
      addToast,
      removeToast,

      unreadNotificationsCount,

      createTask,
      updateTask,
      deleteTask,
      duplicateTask,
      moveTaskStatus,
      addSubtask,
      toggleSubtask,
      deleteSubtask,
      addComment,
      bulkUpdateTasks,
      bulkDeleteTasks,

      createProject,
      updateProject,
      deleteProject,

      createInvitation,
      cancelInvitation,

      createDocument,
      updateDocument,
      deleteDocument,
      toggleFavoriteDocument,

      markNotificationRead,
      markAllNotificationsRead,
      deleteNotification,

      toggleAutomationRule,
      createAutomationRule,
      deleteAutomationRule,
      duplicateAutomationRule,

      dismissInsight,
      markInsightUseful,

      resetDemoData,

      persistenceStatus,
      retryPersistence: retryFailedPersistence,
    }),
    [
      workspace,
      persistenceStatus,
      insights,
      activeView,
      setActiveView,
      activeProjectId,
      openProject,
      openProjectsDirectory,
      lastActiveProjectId,
      previousView,
      returnToPreviousView,
      isMobileSidebarOpen,
      setIsMobileSidebarOpen,
      dispatchBrowserNotification,
      projectTab,
      selectedTaskId,
      selectedMemberId,
      selectedDocId,
      isCommandPaletteOpen,
      isQuickCreateOpen,
      quickCreateDefaultTab,
      isNotificationDrawerOpen,
      isShortcutsModalOpen,
      sidebarCollapsed,
      searchQuery,
      isSearchOpen,
      theme,
      setTheme,
      density,
      setDensity,
      reducedMotion,
      setReducedMotion,
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
      exportWorkspaceData,
      validateImportPayload,
      importWorkspaceData,
      toasts,
      addToast,
      removeToast,
      unreadNotificationsCount,
      createTask,
      updateTask,
      deleteTask,
      duplicateTask,
      moveTaskStatus,
      addSubtask,
      toggleSubtask,
      deleteSubtask,
      addComment,
      bulkUpdateTasks,
      bulkDeleteTasks,
      createProject,
      updateProject,
      deleteProject,
      createInvitation,
      cancelInvitation,
      createDocument,
      updateDocument,
      deleteDocument,
      toggleFavoriteDocument,
      markNotificationRead,
      markAllNotificationsRead,
      deleteNotification,
      toggleAutomationRule,
      createAutomationRule,
      deleteAutomationRule,
      duplicateAutomationRule,
      dismissInsight,
      markInsightUseful,
      resetDemoData,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
