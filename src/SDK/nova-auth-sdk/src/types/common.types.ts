import type { UserInfo } from './auth.types';

/**
 * Configuration options for AuthClient
 */
export interface AuthClientConfig {
  /**
   * Base URL of the API server
   * @default 'http://localhost:3000'
   */
  baseURL?: string;

  /**
   * Storage mechanism for tokens
   * @default 'localStorage'
   */
  storage?: 'localStorage' | 'memory' | 'custom';

  /**
   * Custom storage implementation (required when storage='custom')
   */
  customStorage?: TokenStorage;

  /**
   * Request timeout in milliseconds
   * @default 10000
   */
  timeout?: number;

  /**
   * Headers to include in all requests
   */
  defaultHeaders?: Record<string, string>;
}

/**
 * Token storage interface
 */
export interface TokenStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/**
 * Authentication state
 */
export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: UserInfo | null;
}
