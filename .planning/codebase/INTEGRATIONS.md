# External Integrations

**Analysis Date:** 2026-04-02

## APIs & External Services

**AI Provider:**
- Anthropic Claude API - Primary AI provider
  - SDK: `@anthropic-ai/claude-agent-sdk` 0.2.84
  - Auth: API key via config
  - Features: Tool use, MCP integration, persistent sessions

**Third-Party AI Providers (via OpenAI Bridge):**
- OpenAI-compatible APIs (DeepSeek, Gemini, Moonshot, etc.)
  - Implementation: `src/server/openai-bridge/`
  - Translation layer between Anthropic and OpenAI protocols
  - Supports model alias mapping

## Model Context Protocol (MCP)

**MCP Integration:**
- `src/server/agent-session.ts` - Main MCP integration
- `src/server/tools/builtin-mcp-registry.ts` - Builtin MCP registry
- `src/server/mcp-oauth/` - MCP OAuth authentication support

**Builtin MCP Servers:**
- `cron-tools` - Scheduled task management
- `im-cron-tool` - IM bot cron functionality
- `im-media-tool` - Media handling for IM
- `im-bridge-tools` - IM bridge functionality
- `gemini-image-tool` - Google Gemini image analysis
- `edge-tts-tool` - Edge Text-to-Speech
- `generative-ui-tool` - Generative UI tools

**MCP OAuth:**
- Discovery endpoint probing (`mcp-oauth/discovery.ts`)
- Dynamic client registration (`mcp-oauth/registration.ts`)
- Token management with refresh scheduling (`mcp-oauth/token-manager.ts`)
- Authorization flow with callback server (`mcp-oauth/authorization.ts`)

**Custom MCP:**
- User-installed MCP servers via npx
- npm spec sanitization for secure installation
- Path resolution: system npx, bundled Node.js npx, or bun x fallback

## OpenClaw Plugin Bridge

**Architecture:**
- Independent Bun process for OpenClaw channel plugins
- `src/server/plugin-bridge/` - Main bridge implementation
- `src/server/plugin-bridge/sdk-shim/` - SDK compatibility layer

**SDK Shim:**
- Full coverage of OpenClaw `plugin-sdk/*` exports (154 subpaths)
- Version: `2026.3.27-shim` (defined in `sdk-shim/package.json`)
- 28 handwritten modules (protected by `_handwritten.json`):
  - `index`, `account-id`, `agent-runtime`, `allow-from`, `channel-config-schema`
  - `channel-contract`, `channel-feedback`, `channel-policy`, `channel-runtime`
  - `channel-send-result`, `channel-status`, `command-auth`, `compat`, `core`
  - `feishu`, `infra-runtime`, `param-readers`, `plugin-entry`, `reply-history`
  - `reply-runtime`, `routing`, `setup`, `temp-path`, `text-runtime`
  - `tool-send`, `zalouser`
- 129 auto-generated stubs (regenerated via `bun run generate:sdk-shims`)

**Supported Platforms:**
- Telegram (via `@larksuite/openclaw-telegram`)
- Dingtalk (via `@larksuite/openclaw-dingtalk`)
- Feishu (via `@larksuite/openclaw-lark`)
- WeChat (via `@larksuite/openclaw-wechat`)
- QQ (via `@larksuite/openclaw-qq`)

## IM Bot Integrations

**Built-in Adapters (Rust):**
- `src-tauri/src/im/telegram.rs` - Telegram Bot API (long polling)
- `src-tauri/src/im/dingtalk.rs` - Dingtalk Stream API (WebSocket)
- `src-tauri/src/im/feishu.rs` - Feishu (deprecated, legacy support)

**Bridge Adapter (Bun):**
- `src-tauri/src/im/bridge.rs` - HTTP bidirectional forwarding for OpenClaw plugins

**Heartbeat System:**
- `src-tauri/src/im/heartbeat.rs` - Session keepalive for IM Bot
- Periodic ping to maintain active sessions

## Authentication & Identity

**Provider Auth:**
- API key-based authentication for AI providers
- OAuth 2.0 flow for MCP servers (via `mcp-oauth`)
- Token refresh scheduling for persistent auth

**IM Bot Auth:**
- Telegram: Bot Token via `@botfather`
- Dingtalk: AppKey/AppSecret OAuth
- Feishu: App ID/Secret authentication

## Data Storage

**Configuration:**
- JSON files in `~/.nova-agents/` (disk-first persistence)
- `config.json` - Main application config
- `cron_tasks.json` - Scheduled task definitions
- `projects/` - Per-project workspace configs

**Session Storage:**
- `src/server/SessionStore.ts` - Session message persistence
- Session metadata and attachments

**Logs:**
- Unified logging to `~/.nova-agents/logs/unified-{YYYY-MM-DD}.log`
- Sources tagged: `[REACT]`, `[BUN]`, `[RUST]`

## Caching & Proxies

**SOCKS Bridge:**
- `src/server/utils/socks-bridge.ts` - SOCKS5 proxy support
- Allows AI providers behind corporate proxies

**Proxy Configuration:**
- `src-tauri/src/proxy_config.rs` - System proxy injection
- Injects `HTTP_PROXY`/`NO_PROXY` to Bun subprocesses
- Prevents localhost traffic from being proxied

**HTTP Client:**
- `src-tauri/src/local_http.rs` - reqwest client factory
- `.no_proxy()` built-in to prevent system proxy interception
- SSE clients via `sse_client()`
- JSON clients via `json_client()`

## CI/CD & Deployment

**Update System:**
- Tauri updater plugin with signed updates
- Update endpoint: `https://download.nova-agents.io/update/{{target}}.json`
- Pubkey embedded in `tauri.conf.json`

**Bundled Resources:**
- `src-tauri/binaries/bun-*` - Bundled Bun runtime
- `src-tauri/resources/nodejs/` - Bundled Node.js runtime
- `src-tauri/resources/claude-agent-sdk/` - SDK files
- `src-tauri/resources/plugin-bridge-sdk-shim/` - OpenClaw SDK shim
- `src-tauri/resources/agent-browser-cli/` - Browser automation CLI

## Bundled Agent

**MA Helper (内置小助理):**
- `bundled-agents/nova-agent/` - Built-in AI assistant
- Location: `~/.nova-agents/` workspace
- Self-configuration via CLI tool
- Skills: `self-config`, `support`

---

*Integration audit: 2026-04-02*
