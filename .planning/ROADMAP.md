# Settings Componentization Roadmap

**Project:** nova-agents Settings 页面组件化重构

---

## Milestones

- ✅ **v1.0 MVP** — Settings Componentization (Phases 1-6, shipped 2026-04-16)
- ✅ **v1.0.1** — Startup Optimization (Phases 7-8, shipped 2026-04-25)
- 🔄 **v1.1** — Store Feature (Phases 9-12, in progress)

---

## Phase Progress

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1. Foundation & Static Sections | v1.0 | 5/5 | Complete | 2026-04-10 |
| 2. Shared Components & Business Logic | v1.0 | 2/2 | Complete | 2026-04-10 |
| 3. Complex Sections Migration | v1.0 | 3/3 | Complete | 2026-04-11 |
| 4. Dialogs & Quality Assurance | v1.0 | 6/6 | Complete | 2026-04-12 |
| 5. Auto Update Optimization | v1.0 | 1/1 | Complete | 2026-04-16 |
| 6. Shutdown Progress Overlay | v1.0 | 1/1 | Complete | 2026-04-16 |
| 7. Startup Progress Bar | v1.0.1 | 2/2 | Complete | 2026-04-16 |
| 8. Optimize Cold Start UX | v1.0.1 | 2/2 | Complete | 2026-04-25 |
| 09. Window Foundation | v1.1 | 0/1 | Not started | - |
| 10. IPC Bridge | v1.1 | 0/1 | Not started | - |
| 11. Admin API Integration | v1.1 | 0/1 | Not started | - |
| 12. Settings Integration and Polish | v1.1 | 0/1 | Not started | - |

---

## v1.1 Store Feature Phases

### Phase 09: Window Foundation

**Goal:** 用户可在 Settings 点击商店入口，独立 WebView 窗口加载远程商店页面

**Depends on:** None

**Requirements:** STORE-01, STORE-02

**Success Criteria** (what must be TRUE):
1. 用户可在 Settings 侧边栏看到商店入口按钮
2. 点击商店入口按钮后，独立 WebView 窗口打开并加载远程商店 URL
3. WebView 窗口可正常关闭，不影响主窗口
4. 应用退出时 WebView 窗口正确清理，无孤儿窗口

**Plans:** TBD

### Phase 10: IPC Bridge

**Goal:** WebView 可通过 IPC 发送安装指令，认证 Token 通过安全方式注入 WebView

**Depends on:** Phase 09

**Requirements:** STORE-03, STORE-04

**Success Criteria** (what must be TRUE):
1. WebView 可通过 Tauri invoke 调用 Rust 命令发送安装指令
2. 认证 Token 通过 IPC 事件注入 WebView（非 URL 参数），无 Token 泄漏风险
3. 安装指令正确路由到 Tauri 命令处理函数
4. IPC 消息格式有严格类型定义，双方契约稳定

**Plans:** TBD

### Phase 11: Admin API Integration

**Goal:** 安装指令通过 Admin API 完成，Settings 对应列表自动热更新

**Depends on:** Phase 10

**Requirements:** STORE-05, STORE-06

**Success Criteria** (what must be TRUE):
1. Tauri 接收安装指令后调用 Admin API 完成 Provider/Skill/MCP 安装
2. Admin API 安装成功后广播 config-changed 事件
3. Settings 的 Provider/Skill/MCP 列表自动刷新，无需手动操作
4. 安装过程有明确的成功/失败响应，无静默失败

**Plans:** TBD

### Phase 12: Settings Integration and Polish

**Goal:** 安装进度可视化，用户可看到完整的安装流程反馈

**Depends on:** Phase 11

**Requirements:** STORE-07

**Success Criteria** (what must be TRUE):
1. 用户可在 WebView 中看到安装进度指示
2. 安装完成后 WebView 显示安装结果（成功/失败）
3. 安装成功后 Settings 列表正确显示新安装的项目
4. 从商店安装的项可被正确识别和管理

**Plans:** TBD

---

## Coverage (v1.1)

**Requirements:** 7 total

| Requirement | Phase | Status |
|-------------|-------|--------|
| STORE-01 | Phase 09 | Pending |
| STORE-02 | Phase 09 | Pending |
| STORE-03 | Phase 10 | Pending |
| STORE-04 | Phase 10 | Pending |
| STORE-05 | Phase 11 | Pending |
| STORE-06 | Phase 11 | Pending |
| STORE-07 | Phase 12 | Pending |

**Mapped:** 7/7 ✓
**Unmapped:** 0

---

*Archived milestone details: `.planning/milestones/`*
