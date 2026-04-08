# STATE: nova-agents SMS Auth

**Milestone:** v1.0 SMS Auth
**Current phase:** 1 (Foundation)
**Started:** 2026-04-08

---

## Project Reference

**Core Value:** 用户能够通过手机号 + 短信验证码安全地登录或注册 nova-agents，实现个人身份与工作区的绑定。

**Current Focus:** Phase 1 - Auth transport layer + token storage

---

## Current Position

| Field | Value |
|-------|-------|
| Phase | 1 - Foundation |
| Plan | Not started |
| Status | Not started |
| Progress | 0% |

**Phase Progress Bar:** [Not started]

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Total Phases | 2 |
| Completed Phases | 0 |
| Total Requirements | 13 |
| Mapped Requirements | 13 |

---

## Accumulated Context

### Decisions

- Using `@nova-intelligent/auth-sdk` (already in codebase)
- SDK HTTP calls wrapped via `invoke('proxy_http_request')`
- Token storage backed by `AppConfig.auth` in `config.json`
- AuthContext placed at App level, above TabProvider

### Open Questions

- Auth server URL for dev vs prod environments
- Token expiry duration
- Multi-tab sync approach (SSE broadcast vs storage events)

### Blockers

- None identified

---

## Session Continuity

**Last updated:** 2026-04-08
