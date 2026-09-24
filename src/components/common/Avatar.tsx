import React from 'react';
import { TeamMember } from '../../types';

interface AvatarProps {
  member?: TeamMember;
  name?: string;
  avatarUrl?: string;
  status?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showStatus?: boolean;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  member,
  name,
  avatarUrl,
  status,
  size = 'md',
  showStatus = false,
  className = '',
}) => {
  const [imageError, setImageError] = React.useState(false);
  const displayName = member?.name || name || 'User';
  const url = member?.avatar || avatarUrl;

  React.useEffect(() => {
    setImageError(false);
  }, [url]);

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

  const sizeClasses = {
    xs: 'w-5 h-5 text-[10px]',
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
    xl: 'w-14 h-14 text-base font-semibold',
  }[size];

  const statusDotSize = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-3.5 h-3.5',
  }[size];

  const activeAvailability = status || member?.availability || 'Active';
  const statusColor = {
    Active: 'bg-emerald-500 ring-white dark:ring-[#0f141f]',
    'In a meeting': 'bg-amber-500 ring-white dark:ring-[#0f141f]',
    Away: 'bg-amber-400 ring-white dark:ring-[#0f141f]',
    Offline: 'bg-slate-400 ring-white dark:ring-[#0f141f]',
  }[activeAvailability] || 'bg-emerald-500 ring-white dark:ring-[#0f141f]';

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      {url && !imageError ? (
        <img
          src={url}
          alt={displayName}
          className={`${sizeClasses} rounded-full object-cover ring-1 ring-black/5 dark:ring-white/10`}
          onError={() => setImageError(true)}
        />
      ) : (
        <div
          data-testid="avatar-fallback"
          className={`${sizeClasses} rounded-full bg-gradient-to-tr from-brand-600 to-indigo-400 text-white font-medium flex items-center justify-center`}
        >
          {initials}
        </div>
      )}

      {showStatus && (member || status) && (
        <span
          data-testid="avatar-status-dot"
          className={`absolute bottom-0 right-0 rounded-full ring-2 ${statusDotSize} ${statusColor}`}
          title={`${displayName} (${activeAvailability})`}
        />
      )}
    </div>
  );
};

interface AvatarGroupProps {
  members: TeamMember[];
  max?: number;
  size?: 'xs' | 'sm' | 'md';
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  members,
  max = 4,
  size = 'sm',
}) => {
  const visible = members.slice(0, max);
  const remaining = members.length - max;

  const sizeClasses = {
    xs: 'w-5 h-5 text-[9px]',
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
  }[size];

  return (
    <div className="flex items-center -space-x-1.5 overflow-hidden">
      {visible.map((m) => (
        <div key={m.id} title={`${m.name} (${m.role})`} className="ring-2 ring-white dark:ring-[#0f141f] rounded-full">
          <Avatar member={m} size={size} />
        </div>
      ))}
      {remaining > 0 && (
        <div
          className={`${sizeClasses} rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium flex items-center justify-center ring-2 ring-white dark:ring-[#0f141f]`}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
};
