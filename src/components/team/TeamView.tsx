import React, { useState } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Mail,
  FolderKanban,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../common/Avatar';
import { AvailabilityBadge } from '../common/Badge';
import { MemberProfileDrawer } from './MemberProfileDrawer';

export const TeamView: React.FC = () => {
  const {
    members,
    tasks,
    projects,
    setSelectedMemberId,
    setIsQuickCreateOpen,
    setQuickCreateDefaultTab,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [viewLayout, setViewLayout] = useState<'grid' | 'table'>('grid');

  const departments = ['all', 'Engineering', 'Infrastructure', 'Product Design', 'Product', 'Security', 'Quality Assurance'];

  const filteredMembers = members.filter((m) => {
    if (departmentFilter !== 'all' && m.department !== departmentFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = m.name.toLowerCase().includes(q);
      const matchRole = m.role.toLowerCase().includes(q);
      const matchEmail = m.email.toLowerCase().includes(q);
      if (!matchName && !matchRole && !matchEmail) return false;
    }
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 bg-slate-50/50 dark:bg-[#0b0f19]">
      <MemberProfileDrawer />

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-brand-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
              Personnel Directory
            </span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Team & Capacity Management
          </h1>
          <p className="text-xs text-slate-500">
            {members.length} team members across {departments.length - 1} functional disciplines
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setQuickCreateDefaultTab('invite');
              setIsQuickCreateOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-all hover:scale-[1.02]"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Invite Colleague</span>
          </button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800 text-xs shadow-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search people, roles, emails..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 text-xs outline-hidden focus:border-brand-500"
            />
          </div>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 text-xs outline-hidden"
          >
            {departments.map((d) => (
              <option key={d} value={d}>
                {d === 'all' ? 'All Departments' : d}
              </option>
            ))}
          </select>
        </div>

        {/* View switcher */}
        <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setViewLayout('grid')}
            className={`px-3 py-1 rounded text-xs font-semibold ${
              viewLayout === 'grid'
                ? 'bg-white dark:bg-[#121826] text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Grid Cards
          </button>
          <button
            type="button"
            onClick={() => setViewLayout('table')}
            className={`px-3 py-1 rounded text-xs font-semibold ${
              viewLayout === 'table'
                ? 'bg-white dark:bg-[#121826] text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Table View
          </button>
        </div>
      </div>

      {/* Grid Layout */}
      {viewLayout === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredMembers.map((m) => {
            const assignedCount = tasks.filter((t) => t.assigneeId === m.id && t.status !== 'Done').length;
            const completedCount = tasks.filter((t) => t.assigneeId === m.id && t.status === 'Done').length;
            const currentProject = projects.find((p) => p.id === m.currentProjectId);
            const isOverloaded = m.workload > 85;

            return (
              <div
                key={m.id}
                onClick={() => setSelectedMemberId(m.id)}
                className="p-4 rounded-2xl bg-white dark:bg-[#121826] border border-slate-200/80 dark:border-slate-800/80 hover:border-brand-500/50 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <Avatar member={m} size="lg" showStatus={true} />
                    <AvailabilityBadge availability={m.availability} />
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-brand-500 transition-colors">
                    {m.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{m.role}</p>
                  <span className="inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {m.department}
                  </span>

                  {/* Current project tag */}
                  {currentProject && (
                    <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-600 dark:text-slate-300">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: currentProject.color }}
                      />
                      <span className="truncate">{currentProject.name}</span>
                    </div>
                  )}
                </div>

                {/* Workload bar */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Capacity Load</span>
                    <span
                      className={`font-mono font-bold ${
                        isOverloaded
                          ? 'text-rose-500'
                          : m.workload > 70
                          ? 'text-amber-500'
                          : 'text-emerald-500'
                      }`}
                    >
                      {m.workload}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full ${
                        isOverloaded
                          ? 'bg-rose-500'
                          : m.workload > 70
                          ? 'bg-amber-500'
                          : 'bg-brand-500'
                      }`}
                      style={{ width: `${m.workload}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5">
                    <span>{assignedCount} active tasks</span>
                    <span>{completedCount} completed</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table Layout */}
      {viewLayout === 'table' && (
        <div className="bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#0e1320] border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="p-3">Member</th>
                <th className="p-3">Department</th>
                <th className="p-3">Availability</th>
                <th className="p-3">Primary Project</th>
                <th className="p-3">Workload</th>
                <th className="p-3">Tasks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredMembers.map((m) => {
                const proj = projects.find((p) => p.id === m.currentProjectId);
                const assigned = tasks.filter((t) => t.assigneeId === m.id && t.status !== 'Done').length;

                return (
                  <tr
                    key={m.id}
                    onClick={() => setSelectedMemberId(m.id)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar member={m} size="sm" showStatus={true} />
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{m.name}</p>
                          <p className="text-[10px] text-slate-400">{m.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">{m.department}</td>
                    <td className="p-3">
                      <AvailabilityBadge availability={m.availability} />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: proj?.color || '#6366f1' }}
                        />
                        <span className="truncate max-w-[150px]">{proj?.name}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-brand-500 h-1.5 rounded-full"
                            style={{ width: `${m.workload}%` }}
                          />
                        </div>
                        <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">
                          {m.workload}%
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-slate-500 font-mono">{assigned} active</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
