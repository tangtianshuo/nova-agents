import { describe, it, expect, beforeEach } from 'bun:test';
import type { AuthData } from '../config/types';

// Define atomicModifyConfig inline to avoid importing the real module
// which has Vite build-time dependencies (__DEBUG_MODE__)
const mockStorage = new Map<string, string>();

async function atomicModifyConfig(modifier: (config: { auth?: AuthData }) => { auth?: AuthData }): Promise<{ auth?: AuthData }> {
  const currentConfig = { auth: mockStorage.get('auth') ? JSON.parse(mockStorage.get('auth')!) : undefined };
  const result = modifier(currentConfig);
  if (result.auth) {
    mockStorage.set('auth', JSON.stringify(result.auth));
  } else {
    mockStorage.delete('auth');
  }
  return result;
}

// Token storage keys (must match SDK)
const TOKEN_KEY = 'nova_access_token';
const REFRESH_TOKEN_KEY = 'nova_refresh_token';

/**
 * Disk-based token storage backed by AppConfig.auth
 * Implements SDK TokenStorage interface for use with TauriAuthClient
 * This is a copy of the implementation for testing without module dependencies
 */
class DiskTokenStorageImpl {
  async getItem(key: string): Promise<string | null> {
    const config = await atomicModifyConfig(c => c);
    const auth = config.auth;
    if (!auth) return null;

    if (key === TOKEN_KEY) return auth.accessToken ?? null;
    if (key === REFRESH_TOKEN_KEY) return auth.refreshToken ?? null;
    return null;
  }

  async setItem(key: string, value: string): Promise<void> {
    await atomicModifyConfig(config => {
      const auth: AuthData = config.auth ?? { accessToken: '', refreshToken: '' };
      if (key === TOKEN_KEY) auth.accessToken = value;
      if (key === REFRESH_TOKEN_KEY) auth.refreshToken = value;
      return { ...config, auth };
    });
  }

  async removeItem(key: string): Promise<void> {
    await atomicModifyConfig(config => {
      if (!config.auth) return config;
      const auth = { ...config.auth };
      if (key === TOKEN_KEY) auth.accessToken = '';
      if (key === REFRESH_TOKEN_KEY) auth.refreshToken = '';
      // Clear user info when tokens are removed
      if (!auth.accessToken && !auth.refreshToken) {
        return { ...config, auth: undefined };
      }
      return { ...config, auth };
    });
  }
}

describe('DiskTokenStorage', () => {
  let storage: DiskTokenStorageImpl;

  beforeEach(() => {
    mockStorage.clear();
    storage = new DiskTokenStorageImpl();
  });

  describe('getItem', () => {
    it('returns accessToken when key is nova_access_token', async () => {
      mockStorage.set('auth', JSON.stringify({ accessToken: 'test-access-token', refreshToken: 'test-refresh-token' }));

      const result = await storage.getItem('nova_access_token');

      expect(result).toBe('test-access-token');
    });

    it('returns refreshToken when key is nova_refresh_token', async () => {
      mockStorage.set('auth', JSON.stringify({ accessToken: 'test-access-token', refreshToken: 'test-refresh-token' }));

      const result = await storage.getItem('nova_refresh_token');

      expect(result).toBe('test-refresh-token');
    });

    it('returns null when auth is undefined', async () => {
      const result = await storage.getItem('nova_access_token');

      expect(result).toBeNull();
    });

    it('returns null for unknown keys', async () => {
      mockStorage.set('auth', JSON.stringify({ accessToken: 'token', refreshToken: 'refresh' }));

      const result = await storage.getItem('unknown_key');

      expect(result).toBeNull();
    });

    it('returns empty string when accessToken is empty string', async () => {
      mockStorage.set('auth', JSON.stringify({ accessToken: '', refreshToken: 'refresh' }));

      const result = await storage.getItem('nova_access_token');

      expect(result).toBe('');
    });
  });

  describe('setItem', () => {
    it('sets accessToken in auth', async () => {
      await storage.setItem('nova_access_token', 'new-token');

      const stored = mockStorage.get('auth');
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!).accessToken).toBe('new-token');
    });

    it('sets refreshToken in auth', async () => {
      await storage.setItem('nova_refresh_token', 'new-refresh');

      const stored = mockStorage.get('auth');
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!).refreshToken).toBe('new-refresh');
    });

    it('creates auth object if undefined', async () => {
      await storage.setItem('nova_access_token', 'token');

      const stored = mockStorage.get('auth');
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!).accessToken).toBe('token');
    });

    it('preserves existing refreshToken when setting accessToken', async () => {
      mockStorage.set('auth', JSON.stringify({ accessToken: 'old-token', refreshToken: 'existing-refresh' }));

      await storage.setItem('nova_access_token', 'new-token');

      const stored = mockStorage.get('auth');
      const parsed = JSON.parse(stored!);
      expect(parsed.accessToken).toBe('new-token');
      expect(parsed.refreshToken).toBe('existing-refresh');
    });
  });

  describe('removeItem', () => {
    it('clears accessToken when removing nova_access_token', async () => {
      mockStorage.set('auth', JSON.stringify({ accessToken: 'token', refreshToken: 'refresh' }));

      await storage.removeItem('nova_access_token');

      const stored = mockStorage.get('auth');
      expect(JSON.parse(stored!).accessToken).toBe('');
    });

    it('clears refreshToken when removing nova_refresh_token', async () => {
      mockStorage.set('auth', JSON.stringify({ accessToken: 'token', refreshToken: 'refresh' }));

      await storage.removeItem('nova_refresh_token');

      const stored = mockStorage.get('auth');
      expect(JSON.parse(stored!).refreshToken).toBe('');
    });

    it('removes auth entirely when both tokens cleared', async () => {
      mockStorage.set('auth', JSON.stringify({ accessToken: '', refreshToken: '' }));

      await storage.removeItem('nova_access_token');

      expect(mockStorage.has('auth')).toBe(false);
    });

    it('keeps auth when only accessToken is cleared but refreshToken remains', async () => {
      mockStorage.set('auth', JSON.stringify({ accessToken: '', refreshToken: 'refresh' }));

      await storage.removeItem('nova_access_token');

      expect(mockStorage.has('auth')).toBe(true);
      expect(JSON.parse(mockStorage.get('auth')!).refreshToken).toBe('refresh');
    });

    it('does nothing when auth is already undefined', async () => {
      await storage.removeItem('nova_access_token');

      expect(mockStorage.has('auth')).toBe(false);
    });
  });
});
