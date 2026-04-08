# @nova-core/auth-sdk

TypeScript SDK for Nova authentication API with OAuth support and zero runtime dependencies.

## Features

- 🔐 **User Authentication**: Login, register, logout with JWT tokens
- 🔄 **Auto Token Refresh**: Automatic refresh token management
- 🔗 **OAuth Support**: GitHub, WeChat, and extensible provider system
- 📱 **Tauri Ready**: Special utilities for desktop apps
- 🌐 **Web & Mobile**: Works in browsers, React Native, and Node.js
- 💾 **Flexible Storage**: localStorage, sessionStorage, or custom storage
- 📝 **TypeScript**: Full type safety and IntelliSense support
- 🚀 **Zero Runtime Dependencies**: Uses native fetch API

## Installation

```bash
npm install @nova-core/auth-sdk
# or
yarn add @nova-core/auth-sdk
# or
pnpm add @nova-core/auth-sdk
```

## Quick Start

```typescript
import { AuthClient } from '@nova-core/auth-sdk';

// Create client instance
const client = new AuthClient({
  baseURL: 'http://localhost:3000',
  storage: 'localStorage', // or 'memory' or 'custom'
});

// Login
const result = await client.login({
  username: 'user@example.com',
  password: 'password123',
});

console.log(result.accessToken); // Your JWT token
console.log(result.refreshToken); // Your refresh token
console.log(result.expiresIn);   // Token expiry time

// Validate token
const validation = await client.validateToken();
console.log(validation.user); // { userId: '...', username: '...' }

// Logout
await client.logout();
```

## Configuration

### AuthClientConfig

```typescript
interface AuthClientConfig {
  baseURL?: string;              // Default: 'http://localhost:3000'
  storage?: 'localStorage' | 'memory' | 'custom';
  customStorage?: TokenStorage;  // Required when storage='custom'
  timeout?: number;              // Default: 10000 (10 seconds)
  defaultHeaders?: Record<string, string>;
}
```

### Custom Storage Implementation

```typescript
import { AuthClient, type TokenStorage } from '@nova-core/auth-sdk';

const customStorage: TokenStorage = {
  async getItem(key: string) {
    return sessionStorage.getItem(key);
  },
  async setItem(key: string, value: string) {
    sessionStorage.setItem(key, value);
  },
  async removeItem(key: string) {
    sessionStorage.removeItem(key);
  },
};

const client = new AuthClient({
  storage: 'custom',
  customStorage,
});
```

## API Reference

### Authentication

#### `login(credentials)`
Authenticate with username and password.

```typescript
const result = await client.login({
  username: 'user@example.com',
  password: 'password123',
});

// Returns: LoginResponse
{
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}
```

#### `register(credentials)`
Register a new user account.

```typescript
const result = await client.register({
  username: 'johndoe',
  email: 'john@example.com',
  password: 'SecurePass123!',
});

// Returns: RegisterResponse
{
  user: { id, username, email };
  message: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}
```

#### `validateToken()`
Validate current token and get user info.

```typescript
const result = await client.validateToken();

// Returns: ValidateTokenResponse
{
  valid: true;
  user: {
    userId: string;
    username: string;
  };
}
```

#### `logout()`
Logout and clear tokens.

```typescript
const result = await client.logout();

// Returns: LogoutResponse
{
  message: string;
}
```

### Token Management

#### `refreshToken()`
Manually refresh the access token using the refresh token.

```typescript
const result = await client.refreshToken();

// Returns: RefreshTokenResponse
{
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}
```

#### Token Helpers
```typescript
// Get current tokens
const accessToken = await client.getToken();
const refreshToken = await client.getRefreshToken();

// Set tokens manually
await client.setToken('your-access-token');
await client.setRefreshToken('your-refresh-token');

// Clear all tokens
await client.clearToken();

// Check authentication status
const isAuth = await client.isAuthenticated();

// Get complete auth state
const state = await client.getAuthState();

// Returns: AuthState
{
  isAuthenticated: boolean;
  token: string | null;
  refreshToken: string | null;
  user: UserInfo | null;
}
```

### OAuth

#### `getOAuthUrl(provider)`
Get the OAuth authorization URL for a provider.

```typescript
const { url, state } = await client.getOAuthUrl('github');

// Returns: OAuthUrlResponse
{
  url: string;      // Authorization URL to redirect user to
  state: string;    // State parameter for CSRF protection
}
```

#### `linkOAuthAccount(provider, code, state)`
Link an OAuth account to the current user (requires authentication).

```typescript
await client.linkOAuthAccount('github', code, state);

// Returns: { message: string; provider: string }
```

#### `unlinkOAuthAccount(provider)`
Unlink an OAuth account from the current user.

```typescript
await client.unlinkOAuthAccount('github');

// Returns: { message: string; provider: string }
```

#### `getLinkedAccounts()`
Get all linked OAuth accounts for the current user.

```typescript
const { accounts } = await client.getLinkedAccounts();

// Returns: LinkedAccountsResponse
{
  accounts: Array<{
    provider: string;
    providerId: string;
    connectedAt: string;
  }>
}
```

### Tauri Desktop Apps

Special utilities for Tauri applications:

```typescript
import {
  isTauri,
  openSystemBrowser,
  waitForDeepLinkCallback,
  buildDeepLinkUrl,
  createWebViewCallbackHtml
} from '@nova-core/auth-sdk';

// Check if running in Tauri
if (isTauri()) {
  // Open system browser for OAuth
  await openSystemBrowser(oauthUrl);

  // Wait for deep link callback
  const callback = await waitForDeepLinkCallback({
    scheme: 'nova://',
    path: '/oauth/callback',
    timeout: 300000,
  });

  // Build deep link URL
  const url = buildDeepLinkUrl('nova://', '/oauth/callback', {
    access_token: 'xxx',
    refresh_token: 'yyy'
  });

  // Create HTML for WebView OAuth callback
  const html = createWebViewCallbackHtml();
}
```

See [Tauri Integration](#tauri-integration) below for complete setup guide.

## React Integration Example

```typescript
import { AuthClient } from '@nova-core/auth-sdk';
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext<{
  client: AuthClient;
  user: UserInfo | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
} | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new AuthClient({
    baseURL: process.env.VITE_API_BASE_URL || 'http://localhost:3000',
  }));

  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.getAuthState().then((state) => {
      setUser(state.user);
      setLoading(false);
    });
  }, [client]);

  const login = async (username: string, password: string) => {
    await client.login({ username, password });
    const validation = await client.validateToken();
    setUser(validation.user);
  };

  const logout = async () => {
    await client.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ client, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

## Tauri Integration

For Tauri desktop apps, configure deep link handling:

### 1. Update `tauri.conf.json`

```json
{
  "tauri": {
    "bundle": {
      "identifier": "com.example.nova-app",
      "targets": ["msi"],
      "windows": {
        "webviewInstallMode": {
          "type": "embedBootstrapper"
        }
      }
    },
    "allowlist": {
      "all": false,
      "shell": {
        "open": true
      }
    }
  }
}
```

### 2. Install Deep Link Plugin (Optional)

```bash
npm install tauri-plugin-deep-link
```

### 3. Handle Deep Link Callbacks

```typescript
import { exists, listen } from '@tauri-apps/event';

// Check if app was opened via deep link
exists('deep-link://new-url').then(async (exists) => {
  if (exists) {
    const unlisten = await listen<string>('deep-link://new-url', (event) => {
      const url = event.payload;
      // Parse tokens from URL and store them
      const params = new URL(url);
      const accessToken = params.searchParams.get('access_token');
      if (accessToken) {
        await authClient.setToken(accessToken);
      }
      unlisten();
    });
  }
});
```

## Error Handling

All errors are instances of `AuthError`:

```typescript
import { AuthError } from '@nova-core/auth-sdk';

try {
  await client.login({ username, password });
} catch (error) {
  if (error instanceof AuthError) {
    console.error(error.message);     // Human-readable message
    console.error(error.statusCode);  // HTTP status code (0 for network errors)
    console.error(error.apiCode);     // API-specific error code
  }
}
```

## Version Management

The SDK follows Semantic Versioning:

- **Major** (1.x.x): Breaking changes
- **Minor** (x.1.x): New features, backward compatible
- **Patch** (x.x.1): Bug fixes

To update to the latest version:

```bash
# Check for updates
npm outdated @nova-core/auth-sdk

# Update to latest
npm update @nova-core/auth-sdk

# Or install specific version
npm install @nova-core/auth-sdk@1.1.0
```

## TypeScript Support

Full TypeScript definitions included:

```typescript
import type {
  // Auth types
  LoginCredentials,
  LoginResponse,
  RegisterCredentials,
  RegisterResponse,
  RefreshTokenResponse,
  UserInfo,
  ValidateTokenResponse,
  LogoutResponse,

  // OAuth types
  OAuthProvider,
  OAuthUrlResponse,
  OAuthAccountInfo,
  LinkedAccountsResponse,
  OAuthLinkRequest,
  OAuthUnlinkRequest,

  // Common types
  AuthClientConfig,
  TokenStorage,
  AuthState,
} from '@nova-core/auth-sdk';
```

## License

MIT

## Support

- GitHub Issues: https://github.com/your-org/nova-core/issues
- Documentation: https://github.com/your-org/nova-core/wiki
