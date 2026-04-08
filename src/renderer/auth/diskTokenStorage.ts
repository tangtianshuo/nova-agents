import { atomicModifyConfig } from '../config/services/appConfigService';
import type { AuthData } from '../config/types';
import type { TokenStorage } from '../../SDK/nova-auth-sdk/src/types/common.types';

const TOKEN_KEY = 'nova_access_token';
const REFRESH_TOKEN_KEY = 'nova_refresh_token';

/**
 * Disk-based token storage backed by AppConfig.auth
 * Implements SDK TokenStorage interface for use with TauriAuthClient
 */
export class DiskTokenStorage implements TokenStorage {
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
