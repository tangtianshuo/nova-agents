# nova-agents 功能规格文档

> 文档版本：v0.1.57
> 最后更新：2026-04-02

---

## 目录

1. [功能模块介绍](#1-功能模块介绍)
2. [快速使用指南](#2-快速使用指南)
3. [脚本文件详解](#3-脚本文件详解)
4. [核心架构设计](#4-核心架构设计)
5. [后期拓展性探讨](#5-后期拓展性探讨)

---

## 1. 功能模块介绍

### 1.1 核心模块分层

```
┌─────────────────────────────────────────────────────────────┐
│                      React 前端 (UI 层)                       │
│  TabContext / ConfigContext / TabProvider                    │
├─────────────────────────────────────────────────────────────┤
│                    Tauri Rust 层 (桥接层)                     │
│  SidecarManager / CronTaskManager / TerminalManager           │
├─────────────────────────────────────────────────────────────┤
│                    Bun Sidecar (Agent 运行时)                 │
│  AgentSession / AdminAPI / SSEServer / ToolHandlers           │
├─────────────────────────────────────────────────────────────┤
│                   Claude Agent SDK (AI 引擎)                  │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 前端模块 (src/renderer/)

| 模块 | 路径 | 职责 |
|------|------|------|
| **Tab 管理** | `context/TabContext.tsx` | 多 Tab 状态管理、消息历史、Session 绑定 |
| **配置管理** | `context/ConfigContext.tsx` | Provider/MCP/Agent 配置的双 Context 分离 |
| **API 层** | `api/fetch.ts` | Tab-scoped 请求封装、SSE 连接管理 |
| **Chat 页面** | `pages/ChatPage.tsx` | 核心对话界面、消息渲染、输入控制 |
| **设置页面** | `pages/Settings.tsx` | Provider/MCP/Agent/Plugin 配置浮层 |
| **Launcher** | `pages/Launcher.tsx` | 启动页、品牌展示、工作区选择 |
| **终端面板** | `components/TerminalPanel.tsx` | xterm.js PTY 集成 |

### 1.3 Rust 层模块 (src-tauri/src/)

| 模块 | 职责 |
|------|------|
| `sidecar.rs` | Session-Sidecar 生命周期管理、Owner 模型 |
| `sse_proxy.rs` | 多连接 SSE 代理、事件广播、Last-Value Cache |
| `commands.rs` | Tauri IPC 命令、配置读写、版本门控同步 |
| `cron_task.rs` | 定时任务调度器、三种调度模式、持久化 |
| `terminal.rs` | PTY 会话管理、xterm.js IPC 桥接 |
| `im/` | IM Bot 适配器（Telegram/Dingtalk/Bridge） |
| `local_http.rs` | localhost 请求客户端（防系统代理 502） |
| `process_cmd.rs` | 子进程创建（防 Windows 控制台窗口） |
| `proxy_config.rs` | 代理环境变量注入（防 Bun fetch 代理拦截） |
| `system_binary.rs` | 系统工具查找（跨 PATH 兼容性） |
| `cli.rs` | CLI 模式入口、端口发现 |

### 1.4 Bun Sidecar 模块 (src/server/)

| 模块 | 职责 |
|------|------|
| `index.ts` | Sidecar 主入口、路由注册、生命周期 |
| `agent-session.ts` | Claude SDK 会话管理、持久 Session、Pre-warm |
| `admin-api.ts` | CLI 管理接口、配置变更广播 |
| `sse.ts` | SSE 连接管理、Last-Value Cache、降噪过滤 |
| `system-prompt.ts` | L1/L2/L3 三层 Prompt 组装 |
| `openai-bridge/` | OpenAI 协议翻译（支持 DeepSeek/Gemini 等） |
| `plugin-bridge/` | OpenClaw 插件运行时、SDK Shim |
| `tools/` | MCP 工具实现（cron/media/browser/edge-tts） |

---

## 2. 快速使用指南

### 2.1 开发环境准备

```bash
# 首次克隆后运行
./setup.sh

# 检查依赖完整性
bun install
```

### 2.2 开发模式

```bash
# 浏览器开发模式（快速迭代，无桌面窗口）
./start_dev.sh

# Tauri 开发模式（完整桌面体验）
npm run tauri:dev

# Debug 构建（带 DevTools）
./build_dev.sh
```

### 2.3 生产构建

```bash
# macOS 生产构建
./build_macos.sh

# 发布到 R2
./publish_release.sh

# Windows 构建
.\build_windows.ps1
```

### 2.4 代码质量检查

```bash
npm run typecheck   # TypeScript 类型检查
npm run lint        # ESLint 检查
npm run build:web   # 前端生产构建
```

---

## 3. 脚本文件详解

### 3.1 setup.sh — 开发环境初始化

**执行时机**：首次克隆仓库后运行一次

**核心流程**：
```
[1/7] 检查依赖 (Node.js / npm / Bun / Rust / Cargo)
[2/7] 下载 Bun 运行时 (v1.3.6) → src-tauri/binaries/
[3/7] 下载 Node.js 运行时 → src-tauri/resources/nodejs/
[4/7] 安装前端依赖 (bun install)
[5/7] 检查 Rust 依赖 (cargo check / cargo fetch)
[6/7] 准备默认工作区 mino (git clone openmino)
[7/7] 完成提示
```

**关键设计**：
- Bun 二进制分 ARM/Intel 两个版本，按需下载
- Node.js 用于 MCP Server 和社区 npm 包（分层架构）
- mino 工作区每次拉取最新版本，`.git` 不保留

### 3.2 start_dev.sh — 浏览器开发模式

**执行方式**：`./start_dev.sh [agent_dir]`

**核心流程**：
```
1. 停止占用端口 3000/5173 的进程
2. 停止运行中的 nova-agents 桌面版
3. 启动后端服务器 (bun run index.ts --agent-dir ... --port 3000)
4. 启动前端 Vite 开发服务器 (bun run dev:web)
```

**端口占用检测**：
- 3000：后端 Sidecar SSE/API
- 5173：Vite 前端热更新

### 3.3 build_dev.sh — Debug 构建

**执行方式**：`./build_dev.sh`

**核心流程**：
```
[准备] 杀死残留进程、清理旧构建
[1/3] TypeScript 类型检查
[2/3] 构建前端 (VITE_DEBUG_MODE=true)
[3/3] Tauri Debug 构建 (--debug --bundles app)
```

**关键特性**：
- 创建占位符 `server-dist.js`（debug 模式下 sidecar.rs 从文件系统读取真实代码）
- 禁用 Apple 公证（开发版）
- 保留签名防止 TCC 权限丢失

### 3.4 build_macos.sh — 生产构建

**执行方式**：`./build_macos.sh`（交互式选择架构）

**核心流程**：
```
[准备] 版本同步检查、加载 .env 签名配置、清理进程
[1/7] 加载签名环境变量
[2/7] 检查依赖、mino 工作区、Rust 交叉编译目标
[3/7] CSP 验证（使用 tauri.conf.json 配置）
[4/7] TypeScript 类型检查
[5/7] 打包服务端代码 + 验证无硬编码路径
      ├─ server-dist.js (bun build --target=bun)
      ├─ plugin-bridge-dist.js
      ├─ Claude Agent SDK 复制
      ├─ agent-browser CLI 预装 (lockfile 加速)
      └─ 前端构建
[6/7] 签名外部二进制
      ├─ Bun 可执行文件 (重签名替换官方签名)
      ├─ Vendor 二进制 (ripgrep .node)
      └─ agent-browser CLI 原生二进制
[7/7] Tauri Release 构建 (支持多架构)
      ├─ 下载匹配架构的 Node.js
      ├─ 签名 Node.js 二进制
      └─ bun run tauri:build -- --target ...
```

**产物输出**：
```
src-tauri/target/<target>/release/bundle/
├── dmg/              # 官网下载用 DMG
└── macos/
    ├── nova-agents.app.tar.gz    # 自动更新用
    └── nova-agents.app.tar.gz.sig
```

**签名策略**：
- Bun 默认使用官方签名 (Jarred Sumner)，TCC 会将其视为独立应用
- 重签名替换为应用签名，使 Bun 与主应用共享 TCC 权限
- entitlements 提供 JIT 等运行时权限

### 3.5 publish_release.sh — R2 发布

**前置条件**：
- R2 凭证：R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_ACCOUNT_ID
- Cloudflare 缓存清除凭证：CF_ZONE_ID / CF_API_TOKEN
- rclone：`brew install rclone`

**核心流程**：
```
[1/7] 加载配置
[2/7] 检查 rclone
[3/7] 物料完整性检查
      ├─ DMG（官网下载渠道）
      ├─ tar.gz + sig（自动更新渠道）
      └─ 缺失则阻止或警告
[4/7] 生成更新清单
      ├─ darwin-aarch64.json
      ├─ darwin-x86_64.json
      └─ latest.json
[5/7] 上传到 R2 (rclone copy)
[6/7] 上传 manifest (rclone copy)
[7/7] 清除 CDN 缓存、验证上传结果
```

**上传后验证**：
```bash
curl -s https://download.nova-agents.io/update/latest.json | jq .
curl -s https://download.nova-agents.io/update/darwin-aarch64.json | jq .
```

### 3.6 Windows 脚本

| 脚本 | 用途 |
|------|------|
| `setup_windows.ps1` | Windows 环境初始化 |
| `build_dev_win.ps1` | Windows Debug 构建 |
| `build_windows.ps1` | Windows 生产构建 |
| `publish_windows.ps1` | Windows 发布到 R2 |
| `rebuild_clean.ps1` | 清理重建 |
| `rollback_release.ps1` | 回滚发布 |

---

## 4. 核心架构设计

### 4.1 Session-Centric Sidecar 架构

**核心原则**：
- 一个 Sidecar 进程 = 一个 Claude Agent SDK 实例
- Session : Sidecar = 1:1 严格对应
- Owner 模型：Tab / CronTask / BackgroundCompletion / Agent 共享 Sidecar

**Owner 生命周期**：
```
Tab 打开 → ensureSessionSidecar(sessionId, 'tab', tabId)
Tab 关闭 → releaseSessionSidecar(sessionId, 'tab', tabId)
所有 Owner 释放 → Sidecar 停止
```

**多 Owner 共享**：
```
Session Sidecar (session_abc, port:31415)
  └── owners: { Tab(tab-1), CronTask(cron-1) }
      → Tab 关闭后，CronTask 仍可继续使用
      → CronTask 结束后，Sidecar 才停止
```

### 4.2 通信架构

**三层通信**：
```
[Rust SSE Proxy]          ← 事件广播、端口隔离
      ↓
[Bun SSE Server]          ← 消息生成、工具执行
      ↓
[Claude Agent SDK]        ← AI 推理、工具调用
```

**Tab-scoped 隔离**：
- 每个 Tab 有独立 SSE 连接
- 事件格式：`sse:${tabId}:${eventName}`
- HTTP 请求通过 `invoke` → Rust → reqwest → Sidecar

### 4.3 配置持久化

**Disk-First 原则**：
```
配置写入 → Admin API → atomicModifyConfig() → config.json
         → 更新 Sidecar 内存状态
         → SSE 广播 → 前端 React 状态同步
```

**双 Context 分离**：
- `ConfigDataContext`：只读配置数据
- `ConfigActionsContext`：写操作（调用 Admin API）

### 4.4 双运行时策略

| 运行时 | 用途 | 打包位置 |
|--------|------|---------|
| **Bun** | Agent Runtime（SDK 执行、Sidecar 主进程） | `src-tauri/binaries/bun-*` |
| **Node.js** | MCP Server（npx）、社区 npm 包 | `src-tauri/resources/nodejs/` |

**PATH 优先级**：
```
bundledBunDir → systemNodeDirs → bundledNodeDir → ~/.nova-agents/bin → 系统 PATH
```

### 4.5 Pit-of-Success 四驾马车

| 模块 | 防止的问题 |
|------|-----------|
| `local_http` | 系统代理拦截 localhost → 502 |
| `process_cmd` | Windows GUI 弹出黑色控制台窗口 |
| `proxy_config` | Bun fetch 被代理拦截 localhost |
| `system_binary` | Finder 启动 PATH 不完整 |

### 4.6 Pre-warm 机制

```
配置变更 → schedulePreWarm() (500ms 防抖)
         → Pre-warm Session 创建
         → 用户消息注入 → wakeGenerator()
```

**关键约束**：
- MCP/Agents 同步触发 Pre-warm，Model 同步不触发
- `!preWarm` 条件守卫在持久模式下永远不执行
- MCP 配置权威来源分离：Tab 会话前端配置，IM/Cron 磁盘自 resolve

---

## 5. 后期拓展性探讨

### 5.1 新增模型供应商

**步骤**：
1. 在 `src/server/provider-verify.ts` 添加验证逻辑
2. 在 `src/server/openai-bridge/` 添加协议翻译（如需要）
3. 在前端 `Settings.tsx` 添加 Provider 配置 UI
4. 在 `src/shared/` 添加类型定义

**注意事项**：
- OpenAI 协议供应商走 Bridge 翻译层
- Anthropic 直连无需翻译

### 5.2 新增 MCP Server

**内置 MCP**：
- `builtin-mcp-registry.ts` 注册内置 MCP
- 工具实现在 `tools/` 目录

**外部 MCP**：
- 前端 `/api/mcp/set` 配置
- STDIO/HTTP/SSE 三种传输协议

### 5.3 新增 IM 平台

**通过 OpenClaw 插件**：
1. 安装插件：`nova-agents plugin install @scope/plugin`
2. 配置鉴权方式（config 填写 / QR 扫码）
3. 启动 Bot Channel

**架构约束**：
- 所有功能基于 `ChannelPlugin` 接口
- 禁止为单个插件硬编码逻辑
- 能力检测用 duck-typing

### 5.4 新增 Skills

**内置 Skills**：
- 放在 `bundled-skills/` 目录
- Skill 触发器在前端解析

**自定义 Skills**：
- 用户在工作区 `.claude/skills/` 目录创建
- AI 通过 Skill 工具调用

### 5.5 新增定时任务类型

**Rust 层**：
- `cron_task.rs` 添加新的 `CronSchedule` 变体
- 确保新增字段带 `#[serde(default)]`

**Bun 层**：
- `im-cron-tool.ts` 泛化为所有 Session 可用

### 5.6 性能优化方向

| 方向 | 当前状态 | 优化建议 |
|------|---------|---------|
| Sidecar 冷启动 | 每次新建进程 | 进程池预热 |
| MCP 工具发现 | 运行时加载 | 静态分析 + 预验证 |
| Session 恢复 | 全量重放 | 增量状态同步 |
| 大文件传输 | 内存全量加载 | 流式处理 |

### 5.7 安全增强方向

| 方向 | 当前状态 | 增强建议 |
|------|---------|---------|
| 凭据存储 | config.json 明文 | OS Keychain |
| 网络隔离 | localhost 绑定 | Unix Domain Socket |
| 插件沙箱 | 无隔离 | gVisor / WASM 沙箱 |
| 审计日志 | 基础覆盖 | 结构化审计 |

---

## 附录

### A. 关键文件路径

| 文件 | 说明 |
|------|------|
| `~/.nova-agents/config.json` | 应用配置 |
| `~/.nova-agents/logs/` | 统一日志 |
| `~/.nova-agents/cron_tasks.json` | 定时任务持久化 |
| `~/.nova-agents/workspace/` | 工作区目录 |
| `~/.nova-agents/bin/nova-agents` | CLI 工具 |

### B. 环境变量

| 变量 | 说明 |
|------|------|
| `NOVA_AGENTS_PORT` | Sidecar 端口（CLI 场景） |
| `HTTP_PROXY` / `NO_PROXY` | 代理配置 |
| `VITE_DEBUG_MODE` | 前端调试模式 |

### C. 端口分配

| 端口 | 说明 |
|------|------|
| 3000 | 开发模式后端 |
| 5173 | Vite 前端热更新 |
| 31415+ | Sidecar 动态分配 |
