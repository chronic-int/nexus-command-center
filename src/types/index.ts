export type TaskPriority = 'Urgent' | 'High' | 'Medium' | 'Low';
export type TaskStatus = 'Backlog' | 'Todo' | 'In Progress' | 'Review' | 'Done';
export type ProjectHealth = 'On Track' | 'At Risk' | 'Delayed';
export type MemberAvailability = 'Active' | 'In a meeting' | 'Away' | 'Offline';
export type NotificationCategory = 'Assignments' | 'Mentions' | 'Deadlines' | 'System' | 'Project updates';
export type ViewTab = 'Overview' | 'Board' | 'List' | 'Timeline' | 'Files' | 'Activity';
export type DensityMode = 'comfortable' | 'compact';
export type ThemeMode = 'dark' | 'light' | 'system';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Comment {
  id: string;
  authorId: string;
  content: string;
  timestamp: string;
}

export interface Attachment {
  id: string;
  name: string;
  size: string;
  type: string;
  uploadedAt: string;
}

export interface Task {
  id: string;
  key: string; // e.g. "AUR-104"
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string;
  assigneeId: string;
  dueDate: string; // YYYY-MM-DD
  startDate?: string;
  estimatedHours?: number;
  labels: string[];
  subtasks: Subtask[];
  comments: Comment[];
  attachments: Attachment[];
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  health: ProjectHealth;
  progress: number; // 0 to 100
  deadline: string; // YYYY-MM-DD
  startDate: string; // YYYY-MM-DD
  leadId: string;
  memberIds: string[];
  color: string;
  tags: string[];
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  avatar: string;
  workload: number; // 0 to 100
  availability: MemberAvailability;
  currentProjectId: string;
  bio?: string;
}

export interface PendingInvitation {
  id: string;
  email: string;
  name: string;
  role: string;
  department: string;
  invitedAt: string;
  status: 'Pending' | 'Accepted' | 'Cancelled';
}

export interface Document {
  id: string;
  title: string;
  type: 'Spec' | 'RFC' | 'Meeting Notes' | 'Design System' | 'Architecture';
  projectId: string;
  authorId: string;
  lastEdited: string;
  content: string;
  isFavorite: boolean;
  tags: string[];
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  timestamp: string;
  read: boolean;
  targetType?: 'task' | 'project' | 'document' | 'team';
  targetId?: string;
}

export type AutomationTrigger =
  | 'Task deadline expires'
  | 'Task status changes to Done'
  | 'Task priority set to Urgent'
  | 'New task created without assignee'
  | 'Task moved to Review column'
  | 'Task created';

export type AutomationCondition =
  | 'Status != Done'
  | 'Assignee is unassigned'
  | 'Priority == Urgent'
  | 'Label includes DevOps or Infrastructure'
  | 'Urgent count > 3'
  | 'All subtasks completed'
  | 'Always';

export type AutomationAction =
  | 'Set Priority = Urgent & Send Notification'
  | 'Update Project Health = At Risk'
  | 'Assign task to Alex Rivera'
  | 'Archive completed subtasks to audit history'
  | 'Create assignment notification for Elena'
  | 'Record audit log';

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger: AutomationTrigger | string;
  condition: AutomationCondition | string;
  action: AutomationAction | string;
  lastTriggered?: string;
}

export interface ActivityItem {
  id: string;
  userId: string;
  action: string;
  targetName: string;
  targetType: 'task' | 'project' | 'document' | 'rule';
  targetId: string;
  timestamp: string;
  projectId?: string;
}

export interface AIInsight {
  id: string;
  type: 'risk' | 'workload' | 'velocity' | 'opportunity';
  title: string;
  summary: string;
  detail: string;
  impact: 'High' | 'Medium' | 'Low';
  usefulCount: number;
  isDismissed: boolean;
  actionLabel?: string;
  relatedProjectId?: string;
  relatedMemberId?: string;
}

export interface UserPreferences {
  theme: ThemeMode;
  density: DensityMode;
  sidebarCollapsed: boolean;
  notificationsEnabled: boolean;
  emailDigest: boolean;
  soundEffects: boolean;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}
