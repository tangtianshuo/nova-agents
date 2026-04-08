import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { TauriAuthClient } from './tauri-client';
import type { TokenStorage } from './types';

// Mock @tauri-apps/api/core
const mockInvoke = mock(async () => {
  return { status: 200, body: '{}', headers: {}, is_base64: false };
});

mock.module('@tauri-apps/api/core', () => ({
  invoke: mockInvoke,
}));

// In-memory token storage for tests
class MockTokenStorage implements TokenStorage {
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

describe('TauriAuthClient', () => {
  const baseUrl = 'http://localhost:3000';
  let client: TauriAuthClient;
  let storage: MockTokenStorage;

  beforeEach(() => {
    storage = new MockTokenStorage();
    client = new TauriAuthClient(baseUrl, storage);
    mockInvoke.mockClear();
  });

  describe('constructor', () => {
    it('removes trailing slash from authServerUrl', () => {
      const client2 = new TauriAuthClient('http://localhost:3000/');
      // Verify the URL is normalized by checking it doesn't double-slash
      mockInvoke.mockImplementation(async () => {
        return { status: 200, body: '{}', headers: {}, is_base64: false };
      });
      // Access private property via any to verify
      expect((client2 as any).authServerUrl).toBe('http://localhost:3000');
    });
  });

  describe('sendSmsCode', () => {
    it('calls proxy_http_request with correct params for login', async () => {
      mockInvoke.mockImplementation(async () => {
        return { status: 200, body: '{"success":true,"message":"sent"}', headers: {}, is_base64: false };
      });

      const result = await client.sendSmsCode('13800138000', 'login');

      expect(mockInvoke).toHaveBeenCalledWith('proxy_http_request', {
        request: expect.objectContaining({
          url: 'http://localhost:3000/auth/sms/send',
          method: 'POST',
          body: '{"phone":"13800138000","type":"login"}',
        })
      });
      expect(result.success).toBe(true);
    });

    it('calls proxy_http_request with correct params for register', async () => {
      mockInvoke.mockImplementation(async () => {
        return { status: 200, body: '{"success":true,"message":"sent"}', headers: {}, is_base64: false };
      });

      const result = await client.sendSmsCode('13800138000', 'register');

      expect(mockInvoke).toHaveBeenCalledWith('proxy_http_request', {
        request: expect.objectContaining({
          url: 'http://localhost:3000/auth/sms/send',
          method: 'POST',
          body: '{"phone":"13800138000","type":"register"}',
        })
      });
      expect(result.success).toBe(true);
    });

    it('throws AuthError on non-ok response', async () => {
      mockInvoke.mockImplementation(async () => {
        return { status: 400, body: '{"error":"invalid phone"}', headers: {}, is_base64: false };
      });

      await expect(client.sendSmsCode('invalid', 'login')).rejects.toThrow();
    });
  });

  describe('smsLogin', () => {
    it('calls proxy_http_request with correct params', async () => {
      mockInvoke.mockImplementation(async () => {
        return {
          status: 200,
          body: '{"accessToken":"token","refreshToken":"refresh","expiresIn":"1h"}',
          headers: {},
          is_base64: false
        };
      });

      const result = await client.smsLogin('13800138000', '123456');

      expect(mockInvoke).toHaveBeenCalledWith('proxy_http_request', {
        request: expect.objectContaining({
          url: 'http://localhost:3000/auth/sms/login',
          method: 'POST',
          body: '{"phone":"13800138000","code":"123456"}',
        })
      });
      expect(result.accessToken).toBe('token');
    });

    it('stores tokens after successful login', async () => {
      mockInvoke.mockImplementation(async () => {
        return {
          status: 200,
          body: '{"accessToken":"new-token","refreshToken":"new-refresh","expiresIn":"1h"}',
          headers: {},
          is_base64: false
        };
      });

      await client.smsLogin('13800138000', '123456');

      const storedToken = await client.getToken();
      const storedRefresh = await client.getRefreshToken();
      expect(storedToken).toBe('new-token');
      expect(storedRefresh).toBe('new-refresh');
    });
  });

  describe('smsRegister', () => {
    it('calls proxy_http_request with correct params', async () => {
      mockInvoke.mockImplementation(async () => {
        return {
          status: 200,
          body: '{"user":{"id":"1","username":"tester","phone":"13800138000"},"accessToken":"token","refreshToken":"refresh","expiresIn":"1h","message":"registered"}',
          headers: {},
          is_base64: false
        };
      });

      const result = await client.smsRegister('13800138000', '123456', 'tester');

      expect(mockInvoke).toHaveBeenCalledWith('proxy_http_request', {
        request: expect.objectContaining({
          url: 'http://localhost:3000/auth/sms/register',
          method: 'POST',
          body: '{"phone":"13800138000","code":"123456","username":"tester"}',
        })
      });
      expect(result.user.username).toBe('tester');
    });

    it('stores tokens after successful registration', async () => {
      mockInvoke.mockImplementation(async () => {
        return {
          status: 200,
          body: '{"user":{"id":"1","username":"tester"},"accessToken":"reg-token","refreshToken":"reg-refresh","expiresIn":"1h","message":"registered"}',
          headers: {},
          is_base64: false
        };
      });

      await client.smsRegister('13800138000', '123456', 'tester');

      const storedToken = await client.getToken();
      expect(storedToken).toBe('reg-token');
    });
  });

  describe('getSmsStats', () => {
    it('calls proxy_http_request with GET method', async () => {
      mockInvoke.mockImplementation(async () => {
        return {
          status: 200,
          body: '{"phone":"13800138000","todaySendCount":1,"date":"2026-04-08"}',
          headers: {},
          is_base64: false
        };
      });

      const result = await client.getSmsStats('13800138000');

      expect(mockInvoke).toHaveBeenCalledWith('proxy_http_request', {
        request: expect.objectContaining({
          url: 'http://localhost:3000/auth/sms/stats?phone=13800138000',
          method: 'GET',
        })
      });
      expect(result.todaySendCount).toBe(1);
    });

    it('encodes phone number in query params', async () => {
      mockInvoke.mockImplementation(async () => {
        return {
          status: 200,
          body: '{"phone":"+86-138-0013-8000","todaySendCount":1,"date":"2026-04-08"}',
          headers: {},
          is_base64: false
        };
      });

      await client.getSmsStats('+86-138-0013-8000');

      expect(mockInvoke).toHaveBeenCalledWith('proxy_http_request', {
        request: expect.objectContaining({
          url: 'http://localhost:3000/auth/sms/stats?phone=%2B86-138-0013-8000',
        })
      });
    });
  });

  describe('validateToken', () => {
    it('calls proxy_http_request with Authorization header', async () => {
      // First set a token via smsLogin
      mockInvoke.mockImplementation(async () => {
        return {
          status: 200,
          body: '{"accessToken":"test-token","refreshToken":"test-refresh","expiresIn":"1h"}',
          headers: {},
          is_base64: false
        };
      });
      await client.smsLogin('13800138000', '123456');

      mockInvoke.mockImplementation(async () => {
        return {
          status: 200,
          body: '{"valid":true,"user":{"userId":"1","username":"tester"}}',
          headers: {},
          is_base64: false
        };
      });

      const result = await client.validateToken();

      expect(mockInvoke).toHaveBeenCalledWith('proxy_http_request', {
        request: expect.objectContaining({
          url: 'http://localhost:3000/auth/validate',
          method: 'POST',
        })
      });
      // The Authorization header should be set
      const lastCall = mockInvoke.mock.calls[mockInvoke.mock.calls.length - 1] as any;
      expect(lastCall[1].request.headers?.Authorization).toBe('Bearer test-token');
    });
  });

  describe('logout', () => {
    it('clears tokens and returns success message', async () => {
      // First login to have tokens
      mockInvoke.mockImplementation(async () => {
        return {
          status: 200,
          body: '{"accessToken":"test-token","refreshToken":"test-refresh","expiresIn":"1h"}',
          headers: {},
          is_base64: false
        };
      });
      await client.smsLogin('13800138000', '123456');

      mockInvoke.mockImplementation(async () => {
        return {
          status: 200,
          body: '{"message":"Logged out successfully"}',
          headers: {},
          is_base64: false
        };
      });

      const result = await client.logout();

      expect(result.message).toBe('Logged out successfully');
      const storedToken = await client.getToken();
      expect(storedToken).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('returns false when no token', async () => {
      const result = await client.isAuthenticated();
      expect(result).toBe(false);
    });

    it('returns true when token exists', async () => {
      mockInvoke.mockImplementation(async () => {
        return {
          status: 200,
          body: '{"accessToken":"has-token","refreshToken":"has-refresh","expiresIn":"1h"}',
          headers: {},
          is_base64: false
        };
      });
      await client.smsLogin('13800138000', '123456');

      const result = await client.isAuthenticated();
      expect(result).toBe(true);
    });
  });
});
