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
