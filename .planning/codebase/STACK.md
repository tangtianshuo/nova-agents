# Technology Stack

**Analysis Date:** 2026-04-02

## Languages

**Primary:**
- TypeScript 5.9.3 - Frontend and Bun Sidecar
- Rust 1.77.2 - Tauri desktop framework

**Secondary:**
- JavaScript - Build scripts and CLI tools

## Runtime

**Environment:**
- Bun 1.3.2 - Agent Runtime Sidecar, Plugin Bridge
- Node.js bundled - MCP Server execution, npm packages (in `src-tauri/resources/nodejs/`)
- Git - Required for Claude Code operations (NSIS installer on Windows)

**Package Manager:**
- Bun 1.3.2 (primary)
- npm (bundled, for MCP/npx compatibility)

## Frameworks

**Core Desktop:**
- Tauri v2.9.6 - Desktop application framework
- React 19.2.0 - Frontend UI framework
- TypeScript 5.9.3 - Type safety

**Frontend Build:**
- Vite 7.1.12 - Build tool and dev server
- TailwindCSS 4.1.16 - Utility-first CSS
- PostCSS 8.5.6 - CSS processing

**AI/Agent:**
- `@anthropic-ai/claude-agent-sdk` 0.2.84 - Claude Agent SDK for AI interactions

**UI Components:**
- `@dnd-kit/core` 6.3.1 - Drag and drop
- `@dnd-kit/sortable` 10.0.0 - Sortable lists
- `@monaco-editor/react` 4.7.0 - Code editor (Monaco)
- `react-virtuoso` 4.18.3 - Virtualized lists
- `react-arborist` 3.4.3 - Tree component
- `@xterm/xterm` 6.0.0 - Terminal emulator
- `lucide-react` 0.554.0 - Icons

**Markdown/Content:**
- `react-markdown` 10.1.0 - Markdown rendering
- `remark-gfm` 4.0.1 - GitHub Flavored Markdown
- `remark-math` 6.0.0 - Math support (KaTeX)
- `rehype-katex` 7.0.1 - KaTeX HTML rendering
- `mermaid` 11.12.2 - Diagrams
- `react-syntax-highlighter` 16.1.0 - Code syntax highlighting

**Terminal:**
- `portable-pty` 0.8 - PTY support (Rust)
- `@xterm/addon-fit` 0.11.0 - Terminal fit addon
- `@xterm/addon-web-links` 0.12.0 - Clickable links in terminal

**Tauri Plugins:**
- `tauri-plugin-fs` 2.4.5 - File system access
- `tauri-plugin-dialog` 2.6.0 - Native dialogs
- `tauri-plugin-shell` 2 - Shell command execution
- `tauri-plugin-autostart` 2.5.1 - Auto-start on login
- `tauri-plugin-notification` 2.3.3 - System notifications
- `tauri-plugin-process` 2.3.1 - Process management
- `tauri-plugin-updater` 2.10 - Auto-updates
- `tauri-plugin-log` 2 - Logging
- `tauri-plugin-localhost` 2 - Localhost server

## Rust Dependencies

**Core:**
- `tokio` 1.49.0 (rt, sync, time, macros) - Async runtime
- `serde` 1.0 - Serialization
- `serde_json` 1.0 - JSON handling
- `reqwest` 0.13.1 (stream, json, blocking, multipart, socks) - HTTP client
- `futures` 0.3 - Async utilities
- `futures-util` 0.3.31 - Async stream utilities

**Web/SSE:**
- `axum` 0.8 (json, tokio, query, http1) - HTTP framework
- `tokio-tungstenite` 0.24 (native-tls) - WebSocket

**Scheduling:**
- `cron` 0.15 - Cron expression parsing
- `chrono` 0.4 (serde) - Date/time
- `chrono-tz` 0.10 - Timezone support
- `cron-parser` 5.5.0 - Cron schedule parsing

**Process/PTY:**
- `portable-pty` 0.8 - Cross-platform PTY
- `uuid` 1.11 (v4) - UUID generation
- `dirs` 6.0 - Platform directories
- `which` 8.0.0 - Command finder

**Utilities:**
- `base64` 0.22 - Base64 encoding
- `pulldown-cmark` 0.12 - Markdown parsing
- `prost` 0.13 - Protocol buffers
- `libc` 0.2.180 - C library bindings

## Configuration

**Environment:**
- `.env.example` - Template for environment variables
- `vite.config.ts` - Vite build configuration with proxy rules
- `tauri.conf.json` - Tauri app configuration (window, security, bundling)
- `tailwind.config.ts` - Tailwind CSS configuration
- `tsconfig.json` - TypeScript configuration

**Build:**
- `tsconfig.json` - Strict TypeScript with path aliases (`@/` maps to `src/renderer`)
- `vite.config.ts` - Build targets, chunk size limits (2500KB for large deps)

## Platform Requirements

**Development:**
- Bun 1.3.2+
- Node.js (for some npm-based tooling)
- Rust 1.77.2+

**Production:**
- Windows 10+ (NSIS installer)
- macOS 13.0+ (DMG)
- Bundled runtimes included (no external dependencies needed)

---

*Stack analysis: 2026-04-02*
