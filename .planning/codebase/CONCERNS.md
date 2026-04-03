# Codebase Concerns

**Analysis Date:** 2026-04-02

## Tech Debt

### Agent Architecture Migration (v0.1.41)

**Status:** Partial completion with 4 remaining items from v0.1.41 upgrade

**Remaining Items:**
- **TD-5: Old IM Commands Not Aliased** (Priority: Medium | Workload: Low)
  - Files: `src-tauri/src/im/mod.rs`, `src-tauri/src/lib.rs`
  - Issue: Dual command registration (old `im::cmd_start_im_bot` etc. + new `im::cmd_start_agent_channel`). Frontend needs to know which set to use.
  - Fix approach: Make old commands internally delegate to new commands, or delete old commands after ImSettings deprecation.

- **TD-6 Residual: ImSettings Directory Cleanup** (Priority: Medium | Workload: High)
  - Files: `src/renderer/components/ImSettings/` (20+ files), `src/renderer/pages/Settings.tsx`
  - Issue: Entire `ImSettings` directory still maintained despite being marked "旧版 IM Bot 配置". Dual UI confusion for users.
  - Fix approach: Delete after confirming all `imBotConfigs` migrated to `agents[]`.

- **TD-7: Dual Event Emission** (Priority: Low | Workload: Low)
  - Files: `src-tauri/src/im/mod.rs`
  - Issue: Agent Channel emits both `agent:status-changed` and `im:status-changed` (for compatibility). Frontend must listen on both.
  - Fix approach: Remove `im:status-changed` emission after frontend fully migrated to `agent:status-changed`.

- **TD-8: management_api.rs Dual Lookup** (Priority: Low | Workload: Low)
  - Files: `src-tauri/src/management_api.rs`
  - Issue: `find_bot_refs()` and `find_bot_adapter()` check both `ManagedImBots` and `ManagedAgents` with two lock acquisitions.
  - Fix approach: Remove `ManagedImBots` branch after TD-1 completion + ImSettings deprecation.

**Reference:** `specs/tech_docs/agent_architecture_tech_debt.md`

---

### Legacy API in sidecar.rs

**Location:** `src-tauri/src/sidecar.rs:938`

**Issue:**
```rust
// TODO(PRD 0.1.0): Remove legacy API after confirming all frontend code
```

**Impact:** Unknown legacy endpoints still registered, potential confusion about which API to use.

**Fix approach:** Audit frontend usage, remove legacy endpoints, bump version gate.

---

### SSE Config Not Configurable

**Location:** `src-tauri/src/sse_proxy.rs:23`

**Issue:**
```rust
// TODO v0.2.0: Make these configurable via Settings
```

**Impact:** Hardcoded connection timeouts and limits cannot be adjusted by users.

---

## File Complexity Concerns

### Very Large Files

| File | Lines | Concern |
|------|-------|---------|
| `src-tauri/src/im/mod.rs` | 6260 | Single file contains entire IM/Bot/Agent management. Extremely high coupling. |
| `src/server/index.ts` | 7341 | Single file for entire Bun server. Multiple routing layers. |
| `src/server/agent-session.ts` | 6289 | Session management + tool registration + message generation in one file. |
| `src/renderer/pages/Settings.tsx` | 5609 | Settings page with all sub-panels inline. |

**Risk:** High cognitive load for modifications. A change in one area can silently affect unrelated features.

**Mitigation pattern in codebase:** The project uses Context separation (`TabContext`/`ConfigContext`) and modular files where possible. But `im/mod.rs` at 6260 lines remains an outlier.

---

## Dead Code

### Multiple #[allow(dead_code)] Annotations

The Rust codebase has extensive dead code suppression:

**sidecar.rs:**
- Lines 117, 373, 381, 418, 527, 607, 633, 640, 738, 755, 766, 773, 809, 967, 970
- Functions marked dead code but kept for compatibility: `get_session_sweeping_handlers()`, `get_active_sessions()`, `cleanup_stale_sidecars()`, etc.

**im/mod.rs:**
- Lines 39, 337, 339, 356 (helper functions)
- Line 3771: `save_session_history()` kept for potential future use

**management_api.rs:**
- Lines 62, 138, 595, 853, 861 (API functions)

**im/router.rs:**
- Lines 30, 33, 36: `new_for_agent()` never called despite having full implementation

**im/feishu.rs, im/telegram.rs, im/dingtalk.rs:**
- Various adapter methods marked dead code

**Impact:** Accumulated dead code obscures actual behavior and increases maintenance burden.

---

## Deprecated Commands

**Location:** `src-tauri/src/im/mod.rs`

Multiple commands marked deprecated but still functional:

```rust
// Line 4471
#[deprecated(note = "Use cmd_start_agent_channel instead")]

// Line 4557
#[deprecated(note = "Use cmd_stop_agent_channel instead")]

// Line 4572
#[deprecated(note = "Use cmd_agent_channel_status instead")]

// Line 4622
#[deprecated(note = "Use cmd_all_agents_status instead")]

// Line 5126
#[deprecated(note = "Use cmd_update_agent_config instead")]

// Line 5140
#[deprecated(note = "Use cmd_agent_channel_status or cmd_agent_status instead")]

// Line 5168
#[deprecated(note = "Use addAgentConfig on the frontend instead")]

// Line 5186
#[deprecated(note = "Use removeAgentConfig on the frontend instead")]
```

**Impact:** These commands still work but will be removed. Any code using them will break.

---

## Performance Considerations

### Connection Pool Strategy (sse_proxy.rs)

**Locations:**
- `src-tauri/src/sse_proxy.rs:175`
- `src-tauri/src/sse_proxy.rs:340`

**Pattern:**
```rust
// Use short-lived connection pool to balance performance and stability
```

**Current behavior:** Uses short-lived connections to prevent hanging on upstream failures.

**Limitation:** May increase connection overhead for high-frequency SSE scenarios.

---

### Sidecar Startup Timeout

**Location:** `src-tauri/src/sidecar.rs:1792`

**Issue:**
```
Possible causes: antivirus slow-scanning bun.exe, or port conflict
```

**Impact:** First workspace initialization can timeout on systems with aggressive antivirus or port conflicts.

**Current mitigation:** Adaptive startup timeout (recently added per commit `1dea9ff9`).

---

## Security Considerations

### Plugin Bridge Secrets in Environment

**Location:** `src-tauri/src/im/bridge.rs:905`

**Pattern:**
```rust
// Pass config via env var to avoid leaking secrets in `ps` process listing
```

**Good practice:** Config passed via `BRIDGE_PLUGIN_CONFIG` environment variable instead of command-line arguments.

**Remaining exposure:** Process list could still show environment variable names if attacker has local access.

---

### Localhost Proxy Bypass

**Location:** `src-tauri/src/local_http.rs`

**Protection:** All `local_http` clients use `.no_proxy()` to prevent system proxy interception.

**Risk:** If a developer creates a new localhost client using raw `reqwest::Client::new()`, system proxy (Clash/V2Ray) will cause 502 errors.

**Mitigation:** Project architecture docs explicitly forbid bare `reqwest::Client::new()` for localhost connections.

---

### File System Scope Limitation

**Constraint:** Tauri fs scope only covers `~/.nova-agents/**`

**Implication:** Frontend code cannot directly access arbitrary filesystem paths.

**Correct pattern:** Must use `invoke('cmd_read_workspace_file')` / `invoke('cmd_write_workspace_file')` for workspace files.

---

## Platform-Specific Concerns

### Windows: Git Dependency

**Issue:** Claude Agent SDK requires Git Bash on Windows for shell command execution.

**Mitigation:** NSIS installer bundles `Git-Installer.exe` for silent installation.

**Risk:** If Git is already installed but not in PATH, SDK may fail with "requires git-bash" error.

**Workaround:** Set `CLAUDE_CODE_GIT_BASH_PATH` environment variable.

---

### Windows: PowerShell vs wmic Fallback

**Location:** `src-tauri/src/sidecar.rs:3109`

**Pattern:**
```rust
// Use PowerShell Get-CimInstance (wmic is deprecated in Windows 10/11)
```

**Concern:** Older Windows systems without PowerShell would need wmic fallback.

---

### Windows: CREATE_NO_WINDOW for Subprocesses

**Location:** `src-tauri/src/process_cmd.rs`

**Purpose:** Prevents black console window from appearing when GUI app spawns subprocesses.

**Risk:** Any new subprocess creation using raw `std::process::Command::new()` will violate this protection.

**Mitigation:** Architecture docs explicitly forbid bare `std::process::Command::new()` for child processes.

---

## Known Bugs / Fragile Areas

### Terminal Session Cleanup on Frontend Miss

**Location:** `src-tauri/src/terminal.rs:250, 282`

**Pattern:**
```rust
/// don't leak even if the frontend misses the exit event.
```

**Issue:** If frontend misses the `terminal:exit:{id}` event, terminal sessions could leak.

**Current mitigation:** Reader loop self-cleans on shell exit + `cmd_terminal_close` as fallback.

---

### Cron Task Lock Holding

**Location:** `src-tauri/src/cron_task.rs:2231`

**Issue:**
```rust
// holding the lock during potentially slow ensure_sidecar (~2s).
```

**Risk:** Long lock hold during `ensure_sidecar` could block other cron executions.

**Current behavior:** Acceptable for current scale, but could become bottleneck with many concurrent cron tasks.

---

### Memory Auto-Update Session Scanning

**Location:** `src-tauri/src/im/memory_update.rs`

**Pattern:** Full scan of `sessions.json` to find qualifying sessions for memory update.

**Risk:** As session count grows, this could become slow. Sessions are stored in memory during scanning.

**Current behavior:** Only triggers on qualifying agents with small number of sessions typically.

---

## Testing Coverage Gaps

**Not found in exploration:**
- No test files detected in `src-tauri/src/` (Rust tests appear to be integration-level)
- Test patterns unclear from grep results
- Coverage requirements not enforced (no `CARGO_MAKEFLAGS` or coverage tooling detected)

---

## Dependency Risks

### Bundled Runtime Versions

| Dependency | Bundled Location | Risk |
|------------|-----------------|------|
| Bun | `src-tauri/binaries/bun-*` | SDK compatibility depends on specific Bun version |
| Node.js | `src-tauri/resources/nodejs/` | npm package compatibility varies by Node version |
| Git (Windows) | `src-tauri/nsis/Git-Installer.exe` | Version bundled may become outdated |

**Mitigation:** Version sync checked in build scripts. However, no automated update checking detected.

---

### SDK Shim Version Sync

**Locations:**
- `sdk-shim/package.json` version
- `src/server/plugin-bridge/compat-runtime.ts` SHIM_COMPAT_VERSION
- `src-tauri/src/im/bridge.rs` SHIM_COMPAT_VERSION

**Risk:** If any of these three versions fall out of sync, integrity checks or plugin compatibility may fail silently.

**Fix approach:** Project docs mandate keeping all three in sync, but no automated enforcement detected.

---

### reqwest Version

**Location:** `src-tauri/Cargo.toml:38`

```toml
reqwest = { version = "0.13.1", features = ["stream", "json", "blocking", "multipart", "socks"] }
```

**Note:** Version 0.13.x is relatively old. Monitor for security advisories.

---

## Build/CI Concerns

### Resources Cache Not Auto-Cleaned

**Issue:** Tauri caches `tauri.conf.json` in `target/{arch}/{profile}/resources/`

**Impact:** CSP or other config changes may not take effect after rebuild unless cache cleared.

**Workaround:** Build scripts (`build_windows.ps1`) manually clean resources directory.

**Risk:** Developers who modify build scripts may accidentally remove this cleanup.

---

## Missing Features / Future Work

### TODO: Load Persisted Custom Models

**Location:** `src/renderer/pages/Settings.tsx:1929`

```typescript
customModels: [],  // TODO: Load from persisted custom models if any
```

**Issue:** Custom models configured by user are not persisted across app restarts.

---

## Notes

- All security-sensitive operations (secrets, proxy, file access) follow "pit of success" patterns documented in `specs/tech_docs/architecture.md`
- The project has extensive architecture documentation but no automated enforcement of architecture constraints
- Large file complexity is partially mitigated by clear module boundaries in other files

---

*Concerns audit: 2026-04-02*
