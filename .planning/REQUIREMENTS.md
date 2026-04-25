# Requirements: nova-agents v1.1 Store Feature

**Defined:** 2026-04-25
**Core Value:** 在 Settings 增加商店入口，用户可浏览和安装 Provider/Skills/MCP

## v1 Requirements

Requirements for Store feature. Each maps to roadmap phases.

### STORE (商店功能)

- [ ] **STORE-01**: Settings 商店入口按钮 — 用户可在 Settings 页面点击商店入口
- [ ] **STORE-02**: 独立 WebView 窗口 — 商店在独立窗口中加载远程 URL，不影响主窗口
- [ ] **STORE-03**: IPC 安装通信 — WebView 可发送安装指令给 Tauri
- [ ] **STORE-04**: 认证 Token 共享 — WebView 可获取用户认证 Token（安全方式，非 URL 参数）
- [ ] **STORE-05**: Admin API 集成 — Tauri 接收安装指令后调用 Admin API 完成安装
- [ ] **STORE-06**: Settings 热更新 — 安装完成后 Settings 对应列表自动刷新，无需手动刷新
- [ ] **STORE-07**: 安装进度反馈 — 用户可看到安装进度和结果

## Out of Scope

| Feature | Reason |
|---------|--------|
| 商店后端实现 | 由用户后台服务提供 |
| 离线商店浏览 | 需要网络连接 |
| 安装回滚 | 后续版本考虑 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| STORE-01 | Phase 1 | Pending |
| STORE-02 | Phase 1 | Pending |
| STORE-03 | Phase 2 | Pending |
| STORE-04 | Phase 2 | Pending |
| STORE-05 | Phase 3 | Pending |
| STORE-06 | Phase 3 | Pending |
| STORE-07 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 7 total
- Mapped to phases: 7
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-25*
*Last updated: 2026-04-25 after initial definition*
