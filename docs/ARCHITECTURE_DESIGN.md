# nova-agents 架构设计文档

> 文档版本：v0.1.57
> 最后更新：2026-04-02

---

## 目录

1. [设计原则与目标](#1-设计原则与目标)
2. [系统架构概览](#2-系统架构概览)
3. [核心模块设计](#3-核心模块设计)
4. [通信机制](#4-通信机制)
5. [数据流设计](#5-数据流设计)
6. [扩展性设计](#6-扩展性设计)
7. [安全性设计](#7-安全性设计)

---

## 1. 设计原则与目标

### 1.1 核心设计原则

**Session-Centric 优先**
- 每个会话（Session）拥有独立的 Agent 运行时
- 严格的 1:1 映射关系：Session ↔ Sidecar
- 支持多 Owner 共享：一个 Sidecar 可被 Tab/CronTask/Agent 等多方使用

**后端自主，前端辅助**
- Sidecar 可独立运行，无需前端 Tab
- 定时任务、IM Bot 等后台任务不依赖 UI
- 前端仅负责状态展示和用户交互

**分层隔离**
- Rust 层：进程管理、系统交互、IPC 桥接
- Bun 层：AI 运行时、工具执行、协议翻译
- React 层：状态展示、用户交互

**零信任安全**
- 本地绑定：所有 Sidecar 仅监听 127.0.0.1
- 最小权限：Tauri Capabilities 最小化
- 沙箱隔离：插件运行在独立进程

### 1.2 设计目标

| 目标 | 指标 |
|------|------|
| 多会话并行 | 支持 10+ 并发 Tab |
| 快速启动 | Sidecar 冷启动 < 3s |
| 稳定运行 | 72h 无消息丢失 |
| 无感更新 | 自动热更新 < 30s |

---

## 2. 系统架构概览

### 2.1 分层架构

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           表现层 (React)                                   │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐             │
│  │   Chat Page    │  │  Settings Page │  │ Launcher Page  │             │
│  │   Tab 1..N     │  │  Provider/MCP  │  │  工作区选择    │             │
│  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘             │
│          │                    │                    │                       │
│          ▼                    ▼                    ▼                       │
│  ┌─────────────────────────────────────────────────────────────┐         │
│  │                    Tauri IPC (invoke)                       │         │
│  └─────────────────────────────────────────────────────────────┘         │
├──────────────────────────────────────────────────────────────────────────┤
│                           控制层 (Rust)                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │ SidecarMgr   │  │ CronTaskMgr  │  │ TerminalMgr  │                   │
│  │ Session-1:1  │  │ 定时调度     │  │ PTY 会话     │                   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                   │
│         │                  │                  │                            │
│  ┌──────┴──────────────────┴──────────────────┴───────┐                 │
│  │              SSE Proxy (多连接广播)                   │                 │
│  └────────────────────────┬────────────────────────────┘                 │
├───────────────────────────┼──────────────────────────────────────────────┤
│                           ▼                                              │
│  ┌─────────────────────────────────────────────────────────────┐         │
│  │                    Bun Sidecar 运行时                        │         │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐            │         │
│  │  │ AgentSession│  │ Admin API  │  │ SSE Server │            │         │
│  │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘            │         │
│  │        └───────────────┼────────────────┘                     │         │
│  │                        ▼                                      │         │
│  │  ┌──────────────────────────────────────────────────┐       │         │
│  │  │            Claude Agent SDK (@anthropic-ai)         │       │         │
│  │  └──────────────────────────────────────────────────┘       │         │
│  └─────────────────────────────────────────────────────────────┘         │
├──────────────────────────────────────────────────────────────────────────┤
│                           工具层 (Bun)                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │ MCP Tools    │  │  OpenAI      │  │  Plugin      │                   │
│  │ cron/media   │  │  Bridge      │  │  Bridge      │                   │
│  │ browser/tts  │  │  (翻译层)    │  │  (OpenClaw)  │                   │
│  └──────────────┘  └──────────────┘  └──────────────┘                   │
└──────────────────────────────────────────────────────────────────────────┘
```

### 2.2 进程模型

```
┌─────────────────────────────────────────────────────────────┐
│                    Tauri 主进程 (Rust)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │  Main Window│  │  Sidecar    │  │  CronTask   │       │
│  │  (WebView)  │  │  Manager    │  │  Manager    │       │
│  └─────────────┘  └──────┬──────┘  └──────┬──────┘       │
│                          │                 │               │
├──────────────────────────┼─────────────────┼───────────────┤
│                    子进程 (Bun)                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ Sidecar A  │  │ Sidecar B  │  │ Plugin      │          │
│  │ (session1) │  │ (session2) │  │ Bridge      │          │
│  │ port:31415 │  │ port:31416 │  │             │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 数据流向

```
用户输入 ──► React ──► Tauri IPC ──► Rust SidecarMgr ──► Bun Sidecar
                                                              │
                                                              ▼
                                                       Claude SDK
                                                              │
                                                              ▼
◄────── SSE 事件 ◄── Bun SSE Server ◄── Rust SSE Proxy ◄── 工具调用结果
                                                              │
                                                              ▼
                                                       工具执行
                                                       /    |    \
                                                      ▼     ▼     ▼
                                                   MCP   Bridge  Native
```

---

## 3. 核心模块设计

### 3.1 SidecarManager (Rust)

**职责**：
- Session ↔ Sidecar 生命周期管理
- Owner 注册与释放
- 端口分配与健康检测

**核心数据结构**：
```rust
pub struct SessionSidecar {
    pub session_id: String,
    pub port: u16,
    pub workspace_path: PathBuf,
    pub owners: HashSet<SidecarOwner>,
    pub healthy: bool,
}

pub enum SidecarOwner {
    Tab(String),                 // Tab ID
    CronTask(String),           // CronTask ID
    BackgroundCompletion(String),// Session ID
    Agent(String),              // session_key
}
```

**关键方法**：
```rust
// 确保 Session 有运行中的 Sidecar
fn ensure_session_sidecar(
    session_id: &str,
    workspace_path: &Path,
    owner: SidecarOwner,
) -> Result<u16>;

// 释放 Owner 对 Sidecar 的使用
fn release_session_sidecar(
    session_id: &str,
    owner: SidecarOwner,
) -> Result<()>;

// 当所有 Owner 都释放后，Sidecar 才停止
```

### 3.2 AgentSession (Bun)

**职责**：
- Claude SDK 会话管理
- 消息生成与流式处理
- Pre-warm 与 Abort 控制

**核心流程**：
```typescript
// 1. Pre-warm (配置同步)
await preWarmSession(sessionId, config)

// 2. 消息生成 (持久循环)
async function* messageGenerator() {
  while (true) {
    // 等待用户消息或唤醒信号
    await nextMessageOrWake()
    // 调用 SDK
    for await (const event of sdk.query(messages)) {
      yield event
    }
  }
}

// 3. Abort (优雅停止)
function abortPersistentSession() {
  shouldAbort = true
  wakeGenerator()  // 唤醒 Promise 门控
  interruptSubprocess()  // 中断 SDK 子进程
}
```

### 3.3 SSEProxy (Rust)

**职责**：
- 多连接管理
- 事件广播
- Last-Value Cache（解决中途接入问题）

**事件格式**：
```
sse:${tabId}:${eventName}
示例: sse:tab-xxx:chat:message-chunk
```

**降噪策略**：
| 事件类型 | 处理方式 |
|---------|---------|
| `chat:message-chunk` | 高频，跳过 console.log |
| `chat:thinking-delta` | 高频，跳过 |
| `chat:status` | 缓存，供新连接 replay |
| `chat:complete` | 记录，触发前端状态更新 |

### 3.4 CronTaskManager (Rust)

**职责**：
- 定时任务调度
- 三种调度模式
- 持久化与崩溃恢复

**调度模式**：
```rust
pub enum CronSchedule {
    Every { minutes: u32, start_at: Option<DateTime> },
    Cron { expr: String, tz: Option<String> },
    At { at: DateTime },
}
```

**持久化**：
- 任务定义：`~/.nova-agents/cron_tasks.json`
- 执行记录：`~/.nova-agents/cron_runs/<taskId>.jsonl`

### 3.5 AdminAPI (Bun)

**职责**：
- CLI 管理接口
- 配置变更处理
- SSE 广播触发

**命令路由**：
```
/api/admin/mcp/*    MCP 服务器管理
/api/admin/model/*  模型供应商管理
/api/admin/agent/*  Agent 与 Channel 管理
/api/admin/cron/*   定时任务管理
/api/admin/plugin/*  OpenClaw 插件管理
```

**写入流程**：
```
CLI 请求 ──► Admin API
          ──► atomicModifyConfig() 写磁盘
          ──► 更新内存状态 (setMcpServers 等)
          ──► SSE 广播 ──► 前端同步
```

---

## 4. 通信机制

### 4.1 IPC 通信

**Tauri IPC 命令**：
```rust
// 配置相关
invoke('cmd_update_agent_config', { agentId, config })
invoke('cmd_get_app_config', {})
invoke('cmd_save_app_config', { config })

// Session 管理
invoke('cmd_ensure_session_sidecar', { sessionId, workspace })
invoke('cmd_release_session_sidecar', { sessionId, ownerType, ownerId })
invoke('cmd_get_session_port', { sessionId })

// 终端
invoke('cmd_terminal_create', { workspace, rows, cols, port, id })
invoke('cmd_terminal_write', { id, data })
invoke('cmd_terminal_resize', { id, rows, cols })
invoke('cmd_terminal_close', { id })
```

### 4.2 HTTP/SSE 通信

**Sidecar 端口发现**：
```rust
// Rust 层
fn get_session_port(session_id: &str) -> Option<u16> {
    sidecar_manager.get_port(session_id)
}

// HTTP 代理
reqwest::Client -> sidecar_port -> /api/* 或 /sse/*
```

**SSE 连接管理**：
```typescript
// 前端
const es = new EventSource(`/api/sse?tabId=${tabId}`)
es.addEventListener('sse:tab-xxx:chat:message-chunk', (e) => {
  // 处理流式消息
})
```

### 4.3 文件系统通信

**Rust → Bun**：
- 环境变量注入：`NOVA_AGENTS_PORT`、`NOVA_AGENTS_WS_PORT`
- 工作目录设置：`workspace_path`
- 配置文件传递：命令行参数或环境变量

**Workspace 文件访问**：
```
前端 ──► invoke('cmd_read_workspace_file') ──► Rust ──► 读取工作区文件
前端 ──► invoke('cmd_write_workspace_file') ──► Rust ──► 写入工作区文件
```

---

## 5. 数据流设计

### 5.1 用户消息流

```
1. 用户在 Chat 输入框输入消息
2. React 调用 useTabState().apiPost('/api/chat/message', { message })
3. Rust 代理转发到对应 Sidecar 端口
4. Sidecar 将消息放入消息队列
5. wakeGenerator() 唤醒消息循环
6. Claude SDK 处理消息，yield 流式事件
7. SSE 事件流回前端
8. React 更新消息状态
```

### 5.2 配置变更流

```
1. 用户在 Settings 修改 Provider 配置
2. 前端调用 Admin API (/api/admin/model/set-key)
3. Admin API 验证请求
4. atomicModifyConfig() 原子写入磁盘
5. setProviders() 更新内存状态
6. broadcast() SSE 事件
7. React ConfigContext 收到事件
8. 前端状态与磁盘同步
```

### 5.3 定时任务流

```
1. CronTaskManager 调度器触发
2. ensure_session_sidecar() 确保 Sidecar 运行
3. Sidecar 接收任务消息
4. Claude SDK 执行任务
5. 结果通过 SSE 通知前端
6. release_session_sidecar() 释放 Owner
```

---

## 6. 扩展性设计

### 6.1 模型供应商扩展

**添加新供应商**：
```
src/server/
├── provider-verify.ts      # 添加验证逻辑
├── openai-bridge/
│   └── translate/
│       └── your-provider.ts  # 如需要协议翻译
└── types/
    └── provider.ts         # 添加类型定义
```

**Bridge 协议支持**：
- OpenAI 协议：直接通过 Bridge 翻译
- Anthropic 协议：直连无需翻译
- 其他协议：按需实现翻译层

### 6.2 MCP 工具扩展

**内置 MCP**：
```typescript
// src/server/tools/builtin-mcp-registry.ts
export const builtinMcpTools = {
  'im-cron': imCronTool,
  'im-media': imMediaTool,
  'edge-tts': edgeTtsTool,
  'gemini-image': geminiImageTool,
}
```

**外部 MCP**：
- STDIO 传输：Bun spawn 子进程
- HTTP 传输：reqwest 请求
- SSE 传输：EventSource + 回调

### 6.3 IM 平台扩展

**通过 OpenClaw 插件**：
```
nova-agents plugin install @scope/plugin
  ──► 下载 npm 包
  ──► 启动 Plugin Bridge 进程
  ──► 加载 ChannelPlugin
  ──► 启动 Bot Channel
```

**SDK Shim 机制**：
- 手写 shim：真实实现（`plugin-sdk/_handwritten.json`）
- 自动生成 stub：首次调用警告，防止崩溃

### 6.4 Skills 扩展

**内置 Skills**：
```
bundled-skills/
├── agent-browser/
│   └── SKILL.md
└── download-anything/
    └── SKILL.md
```

**自定义 Skills**：
- 用户在工作区 `.claude/skills/` 创建
- AI 通过 Skill 工具调用
- 支持参数和环境变量

---

## 7. 安全性设计

### 7.1 网络安全

| 措施 | 实现 |
|------|------|
| 本地绑定 | Sidecar 仅监听 127.0.0.1 |
| 无外部暴露 | Rust 层 reqwest 不暴露端口 |
| 代理保护 | local_http 模块内置 no_proxy |

### 7.2 进程安全

| 措施 | 实现 |
|------|------|
| Windows 控制台隐藏 | process_cmd 模块 CREATE_NO_WINDOW |
| 子进程代理注入 | proxy_config 统一注入 HTTP_PROXY |
| TCC 权限隔离 | 应用签名 + entitlements |

### 7.3 配置安全

| 措施 | 实现 |
|------|------|
| 凭据存储 | config.json（未来迁移到 Keychain） |
| 工作区隔离 | 每个工作区独立目录 |
| 路径验证 | Rust 层验证 Agent 目录访问 |

### 7.4 CSP 安全

```json
{
  "csp": {
    "default-src": "'self'",
    "script-src": "'self'",
    "img-src": ["'self'", "https:"],
    "connect-src": ["'self'", "127.0.0.1"],
    "style-src": ["'self'", "'unsafe-inline'"]
  }
}
```

---

## 附录

### A. 关键常量

| 常量 | 值 | 说明 |
|------|-----|------|
| `DEFAULT_SIDECAR_PORT_START` | 31415 | Sidecar 端口起始 |
| `PRE_WARM_DEBOUNCE_MS` | 500 | Pre-warm 防抖 |
| `SESSION_ABORT_TIMEOUT_MS` | 10000 | Abort 超时 |
| `SSE_HEARTBEAT_INTERVAL_MS` | 30000 | SSE 心跳间隔 |

### B. 目录结构

```
~/.nova-agents/
├── config.json           # 应用配置
├── sidecar.port          # Global Sidecar 端口
├── .cli-version          # CLI 版本门控
├── .admin-agent-version  # 小助理版本门控
├── logs/                 # 统一日志
│   └── unified-YYYY-MM-DD.log
├── workspace/            # 工作区
│   └── <workspace-id>/
├── cron_tasks.json       # 定时任务定义
├── cron_runs/            # 定时任务执行记录
│   └── <taskId>.jsonl
└── bin/                  # CLI 工具
    └── nova-agents
```

### C. 版本号同步

| 文件 | 字段 | 说明 |
|------|------|------|
| `package.json` | version | 前端版本 |
| `src-tauri/tauri.conf.json` | version | Tauri 版本 |
| `src-tauri/Cargo.toml` | version | Rust 版本 |
| `src-tauri/src/commands.rs` | CLI_VERSION | CLI 版本门控 |
| `src-tauri/src/commands.rs` | ADMIN_AGENT_VERSION | 小助理性版本门控 |
