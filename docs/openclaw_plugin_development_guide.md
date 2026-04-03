# OpenClaw 插件开发指南

> 文档版本：v1.0.0
> 适用版本：nova-agents v0.1.41+
> 编写日期：2026-04-03

---

## 一、概述

OpenClaw 是 nova-agents 的 IM 平台插件系统。通过开发 OpenClaw 插件，你可以将任意 IM 平台（如企业微信、Slack、Discord、自建 IM 等）接入 nova-agents，让 AI 能够接收消息并回复。

### 接入原理

```
IM 平台 → 插件接收消息 → dispatchReplyFromConfig() → Bridge HTTP → Rust SessionRouter → Bun Sidecar (AI) → 回复 → 插件发送
```

nova-agents 内置了一个 **Plugin Bridge**（独立 Bun 进程），它负责：
- 加载插件并管理其生命周期
- 接收插件转发的消息，转发给 Rust 层
- 将 AI 回复通过插件发送回 IM 平台

### 两种开发路径

| 路径 | 适用场景 | 难度 |
|------|---------|------|
| **接入已有插件** | 目标平台已有 OpenClaw 插件（如 QQ、微信、Slack） | 极低 |
| **开发新插件** | 目标平台没有现成插件 | 中等 |

本文档聚焦于**开发新插件**的完整流程。

---

## 二、插件架构

### 文件结构

```
my-channel-plugin/
├── package.json              # 项目配置，必须包含 openclaw 字段
├── openclaw.plugin.json      # 插件清单（可选）
└── src/
    └── channel.ts           # 插件入口，核心代码
```

### 核心概念

插件是一个**消息转发器**：
1. 从 IM 平台接收用户消息
2. 调用 `dispatchReplyFromConfig()` 将消息发送给 nova-agents AI
3. 等待 AI 回复
4. 将回复通过 IM 平台发送出去

**插件不运行 AI**——它只是消息的搬运工。

---

## 三、快速开始

### 3.1 初始化项目

```bash
mkdir my-channel-plugin && cd my-channel-plugin
npm init -y
```

### 3.2 package.json

```json
{
  "name": "@my/channel-plugin",
  "version": "1.0.0",
  "description": "My IM platform integration for nova-agents",
  "main": "dist/index.js",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "openclaw": {
    "id": "my-channel",
    "name": "My Channel",
    "description": "My IM platform integration"
  },
  "keywords": ["openclaw"],
  "peerDependencies": {
    "openclaw": "*"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

### 3.3 TypeScript 配置（tsconfig.json）

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

### 3.4 最简插件示例

```typescript
// src/channel.ts

// 模拟 IM 平台客户端
class MockIMClient {
  constructor(private token: string) {}
  
  onMessage(handler: (msg: IncomingMessage) => void) {
    // 实际项目中，这里建立 WebSocket 长连接或启动长轮询
    // 收到消息时调用 handler
  }
  
  async sendMessage(chatId: string, text: string): Promise<string> {
    // 调用 IM 平台 API 发送消息
    console.log(`[MockIM] Sending to ${chatId}: ${text}`);
    return `msg-${Date.now()}`;
  }
}

interface IncomingMessage {
  id: string;
  chatId: string;
  content: string;
  senderId: string;
  senderName: string;
  isGroup: boolean;
  mentionedBot?: boolean;
  groupName?: string;
}

// 插件入口
export default {
  register(api: any) {
    const channel = {
      id: 'my-channel',
      name: 'My Channel',
      meta: { label: 'My Channel' },

      // ===== 网关：管理 IM 平台连接 =====
      gateway: {
        async startAccount(ctx: any) {
          const { account, abortSignal, cfg } = ctx;
          const config = (cfg.channels['my-channel'] as Record<string, string>) || {};
          
          // 使用凭证连接 IM 平台
          const client = new MockIMClient(config.token || 'test-token');
          
          // 监听消息
          client.onMessage(async (msg: IncomingMessage) => {
            // 核心：将消息分发给 nova-agents AI 处理
            await cfg.runtime.channel.reply.dispatchReplyFromConfig({
              ctx: {
                Body: msg.content,
                BodyForAgent: msg.content,
                SenderId: msg.senderId,
                SenderName: msg.senderName,
                From: msg.chatId,
                ChatType: msg.isGroup ? 'group' : 'direct',
                MessageSid: msg.id,
                WasMentioned: msg.mentionedBot ?? false,
                GroupSubject: msg.groupName,
              },
              dispatcher: {
                sendFinalReply: async ({ text }: { text: string }) => {
                  await client.sendMessage(msg.chatId, text);
                },
                sendBlockReply: async ({ text }: { text: string }) => {
                  await client.sendMessage(msg.chatId, text);
                },
                markComplete: () => {},
              },
              replyOptions: {
                onPartialReply: ({ text }: { text: string }) => {
                  // 可选：发送打字状态或草稿消息
                },
              },
            });
          });
          
          // 监听中止信号，优雅关闭连接
          abortSignal.addEventListener('abort', () => {
            console.log('[MyChannel] 收到关闭信号');
          });
        },
      },

      // ===== 消息发送（nova-agents 回复用户时调用） =====
      sendText: async (chatId: string, text: string) => {
        // 这里需要在 startAccount 中保存 client 实例的引用
        // 为简化省略，实际推荐使用模块级变量或闭包
        const client = (globalThis as any).__myChannelClient;
        const messageId = await client.sendMessage(chatId, text);
        return { messageId };
      },
    };

    api.registerChannel(channel);
  },
};
```

---

## 四、核心 API 详解

### 4.1 registerChannel()

插件通过调用 `api.registerChannel(channel)` 注册频道。Channel 对象包含：

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 频道唯一标识，如 `"my-channel"` |
| `name` | string | 是 | 频道名称 |
| `meta` | object | 否 | 元数据，`label` 用于 UI 显示 |
| `gateway` | object | 是 | 连接管理器（登录、心跳、消息接收） |
| `sendText` | function | 是 | 发送文本消息 |
| `editMessage` | function | 否 | 编辑已有消息（支持流式草稿） |
| `deleteMessage` | function | 否 | 删除消息 |
| `sendMedia` | function | 否 | 发送图片/文件 |

### 4.2 gateway.startAccount()

这是插件的核心，**长连接的启动和消息的路由都从这里发起**。

```typescript
interface StartAccountContext {
  account: Record<string, any>;      // 凭证（来自 nova-agents 配置）
  accountId: string;                 // 账号 ID
  abortSignal: AbortSignal;         // 中止信号，收到时需断开连接
  cfg: any;                         // OpenClaw 配置对象
  runtime: any;                      // 运行时对象，包含 channel.reply
  setStatus(status: Record<string, any>): void;  // 更新连接状态
  getStatus(): Record<string, any>;              // 获取当前状态
}

gateway: {
  async startAccount(ctx: StartAccountContext) {
    // ctx.cfg.runtime 是 compat-runtime.ts 提供的模拟运行时
    // ctx.cfg.runtime.channel.reply 是消息分发器
  }
}
```

### 4.3 dispatchReplyFromConfig()

这是插件与 nova-agents 交互的核心函数。调用它会将消息发送给 AI，并**阻塞等待回复**。

```typescript
await cfg.runtime.channel.reply.dispatchReplyFromConfig({
  ctx: dispatchContext,    // 消息上下文
  dispatcher,              // 回复回调
  replyOptions,            // 流式回调（可选）
});
```

#### dispatchContext 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `Body` | string | 原始消息文本 |
| `BodyForAgent` | string | 发给 AI 的消息（可预处理，如去掉 @mention 前缀） |
| `SenderId` | string | 发送者 ID |
| `SenderName` | string | 发送者昵称 |
| `From` | string | 会话 ID（私聊为用户 ID，群聊为群 ID） |
| `ChatType` | `"direct"` \| `"group"` | 会话类型 |
| `MessageSid` | string | 消息 ID（用于去重） |
| `WasMentioned` | boolean | 是否 @机器人（群聊时） |
| `GroupSubject` | string | 群名称 |
| `ReplyToBody` | string | 引用回复的原文 |
| `GroupSystemPrompt` | string | 群聊自定义系统提示 |
| `MediaPath` | string | 媒体文件路径（单文件） |
| `MediaPaths` | string[] | 媒体文件路径（多文件） |
| `MediaType` | string | MIME 类型 |

#### dispatcher 回调说明

| 回调 | 说明 | 返回值要求 |
|------|------|------------|
| `sendFinalReply({ text })` | 发送最终回复 | Promise |
| `sendBlockReply({ text })` | 发送块回复（多 block 时） | Promise |
| `markComplete()` | 标记回复完成 | void |

#### replyOptions 流式回调（可选）

| 回调 | 说明 |
|------|------|
| `onPartialReply({ text })` | 增量回复（打字效果、草稿编辑） |
| `onReasoningStream({ text })` | 思考过程流 |

#### 返回值

**必须返回以下结构**，否则插件会崩溃：

```typescript
return { queuedFinal: 0, counts: {} };
```

### 4.4 sendText / editMessage / deleteMessage

这些是 nova-agents 用来回复消息的回调。

```typescript
sendText: async (chatId: string, text: string) => {
  const messageId = await imClient.sendMessage(chatId, text);
  return { messageId };  // 必须返回 messageId
},

editMessage: async (chatId: string, messageId: string, text: string) => {
  await imClient.editMessage(chatId, messageId, text);
},

deleteMessage: async (chatId: string, messageId: string) => {
  await imClient.deleteMessage(chatId, messageId);
},
```

### 4.5 sendMedia

发送图片或文件。

```typescript
sendMedia: async (params: {
  chatId: string;
  type: 'image' | 'file';
  data: Buffer;      // 文件内容，base64 解码后
  filename: string;
  mimeType: string;
  caption?: string;
}) => {
  const messageId = await imClient.sendMedia(params);
  return { messageId };
};
```

---

## 五、完整示例：WebSocket 插件

以下是一个连接自建 IM 平台的完整插件示例。

### 5.1 项目结构

```
my-ws-plugin/
├── package.json
├── tsconfig.json
└── src/
    ├── channel.ts      # 插件入口
    └── ws-client.ts   # WebSocket 客户端封装
```

### 5.2 ws-client.ts

```typescript
export interface WsMessage {
  id: string;
  type: 'text' | 'image' | 'file';
  chatId: string;
  chatType: 'direct' | 'group';
  content: string;
  senderId: string;
  senderName: string;
  mentionedBot?: boolean;
  groupName?: string;
  extra?: Record<string, any>;
}

export interface WsClientOptions {
  url: string;
  token: string;
  onMessage: (msg: WsMessage) => void;
  onStatusChange: (status: 'connected' | 'disconnected' | 'error') => void;
}

export class WsClient {
  private ws: WebSocket | null = null;
  private options: WsClientOptions;

  constructor(options: WsClientOptions) {
    this.options = options;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(
        `${this.options.url}?token=${this.options.token}`
      );

      this.ws.onopen = () => {
        this.options.onStatusChange('connected');
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.options.onMessage({
            id: data.id || `local-${Date.now()}`,
            type: data.type || 'text',
            chatId: data.chatId,
            chatType: data.chatType || 'direct',
            content: data.content || '',
            senderId: data.senderId,
            senderName: data.senderName || 'Unknown',
            mentionedBot: data.mentionedBot,
            groupName: data.groupName,
            extra: data.extra,
          });
        } catch (e) {
          console.error('[WsClient] 解析消息失败:', e);
        }
      };

      this.ws.onclose = () => {
        this.options.onStatusChange('disconnected');
      };

      this.ws.onerror = () => {
        this.options.onStatusChange('error');
        reject(new Error('WebSocket 连接失败'));
      };
    });
  }

  async sendMessage(chatId: string, content: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket 未连接'));
        return;
      }

      const id = `sent-${Date.now()}`;
      this.ws.send(JSON.stringify({
        action: 'send',
        chatId,
        content,
        id,
      }));

      resolve(id);
    });
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }
}
```

### 5.3 channel.ts

```typescript
import type { OpenClawPluginApi, ChannelPlugin } from 'openclaw/plugin-sdk';
import { WsClient } from './ws-client';

let globalClient: WsClient | null = null;

export default {
  register(api: OpenClawPluginApi) {
    const channel: ChannelPlugin = {
      id: 'my-ws-channel',
      name: 'My WebSocket Channel',
      meta: { label: 'My WS' },

      gateway: {
        async startAccount(ctx: any) {
          const { account, abortSignal, cfg, setStatus } = ctx;
          const config = (cfg.channels['my-ws-channel'] as Record<string, string>) || {};

          const client = new WsClient({
            url: config.wsUrl || 'wss://api.example.com/ws',
            token: config.token || '',
            onMessage: async (msg) => {
              try {
                // 构建 dispatch context
                const dispatchCtx = {
                  Body: msg.content,
                  BodyForAgent: msg.content,
                  SenderId: msg.senderId,
                  SenderName: msg.senderName,
                  From: msg.chatId,
                  ChatType: msg.chatType,
                  MessageSid: msg.id,
                  WasMentioned: msg.mentionedBot ?? false,
                  GroupSubject: msg.groupName,
                };

                // 分发给 nova-agents AI 处理
                await cfg.runtime.channel.reply.dispatchReplyFromConfig({
                  ctx: dispatchCtx,
                  dispatcher: {
                    sendFinalReply: async ({ text }: { text: string }) => {
                      await client.sendMessage(msg.chatId, text);
                    },
                    sendBlockReply: async ({ text }: { text: string }) => {
                      await client.sendMessage(msg.chatId, text);
                    },
                    markComplete: () => {},
                  },
                  replyOptions: {
                    onPartialReply: ({ text }: { text: string }) => {
                      // 可选：发送草稿消息实现打字效果
                    },
                  },
                });
              } catch (err) {
                console.error('[MyWS] 处理消息失败:', err);
              }
            },
            onStatusChange: (status) => {
              setStatus({
                connected: status === 'connected',
                running: status === 'connected',
              });
            },
          });

          globalClient = client;

          // 监听中止信号
          abortSignal.addEventListener('abort', () => {
            console.log('[MyWS] 收到中止信号，关闭连接');
            client.disconnect();
            globalClient = null;
          });

          await client.connect();
        },

        async stopAccount() {
          globalClient?.disconnect();
          globalClient = null;
        },
      },

      sendText: async (chatId: string, text: string) => {
        if (!globalClient) throw new Error('客户端未连接');
        const messageId = await globalClient.sendMessage(chatId, text);
        return { messageId };
      },
    };

    api.registerChannel(channel);
  },
};
```

---

## 六、群聊支持

### 6.1 基本配置

在 `dispatchContext` 中设置 `ChatType: 'group'`，并将群 ID 作为 `From`：

```typescript
await cfg.runtime.channel.reply.dispatchReplyFromConfig({
  ctx: {
    Body: msg.content,
    BodyForAgent: msg.content,
    SenderId: msg.senderId,
    SenderName: msg.senderName,
    From: msg.chatId,           // 群 ID
    ChatType: 'group',          // 标记为群聊
    MessageSid: msg.id,
    WasMentioned: msg.mentionedBot ?? false,  // 是否 @机器人
    GroupSubject: msg.groupName,
  },
  dispatcher: { ... },
  replyOptions: { ... },
});
```

### 6.2 激活策略

nova-agents 支持两种群聊激活策略：

| 策略 | 条件 | 行为 |
|------|------|------|
| `Mention`（默认） | 消息 @机器人 或 以 `/ask` 开头 | 触发 AI 回复 |
| `Always` | 所有消息 | 触发 AI 回复，AI 可回复 `<NO_REPLY>` 跳过 |

### 6.3 引用回复

支持将用户引用回复的消息内容传递给 AI：

```typescript
await cfg.runtime.channel.reply.dispatchReplyFromConfig({
  ctx: {
    Body: msg.content,
    BodyForAgent: msg.content,
    From: msg.chatId,
    ChatType: 'group',
    ReplyToBody: msg.quotedContent,  // 引用回复的原文
    // ...
  },
  dispatcher: { ... },
});
```

---

## 七、QR 登录支持（可选）

如果 IM 平台使用扫码登录（而非 token），需实现 QR 登录端点。

### 7.1 实现 QR 登录

```typescript
gateway: {
  async loginWithQrStart() {
    // 返回二维码数据 URL 或跳转链接
    return {
      qrDataUrl: 'data:image/png;base64,...',  // 二维码图片
      // 或
      qrLinkUrl: 'https://example.com/qr?xxx',   // 扫码跳转链接
    };
  },

  async loginWithQrWait(params: { accountId?: string; sessionKey?: string; timeoutMs?: number }) {
    // 轮询扫码状态
    // 返回凭证或继续等待
    return {
      status: 'confirmed',    // 'pending' | 'confirmed' | 'expired'
      credentials: {          // 登录成功后返回凭证
        token: 'xxx',
        accountId: 'xxx',
      },
    };
  },

  async loginWithQrCancel() {
    // 取消登录
  },
}
```

### 7.2 loginWithQrWait 轮询策略

`timeoutMs` 建议设为 40000ms（40 秒），与 WeChat 内部长轮询周期匹配。超时后可返回 `status: 'pending'` 让前端继续轮询。

---

## 八、凭证与配置

### 8.1 配置字段声明

在 `openclaw.plugin.json` 中声明需要的配置字段：

```json
{
  "id": "my-ws-channel",
  "name": "My WebSocket Channel",
  "version": "1.0.0",
  "requiredFields": ["wsUrl", "token"]
}
```

### 8.2 凭证获取

在 `startAccount` 的 `ctx.account` 中获取：

```typescript
gateway: {
  async startAccount(ctx: any) {
    const config = (ctx.cfg.channels['my-ws-channel'] as Record<string, string>) || {};
    // config 中包含用户在 nova-agents 中填写的所有字段
    const wsUrl = config.wsUrl;
    const token = config.token;
    // ...
  }
}
```

### 8.3 凭证验证（可选）

实现 `isConfigured` 函数，让 nova-agents 在保存配置前验证凭证：

```typescript
// 在插件入口文件中导出
export function isConfigured(account: Record<string, any>, cfg: any): boolean {
  const config = (cfg.channels['my-channel'] as Record<string, string>) || {};
  return Boolean(config.token && config.token.length > 0);
}
```

---

## 九、流式输出

如果 IM 平台支持**消息编辑**（如 Telegram、飞书），推荐实现流式输出，让 AI 的回复逐字显示。

### 9.1 模式一：草稿编辑（editMessage）

适合支持编辑消息的平台（如 Telegram）：

```typescript
// 创建草稿消息
let draftId: string | null = null;

dispatcher: {
  sendFinalReply: async ({ text }: { text: string }) => {
    if (draftId) {
      // 已有草稿，直接编辑
      await client.editMessage(chatId, draftId, text);
    } else {
      // 创建新消息作为草稿
      draftId = await client.sendMessage(chatId, text);
    }
  },
  sendBlockReply: async ({ text }: { text: string }) => {
    // 每个 block 创建独立消息
    await client.sendMessage(chatId, text);
  },
  markComplete: () => {},
},

replyOptions: {
  onPartialReply: async ({ text }: { text: string }) => {
    if (draftId) {
      // 编辑草稿（限速 1 秒一次）
      await client.editMessage(chatId, draftId, text);
    } else {
      // 首次，创建草稿
      draftId = await client.sendMessage(chatId, text);
    }
  },
},
```

### 9.2 模式二：卡片流（streamingCardKit）

适合飞书等支持流式卡片的平台。需要实现 `/start-stream`、`/stream-chunk`、`/finalize-stream` 端点（由 Bridge 提供，插件只需调用 `onPartialReply`）。

---

## 十、发布与使用

### 10.1 发布到 npm

```bash
# 1. 编译
npm run build

# 2. 登录 npm
npm login

# 3. 发布（需确认包名包含 openclaw 关键词）
npm publish --access public
```

### 10.2 在 nova-agents 中安装

```
设置 → 聊天机器人 → 添加 Bot → 选择平台
→ 输入 npm 包名（如 @my/channel-plugin）
→ 填入凭证（wsUrl、token 等）
→ 启动
```

或通过 CLI：

```bash
nova-agents plugin install @my/channel-plugin
```

### 10.3 调试

查看 Bridge 日志：

```bash
tail -f ~/.nova-agents/logs/unified-*.log | grep -i bridge
```

检查插件状态：

```bash
curl http://127.0.0.1:<bridge-port>/status
```

查看插件能力：

```bash
curl http://127.0.0.1:<bridge-port>/capabilities
```

---

## 十一、常见问题

### Q1: 插件加载失败？

检查：
1. `package.json` 是否包含 `"openclaw"` 字段
2. `peerDependencies` 是否包含 `"openclaw": "*"`
3. 插件是否导出了 `register` 函数
4. 运行 `npm install` 后 `node_modules` 是否包含插件

### Q2: 消息没有发送给 AI？

检查：
1. `startAccount` 是否正确调用了 `dispatchReplyFromConfig`
2. `cfg.runtime.channel.reply` 是否存在（检查 compat-runtime 是否正确加载）
3. nova-agents 日志中是否有 `[agent]` 相关错误

### Q3: AI 回复没有发送出去？

检查：
1. `sendText` 是否被调用（查看 Bridge 日志）
2. `dispatcher.sendFinalReply` 是否被调用
3. IM 平台 API 是否正常工作

### Q4: 群聊 @mention 不生效？

检查：
1. `dispatchContext.WasMentioned` 是否设为 `true`
2. 群聊 `ChatType` 是否设为 `'group'`

### Q5: 权限审批卡片不显示？

权限审批需要插件实现 `sendApprovalCard`。如果平台不支持交互式卡片，用户可以通过文本回复 `同意`/`拒绝` 完成审批。

---

## 附录：完整类型定义

### ChannelPlugin 接口

```typescript
interface ChannelPlugin {
  id: string;
  name: string;
  meta?: { label: string; description?: string };
  gateway: {
    startAccount?(ctx: StartAccountContext): Promise<void>;
    stopAccount?(ctx: any): Promise<void>;
    loginWithQrStart?(params?: Record<string, any>): Promise<{ qrDataUrl?: string; qrLinkUrl?: string }>;
    loginWithQrWait?(params?: Record<string, any>): Promise<{ status: string; credentials?: Record<string, any> }>;
    loginWithQrCancel?(): Promise<void>;
  };
  sendText?: (chatId: string, text: string) => Promise<{ messageId?: string }>;
  editMessage?: (chatId: string, messageId: string, text: string) => Promise<void>;
  deleteMessage?: (chatId: string, messageId: string) => Promise<void>;
  sendMedia?: (params: SendMediaParams) => Promise<{ messageId?: string }>;
}
```

### SendMediaParams 类型

```typescript
interface SendMediaParams {
  chatId: string;
  type: 'image' | 'file';
  data: Buffer | Uint8Array;
  filename: string;
  mimeType: string;
  caption?: string;
}
```

---

## 更新日志

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.0.0 | 2026-04-03 | 初始版本 |
