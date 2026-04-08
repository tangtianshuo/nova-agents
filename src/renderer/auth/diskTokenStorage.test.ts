import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { DiskTokenStorage } from './diskTokenStorage';

// Mock atomicModifyConfig
const mockAtomicModifyConfig = mock((modifier: (config: any) => any) => {
  return modifier({});
});

// Mock the module
mock.module('../config/services/appConfigService', () => ({
  atomicModifyConfig: mockAtomicModifyConfig,
}));

describe('DiskTokenStorage', () => {
  let storage: DiskTokenStorage;

  beforeEach(() => {
    storage = new DiskTokenStorage();
    mockAtomicModifyConfig.mockClear();
  });

  describe('getItem', () => {
    it('returns accessToken when key is nova_access_token', async () => {
      mockAtomicModifyConfig.mockImplementationOnce((modifier: (config: any) => any) => {
        return modifier({
          auth: { accessToken: 'test-access-token', refreshToken: 'test-refresh-token' }
        });
      });

      const result = await storage.getItem('nova_access_token');

      expect(result).toBe('test-access-token');
    });

    it('returns refreshToken when key is nova_refresh_token', async () => {
      mockAtomicModifyConfig.mockImplementationOnce((modifier: (config: any) => any) => {
        return modifier({
          auth: { accessToken: 'test-access-token', refreshToken: 'test-refresh-token' }
        });
      });

      const result = await storage.getItem('nova_refresh_token');

      expect(result).toBe('test-refresh-token');
    });

    it('returns null when auth is undefined', async () => {
      mockAtomicModifyConfig.mockImplementationOnce((modifier: (config: any) => any) => {
        return modifier({});
      });

      const result = await storage.getItem('nova_access_token');

      expect(result).toBeNull();
    });

    it('returns null for unknown keys', async () => {
      mockAtomicModifyConfig.mockImplementationOnce((modifier: (config: any) => any) => {
        return modifier({
          auth: { accessToken: 'token', refreshToken: 'refresh' }
        });
      });

      const result = await storage.getItem('unknown_key');

      expect(result).toBeNull();
    });

    it('returns null when accessToken is empty string', async () => {
      mockAtomicModifyConfig.mockImplementationOnce((modifier: (config: any) => any) => {
        return modifier({
          auth: { accessToken: '', refreshToken: 'refresh' }
        });
      });

      const result = await storage.getItem('nova_access_token');

      expect(result).toBeNull();
    });
  });

  describe('setItem', () => {
    it('sets accessToken in auth', async () => {
      mockAtomicModifyConfig.mockImplementationOnce((modifier: (config: any) => any) => {
        return modifier({});
      });

      await storage.setItem('nova_access_token', 'new-token');

      expect(mockAtomicModifyConfig).toHaveBeenCalled();
      const modifyFn = mockAtomicModifyConfig.mock.calls[0][0];
      const result = modifyFn({});
      expect(result.auth.accessToken).toBe('new-token');
    });

    it('sets refreshToken in auth', async () => {
      mockAtomicModifyConfig.mockImplementationOnce((modifier: (config: any) => any) => {
        return modifier({});
      });

      await storage.setItem('nova_refresh_token', 'new-refresh');

      expect(mockAtomicModifyConfig).toHaveBeenCalled();
      const modifyFn = mockAtomicModifyConfig.mock.calls[0][0];
      const result = modifyFn({});
      expect(result.auth.refreshToken).toBe('new-refresh');
    });

    it('creates auth object if undefined', async () => {
      mockAtomicModifyConfig.mockImplementationOnce((modifier: (config: any) => any) => {
        return modifier({});
      });

      await storage.setItem('nova_access_token', 'token');

      const modifyFn = mockAtomicModifyConfig.mock.calls[0][0];
      const result = modifyFn({});
      expect(result.auth).toBeDefined();
      expect(result.auth.accessToken).toBe('token');
    });

    it('preserves existing refreshToken when setting accessToken', async () => {
      mockAtomicModifyConfig.mockImplementationOnce((modifier: (config: any) => any) => {
        return modifier({
          auth: { accessToken: 'old-token', refreshToken: 'existing-refresh' }
        });
      });

      await storage.setItem('nova_access_token', 'new-token');

      const modifyFn = mockAtomicModifyConfig.mock.calls[0][0];
      const result = modifyFn({
        auth: { accessToken: 'old-token', refreshToken: 'existing-refresh' }
      });
      expect(result.auth.accessToken).toBe('new-token');
      expect(result.auth.refreshToken).toBe('existing-refresh');
    });
  });

  describe('removeItem', () => {
    it('clears accessToken when removing nova_access_token', async () => {
      mockAtomicModifyConfig.mockImplementationOnce((modifier: (config: any) => any) => {
        return modifier({ auth: { accessToken: 'token', refreshToken: 'refresh' } });
      });

      await storage.removeItem('nova_access_token');

      const modifyFn = mockAtomicModifyConfig.mock.calls[0][0];
      const result = modifyFn({ auth: { accessToken: 'token', refreshToken: 'refresh' } });
      expect(result.auth.accessToken).toBe('');
    });

    it('clears refreshToken when removing nova_refresh_token', async () => {
      mockAtomicModifyConfig.mockImplementationOnce((modifier: (config: any) => any) => {
        return modifier({ auth: { accessToken: 'token', refreshToken: 'refresh' } });
      });

      await storage.removeItem('nova_refresh_token');

      const modifyFn = mockAtomicModifyConfig.mock.calls[0][0];
      const result = modifyFn({ auth: { accessToken: 'token', refreshToken: 'refresh' } });
      expect(result.auth.refreshToken).toBe('');
    });

    it('removes auth entirely when both tokens cleared', async () => {
      mockAtomicModifyConfig.mockImplementationOnce((modifier: (config: any) => any) => {
        return modifier({ auth: { accessToken: '', refreshToken: '' } });
      });

      await storage.removeItem('nova_access_token');

      const modifyFn = mockAtomicModifyConfig.mock.calls[0][0];
      const result = modifyFn({ auth: { accessToken: '', refreshToken: '' } });
      expect(result.auth).toBeUndefined();
    });

    it('keeps auth when only accessToken is cleared but refreshToken remains', async () => {
      mockAtomicModifyConfig.mockImplementationOnce((modifier: (config: any) => any) => {
        return modifier({ auth: { accessToken: '', refreshToken: 'refresh' } });
      });

      await storage.removeItem('nova_access_token');

      const modifyFn = mockAtomicModifyConfig.mock.calls[0][0];
      const result = modifyFn({ auth: { accessToken: '', refreshToken: 'refresh' } });
      expect(result.auth).toBeDefined();
      expect(result.auth.refreshToken).toBe('refresh');
    });

    it('does nothing when auth is already undefined', async () => {
      mockAtomicModifyConfig.mockImplementationOnce((modifier: (config: any) => any) => {
        return modifier({});
      });

      await storage.removeItem('nova_access_token');

      const modifyFn = mockAtomicModifyConfig.mock.calls[0][0];
      const result = modifyFn({});
      expect(result.auth).toBeUndefined();
    });
  });
});
