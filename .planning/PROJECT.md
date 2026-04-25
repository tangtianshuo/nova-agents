# nova-agents

## What This Is

nova-agents 是基于 Tauri v2 的桌面 AI Agent 应用，支持多 Tab 对话、IM Bot、定时任务、MCP 工具集成。

**现状：** Settings 组件化完成，v1.1 商店功能开发中。

## Core Value

**开发者能够高效维护 Settings 页面，单文件代码量 <500 行，组件职责清晰，状态局部化。**

## Current Milestone: v1.1 Store Feature

**Goal:** 在 Settings 增加商店入口，用户可浏览和安装 Provider/Skills/MCP

**Target features:**
- Settings 商店入口按钮
- 独立 WebView 窗口加载远程商店页面
- WebView 与 Tauri IPC 通信（安装指令）
- 认证 Token 在 WebView 和 Tauri 之间共享
- 安装完成后 Settings 对应列表自动热更新

## Requirements

### Validated

| Requirement | Phase | Validated |
|-------------|-------|-----------|
| Settings 组件化 | v1.0 | ✓ |
| 启动进度条 | v1.0.1 | ✓ |
| 冷启动 UX 优化 | v1.0.1 | ✓ |

### Active

- [ ] 商店入口 (Settings)
- [ ] WebView 商店页面
- [ ] IPC 安装通信
- [ ] 认证 Token 共享
- [ ] Settings 热更新

### Out of Scope

- 商店后端实现（由用户后台服务提供）
- 离线商店浏览

## Context

### 技术架构

- **Tauri v2** — 桌面框架
- **React 19** — 前端 UI
- **Bun** — Agent Runtime Sidecar
- **Admin API** — 配置管理接口

### 集成点

- Settings 页面 (`src/renderer/pages/Settings/`)
- Admin API (`src/server/admin-api.ts`)
- useConfig Hook (配置状态管理)

## Constraints

- **架构合规** — `specs/tech_docs/architecture.md`
- **设计规范** — `specs/guides/design_guide.md`
- **React 稳定性** — `specs/tech_docs/react_stability_rules.md`
- **类型安全** — TypeScript strict mode

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| WebView 加载远程 URL | 商店页面由后台提供，可频繁更新 | ✓ |
| IPC 通信安装 | WebView 通知 Tauri 执行安装 | ✓ |
| 热更新列表 | 安装后无需刷新，列表自动更新 | ✓ |

## Evolution

此文档在阶段转换和里程碑边界时演进。

**每次阶段转换后**（通过 `/gsd:transition`）：
1. 失效的需求？→ 移至 Out of Scope 并注明原因
2. 验证的需求？→ 移至 Validated 并注明阶段
3. 新需求出现？→ 添加到 Active
4. 要记录的决策？→ 添加到 Key Decisions
5. "What This Is" 仍然准确？→ 如有偏移则更新

**每次里程碑后**（通过 `/gsd:complete-milestone`）：
1. 全部章节的完整审查
2. Core Value 检查 — 仍是最合适的优先级？
3. 审计 Out of Scope — 原因仍然有效？
4. 用当前状态更新 Context

---
*Last updated: 2026-04-25 after v1.0.1 milestone completion*
