# IM Bot 接入指南

> 文档版本：v1.0.0
> 适用版本：nova-agents v0.1.41+
> 最后更新：2026-04-03

---

## 概述

nova-agents 提供三种方式将其他 IM（Instant Messaging）平台接入其 AI Agent 系统：

| 接入方式 | 推荐场景 | 难度 | 协议 |
|----------|---------|------|------|
| **OpenClaw 社区插件** | 已有 OpenClaw 插件的 IM 平台（QQ、微信、Matrix 等） | 低 | HTTP + OpenClaw Channel 协议 |
| **直接实现 ImAdapter** | 自建 IM 平台、需要深度定制 | 中 | Rust Trait + SSE |
| **外部项目 HTTP 推送** | 任何能发 HTTP 的外部系统 | 低 | POST JSON |

本文档详细介绍每种方式的接入流程、接口定义和注意事项。

---

## 架构概览

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          nova-agents                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐  │
│  │  TelegramAdapter  │    │   FeishuAdapter  │    │  DingtalkAdapter │  │
│  │  (Rust 内置)     │    │   (Rust 内置)    │    │   (Rust 内置)    │  │
│  └────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘  │
│           │                       │                       │             │
│  ┌────────┴───────────────────────┴───────────────────────┴─────────┐  │
│  │                      SessionRouter                                 │  │
│  │              (peer → Sidecar 映射)                                 │  │
│  └─────────────────────────────┬───────────────────────────────────┘  │
│                                │                                       │
│                     ┌──────────┴──────────┐                          │
│                     │    Bun Sidecar        │                          │
│                     │  (Claude Agent SDK)  │                          │
│                     └──────────────────────┘                          │
│                                                                         │
│  ┌───────────────────────────┴─────────────────────────────────────┐   │
│  │                    Plugin Bridge (Bun 进程)                         │   │
│  │     加载 OpenClaw 社区插件 → 消息转发 → HTTP → SessionRouter        │   │
│  └───────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 方式一：OpenClaw 社区插件接入（推荐）

### 1.1 工作原理

OpenClaw 是一个 IM 平台插件系统。nova-agents 内置 Plugin Bridge 机制，通过独立 Bun 进程加载 OpenClaw 插件，实现与社区生态的桥接。

**消息流向**：
```
外部 IM 平台 → OpenClaw 插件 → compat-runtime.ts → HTTP POST → Rust BridgeAdapter → SessionRouter → Bun Sidecar → AI 回复
```

### 1.2 前提条件

- 目标 IM 平台已有 OpenClaw 社区插件（发布在 npm）
- 插件需包含 `openclaw.plugin.json` 或在 `package.json` 中声明 `openclaw` 字段
- 插件需实现 `ChannelPlugin` 接口（核心是 `dispatchReply` 函数）

### 1.3 接入流程

#### 步骤 1：安装插件

通过 nova-agents 前端「聊天机器人 → 添加 Bot → 选择平台」界面，或使用 CLI：

```bash
nova-agents plugin install @openclaw/channel-qqbot
```

内部调用链：
```
cmd_install_openclaw_plugin(npm_spec)
  → install_openclaw_plugin()  # bridge.rs
    → npm install @openclaw/channel-qqbot
    → install_sdk_shim()        # 替换 node_modules/openclaw 为兼容层
    → 返回 manifest + capabilities
```

#### 步骤 2：配置插件

插件安装后，在 nova-agents 中创建 Bot 实例，选择对应平台并填入插件提供的凭证。

#### 步骤 3：启动 Bot

```bash
nova-agents channel start --plugin-id qqbot --config '{"appId": "...", "appSecret": "..."}'
```

内部流程：
```
cmd_start_agent_channel()
  → spawn_plugin_bridge()        # 启动 Bun 进程
  → register_bridge_sender()     # 注册 botId → mpsc::Sender 映射
  → listen_loop()                # 插件开始接收消息
```

### 1.4 OpenClaw 插件开发规范

如果需要为某 IM 平台开发新的 OpenClaw 插件，以下是关键接口约定：

#### 核心接口：dispatchReply

```typescript
// 伪代码，实际参考 OpenClaw SDK
interface DispatchContext {
  Body: string;           // 消息正文
  BodyForAgent: string;   // 发送给 AI 的正文（可预处理）
  SenderId: string;       // 发送者 ID
  SenderName: string;     // 发送者名称
  ChatType: 'direct' | 'group';
  From: string;           // 会话 ID（私聊为用户 ID，群聊为群 ID）
  MessageSid: string;     // 消息 ID
  WasMentioned?: boolean; // 是否 @机器人
  GroupSubject?: string;  // 群名称
  ReplyToBody?: string;   // 引用回复原文
  GroupSystemPrompt?: string; // 群聊自定义系统提示
  MediaPath?: string;     // 媒体文件路径（单文件）
  MediaPaths?: string[];  // 媒体文件路径（多文件）
  MediaType?: string;     // MIME 类型
}

function dispatchReply(params: {
  ctx: DispatchContext;
  dispatcher: {
    sendFinalReply(text: string): Promise<void>;
    sendBlockReply(text: string): Promise<void>;
    markComplete(): void;
  };
  replyOptions: {
    onPartialReply?(text: string): void;
    onReasoningStream?(text: string): void;
  };
}): { queuedFinal: number; counts: Record<string, number> }
```

#### 返回值约定（重要）

**所有 dispatch 相关函数必须返回 `{ queuedFinal, counts }` 结构**，否则插件会崩溃：

```typescript
// 正确返回值
return { queuedFinal: 0, counts: {} };

// 错误示例（会导致崩溃）
return;  // ❌
return { queuedFinal: 0 };  // ❌ counts 缺失
```

#### dispatchReply 上下文字段映射

compat-runtime.ts 从插件的 dispatch context 中提取以下字段，转发到 Rust：

| 插件 ctx 字段 | compat-runtime 变量 | Rust BridgeMessagePayload | 说明 |
|--------------|---------------------|---------------------------|------|
| `BodyForAgent` / `Body` | `text` | `text` | 消息正文 |
| `SenderId` | `senderId` | `sender_id` | 发送者 ID |
| `SenderName` | `senderName` | `sender_name` | 发送者名称 |
| `ChatType` | `chatType` | `chat_type` | `"group"` 或 `"direct"` |
| `From` | `chatId`（去除前缀） | `chat_id` | 会话 ID |
| `MessageSid` | `messageId` | `message_id` | 消息 ID |
| `WasMentioned` / `IsMention` | `isMention` | `is_mention` | 是否 @机器人 |
| `GroupSubject` / `GroupName` | `groupName` | `group_name` | 群名称 |
| `MessageThreadId` | `threadId` | `thread_id` | 线程 ID |
| `ReplyToBody` | `replyToBody` | `reply_to_body` | 引用回复原文 |
| `GroupSystemPrompt` | `groupSystemPrompt` | `group_system_prompt` | 群系统提示 |

**isMention 默认值逻辑**：
```typescript
const isMention = ctx.WasMentioned ?? ctx.IsMention ?? (chatType !== 'group');
// 私聊 → true（消息直达 bot），群聊 → false（需插件明确标记）
```

#### Plugin Manifest 格式

```json
// openclaw.plugin.json
{
  "name": "QQ Bot",
  "version": "1.0.0",
  "description": "QQ 机器人插件",
  "channels": [{
    "id": "qqbot",
    "name": "QQ",
    "icon": "qq.png",
    "authType": "qr" | "token" | "password",
    "capabilities": {
      "streaming": true,
      "edit": true,
      "media": true
    }
  }],
  "requiredFields": ["appId", "appSecret"]
}
```

#### QR 登录支持

若插件支持扫码登录，需要实现以下端点（Bridge 会调用）：

| 端点 | 方法 | 说明 |
|------|------|------|
| `/qr-login-start` | POST | 启动 QR 登录流程 |
| `/qr-login-wait` | POST | 轮询 QR 扫描状态 |
| `/restart-gateway` | POST | 重启网关连接 |

### 1.5 插件能力声明

插件应在 manifest 中声明自己的能力，nova-agents 据此决定流式输出策略：

```json
{
  "capabilities": {
    "streaming": true,      // 支持流式输出
    "streamingCardKit": false, // 支持飞书卡片流
    "edit": true,           // 支持编辑已有消息
    "toolGroups": ["default", "code"]
  }
}
```

**流式策略**：
- `streaming: true` + `edit: true` → 使用 `start_stream` / `stream_chunk` / `finalize_stream` 协议
- `streaming: true` + `edit: false` → 累积文本，block-end 时一次性发送
- `streaming: false` → 使用 edit-based draft 消息流（创建草稿 → 增量编辑 → 定稿）

---

## 方式二：直接实现 ImAdapter（Rust 层）

### 2.1 适用场景

- 自建 IM 平台，无现成 OpenClaw 插件
- 需要深度定制消息处理逻辑
- 希望获得最佳性能（Rust 直连，无 HTTP 中转）

### 2.2 ImAdapter Trait 定义

```rust
// src-tauri/src/im/adapter.rs

pub trait ImAdapter: Send + Sync + 'static {
    /// 验证连接并返回 bot 标识符（如用户名）
    fn verify_connection(
        &self,
    ) -> impl std::future::Future<Output = AdapterResult<String>> + Send;

    /// 注册平台命令（如 Telegram BotFather 菜单）
    fn register_commands(
        &self,
    ) -> impl std::future::Future<Output = AdapterResult<()>> + Send;

    /// 启动消息接收循环（长轮询、WebSocket 等）
    /// 阻塞直到 shutdown_rx 信号 true
    fn listen_loop(
        &self,
        shutdown_rx: tokio::sync::watch::Receiver<bool>,
    ) -> impl std::future::Future<Output = ()> + Send;

    /// 发送文本消息
    fn send_message(
        &self,
        chat_id: &str,
        text: &str,
    ) -> impl std::future::Future<Output = AdapterResult<()>> + Send;

    /// 已读 ACK（显示眼睛等反应）
    fn ack_received(&self, chat_id: &str, message_id: &str) -> impl std::future::Future<Output = ()> + Send;

    /// 处理中 ACK（显示 ⏳ 反应）
    fn ack_processing(&self, chat_id: &str, message_id: &str) -> impl std::future::Future<Output = ()> + Send;

    /// 清除 ACK 反应
    fn ack_clear(&self, chat_id: &str, message_id: &str) -> impl std::future::Future<Output = ()> + Send;

    /// 发送「正在输入」状态
    fn send_typing(&self, chat_id: &str) -> impl std::future::Future<Output = ()> + Send;
}
```

### 2.3 ImStreamAdapter 扩展 Trait

支持流式输出草稿消息的适配器需实现此扩展 Trait：

```rust
pub trait ImStreamAdapter: ImAdapter {
    /// 发送消息并返回 ID（用于后续编辑/删除）
    fn send_message_returning_id(
        &self,
        chat_id: &str,
        text: &str,
    ) -> impl std::future::Future<Output = AdapterResult<Option<String>>> + Send;

    /// 编辑已有消息
    fn edit_message(
        &self,
        chat_id: &str,
        message_id: &str,
        text: &str,
    ) -> impl std::future::Future<Output = AdapterResult<()>> + Send;

    /// 删除消息
    fn delete_message(
        &self,
        chat_id: &str,
        message_id: &str,
    ) -> impl std::future::Future<Output = AdapterResult<()>> + Send;

    /// 平台最大消息长度（如 Telegram 4096，飞书 15000）
    fn max_message_length(&self) -> usize;

    /// 发送权限审批卡片/按钮
    fn send_approval_card(
        &self,
        chat_id: &str,
        request_id: &str,
        tool_name: &str,
        tool_input: &str,
    ) -> impl std::future::Future<Output = AdapterResult<Option<String>>> + Send;

    /// 更新审批卡片状态
    fn update_approval_status(
        &self,
        chat_id: &str,
        message_id: &str,
        status: &str,
    ) -> impl std::future::Future<Output = AdapterResult<()>> + Send;

    /// 发送图片
    fn send_photo(
        &self,
        chat_id: &str,
        data: Vec<u8>,
        filename: &str,
        caption: Option<&str>,
    ) -> impl std::future::Future<Output = AdapterResult<Option<String>>> + Send;

    /// 发送文件
    fn send_file(
        &self,
        chat_id: &str,
        data: Vec<u8>,
        filename: &str,
        mime_type: &str,
        caption: Option<&str>,
    ) -> impl std::future::Future<Output = AdapterResult<Option<String>>> + Send;
}
```

### 2.4 ImMessage 结构

适配器发送消息到 SessionRouter 时使用此结构：

```rust
// src-tauri/src/im/types.rs

pub struct ImMessage {
    pub chat_id: String,           // 会话 ID
    pub message_id: String,        // 消息 ID
    pub text: String,              // 消息正文
    pub sender_id: String,         // 发送者 ID
    pub sender_name: Option<String>, // 发送者名称
    pub source_type: ImSourceType, // 私聊/群聊
    pub platform: ImPlatform,     // 平台类型
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub attachments: Vec<ImAttachment>, // 附件
    pub media_group_id: Option<String>, // 媒体组 ID（用于碎片合并）
    pub is_mention: bool,         // 是否 @机器人
    pub reply_to_bot: bool,        // 是否回复机器人消息
    pub hint_group_name: Option<String>, // 群名称提示（Bridge 插件提供）
    pub reply_to_body: Option<String>,   // 引用回复正文
    pub group_system_prompt: Option<String>, // 群系统提示
}
```

### 2.5 实现示例：最小化适配器

```rust
// src-tauri/src/im/myplatform.rs

use crate::im::adapter::{AdapterResult, ImAdapter};
use crate::im::types::ImMessage;
use std::future::Future;

pub struct MyPlatformAdapter {
    api_key: String,
    // ... 其他配置
}

impl ImAdapter for MyPlatformAdapter {
    async fn verify_connection(&self) -> AdapterResult<String> {
        // 调用平台 API 验证凭证
        let bot_info = self.fetch_bot_info().await?;
        Ok(bot_info.username)
    }

    async fn register_commands(&self) -> AdapterResult<()> {
        // 注册命令菜单
        Ok(())
    }

    async fn listen_loop(&self, mut shutdown_rx: tokio::sync::watch::Receiver<bool>) {
        loop {
            tokio::select! {
                _ = shutdown_rx.changed() => {
                    if *shutdown_rx.borrow() {
                        break;
                    }
                }
                message = self.poll_messages() => {
                    if let Some(msg) = message {
                        self.handle_message(msg).await;
                    }
                }
            }
        }
    }

    async fn send_message(&self, chat_id: &str, text: &str) -> AdapterResult<()> {
        self.send_text(chat_id, text).await
    }

    async fn ack_received(&self, _chat_id: &str, _message_id: &str) {}
    async fn ack_processing(&self, _chat_id: &str, _message_id: &str) {}
    async fn ack_clear(&self, _chat_id: &str, _message_id: &str) {}
    async fn send_typing(&self, _chat_id: &str) {}
}
```

### 2.6 注册适配器

在 `src-tauri/src/im/mod.rs` 中注册新适配器：

```rust
// 在 create_adapter 函数中添加
match platform {
    ImPlatform::Telegram => Box::new(TelegramAdapter::new(...)),
    ImPlatform::Feishu => Box::new(FeishuAdapter::new(...)),
    ImPlatform::Dingtalk => Box::new(DingtalkAdapter::new(...)),
    ImPlatform::OpenClaw(id) => Box::new(BridgeAdapter::new(id, port)),
    ImPlatform::MyPlatform => Box::new(MyPlatformAdapter::new(...)), // 新增
}
```

---

## 方式三：外部 HTTP 推送（最简接入）

### 3.1 适用场景

外部项目只需要发送消息到 nova-agents AI，不依赖特定 IM 平台协议。

### 3.2 接口规范

nova-agents 提供 HTTP 端点接收外部消息：

**端点**：`POST /api/im-bridge/message`（通过 Rust Management API）

**请求格式**（JSON）：

```json
{
  "botId": "uuid-string",           // Bot 实例 ID（必需）
  "pluginId": "my-platform",        // 平台标识符（必需）
  "senderId": "user-123",          // 发送者 ID
  "senderName": "张三",             // 发送者名称
  "text": "你好，帮我查一下天气",   // 消息正文
  "chatType": "direct",             // "direct" 或 "group"
  "chatId": "chat-456",             // 会话 ID
  "messageId": "msg-789",           // 消息 ID（可选）
  "groupId": "",                   // 群 ID（群聊时必需）
  "isMention": true,                // 是否 @机器人（群聊时）
  "groupName": "开发组",           // 群名称（可选）
  "threadId": "",                  // 线程 ID（可选）
  "replyToBody": "",               // 引用回复正文（可选）
  "groupSystemPrompt": "",          // 群系统提示（可选）
  "attachments": [                  // 附件（可选）
    {
      "fileName": "截图.png",
      "mimeType": "image/png",
      "data": "base64-encoded-content",
      "attachmentType": "image"
    }
  ]
}
```

**响应格式**：

```json
{
  "ok": true
}
```

### 3.3 发送 AI 请求示例

```bash
curl -X POST http://127.0.0.1:<rust-port>/api/im-bridge/message \
  -H "Content-Type: application/json" \
  -d '{
    "botId": "your-bot-id",
    "pluginId": "my-integration",
    "senderId": "user-001",
    "senderName": "测试用户",
    "text": "你好",
    "chatType": "direct",
    "chatId": "user-001"
  }'
```

### 3.4 注意事项

- 此端点仅在本地 localhost 可访问（127.0.0.1）
- 外部项目需要先获取 Rust Management API 端口（通过环境变量或端口文件）
- 不支持流式响应（消息推送到 AI 后，AI 回复通过注册的 sender 返回）

---

## 会话路由与生命周期

### Session Key 格式

所有 IM 会话通过 Session Key 路由：

```
私聊：im:{platform}:private:{chat_id}
群聊：im:{platform}:group:{group_id}
```

示例：
- Telegram 私聊：`im:telegram:private:123456789`
- 钉钉群聊：`im:dingtalk:group:987654321`

### Sidecar 生命周期

```
消息到达 → SessionRouter.ensuresession() → 获取/创建 Sidecar
  → AI 处理 → 流式响应 → 发送回复
  → 更新健康状态 → 消息完成
```

Sidecar 持有者（Owner）类型：
- `Tab` — 用户打开的聊天页面
- `CronTask` — 定时任务
- `BackgroundCompletion` — 后台 AI 任务
- `Agent` — IM 消息处理

所有 Owner 释放后，Sidecar 自动停止。

---

## 消息流式输出协议

### SSE 事件类型

Bun Sidecar 通过 SSE 向 Rust 推送事件：

| 事件名 | 说明 |
|--------|------|
| `partial` | 流式输出片段（草稿编辑） |
| `block-end` | 文本块结束 |
| `complete` | 会话完成，返回 sessionId |
| `error` | 错误 |
| `permission-request` | 权限审批请求 |

### 流式处理示例

```
partial: {"text": "正在思考"}
partial: {"text": "今天天气"}
block-end: {"text": "今天天气晴朗，温度 25°C"}
complete: {"sessionId": "sess-abc123"}
```

---

## 安全考虑

### 白名单机制

- 默认拒绝所有消息（空白白名单）
- 支持按 user_id 和 username 白名单
- QR 绑定请求绕过白名单验证

### 权限模式

| 模式 | 说明 |
|------|------|
| `plan` | 只分析不执行（默认） |
| `auto` | 分析后确认再执行 |
| `fullAgency` | 完全自主执行 |

### 工作区沙箱

AI 操作范围限制在配置的工作区路径内。

---

## 故障排查

### 常见问题

**1. Bridge 进程无法启动**

检查：
- npm 包是否正确安装：`ls ~/.nova-agents/openclaw-plugins/<plugin-id>/node_modules/`
- SDK shim 是否完整：`cat ~/.nova-agents/openclaw-plugins/<plugin-id>/node_modules/openclaw/package.json | grep version`

**2. 消息无法到达 AI**

检查：
- 端点是否可达：`curl http://127.0.0.1:<rust-port>/api/im-bridge/message`
- botId 是否正确：`curl http://127.0.0.1:<rust-port>/api/im/channels`
- 白名单是否包含发送者

**3. AI 回复未发送**

检查：
- Sidecar 是否正常运行：查看 `~/.nova-agents/logs/unified-*.log`
- 流式事件是否正常：搜索 `[agent]` 关键词

### 日志位置

| 日志类型 | 路径 |
|----------|------|
| 统一日志 | `~/.nova-agents/logs/unified-{YYYY-MM-DD}.log` |
| Rust 系统日志 | `~/Library/Logs/com.myagents.app/nova-agents.log`（macOS） |
| Windows 事件日志 | 事件查看器 Application 日志 |

### 日志关键词

| 问题类型 | 搜索关键词 |
|----------|-----------|
| IM 连接 | `[telegram]` `[feishu]` `[dingtalk]` `[bridge]` |
| AI 处理 | `[agent]` `pre-warm` `timeout` |
| 定时任务 | `[CronTask]` |
| 终端 | `[terminal]` |

---

## 参考文档

| 文档 | 说明 |
|------|------|
| [IM 集成架构](../tech_docs/im_integration_architecture.md) | 完整技术架构文档 |
| [Plugin Bridge 架构](../tech_docs/plugin_bridge_architecture.md) | OpenClaw 插件桥接详细设计 |
| [架构总览](../tech_docs/architecture.md) | nova-agents 整体架构 |
| [Session ID 架构](../tech_docs/session_id_architecture.md) | Session 管理机制 |

---

## 附录：版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.0.0 | 2026-04-03 | 初始版本，涵盖三种接入方式 |
