# Nova Auth SDK 发布与使用指南

## 目录

- [发布到 npm](#发布到-npm)
  - [前提条件](#前提条件)
  - [发布前检查清单](#发布前检查清单)
  - [发布步骤](#发布步骤)
  - [版本管理策略](#版本管理策略)
  - [发布后验证](#发布后验证)
- [SDK 使用方法](#sdk-使用方法)
  - [基础配置](#基础配置)
  - [用户认证](#用户认证)
  - [Token 管理](#token-管理)
  - [OAuth 第三方登录](#oauth-第三方登录)
  - [React 集成](#react-集成)
  - [Tauri 桌面应用集成](#tauri-桌面应用集成)
  - [错误处理](#错误处理)

---

## 发布到 npm

### 前提条件

1. **拥有 npm 账号**
   - 注册地址: https://www.npmjs.com/signup
   - 推荐使用淘宝镜像的用户先配置 npm 官方源

2. **组织/团队准备（可选）**
   - 如需发布到 `@nova-core` 作用域，需要在 npm 上创建组织
   - 组织类型选择 "Free Team" 即可

3. **本地登录 npm**
   ```bash
   # 切换到官方源
   npm config set registry https://registry.npmjs.org/

   # 登录（按提示输入用户名、密码、邮箱）
   npm login

   # 验证登录状态
   npm whoami
   ```

### 发布前检查清单

#### 1. 检查 package.json 配置

```json
{
  "name": "@nova-intelligent/auth-sdk",      // 作用域包名
  "version": "1.1.0",                  // 版本号（遵循语义化版本）
  "description": "TypeScript SDK...",   // 清晰描述
  "main": "dist/index.js",              // CommonJS 入口
  "types": "dist/index.d.ts",           // TypeScript 类型定义
  "files": [                            // 仅发布这些文件
    "dist",
    "README.md"
  ],
  "publishConfig": {
    "access": "public"                  // 公开访问（作用域包必需）
  }
}
```

#### 2. 更新版本号

```bash
cd nova-auth-sdk

# 升级补丁版本（Bug 修复）
npm version patch  # 1.1.0 → 1.1.1

# 升级次版本（新功能，向后兼容）
npm version minor  # 1.1.0 → 1.2.0

# 升级主版本（破坏性变更）
npm version major  # 1.1.0 → 2.0.0
```

#### 3. 构建并验证

```bash
# 构建 TypeScript
npm run build

# 检查 dist 目录
ls -la dist/

# 验证类型定义
head -50 dist/index.d.ts
```

#### 4. 配置 .npmignore（如需要）

```
src/
tsconfig.json
*.spec.ts
*.test.ts
__tests__/
.git/
node_modules/
npm-debug.log
.DS_Store
.env
```

### 发布步骤

#### 标准发布流程

```bash
# 1. 进入 SDK 目录
cd nova-auth-sdk

# 2. 确保依赖最新
npm install

# 3. 构建
npm run build

# 4. 测试包内容（dry run）
npm pack --dry-run

# 5. 发布到 npm
npm publish

# 6. 发布成功后会显示
# + @nova-core/auth-sdk@1.1.0
```

#### 使用 np 进行更安全的发布

```bash
# 全局安装 np
npm install -g np

# 发布（会自动运行测试、构建，并处理版本控制）
np

# 指定版本发布
np 1.1.0

# 跳过 CI 发布
np --no-ci
```

#### 发布到特定标签

```bash
# 发布到 beta 标签
npm publish --tag beta

# 安装 beta 版本
npm install @nova-core/auth-sdk@beta
```

### 版本管理策略

| 版本类型 | 示例 | 使用场景 |
|---------|------|---------|
| 正式版 | `1.1.0` | 稳定版本，生产环境使用 |
| 测试版 | `1.2.0-beta.1` | 新功能测试 |
| 预发布 | `2.0.0-rc.1` | 正式版前的候选版本 |

```bash
# 发布预发布版本
npm version prerelease  # 1.1.0 → 1.1.1-0
npm publish --tag prerelease
```

### 发布后验证

```bash
# 1. 检查 npm 页面
# https://www.npmjs.com/package/@nova-core/auth-sdk

# 2. 验证包内容
npm view @nova-core/auth-sdk

# 3. 测试安装（新目录）
mkdir test-install && cd test-install
npm init -y
npm install @nova-core/auth-sdk

# 4. 验证 TypeScript 类型
npx tsc --noEmit -p node_modules/@nova-core/auth-sdk
```

---

## SDK 使用方法

### 基础配置

#### 安装

```bash
npm install @nova-core/auth-sdk
# 或
yarn add @nova-core/auth-sdk
# 或
pnpm add @nova-core/auth-sdk
```

#### 创建客户端实例

```typescript
import { AuthClient } from '@nova-core/auth-sdk';

// 基础配置
const client = new AuthClient({
  baseURL: 'http://localhost:3000',  // API 地址
  storage: 'localStorage',            // token 存储方式
  timeout: 10000,                     // 请求超时（毫秒）
});

// 使用内存存储（适用于 SSR 或无存储环境）
const memoryClient = new AuthClient({
  storage: 'memory',
});

// 自定义存储
import { type TokenStorage } from '@nova-core/auth-sdk';

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

const customClient = new AuthClient({
  storage: 'custom',
  customStorage,
});
```

### 用户认证

#### 登录

```typescript
import { AuthClient } from '@nova-core/auth-sdk';

const client = new AuthClient({ baseURL: 'http://localhost:3000' });

async function login() {
  try {
    const result = await client.login({
      username: 'user@example.com',
      password: 'password123',
    });

    console.log('Access Token:', result.accessToken);
    console.log('Refresh Token:', result.refreshToken);
    console.log('过期时间:', result.expiresIn);

    // 登录成功后，token 会自动存储
  } catch (error) {
    if (error instanceof AuthError) {
      console.error('错误代码:', error.apiCode);
      console.error('HTTP 状态:', error.statusCode);
      console.error('错误信息:', error.message);
    }
  }
}
```

#### 注册

```typescript
async function register() {
  try {
    const result = await client.register({
      username: 'johndoe',
      email: 'john@example.com',
      password: 'SecurePass123!',
    });

    console.log('新用户:', result.user);
    console.log('消息:', result.message);
    // 注册成功后自动登录，token 已存储
  } catch (error) {
    // 处理错误
  }
}
```

#### 验证登录状态

```typescript
async function checkAuth() {
  try {
    const result = await client.validateToken();
    console.log('用户信息:', result.user);
    console.log('有效:', result.valid);
  } catch (error) {
    console.log('未登录或 token 已过期');
  }
}
```

#### 登出

```typescript
async function logout() {
  try {
    await client.logout();
    console.log('已退出登录');
  } catch (error) {
    // 即使 API 调用失败，本地 token 也会被清除
  }
}
```

### Token 管理

#### 获取 Token

```typescript
// 获取当前 access token
const accessToken = await client.getToken();

// 获取 refresh token
const refreshToken = await client.getRefreshToken();

// 检查是否已登录
const isAuth = await client.isAuthenticated();

// 获取完整认证状态
const state = await client.getAuthState();
console.log(state.isAuthenticated);  // boolean
console.log(state.token);           // string | null
console.log(state.user);            // UserInfo | null
```

#### 手动管理 Token

```typescript
// 手动设置 tokens（适用于从 URL 或其他来源获取 token）
await client.setToken('your-access-token');
await client.setRefreshToken('your-refresh-token');

// 清除所有 tokens
await client.clearToken();
```

#### 手动刷新 Token

```typescript
// SDK 会自动处理 token 刷新
// 如需手动刷新：
const newTokens = await client.refreshToken();
console.log('新 Access Token:', newTokens.accessToken);
```

### OAuth 第三方登录

#### 获取 OAuth 授权链接

```typescript
async function getGithubLoginUrl() {
  const { url, state } = await client.getOAuthUrl('github');
  console.log('跳转 URL:', url);
  console.log('State 参数（用于 CSRF 防护）:', state);

  // 跳转到 URL
  window.location.href = url;
}
```

#### 链接 OAuth 账户（已登录用户）

```typescript
async function linkGithub() {
  // 用户授权后，会回调到你的页面并携带 code 和 state
  const code = getUrlParam('code');
  const state = getUrlParam('state');

  const result = await client.linkOAuthAccount('github', code, state);
  console.log('已绑定:', result.provider);
}
```

#### 解绑 OAuth 账户

```typescript
async function unlinkGithub() {
  const result = await client.unlinkOAuthAccount('github');
  console.log('已解绑:', result.provider);
}
```

#### 获取已链接的账户列表

```typescript
async function getLinkedAccounts() {
  const { accounts } = await client.getLinkedAccounts();

  accounts.forEach(account => {
    console.log('Provider:', account.provider);
    console.log('Provider ID:', account.providerId);
    console.log('绑定时间:', account.connectedAt);
  });
}
```

### React 集成

#### 创建 AuthProvider

```typescript
// AuthContext.tsx
import { createContext, useContext, useState, useEffect } from 'react';
import { AuthClient, type AuthState, type UserInfo } from 'nova-auth-sdk';

const AuthContext = createContext<{
  client: AuthClient;
  user: UserInfo | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
} | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new AuthClient({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  }));

  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    token: null,
    refreshToken: null,
    user: null,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    client.getAuthState().then((state) => {
      setAuthState(state);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [client]);

  const login = async (username: string, password: string) => {
    setError(null);
    try {
      await client.login({ username, password });
      const validation = await client.validateToken();
      setAuthState({
        isAuthenticated: true,
        token: await client.getToken(),
        refreshToken: await client.getRefreshToken(),
        user: validation.user,
      });
    } catch (err: any) {
      setError(err.message || '登录失败');
      throw err;
    }
  };

  const register = async (username: string, email: string, password: string) => {
    setError(null);
    try {
      const result = await client.register({ username, email, password });
      setAuthState({
        isAuthenticated: true,
        token: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      });
    } catch (err: any) {
      setError(err.message || '注册失败');
      throw err;
    }
  };

  const logout = async () => {
    try {
      await client.logout();
    } finally {
      setAuthState({
        isAuthenticated: false,
        token: null,
        refreshToken: null,
        user: null,
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        client,
        user: authState.user,
        loading,
        isAuthenticated: authState.isAuthenticated,
        login,
        register,
        logout,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

#### 在组件中使用

```typescript
// LoginPage.tsx
import { useAuth } from './AuthContext';

export function LoginPage() {
  const { login, loading, error } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await login(username, password);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={username} onChange={e => setUsername(e.target.value)} />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <button type="submit" disabled={loading}>登录</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </form>
  );
}
```

### Tauri 桌面应用集成

#### 安装依赖

```bash
npm install @nova-core/auth-sdk
npm install @tauri-apps/api
```

#### 配置 deep link（tauri.conf.json）

```json
{
  "tauri": {
    "bundle": {
      "identifier": "com.nova.app",
      "windows": {
        "webviewInstallMode": {
          "type": "embedBootstrapper"
        }
      }
    }
  }
}
```

#### OAuth 登录流程

```typescript
import { AuthClient } from '@nova-core/auth-sdk';
import { open } from '@tauri-apps/plugin-shell';

const client = new AuthClient({ baseURL: 'http://localhost:3000' });

async function loginWithGithub() {
  // 1. 获取 OAuth URL
  const { url, state } = await client.getOAuthUrl('github');

  // 2. 打开系统浏览器
  await open(url);

  // 3. 等待回调（使用自定义实现或 deep-link 插件）
  // 用户在浏览器中完成授权后，会通过 deep link 回到应用
  const callbackUrl = await waitForDeepLink();

  // 4. 从回调 URL 中提取 token
  const params = new URL(callbackUrl);
  const accessToken = params.searchParams.get('access_token');
  const refreshToken = params.searchParams.get('refresh_token');

  if (accessToken) {
    await client.setToken(accessToken);
    if (refreshToken) {
      await client.setRefreshToken(refreshToken);
    }
  }
}

// 简单的 deep link 等待实现
function waitForDeepLink(): Promise<string> {
  return new Promise((resolve) => {
    // 监听 tauri://oauth-callback
    window.__TAURI__?.event.listen('deep-link://oauth-callback', (event) => {
      resolve(event.payload as string);
    });

    // 或者轮询 URL（开发时）
    const interval = setInterval(() => {
      if (window.location.href.startsWith('tauri://')) {
        clearInterval(interval);
        resolve(window.location.href);
      }
    }, 100);

    // 5分钟超时
    setTimeout(() => {
      clearInterval(interval);
      throw new Error('OAuth 回调超时');
    }, 300000);
  });
}
```

### 错误处理

SDK 中的所有错误都是 `AuthError` 的实例：

```typescript
import { AuthError } from '@nova-core/auth-sdk';

try {
  await client.login({ username, password });
} catch (error) {
  if (error instanceof AuthError) {
    console.error(error.message);     // 人类可读的错误信息
    console.error(error.statusCode);  // HTTP 状态码（网络错误为 0）
    console.error(error.apiCode);     // API 错误码
    console.error(error.apiMessage);  // API 返回的错误信息
  } else {
    // 网络错误等
    console.error('网络错误:', error);
  }
}
```

#### AuthError 属性

| 属性 | 类型 | 说明 |
|-----|------|------|
| `message` | `string` | 错误描述 |
| `statusCode` | `number` | HTTP 状态码，0 表示网络错误 |
| `apiCode` | `string \| undefined` | API 返回的业务错误码 |
| `apiMessage` | `string \| undefined` | API 返回的详细错误信息 |

---

## 附录

### 完整类型导入

```typescript
import type {
  // 认证相关
  LoginCredentials,
  LoginResponse,
  RegisterCredentials,
  RegisterResponse,
  RefreshTokenResponse,
  UserInfo,
  ValidateTokenResponse,
  LogoutResponse,

  // OAuth 相关
  OAuthProvider,
  OAuthUrlResponse,
  OAuthAccountInfo,
  LinkedAccountsResponse,

  // 配置相关
  AuthClientConfig,
  TokenStorage,
  AuthState,
} from '@nova-core/auth-sdk';
```

### 常用命令速查

```bash
# 发布
npm publish

# 发布到 beta
npm publish --tag beta

# 更新版本号
npm version patch  # 1.0.0 → 1.0.1
npm version minor  # 1.0.0 → 1.1.0
npm version major  # 1.0.0 → 2.0.0

# 查看包信息
npm view @nova-core/auth-sdk

# 安装特定版本
npm install @nova-core/auth-sdk@1.1.0
```
