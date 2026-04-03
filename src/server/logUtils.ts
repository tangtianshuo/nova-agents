/**
 * Shared utilities for logging system
 */

import { existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export const NOVA_AGENTS_DIR = join(homedir(), '.nova-agents');
export const LOGS_DIR = join(NOVA_AGENTS_DIR, 'logs');
export const LOG_RETENTION_DAYS = 30;

/**
 * Ensure logs directory exists
 */
export function ensureLogsDir(): void {
  if (!existsSync(NOVA_AGENTS_DIR)) {
    mkdirSync(NOVA_AGENTS_DIR, { recursive: true });
  }
  if (!existsSync(LOGS_DIR)) {
    mkdirSync(LOGS_DIR, { recursive: true });
  }
}
