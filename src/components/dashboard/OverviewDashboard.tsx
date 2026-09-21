import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FolderKanban,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  ThumbsUp,
  X,
  ExternalLink,
  Users,
  Activity,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { HealthBadge } from '../common/Badge';
import { Avatar, AvatarGroup } from '../common/Avatar';

export const OverviewDashboard: React.FC = () => {
  const {
    projects,
    tasks,
    members,
    insights,
    dismissInsight,
    markInsightUseful,
    setActiveProjectId,
    setActiveView,
    setSelectedTaskId,
    setSelectedMemberId,
    setProjectTab,
  } = useApp();

  const [chartPeriod, setChartPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [expandedInsightId, setExpandedInsightId] = useState<string | null>(null);

  // Compute live metrics
  const activeProjectsCount = projects.length;
  const completedTasksCount = tasks.filter((t) => t.status === 'Done').length;
  const overdueTasks = tasks.filter((t) => {
    if (t.status === 'Done') return false;
    return new Date(t.dueDate) < new Date('2026-09-22');
  });
  const urgentTasksCount = tasks.filter((t) => t.priority === 'Urgent' && t.status !== 'Done').length;
  const myActionTasks = tasks.filter((t) => t.assigneeId === 'user-1' && t.status !== 'Done');

  // Velocity data generator based on chart period
  const activityData = useMemo(() => {
    if (chartPeriod === '7d') {
      return [
        { date: 'Mon', completed: 6, created: 4, velocity: 22 },
        { date: 'Tue', completed: 8, created: 5, velocity: 28 },
        { date: 'Wed', completed: 5, created: 7, velocity: 24 },
        { date: 'Thu', completed: 11, created: 6, velocity: 35 },
        { date: 'Fri', completed: 9, created: 3, velocity: 30 },
        { date: 'Sat', completed: 3, created: 1, velocity: 14 },
        { date: 'Sun', completed: 2, created: 1, velocity: 10 },
      ];
    }
    if (chartPeriod === '90d') {
      return [
        { date: 'Jul W1', completed: 24, created: 18, velocity: 78 },
        { date: 'Jul W3', completed: 32, created: 25, velocity: 94 },
        { date: 'Aug W1', completed: 28, created: 22, velocity: 88 },
        { date: 'Aug W3', completed: 38, created: 30, velocity: 110 },
        { date: 'Sep W1', completed: 42, created: 28, velocity: 124 },
        { date: 'Sep W3', completed: completedTasksCount + 15, created: 32, velocity: 138 },
      ];
    }
    // Default 30d
    return [
      { date: 'Aug 25', completed: 12, created: 9, velocity: 42 },
      { date: 'Aug 30', completed: 16, created: 14, velocity: 50 },
      { date: 'Sep 04', completed: 14, created: 11, velocity: 46 },
      { date: 'Sep 09', completed: 21, created: 17, velocity: 64 },
      { date: 'Sep 14', completed: 19, created: 13, velocity: 58 },
      { date: 'Sep 19', completed: 26, created: 18, velocity: 74 },
      { date: 'Sep 22', completed: completedTasksCount, created: 15, velocity: 82 },
    ];
  }, [chartPeriod, completedTasksCount]);

  const handleOpenProject = (projectId: string) => {
    setActiveProjectId(projectId);
    setProjectTab('Board');
    setActiveView('projects');
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
      {/* 1. Contextual Greeting & Productivity Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-brand-900/40 via-indigo-950/30 to-slate-900/40 border border-brand-500/20 backdrop-blur-md shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-brand-400 tracking-wider uppercase">
              Operational Status: Nominal
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Good morning, Alex.
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
            <span className="font-semibold text-brand-600 dark:text-brand-400">
              {myActionTasks.length} tasks
            </span>{' '}
            need your attention across{' '}
            <span className="font-semibold text-slate-900 dark:text-white">
              {activeProjectsCount} active projects
            </span>
            . {overdueTasks.length > 0 && `${overdueTasks.length} tasks are currently overdue.`}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setActiveView('my-tasks')}
            className="px-3.5 py-2 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl transition-all shadow-xs"
          >
            Review My Tasks ({myActionTasks.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveView('analytics')}
            className="px-3.5 py-2 text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white rounded-xl shadow-md shadow-brand-500/20 transition-all hover:scale-[1.02]"
          >
            Sprint Telemetry
          </button>
        </div>
      </div>

      {/* 2. Productivity Overview Metrics Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Active Projects */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Active Projects
            </span>
            <div className="p-1.5 rounded-md bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <FolderKanban className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white tracking-tight">
              {activeProjectsCount}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+2 new this quarter</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Tasks Completed */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Tasks Completed
            </span>
            <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white tracking-tight">
              {completedTasksCount}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+14.2% vs last cycle</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Overdue Tasks */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Overdue Tasks
            </span>
            <div className="p-1.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white tracking-tight">
              {overdueTasks.length}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-rose-500 mt-1 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{urgentTasksCount} urgent priority</span>
            </div>
          </div>
        </div>

        {/* Metric 4: Team Velocity */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Team Velocity
            </span>
            <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white tracking-tight">
              82 <span className="text-xs font-sans text-slate-400 font-normal">pts/wk</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+18.4% acceleration</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. AI Insights Panel (Intelligent rule-based analytical module) */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              NEXUS Intelligence Insights
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            {insights.length} active strategic recommendations
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {insights.map((insight) => {
            const isExpanded = expandedInsightId === insight.id;

            return (
              <div
                key={insight.id}
                className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-[#0d121e] border border-slate-200/70 dark:border-slate-800/80 flex flex-col justify-between transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span
                      className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded ${
                        insight.impact === 'High'
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          : insight.impact === 'Medium'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {insight.impact} Impact
                    </span>
                    <button
                      type="button"
                      onClick={() => dismissInsight(insight.id)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                      title="Dismiss insight"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1">
                    {insight.title}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {insight.summary}
                  </p>

                  {isExpanded && (
                    <div className="mt-2.5 p-2 rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed animate-fade-in">
                      {insight.detail}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-xs">
                  <button
                    type="button"
                    onClick={() => setExpandedInsightId(isExpanded ? null : insight.id)}
                    className="text-brand-600 dark:text-brand-400 font-medium hover:underline text-[11px]"
                  >
                    {isExpanded ? 'Show less' : 'Expand details'}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => markInsightUseful(insight.id)}
                      className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-brand-500 transition-colors"
                      title="Mark insight as helpful"
                    >
                      <ThumbsUp className="w-3 h-3" />
                      <span>{insight.usefulCount}</span>
                    </button>

                    {insight.relatedProjectId && (
                      <button
                        type="button"
                        onClick={() => handleOpenProject(insight.relatedProjectId!)}
                        className="text-[11px] text-slate-600 dark:text-slate-300 hover:text-brand-500 flex items-center gap-0.5"
                      >
                        <span>Workspace</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Project Health Matrix & Activity Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Health Matrix (2 cols) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Project Health & Delivery Portfolio
              </h3>
              <p className="text-xs text-slate-500">Live progress telemetry and milestone tracking</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveView('projects')}
              className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
            >
              <span>View all projects</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {projects.map((proj) => {
              const projTasks = tasks.filter((t) => t.projectId === proj.id);
              const doneTasks = projTasks.filter((t) => t.status === 'Done').length;
              const projMembers = members.filter((m) => proj.memberIds.includes(m.id));

              return (
                <div
                  key={proj.id}
                  onClick={() => handleOpenProject(proj.id)}
                  className="p-3.5 rounded-xl bg-slate-50/50 dark:bg-[#0f1422] border border-slate-200/70 dark:border-slate-800/80 hover:border-brand-500/50 hover:bg-slate-50 dark:hover:bg-[#131a2c] cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: proj.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-brand-500 transition-colors truncate">
                          {proj.name}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-500">
                          {proj.key}
                        </span>
                        <HealthBadge health={proj.health} />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {proj.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-5 shrink-0 justify-between sm:justify-end">
                    {/* Progress */}
                    <div className="w-28 flex flex-col items-end">
                      <div className="flex items-center justify-between w-full text-[11px] font-mono">
                        <span className="text-slate-400">Progress</span>
                        <span className="font-bold text-slate-900 dark:text-white">{proj.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
                        <div
                          className="h-1.5 rounded-full transition-all duration-300"
                          style={{
                            width: `${proj.progress}%`,
                            backgroundColor: proj.color,
                          }}
                        />
                      </div>
                    </div>

                    {/* Deadline */}
                    <div className="text-right hidden sm:block">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Due</span>
                      <span className="text-xs font-mono text-slate-700 dark:text-slate-300 font-medium">
                        {proj.deadline}
                      </span>
                    </div>

                    {/* Avatars */}
                    <AvatarGroup members={projMembers} max={3} size="xs" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Team Workload Visualization (1 col) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Team Workload & Capacity
              </h3>
              <button
                type="button"
                onClick={() => setActiveView('team')}
                className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
              >
                Manage
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">Active task commitments across staff</p>

            <div className="space-y-3">
              {members.slice(0, 6).map((m) => {
                const assigned = tasks.filter((t) => t.assigneeId === m.id && t.status !== 'Done').length;
                const isOverloaded = m.workload > 85;

                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMemberId(m.id)}
                    className="p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar member={m} size="xs" />
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {m.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-slate-400 font-mono">
                          {assigned} tasks
                        </span>
                        <span
                          className={`text-xs font-mono font-bold ${
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
                    </div>

                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          isOverloaded
                            ? 'bg-rose-500'
                            : m.workload > 70
                            ? 'bg-amber-500'
                            : 'bg-brand-500'
                        }`}
                        style={{ width: `${m.workload}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Median load: 68%</span>
            <span className="text-emerald-500 font-medium">Sustainable</span>
          </div>
        </div>
      </div>

      {/* 5. Productivity Activity Velocity Chart */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-500" />
              Delivery Velocity & Throughput Over Time
            </h3>
            <p className="text-xs text-slate-500">
              Completed engineering work items compared with incoming ticket volume
            </p>
          </div>

          {/* Time range switcher */}
          <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            {(['7d', '30d', '90d'] as const).map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => setChartPeriod(period)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  chartPeriod === period
                    ? 'bg-white dark:bg-[#111726] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {period === '7d' ? '7 Days' : period === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
        </div>

        {/* Recharts Area Chart */}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorVelocity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
              <XAxis
                dataKey="date"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: 'rgba(148, 163, 184, 0.2)' }}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f1422',
                  borderColor: '#253046',
                  borderRadius: '0.75rem',
                  color: '#fff',
                  fontSize: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                }}
              />
              <Area
                type="monotone"
                dataKey="velocity"
                name="Velocity (pts)"
                stroke="#6366f1"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorVelocity)"
              />
              <Area
                type="monotone"
                dataKey="completed"
                name="Tasks Closed"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCompleted)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-center gap-6 mt-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-500" />
            <span>Velocity (Weighted Points)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Tasks Completed</span>
          </div>
        </div>
      </div>
    </div>
  );
};
