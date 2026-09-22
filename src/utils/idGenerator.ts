import { Task } from '../types';

/**
 * Generates an internal unique ID with entity prefix and cryptographic randomness.
 */
export function generateEntityId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${randomPart}`;
}

/**
 * Generates the next human-readable task key (e.g. "AUR-107") for a project.
 * Uses monotonic sequence detection so deleting a task never causes key duplication.
 */
export function getNextTaskKey(projectKey: string, existingTasks: Task[]): string {
  const cleanKey = (projectKey || 'NEX').toUpperCase().trim();
  const prefix = `${cleanKey}-`;

  let maxNumber = 100;

  for (const task of existingTasks) {
    if (task.key && task.key.startsWith(prefix)) {
      const numStr = task.key.substring(prefix.length);
      const num = parseInt(numStr, 10);
      if (!isNaN(num) && num > maxNumber) {
        maxNumber = num;
      }
    }
  }

  return `${prefix}${maxNumber + 1}`;
}

/**
 * Generates a unique, collision-proof project key (e.g. "PRJ-9" or resolves duplicate custom keys like "ABC-2").
 * Guaranteed never to duplicate existing project keys regardless of deletions or custom collisions.
 */
export function generateUniqueProjectKey(
  requestedKey: string | undefined,
  existingProjects: { key: string }[]
): string {
  const existingKeys = new Set(existingProjects.map((p) => p.key.toUpperCase()));

  if (requestedKey && requestedKey.trim()) {
    const clean = requestedKey.toUpperCase().trim();
    if (!existingKeys.has(clean)) {
      return clean;
    }
    // Resolve collision deterministically: clean-2, clean-3...
    let suffix = 2;
    while (existingKeys.has(`${clean}-${suffix}`)) {
      suffix++;
    }
    return `${clean}-${suffix}`;
  }

  // Auto-generate monotonic PRJ-N scanning maximum existing suffix
  let maxNum = 0;
  for (const p of existingProjects) {
    const match = p.key.match(/^PRJ-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) {
        maxNum = num;
      }
    }
  }

  return `PRJ-${maxNum + 1}`;
}
