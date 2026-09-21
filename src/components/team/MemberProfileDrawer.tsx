import React from 'react';
import {
  Mail,
  FolderKanban,
  CheckSquare,
  Clock,
  Activity,
  Award,
  TrendingUp,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Drawer } from '../common/Drawer';
import { Avatar } from '../common/Avatar';
import { AvailabilityBadge, PriorityBadge, StatusBadge } from '../common/Badge';

export const MemberProfileDrawer: React.FC = () => {
  const {
    selectedMemberId,
    setSelectedMemberId,
    members,
    tasks,
    projects,
    activities,
    setSelectedTaskId,
    setActiveProjectId,
    setActiveView,
  } = useApp();

  const member = members.find((m) => m.id === selectedMemberId);

  if (!member) return null;

  const assignedTasks = tasks.filter((t) => t.assigneeId === member.id);
  const openTasks = assignedTasks.filter((t) => t.status !== 'Done');
  const completedTasks = assignedTasks.filter((t) => t.status === 'Done');
  const memberProjects = projects.filter((p) => p.memberIds.includes(member.id));
  const memberActivities = activities.filter((a) => a.userId === member.id);

  return (
    <Drawer
      isOpen={!!selectedMemberId}
      onClose={() => setSelectedMemberId(null)}
      width="lg"
      title={
        <div className="flex items-center gap-3">
          <Avatar member={member} size="sm" showStatus={true} />
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
              {member.name}
            </h3>
            <span className="text-xs text-slate-400">{member.role}</span>
          </div>
        </div>
      }
      subtitle={
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-slate-500">{member.department}</span>
          <span>•</span>
          <AvailabilityBadge availability={member.availability} />
        </div>
      }
    >
      <div className="space-y-6">
        {/* Bio & Contact */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            {member.bio || 'Core contributor focusing on architectural throughput and system reliability.'}
          </p>
          <div className="flex items-center gap-2 text-slate-500 pt-1">
            <Mail className="w-3.5 h-3.5" />
            <a href={`mailto:${member.email}`} className="text-brand-600 dark:text-brand-400 hover:underline">
              {member.email}
            </a>
          </div>
        </div>

        {/* Workload Capacity Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-[#121826] border border-slate-200/80 dark:border-slate-800 text-center">
            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
              Active Load
            </span>
            <span
              className={`text-xl font-bold font-mono ${
                member.workload > 85
                  ? 'text-rose-500'
                  : member.workload > 70
                  ? 'text-amber-500'
                  : 'text-emerald-500'
              }`}
            >
              {member.workload}%
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-[#121826] border border-slate-200/80 dark:border-slate-800 text-center">
            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
              In Flight
            </span>
            <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
              {openTasks.length}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-[#121826] border border-slate-200/80 dark:border-slate-800 text-center">
            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
              Completed
            </span>
            <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {completedTasks.length}
            </span>
          </div>
        </div>

        {/* Active Projects */}
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 block">
            Associated Initiatives ({memberProjects.length})
          </span>
          <div className="space-y-1.5">
            {memberProjects.map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  setActiveProjectId(p.id);
                  setActiveView('projects');
                  setSelectedMemberId(null);
                }}
                className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 hover:border-brand-500/50 cursor-pointer flex items-center justify-between text-xs transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{p.name}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">{p.progress}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Assigned Tasks */}
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 block">
            Assigned Work Items ({assignedTasks.length})
          </span>
          <div className="space-y-2">
            {assignedTasks.map((t) => (
              <div
                key={t.id}
                onClick={() => {
                  setSelectedTaskId(t.id);
                  setSelectedMemberId(null);
                }}
                className="p-3 rounded-xl bg-slate-50/70 dark:bg-[#121826] border border-slate-200/80 dark:border-slate-800 hover:border-brand-500/50 cursor-pointer transition-all text-xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-slate-400">{t.key}</span>
                  <div className="flex items-center gap-1.5">
                    <StatusBadge status={t.status} size="xs" />
                    <PriorityBadge priority={t.priority} size="xs" />
                  </div>
                </div>
                <h4 className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {t.title}
                </h4>
              </div>
            ))}
          </div>
        </div>

        {/* Member Audit Trail */}
        {memberActivities.length > 0 && (
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 block flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" /> Recent Activity
            </span>
            <div className="space-y-1.5">
              {memberActivities.map((act) => (
                <div
                  key={act.id}
                  className="p-2 rounded-lg bg-slate-50/40 dark:bg-slate-900/40 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between"
                >
                  <span className="truncate">
                    {act.action} "{act.targetName}"
                  </span>
                  <span className="text-[10px] text-slate-400 shrink-0 ml-2">{act.timestamp}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
};
