import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
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
import { getTodayString, isTaskOverdue, formatRelativeTime } from '../utils/dateUtils';
import { generateEntityId, getNextTaskKey } from '../utils/idGenerator';
import {
  calculateProjectProgress,
  calculateProjectHealth,
  calculateMemberWorkload,
} from '../utils/metrics';
import { processWorkspaceAutomation } from '../utils/automationEngine';

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
  // 1. Initial State Hydration with Scoped LocalStorage
  const [projects, setProjects] = useState<Project[]>(() =>
    getStoredItem(STORAGE_KEYS.PROJECTS, INITIAL_PROJECTS)
  );
  const [tasks, setTasks] = useState<Task[]>(() =>
    getStoredItem(STORAGE_KEYS.TASKS, INITIAL_TASKS)
  );
  const [members, setMembers] = useState<TeamMember[]>(() =>
    getStoredItem(STORAGE_KEYS.MEMBERS, INITIAL_MEMBERS)
  );
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>(() =>
    getStoredItem(STORAGE_KEYS.INVITATIONS, [
      {
        id: 'inv_init_1',
        email: 'jordan.zhao@nexus.io',
        name: 'Jordan Zhao',
        role: 'Staff Frontend Engineer',
        department: 'Engineering',
        invitedAt: 'Yesterday',
        status: 'Pending',
      },
    ])
  );
  const [documents, setDocuments] = useState<Document[]>(() =>
    getStoredItem(STORAGE_KEYS.DOCUMENTS, INITIAL_DOCUMENTS)
  );
  const [notifications, setNotifications] = useState<Notification[]>(() =>
    getStoredItem(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS)
  );
  const [automations, setAutomations] = useState<AutomationRule[]>(() =>
    getStoredItem(STORAGE_KEYS.AUTOMATIONS, INITIAL_AUTOMATIONS)
  );
  const [activities, setActivities] = useState<ActivityItem[]>(() =>
    getStoredItem(STORAGE_KEYS.ACTIVITIES, INITIAL_ACTIVITIES)
  );

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

  // 2. Persistence Synchronization
  useEffect(() => setStoredItem(STORAGE_KEYS.PROJECTS, projects), [projects]);
  useEffect(() => setStoredItem(STORAGE_KEYS.TASKS, tasks), [tasks]);
  useEffect(() => setStoredItem(STORAGE_KEYS.MEMBERS, members), [members]);
  useEffect(() => setStoredItem(STORAGE_KEYS.INVITATIONS, pendingInvitations), [pendingInvitations]);
  useEffect(() => setStoredItem(STORAGE_KEYS.DOCUMENTS, documents), [documents]);
  useEffect(() => setStoredItem(STORAGE_KEYS.NOTIFICATIONS, notifications), [notifications]);
  useEffect(() => setStoredItem(STORAGE_KEYS.AUTOMATIONS, automations), [automations]);
  useEffect(() => setStoredItem(STORAGE_KEYS.ACTIVITIES, activities), [activities]);
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

  // Recalculate derived state for affected projects & members cleanly outside state setters
  const recomputeRelationalMetrics = useCallback(
    (nextTasks: Task[], affectedProjectIds?: string[]) => {
      setProjects((prevProjects) =>
        prevProjects.map((p) => {
          if (affectedProjectIds && !affectedProjectIds.includes(p.id)) return p;
          const progress = calculateProjectProgress(nextTasks, p.id);
          const health = calculateProjectHealth(nextTasks, p.id, p.health);
          return { ...p, progress, health };
        })
      );

      setMembers((prevMembers) =>
        prevMembers.map((m) => {
          const workload = calculateMemberWorkload(nextTasks, m.id);
          return { ...m, workload };
        })
      );
    },
    []
  );

  // Trigger automation engine cleanly
  const runAutomationEngine = useCallback(
    (
      eventType: 'TASK_CREATED' | 'STATUS_CHANGED' | 'PRIORITY_CHANGED' | 'DEADLINE_OVERDUE',
      task: Task,
      previousTask?: Task
    ) => {
      const result = processWorkspaceAutomation(
        automations,
        { type: eventType, task, previousTask },
        tasks,
        projects
      );

      if (result.triggeredRuleIds.length > 0) {
        // Update lastTriggered on matching rules
        setAutomations((prev) =>
          prev.map((r) =>
            result.triggeredRuleIds.includes(r.id)
              ? { ...r, lastTriggered: 'Just now' }
              : r
          )
        );

        if (result.newNotifications.length > 0) {
          setNotifications((prev) => [...result.newNotifications, ...prev]);
        }

        if (result.newActivities.length > 0) {
          setActivities((prev) => [...result.newActivities, ...prev]);
        }

        // Re-apply any task or project mutations generated by automations
        if (result.updatedTasks !== tasks) {
          setTasks(result.updatedTasks);
          recomputeRelationalMetrics(result.updatedTasks);
        }
      }
    },
    [automations, tasks, projects, recomputeRelationalMetrics]
  );

  // 3. Pure, Deterministic Task Actions
  const createTask = useCallback(
    (data: Partial<Task>): Task => {
      const project = projects.find((p) => p.id === data.projectId) || projects[0];
      const key = getNextTaskKey(project.key, tasks);
      const now = new Date().toISOString();

      const newTask: Task = {
        id: generateEntityId('task'),
        key,
        title: data.title?.trim() || 'Untitled Task',
        description: data.description?.trim() || '',
        status: data.status || 'Todo',
        priority: data.priority || 'Medium',
        projectId: project.id,
        assigneeId: data.assigneeId || 'user-1',
        dueDate: data.dueDate || getTodayString(),
        startDate: data.startDate,
        estimatedHours: data.estimatedHours || 8,
        labels: data.labels || ['General'],
        subtasks: data.subtasks || [],
        comments: data.comments || [],
        attachments: data.attachments || [],
        createdAt: now,
        updatedAt: now,
      };

      const nextTasks = [newTask, ...tasks];
      setTasks(nextTasks);
      recomputeRelationalMetrics(nextTasks, [project.id]);

      // Record Activity
      const newActivity: ActivityItem = {
        id: generateEntityId('act'),
        userId: 'user-1',
        action: 'created task',
        targetName: newTask.title,
        targetType: 'task',
        targetId: newTask.id,
        timestamp: 'Just now',
        projectId: project.id,
      };
      setActivities((prev) => [newActivity, ...prev]);

      // Run automation check
      runAutomationEngine('TASK_CREATED', newTask);

      addToast({
        type: 'success',
        title: 'Task Created',
        message: `${newTask.key}: ${newTask.title}`,
      });

      return newTask;
    },
    [projects, tasks, recomputeRelationalMetrics, runAutomationEngine, addToast]
  );

  const updateTask = useCallback(
    (id: string, updates: Partial<Task>) => {
      const previousTask = tasks.find((t) => t.id === id);
      if (!previousTask) return;

      const updatedTask: Task = {
        ...previousTask,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      const nextTasks = tasks.map((t) => (t.id === id ? updatedTask : t));
      setTasks(nextTasks);

      // Projects affected: both previous and updated project if changed
      const affectedProjectIds = [previousTask.projectId];
      if (updatedTask.projectId !== previousTask.projectId) {
        affectedProjectIds.push(updatedTask.projectId);
      }
      recomputeRelationalMetrics(nextTasks, affectedProjectIds);

      // Check if priority changed
      if (updates.priority && updates.priority !== previousTask.priority) {
        runAutomationEngine('PRIORITY_CHANGED', updatedTask, previousTask);
      }

      addToast({
        type: 'info',
        title: 'Task Updated',
        message: 'Changes saved automatically',
        duration: 2000,
      });
    },
    [tasks, recomputeRelationalMetrics, runAutomationEngine, addToast]
  );

  const moveTaskStatus = useCallback(
    (id: string, status: TaskStatus) => {
      const target = tasks.find((t) => t.id === id);
      if (!target || target.status === status) return;

      const previousTask = { ...target };
      const updatedTask: Task = {
        ...target,
        status,
        updatedAt: new Date().toISOString(),
      };

      const nextTasks = tasks.map((t) => (t.id === id ? updatedTask : t));
      setTasks(nextTasks);
      recomputeRelationalMetrics(nextTasks, [target.projectId]);

      // Add Activity
      const newActivity: ActivityItem = {
        id: generateEntityId('act'),
        userId: 'user-1',
        action: `moved task to ${status}`,
        targetName: target.title,
        targetType: 'task',
        targetId: target.id,
        timestamp: 'Just now',
        projectId: target.projectId,
      };
      setActivities((prev) => [newActivity, ...prev]);

      // Run Automation Check
      runAutomationEngine('STATUS_CHANGED', updatedTask, previousTask);

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
          message: `${target.title} marked as Done`,
        });
      }
    },
    [tasks, recomputeRelationalMetrics, runAutomationEngine, addToast]
  );

  const deleteTask = useCallback(
    (id: string) => {
      const target = tasks.find((t) => t.id === id);
      if (!target) return;

      const nextTasks = tasks.filter((t) => t.id !== id);
      setTasks(nextTasks);
      recomputeRelationalMetrics(nextTasks, [target.projectId]);

      if (selectedTaskId === id) setSelectedTaskId(null);

      // Toast with Undo
      addToast({
        type: 'warning',
        title: 'Task Deleted',
        message: `${target.key} was removed`,
        action: {
          label: 'Undo',
          onClick: () => {
            setTasks((curr) => {
              const restored = [target, ...curr];
              recomputeRelationalMetrics(restored, [target.projectId]);
              return restored;
            });
          },
        },
        duration: 6000,
      });
    },
    [tasks, selectedTaskId, recomputeRelationalMetrics, addToast]
  );

  const duplicateTask = useCallback(
    (id: string) => {
      const target = tasks.find((t) => t.id === id);
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
    [tasks, createTask]
  );

  const addSubtask = useCallback((taskId: string, title: string) => {
    if (!title.trim()) return;
    const newSub = {
      id: generateEntityId('sub'),
      title: title.trim(),
      completed: false,
    };
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, subtasks: [...t.subtasks, newSub], updatedAt: new Date().toISOString() } : t
      )
    );
  }, []);

  const toggleSubtask = useCallback((taskId: string, subtaskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          subtasks: t.subtasks.map((s) =>
            s.id === subtaskId ? { ...s, completed: !s.completed } : s
          ),
          updatedAt: new Date().toISOString(),
        };
      })
    );
  }, []);

  const deleteSubtask = useCallback((taskId: string, subtaskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          subtasks: t.subtasks.filter((s) => s.id !== subtaskId),
          updatedAt: new Date().toISOString(),
        };
      })
    );
  }, []);

  const addComment = useCallback(
    (taskId: string, content: string) => {
      if (!content.trim()) return;
      const comment = {
        id: generateEntityId('comm'),
        authorId: 'user-1',
        content: content.trim(),
        timestamp: new Date().toISOString(),
      };
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, comments: [...t.comments, comment], updatedAt: new Date().toISOString() }
            : t
        )
      );
      addToast({
        type: 'success',
        title: 'Comment posted',
        duration: 2000,
      });
    },
    [addToast]
  );

  const bulkUpdateTasks = useCallback(
    (ids: string[], updates: Partial<Task>) => {
      const affectedProjectIds = new Set<string>();
      const nextTasks = tasks.map((t) => {
        if (!ids.includes(t.id)) return t;
        affectedProjectIds.add(t.projectId);
        if (updates.projectId) affectedProjectIds.add(updates.projectId);
        return { ...t, ...updates, updatedAt: new Date().toISOString() };
      });

      setTasks(nextTasks);
      recomputeRelationalMetrics(nextTasks, Array.from(affectedProjectIds));

      addToast({
        type: 'info',
        title: 'Bulk Update Applied',
        message: `Updated ${ids.length} tasks`,
      });
    },
    [tasks, recomputeRelationalMetrics, addToast]
  );

  const bulkDeleteTasks = useCallback(
    (ids: string[]) => {
      const deleted = tasks.filter((t) => ids.includes(t.id));
      const nextTasks = tasks.filter((t) => !ids.includes(t.id));
      const affectedProjectIds = Array.from(new Set(deleted.map((t) => t.projectId)));

      setTasks(nextTasks);
      recomputeRelationalMetrics(nextTasks, affectedProjectIds);

      addToast({
        type: 'warning',
        title: 'Bulk Tasks Deleted',
        message: `Removed ${ids.length} tasks`,
        action: {
          label: 'Undo',
          onClick: () => {
            setTasks((curr) => {
              const restored = [...deleted, ...curr];
              recomputeRelationalMetrics(restored, affectedProjectIds);
              return restored;
            });
          },
        },
        duration: 6000,
      });
    },
    [tasks, recomputeRelationalMetrics, addToast]
  );

  // 4. Project Actions with Cascading Relational Cleanup
  const createProject = useCallback(
    (data: Partial<Project>): Project => {
      const key = data.key?.toUpperCase().trim() || `PRJ-${projects.length + 1}`;
      const newProject: Project = {
        id: generateEntityId('proj'),
        key,
        name: data.name?.trim() || 'Untitled Project',
        description: data.description?.trim() || '',
        category: data.category || 'Core Infrastructure',
        health: 'On Track',
        progress: 0,
        deadline: data.deadline || getTodayString(),
        startDate: data.startDate || getTodayString(),
        leadId: data.leadId || 'user-1',
        memberIds: data.memberIds || ['user-1', 'user-3'],
        color: data.color || '#6366f1',
        tags: data.tags || ['Active'],
      };

      setProjects((prev) => [newProject, ...prev]);

      setActivities((prev) => [
        {
          id: generateEntityId('act'),
          userId: 'user-1',
          action: 'created project',
          targetName: newProject.name,
          targetType: 'project',
          targetId: newProject.id,
          timestamp: 'Just now',
          projectId: newProject.id,
        },
        ...prev,
      ]);

      addToast({
        type: 'success',
        title: 'Project Created',
        message: newProject.name,
      });

      return newProject;
    },
    [projects.length, addToast]
  );

  const updateProject = useCallback(
    (id: string, updates: Partial<Project>) => {
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
      addToast({
        type: 'info',
        title: 'Project Updated',
        duration: 2000,
      });
    },
    [addToast]
  );

  const deleteProject = useCallback(
    (id: string) => {
      const proj = projects.find((p) => p.id === id);
      if (!proj) return;

      // Cascading relational cleanup: remove tasks, documents, and target notifications
      const nextTasks = tasks.filter((t) => t.projectId !== id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setTasks(nextTasks);
      setDocuments((prev) => prev.filter((d) => d.projectId !== id));
      setNotifications((prev) => prev.filter((n) => n.targetId !== id));

      if (activeProjectId === id) setActiveProjectId(null);
      recomputeRelationalMetrics(nextTasks);

      addToast({
        type: 'warning',
        title: 'Project & Associated Records Deleted',
        message: `${proj.name} was cleanly removed.`,
      });
    },
    [projects, tasks, activeProjectId, recomputeRelationalMetrics, addToast]
  );

  // 5. Team Invitation Actions (Honest Local Simulation)
  const createInvitation = useCallback(
    (invitationData: Omit<PendingInvitation, 'id' | 'invitedAt' | 'status'>): PendingInvitation => {
      const newInv: PendingInvitation = {
        ...invitationData,
        id: generateEntityId('inv'),
        invitedAt: 'Just now',
        status: 'Pending',
      };
      setPendingInvitations((prev) => [newInv, ...prev]);

      addToast({
        type: 'success',
        title: 'Workspace Invitation Created',
        message: `Registered local invite for ${newInv.name} (${newInv.email}). Ready to join upon auth.`,
      });

      return newInv;
    },
    [addToast]
  );

  const cancelInvitation = useCallback(
    (id: string) => {
      setPendingInvitations((prev) => prev.filter((i) => i.id !== id));
      addToast({
        type: 'info',
        title: 'Invitation Revoked',
        duration: 2000,
      });
    },
    [addToast]
  );

  // 6. Document Actions
  const createDocument = useCallback(
    (data: Partial<Document>): Document => {
      const newDoc: Document = {
        id: generateEntityId('doc'),
        title: data.title?.trim() || 'Untitled Specification',
        type: data.type || 'Spec',
        projectId: data.projectId || projects[0]?.id || 'proj-1',
        authorId: 'user-1',
        lastEdited: new Date().toISOString(),
        content:
          data.content?.trim() ||
          `# ${data.title?.trim() || 'Untitled Specification'}\n\nStart writing technical requirements...`,
        isFavorite: false,
        tags: data.tags || ['General'],
      };
      setDocuments((prev) => [newDoc, ...prev]);
      addToast({
        type: 'success',
        title: 'Document Created',
        message: newDoc.title,
      });
      return newDoc;
    },
    [projects, addToast]
  );

  const updateDocument = useCallback((id: string, updates: Partial<Document>) => {
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, ...updates, lastEdited: new Date().toISOString() } : d
      )
    );
  }, []);

  const deleteDocument = useCallback(
    (id: string) => {
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      if (selectedDocId === id) setSelectedDocId(null);
      addToast({
        type: 'info',
        title: 'Document Deleted',
      });
    },
    [selectedDocId, addToast]
  );

  const toggleFavoriteDocument = useCallback((id: string) => {
    setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, isFavorite: !d.isFavorite } : d)));
  }, []);

  // 7. Notification Actions
  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    addToast({
      type: 'info',
      title: 'All notifications marked as read',
      duration: 2000,
    });
  }, [addToast]);

  const deleteNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  // 8. Automations Actions
  const toggleAutomationRule = useCallback(
    (id: string) => {
      setAutomations((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          const enabled = !r.enabled;
          addToast({
            type: 'info',
            title: `Rule ${enabled ? 'Enabled' : 'Disabled'}`,
            message: r.name,
            duration: 2000,
          });
          return { ...r, enabled };
        })
      );
    },
    [addToast]
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
      setAutomations((prev) => [newRule, ...prev]);
      addToast({
        type: 'success',
        title: 'Automation Rule Created',
        message: newRule.name,
      });
    },
    [addToast]
  );

  const deleteAutomationRule = useCallback(
    (id: string) => {
      setAutomations((prev) => prev.filter((r) => r.id !== id));
      addToast({
        type: 'info',
        title: 'Rule Removed',
      });
    },
    [addToast]
  );

  const duplicateAutomationRule = useCallback(
    (id: string) => {
      const rule = automations.find((r) => r.id === id);
      if (!rule) return;
      createAutomationRule({
        ...rule,
        name: `${rule.name} (Copy)`,
      });
    },
    [automations, createAutomationRule]
  );

  // 9. Dynamic AI Insights
  const insights: AIInsight[] = useMemo(() => {
    const generated: AIInsight[] = [];

    // Project delivery risk assessment
    projects.forEach((p) => {
      const pTasks = tasks.filter((t) => t.projectId === p.id);
      const urgentUnresolved = pTasks.filter(
        (t) => t.priority === 'Urgent' && t.status !== 'Done'
      );
      const overdueTasks = pTasks.filter(
        (t) => t.status !== 'Done' && isTaskOverdue(t.dueDate, t.status)
      );

      if (urgentUnresolved.length >= 2 || overdueTasks.length >= 2) {
        generated.push({
          id: `insight_proj_${p.id}`,
          type: 'risk',
          title: `Delivery Risk in ${p.name}`,
          summary: `${p.name} has ${urgentUnresolved.length} urgent tasks and ${overdueTasks.length} overdue milestones.`,
          detail: `Critical path analysis indicates schedule slippage toward target deadline (${p.deadline}). Consider re-allocating engineering capacity from on-track sprints.`,
          impact: 'High',
          usefulCount: usefulInsightCounts[`insight_proj_${p.id}`] || 14,
          isDismissed: dismissedInsightIds.includes(`insight_proj_${p.id}`),
          actionLabel: 'Review Board',
          relatedProjectId: p.id,
        });
      }
    });

    // Engineer capacity saturation
    members.forEach((m) => {
      const activeTasks = tasks.filter(
        (t) => t.assigneeId === m.id && t.status !== 'Done'
      );
      if (activeTasks.length >= 5 || m.workload > 80) {
        generated.push({
          id: `insight_workload_${m.id}`,
          type: 'workload',
          title: `Capacity Saturation: ${m.name}`,
          summary: `${m.name} has ${activeTasks.length} active work items (${m.workload}% load), exceeding recommended sustainability thresholds.`,
          detail: `Load skew is 38% above team median. High workload increases code review turnaround latency. Consider task rebalancing.`,
          impact: 'Medium',
          usefulCount: usefulInsightCounts[`insight_workload_${m.id}`] || 9,
          isDismissed: dismissedInsightIds.includes(`insight_workload_${m.id}`),
          actionLabel: 'Rebalance Tasks',
          relatedMemberId: m.id,
        });
      }
    });

    // Throughput acceleration
    const doneCount = tasks.filter((t) => t.status === 'Done').length;
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
  }, [projects, tasks, members, dismissedInsightIds, usefulInsightCounts]);

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

  // 10. Scoped Non-Destructive Reset
  const resetDemoData = useCallback(() => {
    // Only clears keys prefixed with 'nexus_'!
    clearNexusStorage();

    setProjects(INITIAL_PROJECTS);
    setTasks(INITIAL_TASKS);
    setMembers(INITIAL_MEMBERS);
    setPendingInvitations([]);
    setDocuments(INITIAL_DOCUMENTS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setAutomations(INITIAL_AUTOMATIONS);
    setActivities(INITIAL_ACTIVITIES);
    setDismissedInsightIds([]);
    setUsefulInsightCounts({});

    addToast({
      type: 'success',
      title: 'Workspace Reset Complete',
      message: 'Restored original demo data without touching other local storage.',
    });
  }, [addToast]);

  const value = useMemo(
    () => ({
      projects,
      tasks,
      members,
      pendingInvitations,
      documents,
      notifications,
      automations,
      activities,
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
      projects,
      tasks,
      members,
      pendingInvitations,
      documents,
      notifications,
      automations,
      activities,
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
