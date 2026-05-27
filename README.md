<div align="center">

# nova-agents

**让每个人都有一个懂你、能替你干活的桌面 AI Agent**

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![macOS](https://img.shields.io/badge/macOS-13.0+-black.svg)](https://www.apple.com/macos/)
[![Windows](https://img.shields.io/badge/Windows-10+-blue.svg)](https://www.microsoft.com/windows/)
[![Version](https://img.shields.io/badge/Version-0.2.2-green.svg)](https://novaagents.io)

[官网](https://agent.novai.net.cn) · [下载](https://download.novai.net.cn/releases/v0.2.2/NovaAgents_0.2.2_x64-setup.exe) · [技术架构](specs/tech_docs/architecture.md) · [设计系统](specs/guides/design_guide.md)

</div>

---

## 什么是 nova-agents

nova-agents 是一款开源桌面端 AI Agent 产品，基于 Claude Agent SDK 构建，同时具备强大的人机协作能力和灵活的 IM Bot 交互——二合一，一键安装，零门槛。

无论你是学生、内容创作者、教育工作者、产品经理、开发者——任何想让 AI 真正帮你完成任务的人，nova-agents 都能为你的电脑注入灵魂，成为你的思维放大器。

## 快速体验

- 访问 [https://agent.novai.net.cn](https://novaagents.io) 下载安装包
- macOS 支持 Apple Silicon 和 Intel (暂时未发布)
- Windows 10 及以上

## 核心能力

- **Chrome 风格多标签页** — 每个 Tab 独立运行一个 Agent，真正的并行工作流
- **10+ 模型供应商** — Anthropic、DeepSeek、Moonshot、智谱、MiniMax、火山方舟、OpenRouter 等，按需切换，成本可控
- **MCP 工具集成** — 内置 MCP 协议支持（STDIO/HTTP/SSE），连接外部工具和数据源，Agent 能力无限扩展
- **Skills 技能系统** — 内置和自定义技能，一键触发常用操作，让 Agent 越用越懂你
- **自定义 Agent** — 配置独立 Prompt、工具、模型，打造专属 Agent
- **IM 聊天机器人** — 接入 Telegram / 钉钉 / 企业微信 / OpenClaw 社区插件，多 Bot 管理、交互式权限审批、定时任务
- **内嵌终端** — Chat 页面右侧分屏终端，无需切换窗口即可执行命令，支持日间/夜间主题自动切换
- **文件预览与编辑** — 工作区文件点击即预览（Monaco Editor），支持直接编辑并自动保存
- **智能权限管理** — Act / Plan / Auto 三种模式，安全可控
- **内置 MA 小助理** — 产品专属客服，帮用户诊断问题、配置工具、管理 Agent
- **自配置 CLI** — `nova-agents` 命令行工具，AI 和用户都能通过 Bash 管理配置
- **本地数据，持续进化** — 所有对话、文件、记忆存在本地，隐私有保障
- **完全开源** — Apache-2.0 协议

## 支持的模型供应商

| 供应商 | 代表模型 | 类型 |
|--------|----------|------|
| Anthropic | Claude Sonnet 4.6, Opus 4.6, Haiku 4.5 | 订阅/API |
| DeepSeek | DeepSeek Chat, Reasoner | API |
| Moonshot | Kimi K2.5, K2 Thinking, K2 | API |
| 智谱 AI | GLM 5, 4.7, 4.5 Air | API |
| MiniMax | M2.5, M2.1 Lightning | API |
| 火山方舟 | Doubao Seed, GLM 4.7, DeepSeek V3 | API |
| ZenMux | Gemini 3.1 Pro, Claude 4.6 等 | API |
| 硅基流动 | Kimi K2.5, GLM 4.7, DeepSeek V3 等 | API |
| OpenRouter | GPT-5.2 Codex, Gemini 3 等多模型 | API |

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | [Tauri v2](https://v2.tauri.app/) (Rust) |
| 前端 | React 19 + TypeScript + Vite + TailwindCSS v4 |
| 后端 | Bun + [Claude Agent SDK](https://docs.anthropic.com/en/docs/agents-and-tools/agent-sdk) 0.2.84 (多实例 Sidecar) |
| 通信 | Rust HTTP/SSE Proxy (`local_http` 模块) |
| 终端 | xterm.js + portable-pty (Rust PTY) |
| 拖拽 | @dnd-kit/sortable |
| AI Bash 环境 | 内置 Node.js（运行 MCP Server / npm 包） |

## 架构

**Session-Centric 多实例 Sidecar 架构** — 每个会话拥有独立的 Agent 进程，严格 1:1 隔离；多 Owner 共享机制让 Tab、定时任务、IM Bot 安全复用同一 Sidecar；Rust 代理层统一接管所有 HTTP/SSE 流量，零 CORS 问题；内置 Bun + Node.js 运行时，用户无需安装任何依赖。

```
┌────────────────────────────────────────────────────────────────┐
│                        Tauri Desktop App                        │
├────────────────────────────────────────────────────────────────┤
│  React Frontend                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │  Chat 1  │  │  Chat 2  │  │ Settings │  │   IM Bot     │  │
│  │ +Terminal │  │  Tab SSE │  │ 全局 API  │  │  多 Bot 管理   │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘  │
│       │              │             │                │           │
├───────┼──────────────┼─────────────┼────────────────┼───────────┤
│  Rust │              │             │                │           │
│  ┌────┴──────────────┴───┐  ┌─────┴─────┐  ┌──────┴────────┐ │
│  │    SidecarManager      │  │  Global   │  │  ManagedAgents │ │
│  │  Session:Sidecar 1:1   │  │  Sidecar  │  │  + OpenClaw   │ │
│  └────┬─────────┬────────┘  └───────────┘  │   Plugin      │ │
│       ▼         ▼                            │   Bridge      │ │
│  Sidecar   Sidecar                       Telegram / 钉钉 /     │ │
│  :31415    :31416                         飞书 / 微信 等插件    │ │
└────────────────────────────────────────────────────────────────┘
```

### 核心架构特性

- **双运行时内置** — Bun（Agent Runtime）+ Node.js（MCP Server / 社区工具），用户无需安装
- **持久 Session** — SDK subprocess 全程存活，消息流式输出，中断后可恢复
- **Pit-of-Success 四驾马车** — `local_http` / `process_cmd` / `proxy_config` / `system_binary` 四个模块消除常见陷阱
- **定时任务系统** — Rust 层统一管理，支持固定间隔 / Cron 表达式 / 一次性三种调度
- **OpenClaw 插件生态** — 通过独立 Bun Bridge 进程加载社区 IM 插件（飞书/微信/QQ 等）
- **自配置 CLI** — 内置 `nova-agents` 命令行工具，AI 和用户都能通过它管理配置
- **统一日志** — 前端 / Bun / Rust 三层日志汇入同一文件，排查无忧
- **内嵌终端** — PTY 终端集成在 Chat 分屏右侧，工作目录为当前工作区

> 完整架构说明、Session 切换机制、Owner 生命周期等详见 [技术架构文档](specs/tech_docs/architecture.md)。

## 系统要求

### 最终用户

- **macOS 13.0 (Ventura)** 或更高版本（Apple Silicon & Intel）
- **Windows 10** 或更高版本

应用内置所有运行时依赖（Bun + Node.js + Git），无需自行安装。

### 开发者

- macOS 13.0+ / Windows 10+
- [Rust](https://rustup.rs) 1.77.2+
- [Bun](https://bun.sh) 1.3.2+
- Node.js（部分 npm 工具需要）

## 快速开始（开发者）

```bash
# 克隆代码
git clone https://github.com/nova-agents/nova-agents.git
cd nova-agents

# 安装依赖
bun install

# 浏览器开发模式（快速迭代，不含桌面功能）
./start_dev.sh

# Tauri 开发模式（完整桌面体验）
npm run tauri:dev

# Debug 构建（含 DevTools）
./build_dev.sh

# 生产构建 (macOS)
./build_macos.sh

# 生产构建 (Windows)
.\build_windows.ps1

# 发布到 R2
./publish_release.sh       # macOS
.\publish_windows.ps1      # Windows
```

代码质量检查：

```bash
npm run typecheck && npm run lint
```

## 项目结构

```
nova-agents/
├── src/
│   ├── renderer/              # React 前端
│   │   ├── api/               # API 调用封装
│   │   ├── context/           # React Context（Tab/Config/SSE 等）
│   │   ├── hooks/             # 业务 Hooks
│   │   ├── components/        # UI 组件
│   │   └── pages/             # 页面（Chat/Settings/Launcher/Login）
│   ├── server/                # Bun 后端 Sidecar
│   │   ├── tools/             # MCP 工具实现
│   │   ├── openai-bridge/     # 三方供应商协议桥接（DeepSeek/Gemini 等）
│   │   └── plugin-bridge/     # OpenClaw 插件 Bridge
│   ├── cli/                   # 自配置 CLI 工具
│   └── shared/                # 前后端共享类型
├── src-tauri/                 # Tauri Rust 层
│   └── src/
│       ├── sidecar.rs         # Sidecar 生命周期管理
│       ├── sse_proxy.rs       # SSE 事件代理
│       ├── cron_task.rs       # 定时任务调度
│       ├── terminal.rs        # 内嵌终端 PTY
│       ├── im/                # IM Bot 适配器
│       └── commands.rs        # Tauri IPC 命令
├── bundled-agents/            # 内置 MA 小助理
├── specs/                     # 设计文档（tech_docs/、guides/、prd/）
└── scripts/                   # 构建脚本
```

## 核心架构模块

| 模块 | 文件 | 用途 |
|------|------|------|
| `local_http` | `src-tauri/src/local_http.rs` | localhost reqwest 客户端（防系统代理拦截 → 502） |
| `process_cmd` | `src-tauri/src/process_cmd.rs` | 子进程创建（防 Windows 弹黑色控制台窗口） |
| `proxy_config` | `src-tauri/src/proxy_config.rs` | 子进程代理环境变量注入（防 Bun fetch 被代理） |
| `system_binary` | `src-tauri/src/system_binary.rs` | 系统工具可靠查找（防 GUI 启动时 PATH 缺失） |
| Sidecar Manager | `src-tauri/src/sidecar.rs` | Session-Centric Sidecar 生命周期（Owner 模型） |
| SSE Proxy | `src-tauri/src/sse_proxy.rs` | 多连接 SSE 事件代理（按 Tab 隔离） |
| Cron Task | `src-tauri/src/cron_task.rs` | 定时任务调度与持久化（wall-clock polling） |
| Terminal | `src-tauri/src/terminal.rs` | 内嵌 PTY 终端（portable-pty + xterm.js） |
| Agent Session | `src/server/agent-session.ts` | Claude Agent SDK 会话管理（持久 Session） |
| System Prompt | `src/server/system-prompt.ts` | 三层 Prompt 组装（L1 身份 / L2 交互 / L3 场景） |

## 平台支持

| 平台 | 安装方式 | 要求 |
|------|---------|------|
| macOS | DMG | macOS 13.0+（Apple Silicon & Intel） |
| Windows | NSIS 安装包 / 便携版 | Windows 10+（内置 Git 安装器） |

## 文档

详细技术文档位于 `specs/` 目录：

| 文档 | 内容 |
|------|------|
| [技术架构](specs/tech_docs/architecture.md) | 系统分层、模块边界、数据流、Session-Centric 模型 |
| [设计系统](specs/guides/design_guide.md) | 颜色/字体/间距/组件/页面规范 |
| [CLI 架构](specs/tech_docs/cli_architecture.md) | 自配置 CLI 设计、版本门控、Admin API |
| [IM 集成](specs/tech_docs/im_integration_architecture.md) | Agent / Channel 详细设计、适配器模型 |
| [Plugin Bridge](specs/tech_docs/plugin_bridge_architecture.md) | OpenClaw 插件加载、SDK shim、消息流转 |
| [代理配置](specs/tech_docs/proxy_config.md) | 系统代理 + SOCKS5 桥接 |
| [Windows 适配](specs/tech_docs/windows_platform_guide.md) | PATH 问题、控制台窗口、npm 兼容 |
| [统一日志](specs/tech_docs/unified_logging.md) | 日志格式、来源、排查指南 |
| [Session ID](specs/tech_docs/session_id_architecture.md) | Session 生命周期、ID 格式 |

## 贡献

请参阅 [CONTRIBUTING.md](CONTRIBUTING.md) 了解贡献指南。

## 许可证

[Apache License 2.0](LICENSE)
