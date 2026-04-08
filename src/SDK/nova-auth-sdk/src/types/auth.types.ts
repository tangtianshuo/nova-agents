/**
 * Login request credentials
 */
export interface LoginCredentials {
  username: string;
  password: string;
}

/**
 * Registration request credentials
 */
export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
}

/**
 * Registered user information
 */
export interface RegisteredUser {
  id: string;
  username: string;
  email: string;
}

/**
 * Registration response
 */
export interface RegisterResponse {
  user: RegisteredUser;
  message: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

/**
 * Token response from login endpoint
 */
export interface TokenResponse {
  accessToken: string;
  expiresIn: string;
}

/**
 * Login response with access token and refresh token
 */
export interface LoginResponse extends TokenResponse {
  refreshToken: string;
}

/**
 * Refresh token response
 */
export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

/**
 * Refresh token request
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * User information from validate endpoint
 */
export interface UserInfo {
  userId: string;
  username: string;
}

/**
 * Validate token response
 */
export interface ValidateTokenResponse {
  valid: true;
  user: UserInfo;
}

/**
 * Logout response
 */
export interface LogoutResponse {
  message: string;
}

/**
 * API error response
 */
export interface ApiErrorResponse {
  error: string;
}

// ==================== OAuth Types ====================

/**
 * OAuth provider information
 */
export interface OAuthProvider {
  name: string;
  displayName: string;
}

/**
 * OAuth authorization URL response
 */
export interface OAuthUrlResponse {
  url: string;
  state: string;
}

/**
 * OAuth account information
 */
export interface OAuthAccountInfo {
  provider: string;
  providerId: string;
  connectedAt: string;
}

/**
 * Linked accounts response
 */
export interface LinkedAccountsResponse {
  accounts: OAuthAccountInfo[];
}

/**
 * OAuth link account request
 */
export interface OAuthLinkRequest {
  provider: string;
  code: string;
  state: string;
}

/**
 * OAuth unlink account request
 */
export interface OAuthUnlinkRequest {
  provider: string;
}

// ==================== SMS Types ====================

/**
 * SMS send request
 */
export interface SmsSendRequest {
  phone: string;
  type: 'login' | 'register';
}

/**
 * SMS send response
 */
export interface SmsSendResponse {
  success: boolean;
  message: string;
}

/**
 * SMS login request
 */
export interface SmsLoginRequest {
  phone: string;
  code: string;
}

/**
 * SMS login response
 */
export interface SmsLoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

/**
 * SMS register request
 */
export interface SmsRegisterRequest {
  phone: string;
  code: string;
  username: string;
}

/**
 * SMS register response
 */
export interface SmsRegisterResponse {
  user: {
    id: string;
    username: string;
    phone: string;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  message: string;
}

/**
 * SMS statistics response
 */
export interface SmsStatsResponse {
  phone: string;
  todaySendCount: number;
  date: string;
}
