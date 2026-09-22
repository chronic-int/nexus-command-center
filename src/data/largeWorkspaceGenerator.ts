import {
  WorkspaceState,
} from '../domain/workspaceDomain';
import {
  Project,
  Task,
  TeamMember,
  Document,
  Notification,
  AutomationRule,
  ActivityItem,
  TaskStatus,
  TaskPriority,
  ProjectHealth,
  MemberAvailability,
  NotificationCategory,
  DocumentType,
} from '../types';
import { calculateProjectProgress, calculateProjectHealth, calculateMemberWorkload } from '../utils/metrics';

export interface LargeWorkspaceConfig {
  seed?: number;
  projects?: number;
  tasks?: number;
  members?: number;
  notifications?: number;
  activities?: number;
  documents?: number;
  automations?: number;
  referenceDate?: string;
}

export function createMulberry32(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DEPARTMENTS = ['Core Platform', 'Infrastructure', 'Security', 'Design Systems', 'Data & AI', 'Product'];
const ROLES = ['Staff Engineer', 'Senior Engineer', 'Lead Architect', 'Product Manager', 'Principal Engineer', 'DevOps Specialist'];
const PROJECT_CATEGORIES = ['Infrastructure', 'Security', 'Product', 'Platform', 'Design System', 'Analytics'];
const PROJECT_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#3b82f6'];
const STATUSES: TaskStatus[] = ['Backlog', 'Todo', 'In Progress', 'Review', 'Done'];
const PRIORITIES: TaskPriority[] = ['Low', 'Medium', 'High', 'Urgent'];
const AVAILABILITIES: MemberAvailability[] = ['Active', 'In a meeting', 'Away', 'Offline'];
const NOTIF_CATEGORIES: NotificationCategory[] = ['Assignments', 'Mentions', 'Deadlines', 'System', 'Project updates'];
const DOC_TYPES: DocumentType[] = ['Spec', 'RFC', 'Architecture', 'Design System', 'Meeting Notes'];
const LABELS_POOL = ['frontend', 'backend', 'security', 'devops', 'database', 'api', 'infra', 'auth', 'perf', 'ui'];

/**
 * Deterministically generates a massive, relationally valid workspace fixture for stress and scalability testing.
 * Every entity satisfies all core domain invariants (foreign keys, progress, ranges, dates, unique IDs).
 */
export function createLargeWorkspace(config: LargeWorkspaceConfig = {}): WorkspaceState {
  const seed = config.seed ?? 428913;
  const numProjects = config.projects ?? 500;
  const numTasks = config.tasks ?? 10000;
  const numMembers = config.members ?? 200;
  const numNotifications = config.notifications ?? 2000;
  const numActivities = config.activities ?? 5000;
  const numDocuments = config.documents ?? 500;
  const numAutomations = config.automations ?? 100;
  const refDate = config.referenceDate || '2026-09-22';

  const random = createMulberry32(seed);

  // 1. Members
  const members: TeamMember[] = [];
  for (let i = 1; i <= numMembers; i++) {
    const id = `usr-${i}`;
    const name = `Engineer ${i}`;
    const email = `engineer.${i}@nexus.internal`;
    const department = DEPARTMENTS[Math.floor(random() * DEPARTMENTS.length)];
    const role = ROLES[Math.floor(random() * ROLES.length)];
    const availability = AVAILABILITIES[Math.floor(random() * AVAILABILITIES.length)];

    members.push({
      id,
      name,
      email,
      role,
      department,
      avatar: `https://images.unsplash.com/photo-${1534528741775 + (i % 1000)}?w=150&auto=format&fit=crop&q=80`,
      workload: 0, // Will be computed after tasks
      availability,
      currentProjectId: `prj-${1 + (i % numProjects)}`,
      bio: `Member of ${department} specializing in scalable architecture.`,
    });
  }

  // 2. Projects
  const projects: Project[] = [];
  for (let i = 1; i <= numProjects; i++) {
    const id = `prj-${i}`;
    const key = `P${i}`;
    const name = `System Initiative ${i}`;
    const category = PROJECT_CATEGORIES[Math.floor(random() * PROJECT_CATEGORIES.length)];
    const color = PROJECT_COLORS[Math.floor(random() * PROJECT_COLORS.length)];
    const leadId = members[Math.floor(random() * members.length)].id;

    // Assign 3-8 members to this project
    const memberCount = 3 + Math.floor(random() * 6);
    const assignedMemberSet = new Set<string>([leadId]);
    while (assignedMemberSet.size < memberCount && assignedMemberSet.size < members.length) {
      assignedMemberSet.add(members[Math.floor(random() * members.length)].id);
    }

    projects.push({
      id,
      key,
      name,
      description: `Core initiative for ${category.toLowerCase()} modernization and scale.`,
      category,
      health: 'On Track', // Calculated later
      progress: 0, // Calculated later
      startDate: '2026-01-01',
      deadline: '2026-12-31',
      leadId,
      memberIds: Array.from(assignedMemberSet),
      color,
      tags: [category, 'Scale'],
    });
  }

  // 3. Tasks
  const tasks: Task[] = [];
  const tasksCountByProject = new Map<string, number>();

  for (let i = 1; i <= numTasks; i++) {
    const id = `task-${i}`;
    const project = projects[Math.floor(random() * projects.length)];
    const projSeq = (tasksCountByProject.get(project.id) || 0) + 1;
    tasksCountByProject.set(project.id, projSeq);
    const key = `${project.key}-${projSeq}`;

    // Realistic distribution
    const statusRoll = random();
    let status: TaskStatus = 'Backlog';
    if (statusRoll < 0.25) status = 'Backlog';
    else if (statusRoll < 0.55) status = 'Todo';
    else if (statusRoll < 0.80) status = 'In Progress';
    else if (statusRoll < 0.90) status = 'Review';
    else status = 'Done';

    const priorityRoll = random();
    let priority: TaskPriority = 'Medium';
    if (priorityRoll < 0.25) priority = 'Low';
    else if (priorityRoll < 0.70) priority = 'Medium';
    else if (priorityRoll < 0.90) priority = 'High';
    else priority = 'Urgent';

    // Assignee: from project memberIds or unassigned
    const isUnassigned = random() < 0.08;
    const assigneeId = isUnassigned
      ? 'unassigned'
      : project.memberIds[Math.floor(random() * project.memberIds.length)];

    // Dates: distributed around reference date
    const monthOffset = Math.floor(random() * 12);
    const day = 1 + Math.floor(random() * 28);
    const dueMonth = String(1 + (monthOffset % 12)).padStart(2, '0');
    const dueDay = String(day).padStart(2, '0');
    const dueDate = `2026-${dueMonth}-${dueDay}`;

    // Labels: 1-3 labels
    const labelCount = 1 + Math.floor(random() * 3);
    const labels: string[] = [];
    for (let l = 0; l < labelCount; l++) {
      const lbl = LABELS_POOL[Math.floor(random() * LABELS_POOL.length)];
      if (!labels.includes(lbl)) labels.push(lbl);
    }

    // Subtasks: ~40% have 1-4 subtasks
    const subtasks = [];
    if (random() < 0.40) {
      const subCount = 1 + Math.floor(random() * 4);
      for (let s = 1; s <= subCount; s++) {
        subtasks.push({
          id: `sub-${i}-${s}`,
          title: `Step ${s} for ${key}`,
          completed: status === 'Done' ? true : random() > 0.5,
        });
      }
    }

    tasks.push({
      id,
      key,
      title: `Engineering Task ${i}: Optimize ${labels[0] || 'service'} layer`,
      description: `Implement high-throughput resilient handlers for ${key}.`,
      status,
      priority,
      projectId: project.id,
      assigneeId,
      dueDate,
      startDate: '2026-02-01',
      estimatedHours: 4 + Math.floor(random() * 16),
      labels,
      subtasks,
      comments: [],
      attachments: [],
      createdAt: '2026-02-01T08:00:00.000Z',
      updatedAt: '2026-09-01T12:00:00.000Z',
    });
  }

  // 4. Recalculate Project Progress, Health, and Member Workloads
  for (const p of projects) {
    p.progress = calculateProjectProgress(tasks, p.id);
    p.health = calculateProjectHealth(tasks, p.id, p.health, refDate);
  }

  for (const m of members) {
    m.workload = calculateMemberWorkload(tasks, m.id);
  }

  // 5. Documents
  const documents: Document[] = [];
  for (let i = 1; i <= numDocuments; i++) {
    const project = projects[Math.floor(random() * projects.length)];
    const author = members[Math.floor(random() * members.length)];
    const docType = DOC_TYPES[Math.floor(random() * DOC_TYPES.length)];

    documents.push({
      id: `doc-${i}`,
      title: `${docType}: Architecture Blueprint ${i}`,
      type: docType,
      projectId: project.id,
      authorId: author.id,
      lastEdited: '2026-09-10T14:00:00.000Z',
      content: `# ${docType} ${i}\n\nTechnical specification and operational metrics for ${project.name}.`,
      isFavorite: random() < 0.1,
      tags: [project.category, 'Core'],
    });
  }

  // 6. Notifications
  const notifications: Notification[] = [];
  for (let i = 1; i <= numNotifications; i++) {
    const category = NOTIF_CATEGORIES[Math.floor(random() * NOTIF_CATEGORIES.length)];
    const targetRoll = random();
    let targetType: 'task' | 'project' | undefined = undefined;
    let targetId: string | undefined = undefined;

    if (targetRoll < 0.6) {
      targetType = 'task';
      targetId = tasks[Math.floor(random() * tasks.length)].id;
    } else if (targetRoll < 0.9) {
      targetType = 'project';
      targetId = projects[Math.floor(random() * projects.length)].id;
    }

    notifications.push({
      id: `notif-${i}`,
      title: `System Event ${i}`,
      message: `Operational alert notification #${i} for workspace telemetry.`,
      category,
      timestamp: '2 hours ago',
      read: random() > 0.3,
      targetType,
      targetId,
    });
  }

  // 7. Activities
  const activities: ActivityItem[] = [];
  for (let i = 1; i <= numActivities; i++) {
    const project = projects[Math.floor(random() * projects.length)];
    const member = members[Math.floor(random() * members.length)];

    activities.push({
      id: `act-${i}`,
      userId: member.id,
      action: 'updated deployment configurations',
      targetName: `Deployment #${i}`,
      targetType: 'task',
      targetId: `task-${1 + (i % numTasks)}`,
      timestamp: 'Just now',
      projectId: project.id,
    });
  }

  // 8. Automation Rules
  const automations: AutomationRule[] = [];
  for (let i = 1; i <= numAutomations; i++) {
    automations.push({
      id: `rule-${i}`,
      name: `Scale Automation Rule ${i}`,
      description: `Automates threshold detection for event pipeline #${i}`,
      trigger: i % 4 === 0 ? 'Task created' : i % 4 === 1 ? 'Task deadline expires' : 'Task priority set to Urgent',
      condition: i % 2 === 0 ? 'always' : 'priority == urgent',
      action: 'Send notification',
      enabled: true,
    });
  }

  return {
    projects,
    tasks,
    members,
    pendingInvitations: [],
    documents,
    notifications,
    automations,
    activities,
  };
}
