/**
 * Scoped LocalStorage Utility for NEXUS
 * Prevents wiping out other application keys on the same domain origin.
 */

const NEXUS_KEY_PREFIX = 'nexus_';

export const STORAGE_KEYS = {
  PROJECTS: `${NEXUS_KEY_PREFIX}projects_v2`,
  TASKS: `${NEXUS_KEY_PREFIX}tasks_v2`,
  MEMBERS: `${NEXUS_KEY_PREFIX}members_v2`,
  DOCUMENTS: `${NEXUS_KEY_PREFIX}documents_v2`,
  NOTIFICATIONS: `${NEXUS_KEY_PREFIX}notifications_v2`,
  AUTOMATIONS: `${NEXUS_KEY_PREFIX}automations_v2`,
  ACTIVITIES: `${NEXUS_KEY_PREFIX}activities_v2`,
  INVITATIONS: `${NEXUS_KEY_PREFIX}invitations_v2`,
  THEME: `${NEXUS_KEY_PREFIX}theme_mode`,
  DENSITY: `${NEXUS_KEY_PREFIX}density_mode`,
  SIDEBAR: `${NEXUS_KEY_PREFIX}sidebar_collapsed`,
  DISMISSED_INSIGHTS: `${NEXUS_KEY_PREFIX}dismissed_insights_v2`,
  USEFUL_INSIGHTS: `${NEXUS_KEY_PREFIX}useful_insights_v2`,
  USER_PROFILE: `${NEXUS_KEY_PREFIX}user_profile_v1`,
  WORKSPACE_SETTINGS: `${NEXUS_KEY_PREFIX}workspace_settings_v1`,
  PRODUCTIVITY_SETTINGS: `${NEXUS_KEY_PREFIX}productivity_settings_v1`,
  NOTIFICATION_PREFERENCES: `${NEXUS_KEY_PREFIX}notification_preferences_v1`,
  REDUCED_MOTION: `${NEXUS_KEY_PREFIX}reduced_motion_v1`,
};

export function getStoredItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function setStoredItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[NEXUS Storage] Failed to write key ${key}:`, err);
  }
}

export function removeStoredItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn(`[NEXUS Storage] Failed to remove key ${key}:`, err);
  }
}

/**
 * Safely clears ONLY keys belonging to NEXUS.
 * NEVER calls localStorage.clear() so other domain data remains completely intact.
 */
export function clearNexusStorage(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(NEXUS_KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (err) {
    console.warn('[NEXUS Storage] Failed during scoped reset:', err);
  }
}
