import type {
  AuthClientConfig,
  LoginCredentials,
  LoginResponse,
  RegisterCredentials,
  RegisterResponse,
  RefreshTokenResponse,
  ValidateTokenResponse,
  LogoutResponse,
  UserInfo,
  RefreshTokenRequest,
  OAuthUrlResponse,
  LinkedAccountsResponse,
  SmsSendRequest,
  SmsSendResponse,
  SmsLoginRequest,
  SmsLoginResponse,
  SmsRegisterRequest,
  SmsRegisterResponse,
  SmsStatsResponse,
} from '../types';
import { AuthError } from '../errors';
import { TokenManager, createTokenStorage } from '../utils';

/**
 * Main authentication client with refresh token support
 */
export class AuthClient {
  private baseURL: string;
  private tokenManager: TokenManager;
  private timeout: number;
  private defaultHeaders: Record<string, string>;
  private refreshInProgress: boolean = false;
  private refreshPromise: Promise<void> | null = null;

  /**
   * Create a new AuthClient instance
   */
  constructor(config: AuthClientConfig = {}) {
    this.baseURL = config.baseURL ?? 'http://localhost:3000';
    this.timeout = config.timeout ?? 10000;
    this.defaultHeaders = config.defaultHeaders ?? {};

    const storage = createTokenStorage(
      config.storage ?? 'localStorage',
      config.customStorage
    );
    this.tokenManager = new TokenManager(storage);
  }

  /**
   * Register a new user account
   */
  async register(credentials: RegisterCredentials): Promise<RegisterResponse> {
    try {
      const response = await this.fetchWithTimeout('/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.defaultHeaders,
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        throw await AuthError.fromResponse(response);
      }

      const data = await response.json() as RegisterResponse;

      // Store access token and refresh token (auto-login after registration)
      await this.tokenManager.setToken(data.accessToken);
      await this.tokenManager.setRefreshToken(data.refreshToken);

      return data;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw AuthError.fromNetworkError(error);
    }
  }

  /**
   * Login with username and password
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await this.fetchWithTimeout('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.defaultHeaders,
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        throw await AuthError.fromResponse(response);
      }

      const data = await response.json() as LoginResponse;

      // Store access token and refresh token
      await this.tokenManager.setToken(data.accessToken);
      await this.tokenManager.setRefreshToken(data.refreshToken);

      return data;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw AuthError.fromNetworkError(error);
    }
  }

  /**
   * Refresh access token using refresh token
   * Implements automatic retry to prevent concurrent refreshes
   */
  async refreshToken(): Promise<RefreshTokenResponse> {
    // If a refresh is already in progress, wait for it
    if (this.refreshInProgress && this.refreshPromise) {
      await this.refreshPromise;
      // After waiting, get the new tokens
      const accessToken = await this.tokenManager.getToken();
      const refreshToken = await this.tokenManager.getRefreshToken();
      if (!accessToken || !refreshToken) {
        throw new AuthError('Token refresh failed', 0, 'No tokens available');
      }
      return {
        accessToken,
        refreshToken,
        expiresIn: '1h',
      };
    }

    // Start a new refresh
    this.refreshInProgress = true;
    this.refreshPromise = this.performRefresh();

    try {
      await this.refreshPromise;
      // Get new tokens after successful refresh
      const accessToken = await this.tokenManager.getToken();
      const refreshToken = await this.tokenManager.getRefreshToken();
      if (!accessToken || !refreshToken) {
        throw new AuthError('Token refresh failed', 0, 'No tokens available');
      }
      return {
        accessToken,
        refreshToken,
        expiresIn: '1h',
      };
    } finally {
      this.refreshInProgress = false;
      this.refreshPromise = null;
    }
  }

  /**
   * Perform the actual token refresh
   */
  private async performRefresh(): Promise<void> {
    const refreshTokenValue = await this.tokenManager.getRefreshToken();

    if (!refreshTokenValue) {
      throw new AuthError('No refresh token available', 0, 'Not authenticated');
    }

    try {
      const response = await this.fetchWithTimeout('/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.defaultHeaders,
        },
        body: JSON.stringify({ refreshToken: refreshTokenValue } satisfies RefreshTokenRequest),
      });

      if (!response.ok) {
        // Clear tokens on refresh failure
        await this.tokenManager.clearAll();
        throw await AuthError.fromResponse(response);
      }

      const data = await response.json() as RefreshTokenResponse;

      // Store new tokens
      await this.tokenManager.setToken(data.accessToken);
      await this.tokenManager.setRefreshToken(data.refreshToken);
    } catch (error) {
      // Clear tokens on any error
      await this.tokenManager.clearAll();
      if (error instanceof AuthError) {
        throw error;
      }
      throw AuthError.fromNetworkError(error);
    }
  }

  /**
   * Validate current token and get user info
   * Will automatically refresh token if expired
   */
  async validateToken(): Promise<ValidateTokenResponse> {
    const token = await this.tokenManager.getToken();

    if (!token) {
      throw new AuthError('No token available', 0, 'Not authenticated');
    }

    try {
      const response = await this.fetchWithAutoRetry('/auth/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.defaultHeaders,
        },
      });

      if (!response.ok) {
        throw await AuthError.fromResponse(response);
      }

      return await response.json() as ValidateTokenResponse;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw AuthError.fromNetworkError(error);
    }
  }

  /**
   * Logout (clears tokens locally and on server)
   */
  async logout(): Promise<LogoutResponse> {
    const accessToken = await this.tokenManager.getToken();
    const refreshTokenValue = await this.tokenManager.getRefreshToken();

    try {
      if (accessToken) {
        const response = await this.fetchWithTimeout('/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            ...this.defaultHeaders,
          },
          body: JSON.stringify({ refreshToken: refreshTokenValue }),
        });

        if (!response.ok) {
          throw await AuthError.fromResponse(response);
        }

        const data = await response.json() as LogoutResponse;

        // Clear tokens locally regardless of response
        await this.tokenManager.clearAll();

        return data;
      }

      // If no token, just clear locally
      await this.tokenManager.clearAll();

      return { message: 'Logged out successfully' };
    } catch (error) {
      // Clear tokens even on error
      await this.tokenManager.clearAll();

      if (error instanceof AuthError) {
        throw error;
      }
      throw AuthError.fromNetworkError(error);
    }
  }

  /**
   * Get current access token
   */
  async getToken(): Promise<string | null> {
    return this.tokenManager.getToken();
  }

  /**
   * Get current refresh token
   */
  async getRefreshToken(): Promise<string | null> {
    return this.tokenManager.getRefreshToken();
  }

  /**
   * Set tokens manually
   */
  async setToken(accessToken: string): Promise<void> {
    await this.tokenManager.setToken(accessToken);
  }

  async setRefreshToken(refreshToken: string): Promise<void> {
    await this.tokenManager.setRefreshToken(refreshToken);
  }

  /**
   * Clear all tokens
   */
  async clearToken(): Promise<void> {
    await this.tokenManager.clearAll();
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    return this.tokenManager.hasToken();
  }

  // ==================== OAuth Methods ====================

  /**
   * Get OAuth authorization URL
   * Returns the URL to redirect the user to for OAuth authorization
   *
   * @param provider - OAuth provider name (e.g., 'github', 'wechat')
   * @param redirectUri - Optional custom redirect URI
   * @returns OAuth authorization URL and state parameter
   */
  async getOAuthUrl(
    provider: string,
    redirectUri?: string
  ): Promise<OAuthUrlResponse> {
    try {
      const params = new URLSearchParams();
      if (redirectUri) {
        params.append('redirect_uri', redirectUri);
      }

      const queryString = params.toString();
      const endpoint = `/auth/oauth/${provider}/login${queryString ? `?${queryString}` : ''}`;

      // Note: This endpoint redirects, so we need to handle it differently
      // For SPA/mobile apps, you might want the backend to return the URL instead of redirecting
      // This implementation assumes the backend returns the URL in the response body

      const response = await this.fetchWithTimeout(endpoint, {
        method: 'GET',
        redirect: 'manual', // Don't follow redirects automatically
      });

      if (response.status === 302 || response.status === 301) {
        const location = response.headers.get('Location');
        if (location) {
          // Extract state from URL
          const url = new URL(location);
          const state = url.searchParams.get('state') || '';
          return { url: location, state };
        }
      }

      // If backend returns JSON with URL
      if (response.ok) {
        const data = await response.json() as OAuthUrlResponse;
        return data;
      }

      throw await AuthError.fromResponse(response);
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw AuthError.fromNetworkError(error);
    }
  }

  /**
   * Link OAuth account to current user
   * Requires user to be authenticated
   *
   * @param provider - OAuth provider name (e.g., 'github', 'wechat')
   * @param code - Authorization code from OAuth callback
   * @param state - State parameter from OAuth callback
   */
  async linkOAuthAccount(
    provider: string,
    code: string,
    state: string
  ): Promise<{ message: string; provider: string }> {
    const token = await this.tokenManager.getToken();

    if (!token) {
      throw new AuthError('Must be authenticated to link an account', 0, 'Not authenticated');
    }

    try {
      const response = await this.fetchWithTimeout('/auth/oauth/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...this.defaultHeaders,
        },
        body: JSON.stringify({ provider, code, state }),
      });

      if (!response.ok) {
        throw await AuthError.fromResponse(response);
      }

      return await response.json() as { message: string; provider: string };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw AuthError.fromNetworkError(error);
    }
  }

  /**
   * Unlink OAuth account from current user
   * Requires user to be authenticated
   *
   * @param provider - OAuth provider name (e.g., 'github', 'wechat')
   */
  async unlinkOAuthAccount(
    provider: string
  ): Promise<{ message: string; provider: string }> {
    const token = await this.tokenManager.getToken();

    if (!token) {
      throw new AuthError('Must be authenticated to unlink an account', 0, 'Not authenticated');
    }

    try {
      const response = await this.fetchWithTimeout('/auth/oauth/unlink', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...this.defaultHeaders,
        },
        body: JSON.stringify({ provider }),
      });

      if (!response.ok) {
        throw await AuthError.fromResponse(response);
      }

      return await response.json() as { message: string; provider: string };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw AuthError.fromNetworkError(error);
    }
  }

  /**
   * Get linked OAuth accounts for current user
   * Requires user to be authenticated
   *
   * @returns List of linked OAuth accounts
   */
  async getLinkedAccounts(): Promise<LinkedAccountsResponse> {
    const token = await this.tokenManager.getToken();

    if (!token) {
      throw new AuthError('Must be authenticated to get linked accounts', 0, 'Not authenticated');
    }

    try {
      const response = await this.fetchWithAutoRetry('/auth/oauth/accounts', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...this.defaultHeaders,
        },
      });

      if (!response.ok) {
        throw await AuthError.fromResponse(response);
      }

      return await response.json() as LinkedAccountsResponse;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw AuthError.fromNetworkError(error);
    }
  }

  /**
   * Get current authentication state
   */
  async getAuthState(): Promise<{
    isAuthenticated: boolean;
    token: string | null;
    refreshToken: string | null;
    user: UserInfo | null;
  }> {
    const token = await this.tokenManager.getToken();
    const refreshTokenValue = await this.tokenManager.getRefreshToken();

    if (!token) {
      return {
        isAuthenticated: false,
        token: null,
        refreshToken: null,
        user: null,
      };
    }

    try {
      const response = await this.validateToken();
      return {
        isAuthenticated: true,
        token,
        refreshToken: refreshTokenValue,
        user: response.user,
      };
    } catch {
      return {
        isAuthenticated: false,
        token: null,
        refreshToken: null,
        user: null,
      };
    }
  }

  // ==================== SMS Methods ====================

  /**
   * Send SMS verification code
   * @param phone - Phone number
   * @param type - Type of SMS ('login' or 'register')
   * @returns SMS send response
   */
  async sendSmsCode(phone: string, type: 'login' | 'register'): Promise<SmsSendResponse> {
    try {
      const response = await this.fetchWithTimeout('/auth/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.defaultHeaders,
        },
        body: JSON.stringify({ phone, type } satisfies SmsSendRequest),
      });

      if (!response.ok) {
        throw await AuthError.fromResponse(response);
      }

      return await response.json() as SmsSendResponse;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw AuthError.fromNetworkError(error);
    }
  }

  /**
   * Login with SMS verification code
   * @param phone - Phone number
   * @param code - Verification code received via SMS
   * @returns Login response with access and refresh tokens
   */
  async smsLogin(phone: string, code: string): Promise<SmsLoginResponse> {
    try {
      const response = await this.fetchWithTimeout('/auth/sms/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.defaultHeaders,
        },
        body: JSON.stringify({ phone, code } satisfies SmsLoginRequest),
      });

      if (!response.ok) {
        throw await AuthError.fromResponse(response);
      }

      const data = await response.json() as SmsLoginResponse;

      // Store access token and refresh token
      await this.tokenManager.setToken(data.accessToken);
      await this.tokenManager.setRefreshToken(data.refreshToken);

      return data;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw AuthError.fromNetworkError(error);
    }
  }

  /**
   * Register with SMS verification code
   * @param phone - Phone number
   * @param code - Verification code received via SMS
   * @param username - Username for the new account
   * @returns Registration response with user info and tokens
   */
  async smsRegister(phone: string, code: string, username: string): Promise<SmsRegisterResponse> {
    try {
      const response = await this.fetchWithTimeout('/auth/sms/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.defaultHeaders,
        },
        body: JSON.stringify({ phone, code, username } satisfies SmsRegisterRequest),
      });

      if (!response.ok) {
        throw await AuthError.fromResponse(response);
      }

      const data = await response.json() as SmsRegisterResponse;

      // Store access token and refresh token (auto-login after registration)
      await this.tokenManager.setToken(data.accessToken);
      await this.tokenManager.setRefreshToken(data.refreshToken);

      return data;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw AuthError.fromNetworkError(error);
    }
  }

  /**
   * Get SMS statistics for a phone number
   * @param phone - Phone number
   * @returns SMS statistics including today's send count
   */
  async getSmsStats(phone: string): Promise<SmsStatsResponse> {
    try {
      const params = new URLSearchParams({ phone });
      const response = await this.fetchWithTimeout(`/auth/sms/stats?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...this.defaultHeaders,
        },
      });

      if (!response.ok) {
        throw await AuthError.fromResponse(response);
      }

      return await response.json() as SmsStatsResponse;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw AuthError.fromNetworkError(error);
    }
  }

  /**
   * Fetch with timeout and automatic retry on 401
   */
  private async fetchWithAutoRetry(
    endpoint: string,
    options: RequestInit = {},
    retried: boolean = false
  ): Promise<Response> {
    const token = await this.tokenManager.getToken();
    const headers = token
      ? { ...options.headers, Authorization: `Bearer ${token}` }
      : options.headers;

    const response = await this.fetchWithTimeout(endpoint, {
      ...options,
      headers,
    });

    // If 401 and we haven't retried yet, try refreshing token
    if (response.status === 401 && !retried) {
      const hasRefreshToken = await this.tokenManager.getRefreshToken();
      if (hasRefreshToken) {
        try {
          await this.refreshToken();
          // Retry the request with new token
          return this.fetchWithAutoRetry(endpoint, options, true);
        } catch {
          // Refresh failed, return the original 401 response
          return response;
        }
      }
    }

    return response;
  }

  /**
   * Fetch with timeout
   */
  private async fetchWithTimeout(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const url = `${this.baseURL}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw AuthError.timeout();
      }

      throw error;
    }
  }
}
