import { Task, Project, TeamMember } from '../types';
import { getTodayString } from './dateUtils';

/**
 * Escapes a cell value conforming to RFC 4180 CSV specifications.
 */
function escapeCsvValue(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '""';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Generates and triggers browser download of an RFC 4180 CSV file containing live workspace tasks.
 */
export function exportTasksToCsv(
  tasks: Task[],
  projects: Project[],
  members: TeamMember[]
): boolean {
  try {
    const projectMap = new Map(projects.map((p) => [p.id, p.name]));
    const memberMap = new Map(members.map((m) => [m.id, m.name]));

    const headers = [
      'Task Key',
      'Task Title',
      'Project',
      'Status',
      'Priority',
      'Assignee',
      'Due Date',
      'Completion State',
      'Subtasks Progress',
      'Created Date',
    ];

    const rows = tasks.map((t) => {
      const completedSubs = t.subtasks.filter((s) => s.completed).length;
      const subtaskStr = t.subtasks.length > 0 ? `${completedSubs}/${t.subtasks.length}` : 'N/A';

      return [
        escapeCsvValue(t.key),
        escapeCsvValue(t.title),
        escapeCsvValue(projectMap.get(t.projectId) || t.projectId),
        escapeCsvValue(t.status),
        escapeCsvValue(t.priority),
        escapeCsvValue(memberMap.get(t.assigneeId) || 'Unassigned'),
        escapeCsvValue(t.dueDate),
        escapeCsvValue(t.status === 'Done' ? 'Completed' : 'In Flight'),
        escapeCsvValue(subtaskStr),
        escapeCsvValue(t.createdAt ? t.createdAt.split('T')[0] : ''),
      ].join(',');
    });

    const csvContent = [headers.map(escapeCsvValue).join(','), ...rows].join('\r\n');

    // Create browser Blob and trigger download
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `nexus-tasks-export-${getTodayString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  } catch (err) {
    console.error('[NEXUS CSV Export] Failed to export CSV:', err);
    return false;
  }
}
