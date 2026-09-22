import {
  Task,
  Project,
  TeamMember,
  PendingInvitation,
  Document,
  Notification,
  AutomationRule,
  ActivityItem,
  TaskStatus,
  TaskPriority,
  ProjectHealth,
  MemberAvailability,
} from '../types';
import { WorkspaceState } from './workspaceDomain';
import { calculateProjectProgress, calculateMemberWorkload } from '../utils/metrics';
import { isValidDateString, validateWorkspaceIntegrity } from './workspaceIntegrity';
import { generateEntityId } from '../utils/idGenerator';

const VALID_STATUSES: TaskStatus[] = ['Backlog', 'Todo', 'In Progress', 'Review', 'Done'];
const VALID_PRIORITIES: TaskPriority[] = ['Urgent', 'High', 'Medium', 'Low'];
const VALID_PROJECT_HEALTHS: ProjectHealth[] = ['On Track', 'At Risk', 'Delayed'];
const VALID_AVAILABILITIES: MemberAvailability[] = ['Active', 'In a meeting', 'Away', 'Offline'];

export interface HydrationResult {
  workspace: WorkspaceState;
  repaired: boolean;
  repairsCount: number;
  issues: string[];
}

export interface WorkspaceDefaults {
  projects: Project[];
  tasks: Task[];
  members: TeamMember[];
  pendingInvitations: PendingInvitation[];
  documents: Document[];
  notifications: Notification[];
  automations: AutomationRule[];
  activities: ActivityItem[];
}

/**
 * Hydrates, validates, and sanitizes persisted workspace data from localStorage or external fixtures.
 * Repairs corrupted foreign keys, out-of-range metrics, invalid enums, malformed dates, and missing fields,
 * guaranteeing that the resulting WorkspaceState satisfies all core domain invariants.
 */
export function hydrateAndValidateWorkspace(
  raw: Partial<{
    projects: unknown;
    tasks: unknown;
    members: unknown;
    pendingInvitations: unknown;
    documents: unknown;
    notifications: unknown;
    automations: unknown;
    activities: unknown;
  }>,
  defaults: WorkspaceDefaults
): HydrationResult {
  let repairsCount = 0;
  const issues: string[] = [];

  function recordRepair(msg: string) {
    repairsCount++;
    issues.push(msg);
  }

  // 1. Members Sanitization
  let members: TeamMember[] = [];
  if (Array.isArray(raw.members) && raw.members.length > 0) {
    const seenMemberIds = new Set<string>();
    for (const m of raw.members) {
      if (!m || typeof m !== 'object') continue;
      const mem = m as Partial<TeamMember>;
      const id = mem.id && typeof mem.id === 'string' ? mem.id : generateEntityId('usr');
      if (seenMemberIds.has(id)) {
        recordRepair(`Deduplicated member with duplicate ID: ${id}`);
        continue;
      }
      seenMemberIds.add(id);

      const rawWorkload = typeof mem.workload === 'number' ? mem.workload : Number(mem.workload);
      const workload = isNaN(rawWorkload) ? 0 : Math.max(0, Math.min(100, Math.round(rawWorkload)));
      if (workload !== mem.workload) {
        recordRepair(`Sanitized member ${id} workload from ${mem.workload} to ${workload}`);
      }

      const availability: MemberAvailability = VALID_AVAILABILITIES.includes(
        mem.availability as MemberAvailability
      )
        ? (mem.availability as MemberAvailability)
        : 'Active';

      members.push({
        id,
        name: mem.name || 'Unnamed Member',
        email: mem.email || `user-${id}@nexus.internal`,
        role: mem.role || 'Contributor',
        department: mem.department || 'Engineering',
        avatar: mem.avatar || '',
        workload,
        availability,
        currentProjectId: mem.currentProjectId || '',
        bio: mem.bio || '',
      });
    }
  }

  if (members.length === 0) {
    recordRepair('No valid members found in storage; fallback to default seed members');
    members = [...defaults.members];
  }

  const validMemberIds = new Set(members.map((m) => m.id));
  const fallbackMemberId = members[0].id;

  // 2. Projects Sanitization
  let projects: Project[] = [];
  if (Array.isArray(raw.projects) && raw.projects.length > 0) {
    const seenProjectIds = new Set<string>();
    const seenProjectKeys = new Set<string>();

    for (const p of raw.projects) {
      if (!p || typeof p !== 'object') continue;
      const prj = p as Partial<Project>;
      const id = prj.id && typeof prj.id === 'string' ? prj.id : generateEntityId('prj');
      if (seenProjectIds.has(id)) {
        recordRepair(`Deduplicated project with duplicate ID: ${id}`);
        continue;
      }
      seenProjectIds.add(id);

      let key = (prj.key || 'PRJ').toUpperCase().trim();
      if (seenProjectKeys.has(key)) {
        let suffix = 2;
        while (seenProjectKeys.has(`${key}-${suffix}`)) suffix++;
        key = `${key}-${suffix}`;
        recordRepair(`Resolved duplicate project key collision to ${key}`);
      }
      seenProjectKeys.add(key);

      const leadId =
        prj.leadId && validMemberIds.has(prj.leadId) ? prj.leadId : fallbackMemberId;
      if (leadId !== prj.leadId) {
        recordRepair(`Repaired missing or invalid project leadId ${prj.leadId} -> ${leadId}`);
      }

      const memberIds = Array.isArray(prj.memberIds)
        ? prj.memberIds.filter((mId) => typeof mId === 'string' && validMemberIds.has(mId))
        : [];
      if (!memberIds.includes(leadId)) {
        memberIds.push(leadId);
      }

      const health: ProjectHealth = VALID_PROJECT_HEALTHS.includes(
        prj.health as ProjectHealth
      )
        ? (prj.health as ProjectHealth)
        : 'On Track';

      const startDate = isValidDateString(prj.startDate || '')
        ? prj.startDate!
        : '2026-01-01';
      const deadline = isValidDateString(prj.deadline || '')
        ? prj.deadline!
        : '2026-12-31';

      projects.push({
        id,
        key,
        name: prj.name || 'Untitled Project',
        description: prj.description || '',
        category: prj.category || 'General',
        health,
        progress: Math.max(0, Math.min(100, Number(prj.progress) || 0)),
        startDate,
        deadline,
        leadId,
        memberIds,
        color: prj.color || '#6366f1',
        tags: Array.isArray(prj.tags) ? prj.tags : [],
      });
    }
  }

  if (projects.length === 0) {
    recordRepair('No valid projects found in storage; fallback to default seed projects');
    projects = [...defaults.projects];
  }

  const validProjectIds = new Set(projects.map((p) => p.id));
  const fallbackProjectId = projects[0].id;

  // 3. Tasks Sanitization
  let tasks: Task[] = [];
  if (Array.isArray(raw.tasks)) {
    const seenTaskIds = new Set<string>();
    const seenTaskKeys = new Set<string>();

    for (const t of raw.tasks) {
      if (!t || typeof t !== 'object') continue;
      const tsk = t as Partial<Task>;
      const id = tsk.id && typeof tsk.id === 'string' ? tsk.id : generateEntityId('tsk');
      if (seenTaskIds.has(id)) {
        recordRepair(`Deduplicated task with duplicate ID: ${id}`);
        continue;
      }
      seenTaskIds.add(id);

      let key = (tsk.key || 'TSK-1').toUpperCase().trim();
      if (seenTaskKeys.has(key)) {
        let suffix = 2;
        while (seenTaskKeys.has(`${key}-${suffix}`)) suffix++;
        key = `${key}-${suffix}`;
        recordRepair(`Resolved duplicate task key collision to ${key}`);
      }
      seenTaskKeys.add(key);

      // Foreign key: projectId
      let projectId = tsk.projectId && validProjectIds.has(tsk.projectId)
        ? tsk.projectId
        : fallbackProjectId;
      if (projectId !== tsk.projectId) {
        recordRepair(`Repaired orphan task ${id} projectId from ${tsk.projectId} to ${projectId}`);
      }

      // Foreign key: assigneeId
      let assigneeId = tsk.assigneeId || 'unassigned';
      if (assigneeId !== 'unassigned' && !validMemberIds.has(assigneeId)) {
        recordRepair(`Repaired task ${id} dangling assigneeId ${assigneeId} to unassigned`);
        assigneeId = 'unassigned';
      }

      // Enum: status
      let rawStatus = (tsk.status as unknown as string) || 'Backlog';
      if (rawStatus === 'In Review') rawStatus = 'Review';
      const status: TaskStatus = VALID_STATUSES.includes(rawStatus as TaskStatus)
        ? (rawStatus as TaskStatus)
        : 'Backlog';
      if (status !== tsk.status) {
        recordRepair(`Normalized task ${id} status from ${tsk.status} to ${status}`);
      }

      // Enum: priority
      const priority: TaskPriority = VALID_PRIORITIES.includes(tsk.priority as TaskPriority)
        ? (tsk.priority as TaskPriority)
        : 'Medium';
      if (priority !== tsk.priority) {
        recordRepair(`Normalized task ${id} priority from ${tsk.priority} to ${priority}`);
      }

      const dueDate = isValidDateString(tsk.dueDate || '')
        ? tsk.dueDate!
        : '2026-12-31';

      tasks.push({
        id,
        key,
        title: tsk.title || 'Untitled Task',
        description: tsk.description || '',
        status,
        priority,
        projectId,
        assigneeId,
        dueDate,
        startDate: isValidDateString(tsk.startDate || '') ? tsk.startDate : undefined,
        estimatedHours: typeof tsk.estimatedHours === 'number' ? Math.max(0, tsk.estimatedHours) : undefined,
        labels: Array.isArray(tsk.labels) ? tsk.labels : [],
        subtasks: Array.isArray(tsk.subtasks) ? tsk.subtasks : [],
        comments: Array.isArray(tsk.comments) ? tsk.comments : [],
        attachments: Array.isArray(tsk.attachments) ? tsk.attachments : [],
        createdAt: isValidDateString(tsk.createdAt || '') ? tsk.createdAt! : new Date().toISOString(),
        updatedAt: isValidDateString(tsk.updatedAt || '') ? tsk.updatedAt! : new Date().toISOString(),
        lastOverdueHandledDeadline: tsk.lastOverdueHandledDeadline,
      });
    }
  } else {
    recordRepair('Tasks in storage was not an array; fallback to defaults');
    tasks = [...defaults.tasks];
  }

  // 4. Documents Sanitization
  let documents: Document[] = [];
  const candidateDocs = Array.isArray(raw.documents) ? raw.documents : defaults.documents;
  const seenDocIds = new Set<string>();

  for (const d of candidateDocs) {
    if (!d || typeof d !== 'object') continue;
    const doc = d as Partial<Document>;
    const id = doc.id && typeof doc.id === 'string' ? doc.id : generateEntityId('doc');
    if (seenDocIds.has(id)) continue;
    seenDocIds.add(id);

    let projectId = doc.projectId && validProjectIds.has(doc.projectId)
      ? doc.projectId
      : fallbackProjectId;
    if (projectId !== doc.projectId) {
      recordRepair(`Repaired document ${id} projectId from ${doc.projectId} to ${projectId}`);
    }

    let authorId = doc.authorId && validMemberIds.has(doc.authorId)
      ? doc.authorId
      : fallbackMemberId;
    if (authorId !== doc.authorId) {
      recordRepair(`Repaired document ${id} authorId from ${doc.authorId} to ${authorId}`);
    }

    documents.push({
      id,
      title: doc.title || 'Untitled Document',
      type: doc.type || 'Spec',
      projectId,
      authorId,
      lastEdited: isValidDateString(doc.lastEdited || '') ? doc.lastEdited! : 'Just now',
      content: typeof doc.content === 'string' ? doc.content : '',
      isFavorite: Boolean(doc.isFavorite),
      tags: Array.isArray(doc.tags) ? doc.tags : [],
    });
  }

  // 5. Notifications Sanitization
  let notifications: Notification[] = [];
  const candidateNotifs = Array.isArray(raw.notifications) ? raw.notifications : defaults.notifications;
  const seenNotifIds = new Set<string>();
  const validTaskIds = new Set(tasks.map((t) => t.id));

  for (const n of candidateNotifs) {
    if (!n || typeof n !== 'object') continue;
    const notif = n as Partial<Notification>;
    const id = notif.id && typeof notif.id === 'string' ? notif.id : generateEntityId('notif');
    if (seenNotifIds.has(id)) continue;
    seenNotifIds.add(id);

    // Verify foreign key targets
    let targetType = notif.targetType;
    let targetId = notif.targetId;
    if (targetType === 'project' && targetId && !validProjectIds.has(targetId)) {
      targetType = undefined;
      targetId = undefined;
      recordRepair(`Cleared dangling project target in notification ${id}`);
    } else if (targetType === 'task' && targetId && !validTaskIds.has(targetId)) {
      targetType = undefined;
      targetId = undefined;
      recordRepair(`Cleared dangling task target in notification ${id}`);
    }

    notifications.push({
      id,
      title: notif.title || 'Notification',
      message: notif.message || '',
      category: notif.category || 'System',
      timestamp: notif.timestamp || 'Just now',
      read: Boolean(notif.read),
      targetType,
      targetId,
    });
  }

  // 6. Automations Sanitization
  let automations: AutomationRule[] = [];
  const candidateAutomations = Array.isArray(raw.automations) ? raw.automations : defaults.automations;
  const seenRuleIds = new Set<string>();

  for (const a of candidateAutomations) {
    if (!a || typeof a !== 'object') continue;
    const rule = a as Partial<AutomationRule>;
    const id = rule.id && typeof rule.id === 'string' ? rule.id : generateEntityId('rule');
    if (seenRuleIds.has(id)) continue;
    seenRuleIds.add(id);

    automations.push({
      id,
      name: rule.name || 'Automation Rule',
      description: rule.description || 'Workspace automation rule',
      trigger: rule.trigger || 'Task created',
      condition: rule.condition || 'always',
      action: rule.action || 'Send notification',
      enabled: Boolean(rule.enabled),
    });
  }

  // 7. Activities Sanitization
  let activities: ActivityItem[] = [];
  const candidateActivities = Array.isArray(raw.activities) ? raw.activities : defaults.activities;
  const seenActIds = new Set<string>();

  for (const act of candidateActivities) {
    if (!act || typeof act !== 'object') continue;
    const item = act as Partial<ActivityItem>;
    const id = item.id && typeof item.id === 'string' ? item.id : generateEntityId('act');
    if (seenActIds.has(id)) continue;
    seenActIds.add(id);

    let projectId = item.projectId;
    if (projectId && !validProjectIds.has(projectId)) {
      projectId = undefined;
      recordRepair(`Cleared dangling project in activity ${id}`);
    }

    activities.push({
      id,
      userId: item.userId || 'system',
      action: item.action || 'updated item',
      targetName: item.targetName || 'Workspace',
      targetType: item.targetType || 'task',
      targetId: item.targetId || '',
      timestamp: item.timestamp || 'Just now',
      projectId,
    });
  }

  // 8. Pending Invitations
  const pendingInvitations: PendingInvitation[] = Array.isArray(raw.pendingInvitations)
    ? (raw.pendingInvitations as PendingInvitation[])
    : [...defaults.pendingInvitations];

  // 9. Mathematically Synchronize Derived Metrics
  projects = projects.map((p) => ({
    ...p,
    progress: calculateProjectProgress(tasks, p.id),
  }));

  members = members.map((m) => ({
    ...m,
    workload: calculateMemberWorkload(tasks, m.id),
  }));

  const workspace: WorkspaceState = {
    projects,
    tasks,
    members,
    pendingInvitations,
    documents,
    notifications,
    automations,
    activities,
  };

  // 10. Run final integrity audit
  const integrityAudit = validateWorkspaceIntegrity(workspace);
  if (integrityAudit.length > 0) {
    recordRepair(`Remaining integrity issues resolved after hydration pass: ${integrityAudit.length}`);
  }

  return {
    workspace,
    repaired: repairsCount > 0,
    repairsCount,
    issues,
  };
}
