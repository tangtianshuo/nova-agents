import { invoke } from '@tauri-apps/api/core';
import type {
  SmsSendRequest,
  SmsSendResponse,
  SmsLoginRequest,
  SmsLoginResponse,
  SmsRegisterRequest,
  SmsRegisterResponse,
  SmsStatsResponse,
  RefreshTokenResponse,
  ValidateTokenResponse,
  LogoutResponse,
  TokenStorage,
} from './types';
import { AuthError } from './errors';
import { TokenManager } from './utils';

/**
 * HTTP request/response types matching Rust sse_proxy.rs
 */
interface HttpRequest {
  url: string;
  method: string;
  body?: string;
  headers?: Record<string, string>;
}

interface HttpResponse {
  status: number;
  body: string;
  headers: Record<string, string>;
  is_base64: boolean;
}

/**
 * TauriAuthClient wraps SDK HTTP calls through Rust invoke('proxy_http_request')
 * Bypasses WebView CORS and system proxy for localhost auth server
 */
export class TauriAuthClient {
  private authServerUrl: string;
  private tokenManager: TokenManager;

  constructor(authServerUrl: string, tokenStorage?: TokenStorage) {
    this.authServerUrl = authServerUrl.replace(/\/$/, ''); // Remove trailing slash
    // If no storage provided, use memory storage (app layer should inject DiskTokenStorage)
    this.tokenManager = new TokenManager(tokenStorage ?? {
      getItem: async () => null,
      setItem: async () => {},
      removeItem: async () => {},
    });
  }

  /**
   * Invoke Rust proxy_http_request command
   */
  private async proxyRequest(
    endpoint: string,
    method: string,
    body?: object,
    headers?: Record<string, string>
  ): Promise<Response> {
    const url = `${this.authServerUrl}${endpoint}`;
    const httpRequest: HttpRequest = {
      url,
      method,
      body: body ? JSON.stringify(body) : undefined,
      headers: headers ?? { 'Content-Type': 'application/json' },
    };

    try {
      const response = await invoke<HttpResponse>('proxy_http_request', { request: httpRequest });

      if (response.is_base64) {
        throw new Error('Unexpected binary response from auth server');
      }

      return new HttpResponseWrapper(response.status, response.body, response.headers);
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw AuthError.fromNetworkError(error);
    }
  }

  async sendSmsCode(phone: string, type: 'login' | 'register'): Promise<SmsSendResponse> {
    const response = await this.proxyRequest('/auth/sms/send', 'POST', { phone, type } satisfies SmsSendRequest);
    if (!response.ok) throw await AuthError.fromResponse(response);
    return response.json() as Promise<SmsSendResponse>;
  }

  async smsLogin(phone: string, code: string): Promise<SmsLoginResponse> {
    const response = await this.proxyRequest('/auth/sms/login', 'POST', { phone, code } satisfies SmsLoginRequest);
    if (!response.ok) throw await AuthError.fromResponse(response);
    const data = await response.json() as SmsLoginResponse;
    await this.tokenManager.setToken(data.accessToken);
    await this.tokenManager.setRefreshToken(data.refreshToken);
    return data;
  }

  async smsRegister(phone: string, code: string, username: string): Promise<SmsRegisterResponse> {
    const response = await this.proxyRequest('/auth/sms/register', 'POST', { phone, code, username } satisfies SmsRegisterRequest);
    if (!response.ok) throw await AuthError.fromResponse(response);
    const data = await response.json() as SmsRegisterResponse;
    await this.tokenManager.setToken(data.accessToken);
    await this.tokenManager.setRefreshToken(data.refreshToken);
    return data;
  }

  async getSmsStats(phone: string): Promise<SmsStatsResponse> {
    const response = await this.proxyRequest(`/auth/sms/stats?phone=${encodeURIComponent(phone)}`, 'GET');
    if (!response.ok) throw await AuthError.fromResponse(response);
    return response.json() as Promise<SmsStatsResponse>;
  }

  async validateToken(): Promise<ValidateTokenResponse> {
    const token = await this.tokenManager.getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    const response = await this.proxyRequest('/auth/validate', 'POST', undefined, headers);
    if (!response.ok) throw await AuthError.fromResponse(response);
    return response.json() as Promise<ValidateTokenResponse>;
  }

  async refreshToken(): Promise<RefreshTokenResponse> {
    const refreshToken = await this.tokenManager.getRefreshToken();
    if (!refreshToken) throw new AuthError('No refresh token available', 0, 'Not authenticated');

    const response = await this.proxyRequest('/auth/refresh', 'POST', { refreshToken });
    if (!response.ok) {
      await this.tokenManager.clearAll();
      throw await AuthError.fromResponse(response);
    }

    const data = await response.json() as RefreshTokenResponse;
    await this.tokenManager.setToken(data.accessToken);
    await this.tokenManager.setRefreshToken(data.refreshToken);
    return data;
  }

  async logout(): Promise<LogoutResponse> {
    const token = await this.tokenManager.getToken();
    const refreshToken = await this.tokenManager.getRefreshToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

    let response: Response;
    if (token) {
      response = await this.proxyRequest('/auth/logout', 'POST', { refreshToken }, headers);
      if (!response.ok) throw await AuthError.fromResponse(response);
    }

    await this.tokenManager.clearAll();
    return { message: 'Logged out successfully' };
  }

  async getToken(): Promise<string | null> {
    return this.tokenManager.getToken();
  }

  async getRefreshToken(): Promise<string | null> {
    return this.tokenManager.getRefreshToken();
  }

  async setToken(accessToken: string): Promise<void> {
    await this.tokenManager.setToken(accessToken);
  }

  async setRefreshToken(refreshToken: string): Promise<void> {
    await this.tokenManager.setRefreshToken(refreshToken);
  }

  async clearToken(): Promise<void> {
    await this.tokenManager.clearAll();
  }

  async isAuthenticated(): Promise<boolean> {
    return this.tokenManager.hasToken();
  }
}

/**
 * Minimal Response wrapper to match web Response interface
 */
class HttpResponseWrapper {
  status: number;
  body: string;
  headers: Record<string, string>;
  ok: boolean;

  constructor(status: number, body: string, headers: Record<string, string>) {
    this.status = status;
    this.body = body;
    this.headers = headers;
    this.ok = status >= 200 && status < 300;
  }

  async json(): Promise<unknown> {
    return JSON.parse(this.body);
  }
}
