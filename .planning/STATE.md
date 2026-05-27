---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Store Feature
status: planning
last_updated: "2026-04-25"
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# Project State

**Project:** nova-agents
**Version:** v1.1
**Last Updated:** 2026-04-25

---

## Project Reference

### Core Value

**开发者能够高效维护 Settings 页面，单文件代码量 <500 行，组件职责清晰，状态局部化。**

### Current Focus

v1.1 Store Feature — 商店功能开发

---

## Current Position

**Phase:** 09 - Window Foundation
**Status:** Not started
**Progress:** [----------] 0%

---

## Milestone Status

| Milestone | Phases | Status | Shipped |
|-----------|--------|--------|---------|
| v1.0 | 6 | Complete | 2026-04-12 |
| v1.0.1 | 2 | Complete | 2026-04-25 |
| v1.1 | 4 | In progress | - |

---

## Milestone Goals (v1.1)

**Goal:** 在 Settings 增加商店入口，用户可浏览和安装 Provider/Skills/MCP

**Key features:**
- Settings 商店入口按钮
- 独立 WebView 窗口加载远程商店页面
- WebView 与 Tauri IPC 通信（安装指令）
- 认证 Token 在 WebView 和 Tauri 之间共享
- 安装完成后 Settings 对应列表自动热更新

---

## Phase Details

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 09 | Window Foundation | STORE-01, STORE-02 | Not started |
| 10 | IPC Bridge | STORE-03, STORE-04 | Not started |
| 11 | Admin API Integration | STORE-05, STORE-06 | Not started |
| 12 | Settings Integration and Polish | STORE-07 | Not started |

---

## Blockers

None

---

## Accumulated Context

### Key Decisions

| Decision | Rationale |
|----------|-----------|
| WebView 加载远程 URL | 商店页面由后台提供，可频繁更新 |
| IPC 通信安装 | WebView 通知 Tauri 执行安装 |
| 热更新列表 | 安装后无需刷新，列表自动更新 |

### Architecture Notes

- Store WebView 使用 `WebviewWindowBuilder` 创建，与 overlay window 模式相同
- 认证 Token 通过 IPC 事件注入（非 URL 参数），防止 Token 泄漏
- 安装指令通过 `cmd_store_install` 路由到 Admin API
- Config 变更通过 SSE broadcast 广播，`ConfigDataContext` 自动监听刷新

### Research Findings

- Phase 1 风险：Token 泄漏、WebView 孤儿窗口
- Phase 2 风险：IPC 消息格式稳定性
- Phase 3 风险：Admin API 静默失败
- Phase 4 风险：热更新竞态条件

---

## Quick Tasks

| Task | Status |
|------|--------|
| Phase 09: Window Foundation | Pending |
| Phase 10: IPC Bridge | Pending |
| Phase 11: Admin API Integration | Pending |
| Phase 12: Settings Integration and Polish | Pending |

*State initialized: 2026-04-09*
