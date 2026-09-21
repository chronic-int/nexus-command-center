import React from 'react';
import { TaskPriority, TaskStatus, ProjectHealth, MemberAvailability } from '../../types';

interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'default' | 'outline' | 'dot' | 'subtle';
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  className = '',
}) => {
  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.5 rounded',
    sm: 'text-xs px-2 py-0.5 rounded-md',
    md: 'text-xs px-2.5 py-1 rounded-md font-medium',
  }[size];

  const variantClasses = {
    default: 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200',
    outline: 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300',
    dot: 'bg-transparent text-slate-700 dark:text-slate-300 flex items-center gap-1.5',
    subtle: 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400',
  }[variant];

  return (
    <span className={`inline-flex items-center font-medium transition-colors ${sizeClasses} ${variantClasses} ${className}`}>
      {children}
    </span>
  );
};

export const PriorityBadge: React.FC<{ priority: TaskPriority; size?: 'xs' | 'sm' | 'md' }> = ({
  priority,
  size = 'xs',
}) => {
  const styles: Record<TaskPriority, { bg: string; text: string; dot: string }> = {
    Urgent: {
      bg: 'bg-rose-500/10 dark:bg-rose-500/20 border-rose-500/30 text-rose-600 dark:text-rose-400',
      text: 'Urgent',
      dot: 'bg-rose-500',
    },
    High: {
      bg: 'bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/30 text-amber-600 dark:text-amber-400',
      text: 'High',
      dot: 'bg-amber-500',
    },
    Medium: {
      bg: 'bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/30 text-blue-600 dark:text-blue-400',
      text: 'Medium',
      dot: 'bg-blue-500',
    },
    Low: {
      bg: 'bg-slate-500/10 dark:bg-slate-500/20 border-slate-500/30 text-slate-600 dark:text-slate-400',
      text: 'Low',
      dot: 'bg-slate-400',
    },
  };

  const style = styles[priority] || styles.Medium;
  const padding = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium border rounded-md ${padding} ${style.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot} animate-pulse`} />
      {style.text}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: TaskStatus; size?: 'xs' | 'sm' | 'md' }> = ({
  status,
  size = 'xs',
}) => {
  const styles: Record<TaskStatus, { bg: string; text: string; dot: string }> = {
    Backlog: {
      bg: 'bg-slate-500/10 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700',
      text: 'Backlog',
      dot: 'bg-slate-400',
    },
    Todo: {
      bg: 'bg-sky-500/10 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border-sky-500/30',
      text: 'Todo',
      dot: 'bg-sky-500',
    },
    'In Progress': {
      bg: 'bg-indigo-500/10 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
      text: 'In Progress',
      dot: 'bg-indigo-500',
    },
    Review: {
      bg: 'bg-amber-500/10 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-500/30',
      text: 'Review',
      dot: 'bg-amber-500',
    },
    Done: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      text: 'Done',
      dot: 'bg-emerald-500',
    },
  };

  const style = styles[status] || styles.Todo;
  const padding = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium border rounded-md ${padding} ${style.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {style.text}
    </span>
  );
};

export const HealthBadge: React.FC<{ health: ProjectHealth }> = ({ health }) => {
  const styles: Record<ProjectHealth, { bg: string; dot: string; text: string }> = {
    'On Track': {
      bg: 'bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      dot: 'bg-emerald-500',
      text: 'On Track',
    },
    'At Risk': {
      bg: 'bg-amber-500/10 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-500/30',
      dot: 'bg-amber-500',
      text: 'At Risk',
    },
    Delayed: {
      bg: 'bg-rose-500/10 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-500/30',
      dot: 'bg-rose-500',
      text: 'Delayed',
    },
  };

  const style = styles[health] || styles['On Track'];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium border rounded-full ${style.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {style.text}
    </span>
  );
};

export const AvailabilityBadge: React.FC<{ availability: MemberAvailability }> = ({ availability }) => {
  const dotColor = {
    Active: 'bg-emerald-500',
    'In a meeting': 'bg-amber-500',
    Away: 'bg-amber-400',
    Offline: 'bg-slate-400',
  }[availability] || 'bg-slate-400';

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
      {availability}
    </span>
  );
};
