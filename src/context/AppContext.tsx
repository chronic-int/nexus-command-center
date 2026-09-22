import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
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
  ToastMessage,
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
} from '../domain/workspaceDomain';
import { hydrateAndValidateWorkspace } from '../domain/workspaceHydration';
import {
  scheduleWorkspacePersistence,
  loadUnifiedWorkspace,
  clearWorkspaceFromIDB,
} from '../utils/idbStorage';

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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Initial State Hydration with Scoped Storage & Runtime Sanitization
  const initialWorkspace = useMemo<WorkspaceState>(() => {
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() =>
    getStoredItem(STORAGE_KEYS.SIDEBAR, false)
  );

  // Navigation state
  const [activeView, setActiveView] = useState<string>('overview');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [projectTab, setProjectTab] = useState<ViewTab>('Board');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

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

  // Async hydration from IndexedDB on startup
  useEffect(() => {
    let isMounted = true;
    loadUnifiedWorkspace().then((persisted) => {
      if (isMounted && persisted && persisted.projects && persisted.tasks) {
        const sanitized = hydrateAndValidateWorkspace(persisted, initialWorkspace).workspace;
        workspaceRef.current = sanitized;
        setWorkspace(sanitized);
      }
    });
    return () => {
      isMounted = false;
    };
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

  /**
   * Transactional transition engine:
   * Synchronously mutates workspaceRef.current before scheduling React re-render,
   * guaranteeing that rapid same-tick consecutive mutations execute against the latest state
   * without losing data to stale closures.
   */
  const executeTransaction = useCallback(
    <R,>(op: (state: WorkspaceState) => { nextState: WorkspaceState; result: R }): R => {
      const currentState = workspaceRef.current;
      const { nextState, result } = op(currentState);
      workspaceRef.current = nextState;
      setWorkspace(nextState);
      scheduleWorkspacePersistence(nextState);
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
      const newTask = executeTransaction((state) => {
        const { state: nextState, task } = createTaskOp(state, data);
        return { nextState, result: task };
      });

      addToast({
        type: 'success',
        title: 'Task Created',
        message: `${newTask.key}: ${newTask.title}`,
      });

      return newTask;
    },
    [executeTransaction, addToast]
  );

  const updateTask = useCallback(
    (id: string, updates: Partial<Task>) => {
      executeTransaction((state) => {
        const { state: nextState } = updateTaskOp(state, id, updates);
        return { nextState, result: undefined };
      });

      addToast({
        type: 'info',
        title: 'Task Updated',
        message: 'Changes saved automatically',
        duration: 2000,
      });
    },
    [executeTransaction, addToast]
  );

  const moveTaskStatus = useCallback(
    (id: string, status: TaskStatus) => {
      const task = executeTransaction((state) => {
        const { state: nextState, task } = moveTaskStatusOp(state, id, status);
        return { nextState, result: task };
      });

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
      const deletedTask = executeTransaction((state) => {
        const { state: nextState, deletedTask } = deleteTaskOp(state, id);
        return { nextState, result: deletedTask };
      });

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
            executeTransaction((state) => {
              const { state: restoredState } = restoreTaskOp(state, deletedTask);
              return { nextState: restoredState, result: undefined };
            });
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

      executeTransaction((state) => {
        const nextTasks = state.tasks.map((t) =>
          t.id === taskId
            ? { ...t, subtasks: [...t.subtasks, newSub], updatedAt: new Date().toISOString() }
            : t
        );
        return { nextState: { ...state, tasks: nextTasks }, result: undefined };
      });
    },
    [executeTransaction]
  );

  const toggleSubtask = useCallback(
    (taskId: string, subtaskId: string) => {
      executeTransaction((state) => {
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
        return { nextState: { ...state, tasks: nextTasks }, result: undefined };
      });
    },
    [executeTransaction]
  );

  const deleteSubtask = useCallback(
    (taskId: string, subtaskId: string) => {
      executeTransaction((state) => {
        const nextTasks = state.tasks.map((t) => {
          if (t.id !== taskId) return t;
          return {
            ...t,
            subtasks: t.subtasks.filter((s) => s.id !== subtaskId),
            updatedAt: new Date().toISOString(),
          };
        });
        return { nextState: { ...state, tasks: nextTasks }, result: undefined };
      });
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

      executeTransaction((state) => {
        const nextTasks = state.tasks.map((t) =>
          t.id === taskId
            ? { ...t, comments: [...t.comments, comment], updatedAt: new Date().toISOString() }
            : t
        );
        return { nextState: { ...state, tasks: nextTasks }, result: undefined };
      });

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
      executeTransaction((state) => {
        const { state: nextState, updatedTasks } = bulkUpdateTasksOp(state, ids, updates);
        return { nextState, result: updatedTasks };
      });

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
      const deletedTasks = executeTransaction((state) => {
        const { state: nextState, deletedTasks } = bulkDeleteTasksOp(state, ids);
        return { nextState, result: deletedTasks };
      });

      addToast({
        type: 'warning',
        title: 'Bulk Tasks Deleted',
        message: `Removed ${deletedTasks.length} tasks`,
        action: {
          label: 'Undo',
          onClick: () => {
            executeTransaction((state) => {
              const { state: nextState } = bulkRestoreTasksOp(state, deletedTasks);
              return { nextState, result: undefined };
            });
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
      const newProject = executeTransaction((state) => {
        const { state: nextState, project } = createProjectOp(state, data);
        return { nextState, result: project };
      });

      addToast({
        type: 'success',
        title: 'Project Created',
        message: newProject.name,
      });

      return newProject;
    },
    [executeTransaction, addToast]
  );

  const updateProject = useCallback(
    (id: string, updates: Partial<Project>) => {
      executeTransaction((state) => {
        const nextProjects = state.projects.map((p) =>
          p.id === id ? { ...p, ...updates } : p
        );
        return { nextState: { ...state, projects: nextProjects }, result: undefined };
      });

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
      const deleted = executeTransaction((state) => {
        const { state: nextState, deletedProject } = deleteProjectCascadeOp(state, id);
        return { nextState, result: deletedProject };
      });

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

      executeTransaction((state) => ({
        nextState: { ...state, documents: [newDoc, ...state.documents] },
        result: undefined,
      }));

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
      executeTransaction((state) => ({
        nextState: {
          ...state,
          documents: state.documents.map((d) =>
            d.id === id ? { ...d, ...updates, lastEdited: new Date().toISOString() } : d
          ),
        },
        result: undefined,
      }));
    },
    [executeTransaction]
  );

  const deleteDocument = useCallback(
    (id: string) => {
      executeTransaction((state) => ({
        nextState: {
          ...state,
          documents: state.documents.filter((d) => d.id !== id),
        },
        result: undefined,
      }));

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
      executeTransaction((state) => ({
        nextState: {
          ...state,
          documents: state.documents.map((d) =>
            d.id === id ? { ...d, isFavorite: !d.isFavorite } : d
          ),
        },
        result: undefined,
      }));
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
    return workspace.notifications.filter((n) => !n.read).length;
  }, [workspace.notifications]);

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

  // ---------------------------------------------------------------------------
  // Scoped Non-Destructive Reset
  // ---------------------------------------------------------------------------
  const resetDemoData = useCallback(() => {
    // Only clears keys prefixed with 'nexus_'!
    clearNexusStorage();
    clearWorkspaceFromIDB();

    workspaceRef.current = initialWorkspace;
    setWorkspace(initialWorkspace);
    setDismissedInsightIds([]);
    setUsefulInsightCounts({});

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
    }),
    [
      workspace,
      insights,
      activeView,
      activeProjectId,
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
