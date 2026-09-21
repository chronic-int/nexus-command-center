import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Task,
  Project,
  TeamMember,
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

interface AppContextType {
  // Collections
  projects: Project[];
  tasks: Task[];
  members: TeamMember[];
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

const STORAGE_KEYS = {
  PROJECTS: 'nexus_projects_v1',
  TASKS: 'nexus_tasks_v1',
  MEMBERS: 'nexus_members_v1',
  DOCUMENTS: 'nexus_documents_v1',
  NOTIFICATIONS: 'nexus_notifications_v1',
  AUTOMATIONS: 'nexus_automations_v1',
  ACTIVITIES: 'nexus_activities_v1',
  THEME: 'nexus_theme_mode',
  DENSITY: 'nexus_density_mode',
  SIDEBAR: 'nexus_sidebar_collapsed',
  DISMISSED_INSIGHTS: 'nexus_dismissed_insights_v1',
  USEFUL_INSIGHTS: 'nexus_useful_insights_v1',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Persistence state helpers
  const getStored = <T,>(key: string, fallback: T): T => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  };

  const [projects, setProjects] = useState<Project[]>(() => getStored(STORAGE_KEYS.PROJECTS, INITIAL_PROJECTS));
  const [tasks, setTasks] = useState<Task[]>(() => getStored(STORAGE_KEYS.TASKS, INITIAL_TASKS));
  const [members, setMembers] = useState<TeamMember[]>(() => getStored(STORAGE_KEYS.MEMBERS, INITIAL_MEMBERS));
  const [documents, setDocuments] = useState<Document[]>(() => getStored(STORAGE_KEYS.DOCUMENTS, INITIAL_DOCUMENTS));
  const [notifications, setNotifications] = useState<Notification[]>(() => getStored(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS));
  const [automations, setAutomations] = useState<AutomationRule[]>(() => getStored(STORAGE_KEYS.AUTOMATIONS, INITIAL_AUTOMATIONS));
  const [activities, setActivities] = useState<ActivityItem[]>(() => getStored(STORAGE_KEYS.ACTIVITIES, INITIAL_ACTIVITIES));

  // Theming & Density
  const [theme, setThemeState] = useState<ThemeMode>(() => getStored(STORAGE_KEYS.THEME, 'dark'));
  const [density, setDensityState] = useState<DensityMode>(() => getStored(STORAGE_KEYS.DENSITY, 'comfortable'));
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => getStored(STORAGE_KEYS.SIDEBAR, false));

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
  const [dismissedInsightIds, setDismissedInsightIds] = useState<string[]>(() => getStored(STORAGE_KEYS.DISMISSED_INSIGHTS, []));
  const [usefulInsightCounts, setUsefulInsightCounts] = useState<Record<string, number>>(() => getStored(STORAGE_KEYS.USEFUL_INSIGHTS, {}));

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Sync state to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(documents));
  }, [documents]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.AUTOMATIONS, JSON.stringify(automations));
  }, [automations]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SIDEBAR, JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DISMISSED_INSIGHTS, JSON.stringify(dismissedInsightIds));
  }, [dismissedInsightIds]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USEFUL_INSIGHTS, JSON.stringify(usefulInsightCounts));
  }, [usefulInsightCounts]);

  // Apply Theme
  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify(newTheme));
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
    localStorage.setItem(STORAGE_KEYS.DENSITY, JSON.stringify(newDensity));
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('density-compact', 'density-comfortable');
    root.classList.add(`density-${density}`);
  }, [density]);

  // Toast Dispatcher
  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastMessage = { ...toast, id };
    setToasts(prev => [...prev, newToast]);

    const duration = toast.duration ?? 4500;
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Recalculate project progress when tasks change
  const syncProjectProgress = useCallback((updatedTasks: Task[], targetProjectId?: string) => {
    setProjects(prevProjects => {
      return prevProjects.map(proj => {
        if (targetProjectId && proj.id !== targetProjectId) return proj;
        const projectTasks = updatedTasks.filter(t => t.projectId === proj.id);
        if (projectTasks.length === 0) return proj;
        const doneTasks = projectTasks.filter(t => t.status === 'Done').length;
        const progress = Math.round((doneTasks / projectTasks.length) * 100);

        // Check health status dynamically
        const urgentCount = projectTasks.filter(t => t.priority === 'Urgent' && t.status !== 'Done').length;
        const overdueCount = projectTasks.filter(t => {
          if (t.status === 'Done') return false;
          return new Date(t.dueDate) < new Date('2026-09-22');
        }).length;

        let health = proj.health;
        if (urgentCount >= 3 || overdueCount >= 2) {
          health = 'Delayed';
        } else if (urgentCount >= 1 || overdueCount >= 1) {
          health = 'At Risk';
        } else {
          health = 'On Track';
        }

        return { ...proj, progress, health };
      });
    });
  }, []);

  // Recalculate members workload based on assigned open tasks
  const syncMembersWorkload = useCallback((updatedTasks: Task[]) => {
    setMembers(prevMembers => {
      return prevMembers.map(member => {
        const assignedTasks = updatedTasks.filter(t => t.assigneeId === member.id && t.status !== 'Done');
        const workload = Math.min(100, Math.round(assignedTasks.length * 18 + 20));
        return { ...member, workload };
      });
    });
  }, []);

  // Task Actions
  const createTask = useCallback((data: Partial<Task>): Task => {
    const project = projects.find(p => p.id === data.projectId) || projects[0];
    const projectTasks = tasks.filter(t => t.projectId === project.id);
    const key = `${project.key}-${100 + projectTasks.length + 1}`;

    const newTask: Task = {
      id: `task-${Date.now()}`,
      key,
      title: data.title || 'Untitled Task',
      description: data.description || '',
      status: data.status || 'Todo',
      priority: data.priority || 'Medium',
      projectId: project.id,
      assigneeId: data.assigneeId || 'user-1',
      dueDate: data.dueDate || new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
      labels: data.labels || ['General'],
      subtasks: data.subtasks || [],
      comments: data.comments || [],
      attachments: data.attachments || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newTasks = [newTask, ...tasks];
    setTasks(newTasks);
    syncProjectProgress(newTasks, project.id);
    syncMembersWorkload(newTasks);

    // Record activity
    const newActivity: ActivityItem = {
      id: `act-${Date.now()}`,
      userId: 'user-1',
      action: 'created task',
      targetName: newTask.title,
      targetType: 'task',
      targetId: newTask.id,
      timestamp: 'Just now',
      projectId: project.id,
    };
    setActivities(prev => [newActivity, ...prev]);

    addToast({
      type: 'success',
      title: 'Task Created',
      message: `${newTask.key}: ${newTask.title}`,
    });

    return newTask;
  }, [projects, tasks, syncProjectProgress, syncMembersWorkload, addToast]);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasks(prev => {
      const target = prev.find(t => t.id === id);
      if (!target) return prev;
      const updated = { ...target, ...updates, updatedAt: new Date().toISOString() };
      const next = prev.map(t => (t.id === id ? updated : t));

      syncProjectProgress(next, updated.projectId);
      syncMembersWorkload(next);
      return next;
    });

    addToast({
      type: 'info',
      title: 'Task Updated',
      message: 'Changes saved automatically',
      duration: 2000,
    });
  }, [syncProjectProgress, syncMembersWorkload, addToast]);

  const moveTaskStatus = useCallback((id: string, status: TaskStatus) => {
    let completedProjectName = '';
    let completedTitle = '';

    setTasks(prev => {
      const target = prev.find(t => t.id === id);
      if (!target || target.status === status) return prev;

      completedTitle = target.title;
      const project = projects.find(p => p.id === target.projectId);
      if (project) completedProjectName = project.name;

      const updated = { ...target, status, updatedAt: new Date().toISOString() };
      const next = prev.map(t => (t.id === id ? updated : t));

      syncProjectProgress(next, target.projectId);
      syncMembersWorkload(next);

      // Add activity
      const newActivity: ActivityItem = {
        id: `act-${Date.now()}`,
        userId: 'user-1',
        action: `moved task to ${status}`,
        targetName: target.title,
        targetType: 'task',
        targetId: target.id,
        timestamp: 'Just now',
        projectId: target.projectId,
      };
      setActivities(actPrev => [newActivity, ...actPrev]);

      return next;
    });

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
        message: `${completedTitle} marked as Done in ${completedProjectName}`,
      });
    }
  }, [projects, syncProjectProgress, syncMembersWorkload, addToast]);

  const deleteTask = useCallback((id: string) => {
    const target = tasks.find(t => t.id === id);
    if (!target) return;

    const remainingTasks = tasks.filter(t => t.id !== id);
    setTasks(remainingTasks);
    syncProjectProgress(remainingTasks, target.projectId);
    syncMembersWorkload(remainingTasks);

    if (selectedTaskId === id) setSelectedTaskId(null);

    // Toast with Undo option
    addToast({
      type: 'warning',
      title: 'Task Deleted',
      message: `${target.key} was removed`,
      action: {
        label: 'Undo',
        onClick: () => {
          setTasks(prev => {
            const restored = [target, ...prev];
            syncProjectProgress(restored, target.projectId);
            syncMembersWorkload(restored);
            return restored;
          });
        },
      },
      duration: 6000,
    });
  }, [tasks, selectedTaskId, syncProjectProgress, syncMembersWorkload, addToast]);

  const duplicateTask = useCallback((id: string) => {
    const target = tasks.find(t => t.id === id);
    if (!target) return;
    createTask({
      ...target,
      title: `${target.title} (Copy)`,
      status: 'Todo',
      subtasks: target.subtasks.map(s => ({ ...s, id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, completed: false })),
      comments: [],
    });
  }, [tasks, createTask]);

  const addSubtask = useCallback((taskId: string, title: string) => {
    if (!title.trim()) return;
    const newSub: { id: string; title: string; completed: boolean } = {
      id: `sub-${Date.now()}`,
      title: title.trim(),
      completed: false,
    };
    setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, subtasks: [...t.subtasks, newSub] } : t)));
  }, []);

  const toggleSubtask = useCallback((taskId: string, subtaskId: string) => {
    setTasks(prev =>
      prev.map(t => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          subtasks: t.subtasks.map(s => (s.id === subtaskId ? { ...s, completed: !s.completed } : s)),
        };
      })
    );
  }, []);

  const deleteSubtask = useCallback((taskId: string, subtaskId: string) => {
    setTasks(prev =>
      prev.map(t => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          subtasks: t.subtasks.filter(s => s.id !== subtaskId),
        };
      })
    );
  }, []);

  const addComment = useCallback((taskId: string, content: string) => {
    if (!content.trim()) return;
    const comment = {
      id: `comm-${Date.now()}`,
      authorId: 'user-1', // current user
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };
    setTasks(prev =>
      prev.map(t => {
        if (t.id !== taskId) return t;
        return { ...t, comments: [...t.comments, comment] };
      })
    );
    addToast({
      type: 'success',
      title: 'Comment posted',
      duration: 2000,
    });
  }, [addToast]);

  const bulkUpdateTasks = useCallback((ids: string[], updates: Partial<Task>) => {
    setTasks(prev => {
      const next = prev.map(t => (ids.includes(t.id) ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t));
      syncProjectProgress(next);
      syncMembersWorkload(next);
      return next;
    });
    addToast({
      type: 'info',
      title: 'Bulk Update Applied',
      message: `Updated ${ids.length} tasks`,
    });
  }, [syncProjectProgress, syncMembersWorkload, addToast]);

  const bulkDeleteTasks = useCallback((ids: string[]) => {
    const deleted = tasks.filter(t => ids.includes(t.id));
    setTasks(prev => {
      const next = prev.filter(t => !ids.includes(t.id));
      syncProjectProgress(next);
      syncMembersWorkload(next);
      return next;
    });
    addToast({
      type: 'warning',
      title: 'Bulk Tasks Deleted',
      message: `Removed ${ids.length} tasks`,
      action: {
        label: 'Undo',
        onClick: () => {
          setTasks(prev => {
            const restored = [...deleted, ...prev];
            syncProjectProgress(restored);
            syncMembersWorkload(restored);
            return restored;
          });
        },
      },
      duration: 6000,
    });
  }, [tasks, syncProjectProgress, syncMembersWorkload, addToast]);

  // Project Actions
  const createProject = useCallback((data: Partial<Project>): Project => {
    const newProject: Project = {
      id: `proj-${Date.now()}`,
      key: data.key?.toUpperCase() || `PRJ-${projects.length + 1}`,
      name: data.name || 'Untitled Project',
      description: data.description || '',
      category: data.category || 'Engineering',
      health: 'On Track',
      progress: 0,
      deadline: data.deadline || '2026-11-30',
      startDate: data.startDate || new Date().toISOString().split('T')[0],
      leadId: data.leadId || 'user-1',
      memberIds: data.memberIds || ['user-1', 'user-3'],
      color: data.color || '#6366f1',
      tags: data.tags || ['Active'],
    };

    setProjects(prev => [newProject, ...prev]);

    setActivities(prev => [
      {
        id: `act-${Date.now()}`,
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
  }, [projects.length, addToast]);

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)));
    addToast({
      type: 'info',
      title: 'Project Updated',
      duration: 2000,
    });
  }, [addToast]);

  const deleteProject = useCallback((id: string) => {
    const proj = projects.find(p => p.id === id);
    if (!proj) return;
    setProjects(prev => prev.filter(p => p.id !== id));
    setTasks(prev => prev.filter(t => t.projectId !== id));
    if (activeProjectId === id) setActiveProjectId(null);

    addToast({
      type: 'warning',
      title: 'Project Deleted',
      message: `${proj.name} and associated tasks removed`,
    });
  }, [projects, activeProjectId, addToast]);

  // Document Actions
  const createDocument = useCallback((data: Partial<Document>): Document => {
    const newDoc: Document = {
      id: `doc-${Date.now()}`,
      title: data.title || 'Untitled Document',
      type: data.type || 'Spec',
      projectId: data.projectId || projects[0]?.id || 'proj-1',
      authorId: 'user-1',
      lastEdited: new Date().toISOString(),
      content: data.content || '# ' + (data.title || 'Untitled Document') + '\n\nStart writing specifications and RFCs here...',
      isFavorite: false,
      tags: data.tags || ['General'],
    };
    setDocuments(prev => [newDoc, ...prev]);
    addToast({
      type: 'success',
      title: 'Document Created',
      message: newDoc.title,
    });
    return newDoc;
  }, [projects, addToast]);

  const updateDocument = useCallback((id: string, updates: Partial<Document>) => {
    setDocuments(prev => prev.map(d => (d.id === id ? { ...d, ...updates, lastEdited: new Date().toISOString() } : d)));
  }, []);

  const deleteDocument = useCallback((id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
    if (selectedDocId === id) setSelectedDocId(null);
    addToast({
      type: 'info',
      title: 'Document Deleted',
    });
  }, [selectedDocId, addToast]);

  const toggleFavoriteDocument = useCallback((id: string) => {
    setDocuments(prev => prev.map(d => (d.id === id ? { ...d, isFavorite: !d.isFavorite } : d)));
  }, []);

  // Notification Actions
  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    addToast({
      type: 'info',
      title: 'All notifications marked as read',
      duration: 2000,
    });
  }, [addToast]);

  const deleteNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  // Automations Actions
  const toggleAutomationRule = useCallback((id: string) => {
    setAutomations(prev =>
      prev.map(r => {
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
  }, [addToast]);

  const createAutomationRule = useCallback((data: Partial<AutomationRule>) => {
    const newRule: AutomationRule = {
      id: `auto-${Date.now()}`,
      name: data.name || 'New Custom Automation',
      description: data.description || 'Custom workflow rule',
      enabled: true,
      trigger: data.trigger || 'Task status changes',
      condition: data.condition || 'Priority == Urgent',
      action: data.action || 'Notify assignees',
      lastTriggered: 'Never',
    };
    setAutomations(prev => [newRule, ...prev]);
    addToast({
      type: 'success',
      title: 'Automation Rule Created',
      message: newRule.name,
    });
  }, [addToast]);

  const deleteAutomationRule = useCallback((id: string) => {
    setAutomations(prev => prev.filter(r => r.id !== id));
    addToast({
      type: 'info',
      title: 'Rule Removed',
    });
  }, [addToast]);

  const duplicateAutomationRule = useCallback((id: string) => {
    const rule = automations.find(r => r.id === id);
    if (!rule) return;
    createAutomationRule({
      ...rule,
      name: `${rule.name} (Copy)`,
    });
  }, [automations, createAutomationRule]);

  // Dynamic AI Insights Engine (computed dynamically based on live tasks, projects, members)
  const insights: AIInsight[] = useMemo(() => {
    const generated: AIInsight[] = [];

    // Check project bottlenecks
    projects.forEach(p => {
      const pTasks = tasks.filter(t => t.projectId === p.id);
      const urgentUnresolved = pTasks.filter(t => t.priority === 'Urgent' && t.status !== 'Done');
      if (urgentUnresolved.length >= 2) {
        generated.push({
          id: `insight-proj-${p.id}`,
          type: 'risk',
          title: `Delivery Risk in ${p.name}`,
          summary: `${p.name} has ${urgentUnresolved.length} unresolved urgent tasks with target deadline ${p.deadline}.`,
          detail: `Critical path analysis indicates potential release slippage unless high-priority blocker "${urgentUnresolved[0].title}" is re-triaged.`,
          impact: 'High',
          usefulCount: usefulInsightCounts[`insight-proj-${p.id}`] || 14,
          isDismissed: dismissedInsightIds.includes(`insight-proj-${p.id}`),
          actionLabel: 'Review Kanban Board',
          relatedProjectId: p.id,
        });
      }
    });

    // Check member workload imbalance
    members.forEach(m => {
      const assigned = tasks.filter(t => t.assigneeId === m.id && t.status !== 'Done');
      if (assigned.length >= 5 || m.workload > 85) {
        generated.push({
          id: `insight-workload-${m.id}`,
          type: 'workload',
          title: `Capacity Saturation: ${m.name}`,
          summary: `${m.name} is currently assigned ${assigned.length} open tasks, exceeding sustainable threshold (${m.workload}% load).`,
          detail: `Workload skew is 34% above median engineering velocity. Consider load balancing tasks to Marcus Vance or David Kim.`,
          impact: 'Medium',
          usefulCount: usefulInsightCounts[`insight-workload-${m.id}`] || 9,
          isDismissed: dismissedInsightIds.includes(`insight-workload-${m.id}`),
          actionLabel: 'Reassign Tasks',
          relatedMemberId: m.id,
        });
      }
    });

    // Velocity insight
    const doneTasksCount = tasks.filter(t => t.status === 'Done').length;
    generated.push({
      id: 'insight-velocity-core',
      type: 'velocity',
      title: 'Engineering Velocity Acceleration',
      summary: `Team closed ${doneTasksCount} tasks across 6 initiatives this cycle (+18.4% throughput vs baseline).`,
      detail: `Cycle time from 'Todo' to 'Done' averaged 3.4 days, down from 4.8 days last month, driven by faster code review cycles in Design Systems and Infrastructure.`,
      impact: 'Low',
      usefulCount: usefulInsightCounts['insight-velocity-core'] || 27,
      isDismissed: dismissedInsightIds.includes('insight-velocity-core'),
      actionLabel: 'View Velocity Analytics',
    });

    // Return filtered non-dismissed
    return generated;
  }, [projects, tasks, members, dismissedInsightIds, usefulInsightCounts]);

  const dismissInsight = useCallback((id: string) => {
    setDismissedInsightIds(prev => [...prev, id]);
    addToast({
      type: 'info',
      title: 'Insight Dismissed',
      duration: 2000,
    });
  }, [addToast]);

  const markInsightUseful = useCallback((id: string) => {
    setUsefulInsightCounts(prev => {
      const current = prev[id] || 0;
      return { ...prev, [id]: current + 1 };
    });
    addToast({
      type: 'success',
      title: 'Feedback Recorded',
      message: 'Thank you for helping train NEXUS intelligence models.',
      duration: 2500,
    });
  }, [addToast]);

  // Global reset
  const resetDemoData = useCallback(() => {
    setProjects(INITIAL_PROJECTS);
    setTasks(INITIAL_TASKS);
    setMembers(INITIAL_MEMBERS);
    setDocuments(INITIAL_DOCUMENTS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setAutomations(INITIAL_AUTOMATIONS);
    setActivities(INITIAL_ACTIVITIES);
    setDismissedInsightIds([]);
    setUsefulInsightCounts({});
    localStorage.clear();
    addToast({
      type: 'success',
      title: 'Demo Data Reset',
      message: 'Restored all original projects, tasks, and telemetry.',
    });
  }, [addToast]);

  const value = useMemo(
    () => ({
      projects,
      tasks,
      members,
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
