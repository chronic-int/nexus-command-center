import React, { useState, useEffect, useRef } from 'react';
import {
  CheckSquare,
  FolderKanban,
  FileText,
  UserPlus,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { TaskPriority, TaskStatus } from '../../types';

export const QuickCreateModal: React.FC = () => {
  const {
    isQuickCreateOpen,
    setIsQuickCreateOpen,
    quickCreateDefaultTab,
    projects,
    members,
    activeProjectId,
    workspaceSettings,
    userProfile,
    productivitySettings,
    openProject,
    setActiveView,
    setSelectedDocId,
    createTask,
    createProject,
    createDocument,
    createInvitation,
    addToast,
    setSelectedTaskId,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'task' | 'project' | 'document' | 'invite'>(quickCreateDefaultTab);

  // Task Form State
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskProjectId, setTaskProjectId] = useState(activeProjectId || projects[0]?.id || 'proj-1');
  const [taskAssigneeId, setTaskAssigneeId] = useState(
    workspaceSettings?.autoAssignCreator ? userProfile.id || 'user-1' : members[0]?.id || 'user-1'
  );
  const [taskPriority, setTaskPriority] = useState<TaskPriority>(
    workspaceSettings?.defaultTaskPriority || 'Medium'
  );
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('Todo');
  const [taskDueDate, setTaskDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  });
  const [taskLabels, setTaskLabels] = useState('Frontend, Core');

  // Project Form State
  const [projectName, setProjectName] = useState('');
  const [projectKey, setProjectKey] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [projectCategory, setProjectCategory] = useState('Core Infrastructure');
  const [projectDeadline, setProjectDeadline] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 60);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  });
  const [projectColor, setProjectColor] = useState('#6366f1');

  // Document Form State
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState<'Spec' | 'RFC' | 'Meeting Notes' | 'Design System' | 'Architecture'>('Spec');
  const [docProjectId, setDocProjectId] = useState(activeProjectId || projects[0]?.id || 'proj-1');
  const [docContent, setDocContent] = useState('');

  // Invite Form State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('Software Engineer');
  const [inviteDepartment, setInviteDepartment] = useState('Engineering');

  const prevOpenRef = useRef(false);

  // Sync contextual defaults when modal transitions from closed to open
  useEffect(() => {
    if (isQuickCreateOpen && !prevOpenRef.current) {
      setActiveTab(quickCreateDefaultTab);
      // Contextual project preselection
      const targetProjId = activeProjectId || projects[0]?.id || 'proj-1';
      setTaskProjectId(targetProjId);
      setDocProjectId(targetProjId);

      // Workspace defaults
      if (workspaceSettings?.defaultTaskPriority) {
        setTaskPriority(workspaceSettings.defaultTaskPriority);
      }
      if (workspaceSettings?.autoAssignCreator) {
        setTaskAssigneeId(userProfile.id || 'user-1');
      }
      if (workspaceSettings?.projectKeyPrefix) {
        setProjectKey(`${workspaceSettings.projectKeyPrefix}-`);
      }
    }
    prevOpenRef.current = isQuickCreateOpen;
  }, [
    isQuickCreateOpen,
    quickCreateDefaultTab,
    activeProjectId,
    workspaceSettings?.defaultTaskPriority,
    workspaceSettings?.autoAssignCreator,
    workspaceSettings?.projectKeyPrefix,
    userProfile.id,
    projects,
  ]);

  // Global key listener for 'C' to open quick create when not typing
  useEffect(() => {
    if (!productivitySettings.keyboardShortcutsEnabled) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (
        (e.key === 'c' || e.key === 'C') &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        tag !== 'INPUT' &&
        tag !== 'TEXTAREA' &&
        !(e.target as HTMLElement)?.isContentEditable &&
        !isQuickCreateOpen
      ) {
        e.preventDefault();
        setActiveTab('task');
        setIsQuickCreateOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [productivitySettings.keyboardShortcutsEnabled, isQuickCreateOpen, setIsQuickCreateOpen]);

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    const labels = taskLabels.split(',').map((s) => s.trim()).filter(Boolean);

    const newTask = createTask({
      title: taskTitle.trim(),
      description: taskDescription.trim(),
      projectId: taskProjectId,
      assigneeId: taskAssigneeId,
      priority: taskPriority,
      status: taskStatus,
      dueDate: taskDueDate,
      labels: labels.length ? labels : ['General'],
    });

    setTaskTitle('');
    setTaskDescription('');
    setIsQuickCreateOpen(false);

    if (productivitySettings.quickCreateAutoOpen) {
      setSelectedTaskId(newTask.id);
    } else {
      const projectMatch = projects.find((p) => p.id === newTask.projectId);
      addToast({
        type: 'info',
        title: 'Task Created',
        message: `${newTask.key} was added to ${projectMatch?.name || 'project'}.`,
        action: {
          label: 'View Task',
          onClick: () => setSelectedTaskId(newTask.id),
        },
      });
    }
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    const newProject = createProject({
      name: projectName.trim(),
      key: projectKey.trim().toUpperCase() || projectName.slice(0, 3).toUpperCase(),
      description: projectDesc.trim(),
      category: projectCategory,
      deadline: projectDeadline,
      color: projectColor,
    });

    setProjectName('');
    setProjectKey('');
    setProjectDesc('');
    setIsQuickCreateOpen(false);
    // Discover immediately: navigate directly to the new project!
    openProject(newProject.id);
  };

  const handleCreateDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim()) return;

    const newDoc = createDocument({
      title: docTitle.trim(),
      type: docType,
      projectId: docProjectId,
      content: docContent.trim() || `# ${docTitle.trim()}\n\nEnter documentation contents here...`,
    });

    setDocTitle('');
    setDocContent('');
    setIsQuickCreateOpen(false);
    // Discover immediately: open the document in documents view!
    setSelectedDocId(newDoc.id);
    setActiveView('documents');
  };

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    createInvitation({
      email: inviteEmail.trim(),
      name: inviteName.trim() || inviteEmail.trim().split('@')[0],
      role: inviteRole.trim() || 'Software Engineer',
      department: inviteDepartment || 'Engineering',
    });

    setInviteEmail('');
    setInviteName('');
    setIsQuickCreateOpen(false);
    // Discover immediately: navigate to team view to see the pending invite!
    setActiveView('team');
  };

  return (
    <Modal
      isOpen={isQuickCreateOpen}
      onClose={() => setIsQuickCreateOpen(false)}
      title="Create New Object"
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 pb-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('task')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'task'
                ? 'bg-brand-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            Task
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('project')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'project'
                ? 'bg-brand-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5" />
            Project
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('document')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'document'
                ? 'bg-brand-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Document
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('invite')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'invite'
                ? 'bg-brand-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Invite
          </button>
        </div>

        {/* Task Form */}
        {activeTab === 'task' && (
          <form onSubmit={handleCreateTask} className="space-y-3.5">
            <div>
              <label htmlFor="task-title-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Task Title *
              </label>
              <input
                id="task-title-input"
                type="text"
                required
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="e.g. Implement WebAssembly memory allocators"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:border-brand-500 outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="task-project-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Project
                </label>
                <select
                  id="task-project-select"
                  value={taskProjectId}
                  onChange={(e) => setTaskProjectId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:border-brand-500 outline-hidden"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.key})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="task-assignee-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assignee
                </label>
                <select
                  id="task-assignee-select"
                  value={taskAssigneeId}
                  onChange={(e) => setTaskAssigneeId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:border-brand-500 outline-hidden"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="task-priority-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Priority
                </label>
                <select
                  id="task-priority-select"
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:border-brand-500 outline-hidden"
                >
                  <option value="Urgent">Urgent</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Initial Column
                </label>
                <select
                  value={taskStatus}
                  onChange={(e) => setTaskStatus(e.target.value as TaskStatus)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:border-brand-500 outline-hidden"
                >
                  <option value="Backlog">Backlog</option>
                  <option value="Todo">Todo</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Review">Review</option>
                  <option value="Done">Done</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:border-brand-500 outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Labels (comma-separated)
              </label>
              <input
                type="text"
                value={taskLabels}
                onChange={(e) => setTaskLabels(e.target.value)}
                placeholder="e.g. Frontend, React, Accessibility"
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:border-brand-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Provide architectural requirements and definition of done..."
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:border-brand-500 outline-hidden resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsQuickCreateOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white rounded-lg shadow-sm"
              >
                Create Task
              </button>
            </div>
          </form>
        )}

        {/* Project Form */}
        {activeTab === 'project' && (
          <form onSubmit={handleCreateProject} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Project Name *
              </label>
              <input
                type="text"
                required
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. Chronos Time-Series Ingestion"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:border-brand-500 outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Identifier Key
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={projectKey}
                  onChange={(e) => setProjectKey(e.target.value.toUpperCase())}
                  placeholder="e.g. CHR"
                  className="w-full px-3 py-1.5 text-xs font-mono uppercase bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:border-brand-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={projectCategory}
                  onChange={(e) => setProjectCategory(e.target.value)}
                  placeholder="e.g. Data Systems"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:border-brand-500 outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Deadline
                </label>
                <input
                  type="date"
                  value={projectDeadline}
                  onChange={(e) => setProjectDeadline(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:border-brand-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Theme Color
                </label>
                <div className="flex items-center gap-2 pt-0.5">
                  {['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'].map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setProjectColor(col)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        projectColor === col ? 'scale-110 border-white ring-2 ring-brand-500' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Project Overview
              </label>
              <textarea
                rows={3}
                value={projectDesc}
                onChange={(e) => setProjectDesc(e.target.value)}
                placeholder="High-level initiative goals and scope..."
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:border-brand-500 outline-hidden resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsQuickCreateOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white rounded-lg shadow-sm"
              >
                Create Project
              </button>
            </div>
          </form>
        )}

        {/* Document Form */}
        {activeTab === 'document' && (
          <form onSubmit={handleCreateDocument} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Document Title *
              </label>
              <input
                type="text"
                required
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="e.g. Distributed Memory Storage RFC"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:border-brand-500 outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Type
                </label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:border-brand-500 outline-hidden"
                >
                  <option value="Spec">Technical Spec</option>
                  <option value="RFC">RFC Proposal</option>
                  <option value="Architecture">Architecture</option>
                  <option value="Design System">Design System</option>
                  <option value="Meeting Notes">Meeting Notes</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Associated Project
                </label>
                <select
                  value={docProjectId}
                  onChange={(e) => setDocProjectId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:border-brand-500 outline-hidden"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Markdown Outline
              </label>
              <textarea
                rows={4}
                value={docContent}
                onChange={(e) => setDocContent(e.target.value)}
                placeholder="# Document Title&#10;&#10;## Motivation&#10;Write initial RFC notes here..."
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:border-brand-500 outline-hidden resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsQuickCreateOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white rounded-lg shadow-sm"
              >
                Create Document
              </button>
            </div>
          </form>
        )}

        {/* Invite Member Form */}
        {activeTab === 'invite' && (
          <form onSubmit={handleSendInvite} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="e.g. Jordan Zhao"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:border-brand-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="jordan.zhao@nexus.io"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:border-brand-500 outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Role
                </label>
                <input
                  type="text"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  placeholder="Staff Frontend Engineer"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:border-brand-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Department
                </label>
                <select
                  value={inviteDepartment}
                  onChange={(e) => setInviteDepartment(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:border-brand-500 outline-hidden"
                >
                  <option value="Engineering">Engineering</option>
                  <option value="Infrastructure">Infrastructure</option>
                  <option value="Product Design">Product Design</option>
                  <option value="Product">Product</option>
                  <option value="Security">Security</option>
                  <option value="Operations">Operations</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsQuickCreateOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white rounded-lg shadow-sm"
              >
                Send Workspace Invite
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
