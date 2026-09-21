import React, { useState } from 'react';
import {
  FolderKanban,
  LayoutGrid,
  List,
  Calendar,
  FileText,
  Activity,
  Plus,
  Users,
  Settings,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ViewTab } from '../../types';
import { HealthBadge } from '../common/Badge';
import { Avatar, AvatarGroup } from '../common/Avatar';
import { KanbanBoard } from './KanbanBoard';
import { TaskListView } from './TaskListView';
import { TimelineGanttView } from './TimelineGanttView';

export const ProjectWorkspace: React.FC = () => {
  const {
    activeProjectId,
    projects,
    tasks,
    members,
    documents,
    activities,
    projectTab,
    setProjectTab,
    setIsQuickCreateOpen,
    setQuickCreateDefaultTab,
    setSelectedTaskId,
    setSelectedDocId,
    setActiveView,
  } = useApp();

  // Find active project or fallback to first project
  const project = projects.find((p) => p.id === activeProjectId) || projects[0];
  const projectTasks = tasks.filter((t) => t.projectId === project?.id);
  const projectDocs = documents.filter((d) => d.projectId === project?.id);
  const projectActivities = activities.filter((a) => a.projectId === project?.id);
  const projectMembers = members.filter((m) => project?.memberIds.includes(m.id));

  if (!project) {
    return (
      <div className="p-12 text-center text-slate-400">
        Project not found. Select a project from the sidebar.
      </div>
    );
  }

  const tabs: { id: ViewTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'Board', label: 'Kanban Board', icon: LayoutGrid },
    { id: 'List', label: 'List View', icon: List },
    { id: 'Timeline', label: 'Timeline', icon: Calendar },
    { id: 'Overview', label: 'Project Brief', icon: FolderKanban },
    { id: 'Files', label: 'Documents & Files', icon: FileText },
    { id: 'Activity', label: 'Audit Trail', icon: Activity },
  ];

  const doneCount = projectTasks.filter((t) => t.status === 'Done').length;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-50/50 dark:bg-[#0b0f19]">
      {/* Project Header */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-[#0e1322]/80 backdrop-blur-md shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span
                className="w-3.5 h-3.5 rounded-md shrink-0 shadow-xs"
                style={{ backgroundColor: project.color }}
              />
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {project.key}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {project.category}
              </span>
              <HealthBadge health={project.health} />
            </div>

            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {project.name}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              {project.description}
            </p>
          </div>

          {/* Right Metrics & Members */}
          <div className="flex items-center gap-5 shrink-0">
            {/* Progress gauge */}
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-medium">Completion</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {project.progress}%
                </span>
              </div>
              <div className="w-28 bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
                <div
                  className="h-1.5 rounded-full transition-all duration-500"
                  style={{
                    width: `${project.progress}%`,
                    backgroundColor: project.color,
                  }}
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1">
                {doneCount} of {projectTasks.length} tasks done
              </span>
            </div>

            {/* Team Avatars */}
            <div className="border-l border-slate-200 dark:border-slate-800 pl-4 flex flex-col items-end">
              <span className="text-[10px] uppercase font-bold text-slate-400 mb-1">Team</span>
              <AvatarGroup members={projectMembers} max={4} size="sm" />
            </div>

            {/* Target Deadline */}
            <div className="border-l border-slate-200 dark:border-slate-800 pl-4 hidden lg:flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Deadline</span>
              <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-slate-800 dark:text-slate-200">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{project.deadline}</span>
              </div>
            </div>

            {/* Add Task Button */}
            <button
              type="button"
              onClick={() => {
                setQuickCreateDefaultTab('task');
                setIsQuickCreateOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-all hover:scale-[1.02]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </button>
          </div>
        </div>

        {/* Workspace Navigation Tabs */}
        <div className="flex items-center gap-1 mt-5 border-t border-slate-200/80 dark:border-slate-800/80 pt-3 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = projectTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setProjectTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.id === 'Board' && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {projectTasks.length}
                  </span>
                )}
                {tab.id === 'Files' && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {projectDocs.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Views Content */}
      <div className="flex-1 p-5 overflow-hidden flex flex-col min-h-0">
        {projectTab === 'Board' && <KanbanBoard tasks={projectTasks} projectId={project.id} />}

        {projectTab === 'List' && <TaskListView tasks={projectTasks} showProjectColumn={false} />}

        {projectTab === 'Timeline' && <TimelineGanttView tasks={projectTasks} />}

        {projectTab === 'Overview' && (
          <div className="flex-1 overflow-y-auto space-y-5 max-w-5xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Deliverable Scope
                </span>
                <p className="text-xl font-bold text-slate-900 dark:text-white font-mono">
                  {projectTasks.length} Work Items
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {doneCount} completed • {projectTasks.length - doneCount} active
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Risk Level
                </span>
                <p className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <HealthBadge health={project.health} />
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Target milestone: {project.deadline}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Assigned Personnel
                </span>
                <p className="text-xl font-bold text-slate-900 dark:text-white font-mono">
                  {projectMembers.length} Engineers
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Led by {members.find((m) => m.id === project.leadId)?.name || 'Lead'}
                </p>
              </div>
            </div>

            {/* Architecture Overview */}
            <div className="p-5 rounded-xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-500" />
                Executive Project Mandate
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                {project.description}
              </p>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {projectTab === 'Files' && (
          <div className="flex-1 overflow-y-auto space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Project Documentation & Specs
              </h3>
              <button
                type="button"
                onClick={() => {
                  setQuickCreateDefaultTab('document');
                  setIsQuickCreateOpen(true);
                }}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                New Spec
              </button>
            </div>

            {projectDocs.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                No documents created for this project yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {projectDocs.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => {
                      setSelectedDocId(doc.id);
                      setActiveView('documents');
                    }}
                    className="p-4 rounded-xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 cursor-pointer transition-all shadow-xs group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-brand-500/10 text-brand-600 dark:text-brand-400">
                        {doc.type}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(doc.lastEdited).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 group-hover:text-brand-500 transition-colors line-clamp-2">
                      {doc.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-2 line-clamp-2">
                      {doc.content.replace(/^#+ .*/g, '').slice(0, 100)}...
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {projectTab === 'Activity' && (
          <div className="flex-1 overflow-y-auto space-y-2 max-w-3xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Chronological Audit Trail
            </h3>
            {projectActivities.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No recent activity logged for this project.
              </div>
            ) : (
              <div className="space-y-2">
                {projectActivities.map((act) => {
                  const actor = members.find((m) => m.id === act.userId);
                  return (
                    <div
                      key={act.id}
                      className="p-3 rounded-lg bg-white dark:bg-[#121826] border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar member={actor} size="xs" />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {actor?.name || 'User'}
                        </span>
                        <span className="text-slate-400">{act.action}</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[280px]">
                          "{act.targetName}"
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono shrink-0 ml-2">
                        {act.timestamp}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
