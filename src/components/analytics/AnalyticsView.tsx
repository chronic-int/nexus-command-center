import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  PieChart as PieChartIcon,
  Calendar,
  Filter,
  Download,
  Share2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { useApp } from '../../context/AppContext';

export const AnalyticsView: React.FC = () => {
  const { tasks, projects, members, addToast } = useApp();

  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  // Priority Distribution Data
  const priorityData = useMemo(() => {
    const counts = { Urgent: 0, High: 0, Medium: 0, Low: 0 };
    tasks.forEach((t) => {
      if (counts[t.priority] !== undefined) counts[t.priority]++;
    });

    return [
      { name: 'Urgent', value: counts.Urgent, color: '#f43f5e' },
      { name: 'High', value: counts.High, color: '#f59e0b' },
      { name: 'Medium', value: counts.Medium, color: '#3b82f6' },
      { name: 'Low', value: counts.Low, color: '#64748b' },
    ];
  }, [tasks]);

  // Velocity by Member Data
  const memberVelocityData = useMemo(() => {
    return members.slice(0, 6).map((m) => {
      const mTasks = tasks.filter((t) => t.assigneeId === m.id);
      const completed = mTasks.filter((t) => t.status === 'Done').length;
      const inProgress = mTasks.filter((t) => t.status === 'In Progress' || t.status === 'Review').length;

      return {
        name: m.name.split(' ')[0],
        Completed: completed,
        'In Flight': inProgress,
      };
    });
  }, [members, tasks]);

  // Project Category Distribution
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    projects.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });

    const colors = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    return Object.entries(counts).map(([name, value], i) => ({
      name,
      value,
      color: colors[i % colors.length],
    }));
  }, [projects]);

  // Cumulative Burnup Trend
  const cumulativeTrendData = [
    { sprint: 'Sprint 30', planned: 20, completed: 18 },
    { sprint: 'Sprint 31', planned: 35, completed: 32 },
    { sprint: 'Sprint 32', planned: 52, completed: 48 },
    { sprint: 'Sprint 33', planned: 70, completed: 64 },
    { sprint: 'Sprint 34', planned: 88, completed: 82 },
    { sprint: 'Sprint 35', planned: 104, completed: 96 },
  ];

  const handleExportData = () => {
    addToast({
      type: 'success',
      title: 'Telemetry Report Exported',
      message: 'Generated CSV export containing comprehensive task performance metrics.',
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 bg-slate-50/50 dark:bg-[#0b0f19]">
      {/* Header & Date Range Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-brand-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
              Operational Telemetry
            </span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Engineering Velocity & Analytics
          </h1>
          <p className="text-xs text-slate-500">
            Real-time throughput metrics, burnup curves, and capacity allocation models
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Time Range Filter */}
          <div className="p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex text-xs">
            {(['week', 'month', 'quarter', 'year'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1 rounded-md font-medium capitalize transition-colors ${
                  timeRange === r
                    ? 'bg-white dark:bg-[#111726] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {r === 'week' ? 'This Week' : r === 'month' ? 'This Month' : r === 'quarter' ? 'Quarter' : 'Year'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportData}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Performance Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Average Cycle Time
          </span>
          <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            3.4 <span className="text-xs font-sans text-slate-400 font-normal">days</span>
          </p>
          <span className="text-[11px] text-emerald-500 font-medium">
            -28% faster than median
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            PR Merge Latency
          </span>
          <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            4.2 <span className="text-xs font-sans text-slate-400 font-normal">hours</span>
          </p>
          <span className="text-[11px] text-emerald-500 font-medium">
            94% reviewed within 24h
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Sprint Predictability
          </span>
          <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            91.8%
          </p>
          <span className="text-[11px] text-emerald-500 font-medium">
            High confidence rating
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Defect Escape Rate
          </span>
          <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            0.6%
          </p>
          <span className="text-[11px] text-slate-400">
            Across 14 releases
          </span>
        </div>
      </div>

      {/* Charts Grid Row 1: Cumulative Burnup + Member Velocity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cumulative Burnup Curve */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Cumulative Scope & Burnup Trajectory
            </h3>
            <p className="text-xs text-slate-400">
              Planned scope commitment vs confirmed completed story units
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cumulativeTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                <XAxis dataKey="sprint" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f1422',
                    borderColor: '#253046',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="planned"
                  name="Planned Scope"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  fill="transparent"
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  name="Completed Units"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  fill="rgba(99, 102, 241, 0.15)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Task Velocity by Engineer */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Throughput Volume by Engineer
            </h3>
            <p className="text-xs text-slate-400">
              Completed vs active tasks currently assigned to staff
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={memberVelocityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f1422',
                    borderColor: '#253046',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend />
                <Bar dataKey="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="In Flight" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Grid Row 2: Priority Donut + Category Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Task Priority Distribution Donut */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col">
          <div className="mb-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Task Priority Allocation
            </h3>
            <p className="text-xs text-slate-400">Current backlog breakdown across priority tiers</p>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {priorityData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f1422',
                    borderColor: '#253046',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col">
          <div className="mb-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Strategic Portfolio Distribution
            </h3>
            <p className="text-xs text-slate-400">Initiative weight across technical divisions</p>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {categoryData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f1422',
                    borderColor: '#253046',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
