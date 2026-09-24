import React, { useState, useRef, useMemo } from 'react';
import {
  User,
  Mail,
  Briefcase,
  Clock,
  Globe,
  Camera,
  Trash2,
  Edit3,
  Check,
  X,
  AlertCircle,
  FolderKanban,
  CheckSquare,
  Activity,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../common/Avatar';
import { MemberAvailability } from '../../types';
import { StatusBadge, PriorityBadge, AvailabilityBadge } from '../common/Badge';

export const ProfileView: React.FC = () => {
  const {
    userProfile,
    updateUserProfile,
    tasks,
    projects,
    activities,
    setSelectedTaskId,
    setActiveProjectId,
    setActiveView,
    addToast,
  } = useApp();

  // Mode: 'overview' | 'edit'
  const [isEditing, setIsEditing] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: userProfile.name,
    email: userProfile.email,
    role: userProfile.role,
    department: userProfile.department,
    bio: userProfile.bio,
    avatar: userProfile.avatar,
    availability: userProfile.availability,
    timezone: userProfile.timezone,
    workingHours: userProfile.workingHours,
    language: userProfile.language,
  });

  // Validation & Feedback State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if form is dirty
  const isDirty = useMemo(() => {
    return (
      formData.name !== userProfile.name ||
      formData.email !== userProfile.email ||
      formData.role !== userProfile.role ||
      formData.department !== userProfile.department ||
      formData.bio !== userProfile.bio ||
      formData.avatar !== userProfile.avatar ||
      formData.availability !== userProfile.availability ||
      formData.timezone !== userProfile.timezone ||
      formData.workingHours !== userProfile.workingHours ||
      formData.language !== userProfile.language
    );
  }, [formData, userProfile]);

  // Sync formData when userProfile updates externally
  const handleStartEdit = () => {
    setFormData({
      name: userProfile.name,
      email: userProfile.email,
      role: userProfile.role,
      department: userProfile.department,
      bio: userProfile.bio,
      avatar: userProfile.avatar,
      availability: userProfile.availability,
      timezone: userProfile.timezone,
      workingHours: userProfile.workingHours,
      language: userProfile.language,
    });
    setErrors({});
    setAvatarError(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (isDirty) {
      setShowUnsavedWarning(true);
      return;
    }
    setIsEditing(false);
  };

  const confirmDiscard = () => {
    setFormData({
      name: userProfile.name,
      email: userProfile.email,
      role: userProfile.role,
      department: userProfile.department,
      bio: userProfile.bio,
      avatar: userProfile.avatar,
      availability: userProfile.availability,
      timezone: userProfile.timezone,
      workingHours: userProfile.workingHours,
      language: userProfile.language,
    });
    setShowUnsavedWarning(false);
    setIsEditing(false);
  };

  // Avatar local file upload with validation
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarError(null);

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      setAvatarError('Please select a valid image file (JPEG, PNG, WebP, or SVG).');
      return;
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      setAvatarError(`Image size exceeds 2MB limit (selected: ${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setFormData((prev) => ({ ...prev, avatar: result }));
      // Also update immediately if not in edit mode
      if (!isEditing) {
        updateUserProfile({ avatar: result });
        addToast({
          type: 'success',
          title: 'Avatar Updated',
          message: 'Your new profile image was saved locally.',
          duration: 3000,
        });
      }
    };
    reader.onerror = () => {
      setAvatarError('Failed to read image file. Please try another image.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setFormData((prev) => ({ ...prev, avatar: '' }));
    setAvatarError(null);
    if (!isEditing) {
      updateUserProfile({ avatar: '' });
      addToast({
        type: 'info',
        title: 'Avatar Reset',
        message: 'Reverted to initials avatar.',
        duration: 2500,
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required.';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters.';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Contact email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please provide a valid email address.';
    }

    if (!formData.role.trim()) {
      newErrors.role = 'Role or job title is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    updateUserProfile(formData);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsEditing(false);
    }, 800);

    addToast({
      type: 'success',
      title: 'Profile Updated',
      message: 'Your workspace profile and responsibility summary were saved.',
      duration: 3000,
    });
  };

  // User responsibilities data derivation
  const assignedTasks = useMemo(() => {
    return tasks.filter((t) => t.assigneeId === userProfile.id || t.assigneeId === 'user-1');
  }, [tasks, userProfile.id]);

  const openTasks = useMemo(() => {
    return assignedTasks.filter((t) => t.status !== 'Done');
  }, [assignedTasks]);

  const completedTasks = useMemo(() => {
    return assignedTasks.filter((t) => t.status === 'Done');
  }, [assignedTasks]);

  const userProjects = useMemo(() => {
    return projects.filter(
      (p) =>
        p.leadId === userProfile.id ||
        p.leadId === 'user-1' ||
        p.memberIds.includes(userProfile.id) ||
        p.memberIds.includes('user-1')
    );
  }, [projects, userProfile.id]);

  const userActivities = useMemo(() => {
    return activities.filter((a) => a.userId === userProfile.id || a.userId === 'user-1').slice(0, 10);
  }, [activities, userProfile.id]);

  // Compute live workload percentage based on open tasks weight
  const dynamicWorkload = useMemo(() => {
    if (openTasks.length === 0) return 0;
    let points = 0;
    for (const t of openTasks) {
      if (t.priority === 'Urgent') points += 30;
      else if (t.priority === 'High') points += 20;
      else if (t.priority === 'Medium') points += 12;
      else points += 6;
    }
    return Math.min(100, Math.round(points));
  }, [openTasks]);

  return (
    <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 bg-slate-50/50 dark:bg-[#0b0f19]">
      {/* Hidden File Input for Avatar */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/svg+xml"
        onChange={handleAvatarFileChange}
        className="hidden"
        aria-hidden="true"
      />

      {/* Hero Header Card */}
      <div className="relative rounded-2xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800 p-6 shadow-xs overflow-hidden">
        {/* Subtle decorative background gradient */}
        <div className="absolute top-0 right-0 w-96 h-48 bg-gradient-to-bl from-brand-500/10 via-indigo-500/5 to-transparent rounded-bl-full pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Avatar & Identity Info */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="relative group shrink-0">
              <Avatar
                name={isEditing ? formData.name : userProfile.name}
                avatarUrl={isEditing ? formData.avatar : userProfile.avatar}
                status={isEditing ? formData.availability : userProfile.availability}
                size="xl"
                showStatus={true}
                className="ring-4 ring-slate-100 dark:ring-slate-800"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-slate-950/60 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs cursor-pointer"
                title="Upload profile photo"
                aria-label="Upload profile photo"
              >
                <Camera className="w-5 h-5 mb-0.5" />
                <span className="text-[9px] font-semibold">Change</span>
              </button>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {userProfile.name}
                </h1>
                <AvailabilityBadge availability={userProfile.availability} />
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400">
                  Workspace Owner
                </span>
              </div>

              <p className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2 flex-wrap">
                <span>{userProfile.role}</span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-500 dark:text-slate-400">{userProfile.department}</span>
              </p>

              <div className="flex flex-wrap items-center gap-4 mt-2.5 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <a href={`mailto:${userProfile.email}`} className="hover:text-brand-500 transition-colors">
                    {userProfile.email}
                  </a>
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{userProfile.workingHours}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <span>{userProfile.timezone}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Toggle */}
          <div className="flex items-center gap-2.5 shrink-0">
            {!isEditing ? (
              <button
                type="button"
                onClick={handleStartEdit}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            )}
          </div>
        </div>

        {/* Bio snippet if present */}
        {!isEditing && userProfile.bio && (
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
            {userProfile.bio}
          </div>
        )}

        {/* Avatar Error banner */}
        {avatarError && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {avatarError}
            </span>
            <button
              type="button"
              onClick={() => setAvatarError(null)}
              className="p-1 hover:text-rose-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Current Workload
          </span>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-black font-mono ${
                dynamicWorkload > 85
                  ? 'text-rose-500'
                  : dynamicWorkload > 65
                  ? 'text-amber-500'
                  : 'text-emerald-500'
              }`}
            >
              {dynamicWorkload}%
            </span>
            <span className="text-[11px] text-slate-400">
              {dynamicWorkload > 80 ? 'Heavy Load' : dynamicWorkload > 40 ? 'Optimal' : 'Light Load'}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Assigned In Flight
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
              {openTasks.length}
            </span>
            <span className="text-[11px] text-slate-400">of {assignedTasks.length} total</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Completed Tasks
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {completedTasks.length}
            </span>
            <span className="text-[11px] text-slate-400">closed milestones</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Active Initiatives
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-brand-600 dark:text-brand-400">
              {userProjects.length}
            </span>
            <span className="text-[11px] text-slate-400">collaborations</span>
          </div>
        </div>
      </div>

      {/* Main Content Area: Edit Form OR Responsibilities Overview */}
      {isEditing ? (
        <form
          onSubmit={handleSaveProfile}
          className="rounded-2xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6"
        >
          {/* Header & Unsaved alert */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Edit Workspace Profile
              </h2>
              <p className="text-xs text-slate-500">
                Update your professional identity, working hours, and communication preferences.
              </p>
            </div>
            {isDirty && (
              <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full animate-pulse">
                Unsaved Changes
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* 1. Identity Group */}
            <div className="space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Identity & Avatar
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Alex Rivera"
                  className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-brand-500/30 transition-all ${
                    errors.name
                      ? 'border-rose-500 focus:border-rose-500'
                      : 'border-slate-200 dark:border-slate-800 focus:border-brand-500'
                  }`}
                />
                {errors.name && <p className="text-rose-500 text-[11px] mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Contact Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="alex.rivera@nexus.io"
                  className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-brand-500/30 transition-all ${
                    errors.email
                      ? 'border-rose-500 focus:border-rose-500'
                      : 'border-slate-200 dark:border-slate-800 focus:border-brand-500'
                  }`}
                />
                {errors.email && <p className="text-rose-500 text-[11px] mt-1">{errors.email}</p>}
              </div>

              {/* Avatar Controls */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Profile Photo
                </label>
                <div className="flex items-center gap-3">
                  <Avatar
                    name={formData.name}
                    avatarUrl={formData.avatar}
                    size="md"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium transition-colors"
                    >
                      Choose Image
                    </button>
                    {formData.avatar && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg font-medium transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  JPG, PNG, WebP or SVG. Stored in local browser storage (Max 2MB).
                </p>
              </div>
            </div>

            {/* 2. Work & Role Group */}
            <div className="space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" /> Role & Department
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Job Title / Role <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder="e.g. Staff Product Engineer"
                  className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-brand-500/30 transition-all ${
                    errors.role
                      ? 'border-rose-500 focus:border-rose-500'
                      : 'border-slate-200 dark:border-slate-800 focus:border-brand-500'
                  }`}
                />
                {errors.role && <p className="text-rose-500 text-[11px] mt-1">{errors.role}</p>}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Department / Team
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="e.g. Engineering"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white outline-hidden focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 transition-all"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Short Professional Bio
                </label>
                <textarea
                  rows={2}
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Brief summary of responsibilities, focus areas, and technical specialties..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white outline-hidden focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 transition-all"
                />
              </div>
            </div>

            {/* 3. Availability & Working Hours */}
            <div className="space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Availability & Hours
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Current Availability Status
                </label>
                <select
                  value={formData.availability}
                  onChange={(e) =>
                    setFormData({ ...formData, availability: e.target.value as MemberAvailability })
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white outline-hidden focus:border-brand-500"
                >
                  <option value="Active">Active (Available)</option>
                  <option value="In a meeting">In a meeting (Busy)</option>
                  <option value="Away">Away (Temporary)</option>
                  <option value="Offline">Offline (Unavailable)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Preferred Working Hours
                </label>
                <input
                  type="text"
                  value={formData.workingHours}
                  onChange={(e) => setFormData({ ...formData, workingHours: e.target.value })}
                  placeholder="09:00 - 17:00 EST"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white outline-hidden focus:border-brand-500"
                />
              </div>
            </div>

            {/* 4. Localization & Preferences */}
            <div className="space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" /> Localization & Language
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Timezone
                </label>
                <select
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white outline-hidden focus:border-brand-500"
                >
                  <option value="America/New_York (UTC-5)">America/New_York (UTC-5 Eastern)</option>
                  <option value="America/Chicago (UTC-6)">America/Chicago (UTC-6 Central)</option>
                  <option value="America/Denver (UTC-7)">America/Denver (UTC-7 Mountain)</option>
                  <option value="America/Los_Angeles (UTC-8)">America/Los_Angeles (UTC-8 Pacific)</option>
                  <option value="Europe/London (UTC+0)">Europe/London (UTC+0 GMT/BST)</option>
                  <option value="Europe/Berlin (UTC+1)">Europe/Berlin (UTC+1 CET)</option>
                  <option value="Asia/Tokyo (UTC+9)">Asia/Tokyo (UTC+9 JST)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Interface Language
                </label>
                <select
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white outline-hidden focus:border-brand-500"
                >
                  <option value="English (US)">English (US)</option>
                  <option value="English (UK)">English (UK)</option>
                  <option value="German">Deutsch (German)</option>
                  <option value="French">Français (French)</option>
                  <option value="Spanish">Español (Spanish)</option>
                  <option value="Japanese">日本語 (Japanese)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-5 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleCancelEdit}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>

            <div className="flex items-center gap-3">
              {saveSuccess && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold animate-fade-in">
                  <Check className="w-4 h-4" /> Saved!
                </span>
              )}

              <button
                type="submit"
                disabled={!isDirty}
                className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-xs transition-all ${
                  isDirty
                    ? 'bg-brand-600 hover:bg-brand-500 hover:scale-[1.02] active:scale-[0.98]'
                    : 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                }`}
              >
                <span>Save Profile Changes</span>
              </button>
            </div>
          </div>
        </form>
      ) : (
        /* Responsibilities Overview Mode */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Left Column (2 Cols): Assigned Tasks & Active Projects */}
          <div className="lg:col-span-2 space-y-6">
            {/* Assigned Work Items Section */}
            <div className="rounded-2xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-brand-500" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Assigned Work Items ({assignedTasks.length})
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveView('my-tasks')}
                  className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                >
                  <span>Open Full Tasks View</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {assignedTasks.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No tasks currently assigned to you.
                </div>
              ) : (
                <div className="space-y-2">
                  {assignedTasks.slice(0, 8).map((task) => (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800/70 hover:border-brand-500/50 hover:bg-slate-50 dark:hover:bg-slate-900/80 transition-all cursor-pointer flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[10px] text-slate-400">{task.key}</span>
                          <StatusBadge status={task.status} size="xs" />
                          <PriorityBadge priority={task.priority} size="xs" />
                        </div>
                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {task.title}
                        </h4>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-slate-400 block font-mono">
                          Due {task.dueDate}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Associated Initiatives & Projects */}
            <div className="rounded-2xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-2">
                  <FolderKanban className="w-4 h-4 text-brand-500" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Active Initiatives ({userProjects.length})
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveProjectId(null);
                    setActiveView('projects');
                  }}
                  className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                >
                  <span>All Projects</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {userProjects.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Not actively assigned to any initiatives.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {userProjects.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setActiveProjectId(p.id);
                        setActiveView('projects');
                      }}
                      className="p-3.5 rounded-xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800/70 hover:border-brand-500/50 transition-all cursor-pointer text-xs"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                          <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                            {p.name}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">{p.key}</span>
                      </div>

                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden my-2">
                        <div
                          className="bg-brand-500 h-full rounded-full transition-all"
                          style={{ width: `${p.progress}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>{p.health}</span>
                        <span className="font-mono">{p.progress}% complete</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: About, Working Schedule & Activity Log */}
          <div className="space-y-6">
            {/* Working Details & Location Card */}
            <div className="rounded-2xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3.5 text-xs">
              <h3 className="font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800/80">
                Working Schedule & Context
              </h3>

              <div className="space-y-2.5 text-slate-600 dark:text-slate-300">
                <div className="flex items-start justify-between">
                  <span className="text-slate-400">Timezone</span>
                  <span className="font-medium text-right text-slate-800 dark:text-slate-200">{userProfile.timezone}</span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-slate-400">Working Hours</span>
                  <span className="font-medium text-right text-slate-800 dark:text-slate-200">{userProfile.workingHours}</span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-slate-400">Language</span>
                  <span className="font-medium text-right text-slate-800 dark:text-slate-200">{userProfile.language}</span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-slate-400">Department</span>
                  <span className="font-medium text-right text-slate-800 dark:text-slate-200">{userProfile.department}</span>
                </div>
              </div>
            </div>

            {/* Audit Trail / Recent Activity */}
            <div className="rounded-2xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                <Activity className="w-4 h-4 text-brand-500" />
                <h3 className="font-bold text-slate-900 dark:text-white text-xs">
                  Recent User Activity
                </h3>
              </div>

              {userActivities.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No recent activity recorded.</p>
              ) : (
                <div className="space-y-2">
                  {userActivities.map((act) => (
                    <div
                      key={act.id}
                      className="p-2.5 rounded-lg bg-slate-50/50 dark:bg-slate-900/40 text-xs text-slate-600 dark:text-slate-300 flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <span className="font-medium">{act.action}</span>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          "{act.targetName}"
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        {act.timestamp}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Confirmation Modal */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800 p-5 shadow-2xl animate-slide-down">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400 mb-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Discard Unsaved Changes?
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
              You have modified your profile information. Navigating away or cancelling now will discard those edits.
            </p>
            <div className="flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setShowUnsavedWarning(false)}
                className="px-3.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
              >
                Continue Editing
              </button>
              <button
                type="button"
                onClick={confirmDiscard}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-xs"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
