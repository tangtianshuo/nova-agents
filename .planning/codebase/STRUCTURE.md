# Codebase Structure

**Analysis Date:** 2026-04-02

## Directory Layout

```
D:\Projects\Tauri\nova-agents\
├── src/
│   ├── renderer/          # React frontend
│   ├── server/            # Bun sidecar
│   ├── cli/               # CLI tool
│   └── shared/            # Shared types
├── src-tauri/
│   ├── src/               # Rust backend
│   ├── binaries/          # Bundled Bun runtime
│   ├── resources/         # Bundled Node.js runtime
│   └── nsis/              # Windows installer resources
├── specs/                 # Design documents
├── bundled-agents/        # Built-in MA assistant
└── .planning/            # GSD planning docs
```

## Directory Purposes

**src/renderer/ (React Frontend):**
- Purpose: User interface layer
- Contains: pages/, components/, context/, hooks/, api/, utils/
- Key: All UI code, runs in Tauri WebView

**src/server/ (Bun Sidecar):**
- Purpose: Claude Agent SDK runtime, HTTP/SSE server
- Contains: agent-session.ts, index.ts, admin-api.ts, tools/, openai-bridge/, plugin-bridge/
- Key: All Bun/TypeScript backend logic

**src-tauri/src/ (Rust Backend):**
- Purpose: Desktop integration, process management, HTTP proxy
- Contains: sidecar.rs, commands.rs, cron_task.rs, im/, terminal.rs
- Key: All Rust code compiled into Tauri binary

**src/cli/ (CLI Tool):**
- Purpose: Self-configuration command-line interface
- Contains: myagents.ts, myagents.cmd
- Installed to: ~/.nova-agents/bin/

**src/shared/ (Shared Types):**
- Purpose: TypeScript types shared between frontend and backend
- Contains: Types for config, chat, system, etc.

**src-tauri/binaries/ (Bundled Runtime):**
- Purpose: Bundled Bun executable for sidecar
- Contains: bun-* executables for each platform

**src-tauri/resources/ (Bundled Runtime):**
- Purpose: Bundled Node.js runtime
- Contains: nodejs/ directory with node + npm/npx

**specs/ (Documentation):**
- Purpose: Design documents, architecture specs, guides
- Contains: tech_docs/, guides/, prd/, research/

**bundled-agents/ (Built-in Agent):**
- Purpose: MA Assistant (product customer service agent)
- Contains: nova-agent/ with CLAUDE.md and skills/

## Key File Locations

**Entry Points:**
- `src-tauri/src/main.rs` — Rust application entry
- `src-tauri/src/lib.rs` — Tauri app builder with all commands
- `src/renderer/main.tsx` — React entry point
- `src/renderer/App.tsx` — Root React component
- `src/server/index.ts` — Bun sidecar HTTP/SSE server

**Configuration:**
- `src/renderer/config/types.ts` — Frontend config types
- `src/renderer/config/ConfigContext.tsx` — Config state management
- `src-tauri/src/commands.rs` — Rust command handlers (39K)

**Core Session Logic:**
- `src-tauri/src/sidecar.rs` — SidecarManager, session lifecycle (145K)
- `src/renderer/context/TabProvider.tsx` — Tab-scoped state
- `src/server/agent-session.ts` — SDK session management

**Cron Task System:**
- `src-tauri/src/cron_task.rs` — CronTaskManager (105K)
- `src/server/tools/cron-tools.ts` — Cron tool definitions

**IM/Agent System:**
- `src-tauri/src/im/mod.rs` — IM/Agent module entry
- `src-tauri/src/im/telegram.rs` — Telegram adapter
- `src-tauri/src/im/dingtalk.rs` — Dingtalk adapter
- `src-tauri/src/im/bridge.rs` — OpenClaw bridge adapter

**Terminal:**
- `src-tauri/src/terminal.rs` — PTY terminal manager
- `src/renderer/components/TerminalPanel.tsx` — Terminal UI

**Plugin Bridge:**
- `src/server/plugin-bridge/index.ts` — Bridge entry point
- `src/server/plugin-bridge/sdk-shim/plugin-sdk/` — OpenClaw SDK shim

**OpenAI Bridge:**
- `src/server/openai-bridge/index.ts` — Bridge entry
- `src/server/openai-bridge/handler.ts` — Request translation

**Utilities:**
- `src-tauri/src/local_http.rs` — Local HTTP client builder
- `src-tauri/src/process_cmd.rs` — Subprocess creation
- `src-tauri/src/proxy_config.rs` — Proxy injection
- `src-tauri/src/sse_proxy.rs` — SSE proxy
- `src/server/utils/runtime.ts` — Runtime path detection
- `src/server/utils/platform.ts` — Cross-platform utilities

## Module Organization

**Frontend Modules (src/renderer/):**

| Module | Purpose |
|--------|---------|
| `pages/` | Route-level components: Chat, Settings, Launcher |
| `components/` | Reusable UI components |
| `context/` | React contexts: TabContext, ConfigContext, FileActionContext |
| `hooks/` | Custom React hooks |
| `api/` | API clients: tauriClient, sessionClient, sseClient, chatClient |
| `utils/` | Utility functions |
| `config/` | Configuration types and context |
| `services/` | Business logic services |
| `types/` | TypeScript type definitions |

**Server Modules (src/server/):**

| Module | Purpose |
|--------|---------|
| `agent-session.ts` | Claude SDK session management, message generator |
| `admin-api.ts` | Admin API handlers (config CRUD) |
| `index.ts` | HTTP/SSE server entry |
| `sse.ts` | SSE broadcast and connection management |
| `system-prompt.ts` | L1/L2/L3 prompt assembly |
| `tools/` | MCP tools: cron, im-cron, builtin-mcp-registry, etc. |
| `openai-bridge/` | OpenAI protocol translation for third-party providers |
| `plugin-bridge/` | OpenClaw plugin loading and bridge |
| `utils/` | admin-config, runtime, platform, shell utilities |

**Rust Modules (src-tauri/src/):**

| Module | Purpose |
|--------|---------|
| `lib.rs` | App builder, plugin registration, setup logic |
| `commands.rs` | Tauri command handlers |
| `sidecar.rs` | Sidecar process management (largest file) |
| `cron_task.rs` | Cron task scheduling and execution |
| `im/mod.rs` | IM/Agent management module |
| `im/telegram.rs` | Telegram bot adapter |
| `im/dingtalk.rs` | Dingtalk adapter |
| `im/bridge.rs` | OpenClaw bridge adapter |
| `terminal.rs` | PTY terminal management |
| `sse_proxy.rs` | SSE proxy to frontend |
| `local_http.rs` | HTTP client for localhost |
| `process_cmd.rs` | Subprocess spawning |
| `proxy_config.rs` | Proxy environment injection |
| `system_binary.rs` | System tool discovery |
| `management_api.rs` | Internal HTTP API for Bun→Rust IPC |
| `app_dirs.rs` | App data directories |
| `logger.rs` | Unified logging setup |
| `tray.rs` | System tray |
| `updater.rs` | Auto-update |

## Naming Conventions

**Files:**
- React components: PascalCase (`TabProvider.tsx`, `TerminalPanel.tsx`)
- TypeScript modules: camelCase (`agentSession.ts`, `adminApi.ts`)
- Rust modules: snake_case (`sidecar.rs`, `cron_task.rs`)
- Types: PascalCase (`Message`, `SessionState`)

**Directories:**
- React: kebab-case (`agent-settings/`, `custom-select/`)
- Server: kebab-case (`openai-bridge/`, `plugin-bridge/`)
- Rust: snake_case (`im/`, `utils/`)

## Where to Add New Code

**New Frontend Feature:**
1. UI component: `src/renderer/components/NewFeature.tsx`
2. If page-level: `src/renderer/pages/NewPage.tsx`
3. If shared state: add to `src/renderer/context/` or `src/renderer/hooks/`
4. API integration: add to `src/renderer/api/` or use `invoke`

**New Rust Command:**
1. Add handler function in `src-tauri/src/commands.rs`
2. Register in `invoke_handler` in `lib.rs`

**New MCP Tool:**
1. Tool definition: `src/server/tools/new-tool.ts`
2. Register in `src/server/tools/builtin-mcp-registry.ts`

**New Sidecar Endpoint:**
1. Add route handler in `src/server/index.ts`

**New IM Adapter:**
1. Create in `src-tauri/src/im/` (e.g., `new_adapter.rs`)
2. Add module to `src-tauri/src/im/mod.rs`
3. Wire up in `src-tauri/src/im/router.rs`

**New OpenClaw Shim:**
1. Add to `src/server/plugin-bridge/sdk-shim/plugin-sdk/`
2. If hand-written, add to `_handwritten.json` to protect from regeneration
3. Sync version in `sdk-shim/package.json`, `compat-runtime.ts`, `bridge.rs`

## Special Directories

**src-tauri/binaries/:**
- Purpose: Bundled Bun runtime for sidecar
- Generated: Yes
- Contains: Platform-specific Bun executables

**src-tauri/resources/nodejs/:**
- Purpose: Bundled Node.js runtime for MCP servers
- Generated: Yes
- Contains: node, npm, npx executables

**src-tauri/nsis/:**
- Purpose: Windows installer resources
- Contains: Git-Installer.exe, NSIS scripts

**~/.nova-agents/:**
- Purpose: User data directory (not in repo)
- Created at runtime
- Contains: config.json, workspaces/, logs/, cli/, cron_tasks.json, etc.

**src/server/plugin-bridge/sdk-shim/:**
- Purpose: OpenClaw SDK compatibility layer
- Generated: Partially (stub files from `generate:sdk-shims` script)
- Committed: Yes (in sdk-shim/ directory)

**bundled-agents/nova-agent/:**
- Purpose: Built-in MA assistant agent
- Contains: CLAUDE.md, .claude/skills/
- Version-gated: Changes require ADMIN_AGENT_VERSION bump

---

*Structure analysis: 2026-04-02*
