# nova-agents 用户登录注册

## What This Is

nova-agents 桌面应用的**用户身份认证模块**。基于短信验证码实现用户的登录和注册功能，接入已有的 `@nova-intelligent/auth-sdk`，为桌面客户端提供用户身份体系。

**现状：** nova-agents 是多会话 AI Agent 桌面客户端，无用户身份系统。所有会话共享同一配置，无个人化设置、多用户隔离、订阅管理。

## Core Value

**用户能够通过手机号 + 短信验证码安全地登录或注册 nova-agents，实现个人身份与工作区的绑定。**

## Requirements

### Validated

- [x] SDK HTTP 请求通过 Rust 代理层（TauriAuthClient + invoke proxy_http_request）— Phase 1
- [x] 登录态持久化（DiskTokenStorage + AppConfig.auth）— Phase 1
- [x] AuthData schema 和 configurable baseURL — Phase 1

### Active

- [ ] 用户可使用手机号 + 短信验证码注册新账号 — Phase 2
- [ ] 用户可使用手机号 + 短信验证码登录已有账号 — Phase 2
- [ ] 用户可登出账号 — Phase 2
- [ ] 短信发送频率限制（防刷）— Phase 2

## Current State

**Phase 1 complete** — Auth transport layer delivered:
- TauriAuthClient routes all SMS API calls through Rust `invoke('proxy_http_request')`
- DiskTokenStorage persists tokens to `AppConfig.auth` via `atomicModifyConfig`
- AppConfig schema extended with `authServerUrl` + `AuthData` fields
- 28 unit tests passing, TypeScript clean

### Out of Scope

- 密码登录/注册 — 仅短信验证码
- OAuth 第三方登录 — 仅手机号
- 账号绑定（微信/支付宝）— 未来 v2
- 多设备登录管理 — 未来 v2
- 人脸/指纹认证 — 桌面端无意义

## Context

### 已有资产

- **nova-auth-sdk** (`src/SDK/nova-auth-sdk/`) — TypeScript SDK，已实现：
  - `sendSmsCode(phone, type)` → POST `/auth/sms/send`
  - `smsLogin(phone, code)` → POST `/auth/sms/login`
  - `smsRegister(phone, code, username)` → POST `/auth/sms/register`
  - `getSmsStats(phone)` → GET `/auth/sms/stats`
  - Token 自动 refresh + localStorage 持久化
  - Tauri deep link 工具函数
- **现有架构**：Tauri v2 + React 19，前端所有 HTTP 须经 Rust 代理层
- **现有设计系统**：Paper/Ink 色系，14px 主按钮，规范在 `specs/guides/design_guide.md`

### 技术约束

- **Rust 代理层强制**：所有前端 HTTP 必须走 `invoke('cmd_proxy_http')` → Rust → reqwest → Bun Sidecar/后端。SDK 原生 `fetch()` 需封装
- **Token 持久化**：SDK 默认 localStorage，但 config 系统是 disk-first（`~/.nova-agents/config.json`）。需确保 token 存储路径一致
- **Auth API 地址**：需确认 auth-server 部署地址（开发环境 vs 生产环境）
- **多 Tab 登录态**：所有 Tab 共享同一登录态，需考虑 Session 隔离

## Constraints

- **架构合规**: HTTP 流量必须经 Rust 代理层 — SDK fetch 需重新封装
- **无后端自建**: auth-server 是外部服务，只做前端接入
- **桌面端首次**: 短信验证码交互需适配桌面端 UX（输入框 + 倒计时 + 错误提示）

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 使用 nova-auth-sdk | 已有完整 SMS auth 实现，减少自研 | ✓ 采用 |
| SDK HTTP 封装 via Tauri invoke | 架构要求所有 HTTP 经 Rust 代理层 | — Pending |
| Token 存 localStorage | SDK 默认行为，够用（桌面端无跨域风险） | ✓ 采用 |
| Auth API baseURL 可配置 | 开发/生产环境不同地址 | — Pending |
| 登录页为独立路由 | 非 Tab 页面，独立 session 生命周期 | — Pending |

---
*Last updated: 2026-04-08 after initialization*
