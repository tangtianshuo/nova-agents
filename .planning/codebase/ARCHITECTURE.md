# Architecture

**Analysis Date:** 2026-04-02

## Pattern Overview

**Overall:** Session-Centric Multi-Process Architecture with Rust Tauri as the desktop framework

**Key Characteristics:**
- **Session-centric sidecar model** — Each AI session runs in its own Bun process, isolated per session
- **Owner-based lifecycle** — Tabs, CronTasks, BackgroundCompletions, and Agents can all "own" a sidecar; it stops when all owners release it
- **Rust proxy layer** — All frontend HTTP/SSE traffic routes through Rust (reqwest) to prevent system proxy interference with localhost
- **Dual runtime** — Bun runs the agent SDK and core logic; Node.js runs MCP servers and community packages
- **Plugin bridge** — OpenClaw plugins run in a separate Bun process with SDK shim for compatibility

## Layers

**React Frontend:**
- Purpose: User interface, state management, chat UI
- Location: `src/renderer/`
- Contains: Pages (Chat, Settings, Launcher), Components, Context providers, API clients
- Depends on: Tauri IPC (`invoke`), Tauri events
- Used by: End users

**Rust Tauri Layer:**
- Purpose: Desktop integration, process management, HTTP/SSE proxy, security boundary
- Location: `src-tauri/src/`
- Contains: SidecarManager, CronTaskManager, TerminalManager, IM/Agent management, SSE proxy
- Depends on: Tauri framework, tokio, reqwest
- Used by: Frontend (via invoke/events), Bun Sidecar (via HTTP)

**Bun Sidecar:**
- Purpose: Claude Agent SDK runtime, tool execution, MCP server management
- Location: `src/server/`
- Contains: agent-session.ts, admin-api.ts, tools/, openai-bridge/, plugin-bridge/
- Depends on: Bun runtime, Claude Agent SDK
- Used by: Rust via HTTP (proxy)

**Plugin Bridge:**
- Purpose: Load OpenClaw community plugins (Feishu/WeChat/QQ)
- Location: `src/server/plugin-bridge/`
- Contains: Bridge index, SDK shim, MCP handler
- Used by: Rust IM/Agent management

## Data Flow

**Chat Message Flow:**

1. User types message in React frontend
2. Frontend calls `invoke('cmd_ensure_session_sidecar')` to get/create sidecar for session
3. Frontend POSTs to Rust SSE proxy: `proxy_http_request` → Rust proxies to Bun Sidecar
4. Bun Sidecar's `agent-session.ts` forwards to Claude Agent SDK subprocess
5. SDK yields events (thinking, tool use, message chunks) via stdout
6. Bun Sidecar broadcasts SSE events to Rust
7. Rust SSE proxy fans out to correct Tab's SSE connection
8. Frontend receives SSE events, updates UI

**IM Message Flow:**

1. External platform (Telegram/Dingtalk/OpenClaw) sends message
2. Rust IM adapter receives via polling/stream (TelegramAdapter/DingtalkAdapter/BridgeAdapter)
3. Rust calls `ensure_session_sidecar` for the agent's session
4. Message forwarded to Bun Sidecar via HTTP
5. Agent processes message, generates response
6. Response routed back through Rust IM adapter to external platform

**Cron Task Flow:**

1. Rust `CronTaskManager` fires based on schedule (wall-clock polling)
2. Rust calls `cmd_execute_cron_task` → `ensure_session_sidecar`
3. Rust spawns direct HTTP to Bun Sidecar `/api/cron/execute`
4. Agent runs task autonomously, results stored to disk

## Communication Patterns

**Tauri IPC (invoke):**
- Command-based RPC from frontend to Rust
- Examples: `cmd_ensure_session_sidecar`, `cmd_create_cron_task`, `cmd_terminal_create`
- Synchronous request/response

**Tauri Events:**
- Server-sent events from Rust to frontend
- Examples: `terminal:data:{id}`, `sse:{tabId}:{event}`
- Used for streaming responses and terminal I/O

**HTTP Proxy (Rust → Bun):**
- Rust `reqwest` client connects to Bun Sidecar HTTP server
- All connections use `local_http` module (`.no_proxy()` for localhost)
- Used for: API calls, health checks

**SSE (Bun → Rust → Frontend):**
- Bun Sidecar runs SSE server (`src/server/sse.ts`)
- Rust `sse_proxy` module streams events to frontend
- Format: `sse:{tabId}:{eventName}`
- Events: `chat:message-chunk`, `chat:status`, `chat:complete`, etc.

**Management API (Bun → Rust):**
- Bun Sidecar calls `127.0.0.1:{management_port}/api/im/wake`
- Rust `management_api.rs` handles internal IPC
- Used for: IM bot wake, config reload

## Key Architectural Patterns

**Session-Centric Sidecar (src-tauri/src/sidecar.rs):**
```rust
pub struct SessionSidecar {
    pub session_id: String,
    pub port: u16,
    pub workspace_path: PathBuf,
    pub owners: HashSet<SidecarOwner>,  // Tab, CronTask, BackgroundCompletion, Agent
    pub healthy: bool,
}
```
- One Sidecar per Session, but multiple owners can share it
- Port allocation from 31415-31915
- Health monitoring with auto-restart

**Owner Model (src-tauri/src/sidecar.rs):**
```rust
pub enum SidecarOwner {
    Tab(String),                 // Tab ID
    CronTask(String),            // CronTask ID
    BackgroundCompletion(String),// Session ID
    Agent(String),               // session_key
}
```
- `ensure_session_sidecar` adds an owner
- `release_session_sidecar` removes an owner
- Sidecar stops when `owners` becomes empty

**Tab-Scoped State (src/renderer/context/TabProvider.tsx):**
- Each Chat tab wrapped in TabProvider
- Own SSE connection, message history, API client
- Uses `useTabState()` hook for tab-scoped operations
- Settings/Launcher use Global Sidecar via `apiFetch.ts`

**Pit-of-Success Modules (src-tauri/src/):**
| Module | Function | Purpose |
|--------|----------|---------|
| `local_http.rs` | `builder()`, `sse_client()` | Creates reqwest clients with `.no_proxy()` for localhost |
| `process_cmd.rs` | `new()` | Creates Child processes with `CREATE_NO_WINDOW` flag |
| `proxy_config.rs` | `apply_to_subprocess()` | Injects `HTTP_PROXY`/`NO_PROXY` into subprocess env |
| `system_binary.rs` | `find()` | Searches system PATH reliably for tools |

**SSE Event Broadcasting (src/server/sse.ts):**
```typescript
broadcast(event: string, data: unknown): void
```
- Maintains client connections per tab
- Last-value cache for `chat:status` events
- SILENT_EVENTS filter for log noise reduction

**System Prompt Assembly (src/server/system-prompt.ts):**
- L1: Base identity (always)
- L2: Interaction channel (desktop/im/agent-channel) - mutually exclusive
- L3: Scenario context (cron-task/heartbeat) - additive

## Entry Points

**Application Entry:**
- `src-tauri/src/main.rs` — Tauri app entry, calls `lib::run()`
- `src-tauri/src/lib.rs` — App builder with all plugins, commands, setup logic

**Frontend Entry:**
- `src/renderer/main.tsx` — React mount
- `src/renderer/App.tsx` — Root component with routing

**Bun Sidecar Entry:**
- `src/server/index.ts` — Main Bun server, HTTP/SSE endpoints

**CLI Entry:**
- `src-tauri/src/cli.rs` — Detects CLI mode, spawns Bun script
- `src/cli/myagents.ts` — CLI script, parses args, calls Admin API

## Error Handling

**Strategy:** Layered error handling with fallback patterns

**Frontend:**
- `AppErrorBoundary` catches React errors
- `try/catch` around API calls with user-facing toast errors
- SSE connection auto-reconnect

**Rust:**
- `Result` types with `?` operator propagation
- `ulog_error!` macro for unified logging
- Health monitors detect and restart unhealthy sidecars
- Timeout protection (`awaitSessionTermination(10_000)`) for session cleanup

**Bun Sidecar:**
- SDK subprocess managed with timeout/abort signals
- `abortPersistentSession()` for clean generator termination
- Uncaught errors logged via UnifiedLogger

## Cross-Cutting Concerns

**Logging:** Three-layer unified logging (React/Bun/Rust) → `~/.nova-agents/logs/unified-{date}.log`
**Validation:** Zod schemas for frontend config; Rust serde for serialization
**Authentication:** Provider API keys stored encrypted in config.json
**Concurrency:** Tokio async runtime in Rust; Bun's built-in async

## Key File Locations

**Core Sidecar Logic:** `src-tauri/src/sidecar.rs` (145K, largest file)
**Frontend State:** `src/renderer/context/TabProvider.tsx`
**Bun Server:** `src/server/index.ts`
**Commands Registry:** `src-tauri/src/commands.rs` (39K)
**Cron Tasks:** `src-tauri/src/cron_task.rs` (105K)
**IM/Agent:** `src-tauri/src/im/mod.rs`

---

*Architecture analysis: 2026-04-02*
