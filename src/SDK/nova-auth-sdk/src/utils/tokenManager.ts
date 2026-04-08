import type { TokenStorage } from '../types';

const TOKEN_KEY = 'nova_access_token';
const REFRESH_TOKEN_KEY = 'nova_refresh_token';

/**
 * Default localStorage implementation
 */
class LocalStorageAdapter implements TokenStorage {
  async getItem(key: string): Promise<string | null> {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      throw new Error('localStorage is not available in this environment');
    }
    return window.localStorage.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      throw new Error('localStorage is not available in this environment');
    }
    window.localStorage.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      throw new Error('localStorage is not available in this environment');
    }
    window.localStorage.removeItem(key);
  }
}

/**
 * Memory storage implementation
 */
class MemoryStorageAdapter implements TokenStorage {
  private store: Map<string, string> = new Map();

  async getItem(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }
}

/**
 * Token manager for handling token storage
 */
export class TokenManager {
  private storage: TokenStorage;

  constructor(storage: TokenStorage) {
    this.storage = storage;
  }

  /**
   * Get stored access token
   */
  async getToken(): Promise<string | null> {
    return this.storage.getItem(TOKEN_KEY);
  }

  /**
   * Set access token
   */
  async setToken(token: string): Promise<void> {
    await this.storage.setItem(TOKEN_KEY, token);
  }

  /**
   * Remove access token
   */
  async removeToken(): Promise<void> {
    await this.storage.removeItem(TOKEN_KEY);
  }

  /**
   * Get stored refresh token
   */
  async getRefreshToken(): Promise<string | null> {
    return this.storage.getItem(REFRESH_TOKEN_KEY);
  }

  /**
   * Set refresh token
   */
  async setRefreshToken(token: string): Promise<void> {
    await this.storage.setItem(REFRESH_TOKEN_KEY, token);
  }

  /**
   * Remove refresh token
   */
  async removeRefreshToken(): Promise<void> {
    await this.storage.removeItem(REFRESH_TOKEN_KEY);
  }

  /**
   * Clear all tokens
   */
  async clearAll(): Promise<void> {
    await this.removeToken();
    await this.removeRefreshToken();
  }

  /**
   * Check if access token exists
   */
  async hasToken(): Promise<boolean> {
    const token = await this.getToken();
    return token !== null;
  }
}

/**
 * Factory function to create token storage adapter
 */
export function createTokenStorage(
  type: 'localStorage' | 'memory' | 'custom',
  customStorage?: TokenStorage
): TokenStorage {
  switch (type) {
    case 'localStorage':
      return new LocalStorageAdapter();
    case 'memory':
      return new MemoryStorageAdapter();
    case 'custom':
      if (!customStorage) {
        throw new Error('customStorage must be provided when storage type is "custom"');
      }
      return customStorage;
    default:
      throw new Error(`Unknown storage type: ${type}`);
  }
}
