import { describe, it, expect, beforeEach } from 'vitest';
import {
  getStoredItem,
  setStoredItem,
  clearNexusStorage,
  STORAGE_KEYS,
} from '../../src/utils/storage';
import { createTestWorkspace } from '../testUtils';

describe('Persistence Roundtrip & Scoped Storage Invariants', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('performs lossless JSON roundtrip serialization of full workspace collections', () => {
    const ws = createTestWorkspace();

    setStoredItem(STORAGE_KEYS.TASKS, ws.tasks);
    setStoredItem(STORAGE_KEYS.PROJECTS, ws.projects);
    setStoredItem(STORAGE_KEYS.MEMBERS, ws.members);

    const loadedTasks = getStoredItem(STORAGE_KEYS.TASKS, []);
    const loadedProjects = getStoredItem(STORAGE_KEYS.PROJECTS, []);
    const loadedMembers = getStoredItem(STORAGE_KEYS.MEMBERS, []);

    expect(loadedTasks).toEqual(ws.tasks);
    expect(loadedProjects).toEqual(ws.projects);
    expect(loadedMembers).toEqual(ws.members);
  });

  it('safely handles corrupted or malformed JSON by falling back without throwing', () => {
    localStorage.setItem(STORAGE_KEYS.TASKS, '{ bad json: [unterminated');

    const fallback = [{ id: 'fallback-task' }];
    const recovered = getStoredItem(STORAGE_KEYS.TASKS, fallback);

    expect(recovered).toEqual(fallback);
  });

  it('selectively purges only NEXUS keys during reset, preserving third-party domain keys', () => {
    // Inject third-party / host application keys
    localStorage.setItem('auth_session_token', 'secret-token-xyz');
    localStorage.setItem('analytics_uuid', 'visitor-1234');
    localStorage.setItem('other_app_theme', 'light');

    // Inject NEXUS keys
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify([{ id: 'task-1' }]));
    localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify('dark'));
    localStorage.setItem(STORAGE_KEYS.DENSITY, JSON.stringify('compact'));

    // Execute scoped clear
    clearNexusStorage();

    // NEXUS keys must be wiped
    expect(localStorage.getItem(STORAGE_KEYS.TASKS)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.THEME)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.DENSITY)).toBeNull();

    // Third-party keys must remain completely intact
    expect(localStorage.getItem('auth_session_token')).toBe('secret-token-xyz');
    expect(localStorage.getItem('analytics_uuid')).toBe('visitor-1234');
    expect(localStorage.getItem('other_app_theme')).toBe('light');
  });
});
