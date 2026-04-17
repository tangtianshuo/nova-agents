# Phase 08: Optimize Cold Start UX - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-16
**Phase:** 08-optimize-cold-start-ux
**Areas discussed:** Speed Optimization, Brand Experience, Progress Visibility

---

## Speed Optimization

| Option | Description | Selected |
|--------|-------------|----------|
| Bun Sidecar 启动 | Global Sidecar 进程启动耗时最长 | |
| 窗口创建/Rust 初始化 | Tauri 窗口创建和 Rust 层初始化较慢 | |
| React 渲染/Webview | React 应用挂载和首次渲染较慢 | |
| 全部都需要看 | 需要先 profile 分析，不确定哪个最慢 | ✓ |

**User's choice:** 全部都需要看
**Notes:** Profile approach: Rust logging + frontend Performance API, analyze all three phases

---

## Profiling Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Rust 层加日志 | 在 Rust 初始化关键步骤加时间戳日志 | |
| 前端 Performance API | 用 React 的 Profiler 或 Performance API 分析前端渲染 | |
| 两步都加 | Rust 加日志 + 前端 Performance API，全链路分析 | ✓ |
| 我已经知道哪里慢 | 不需要 profile | |

**User's choice:** 两步都加

---

## Brand Experience

| Option | Description | Selected |
|--------|-------------|----------|
| 视觉风格 | 颜色、字体、间距、动画等视觉细节调整 | ✓ |
| 品牌元素 | 增加 slogan、副标题、版本信息等品牌元素 | ✓ |
| 动画效果 | 更精致的动画效果（如呼吸动画、渐变、粒子等） | ✓ |
| 已经挺好 | 当前设计已经满意，不需要大改 | |

**User's choice:** 1, 2, 3 都需要
**Notes:** 还要增加品牌的icon，品牌色依据系统深浅色自动适应

---

## Brand Elements

| Option | Description | Selected |
|--------|-------------|----------|
| 产品名 + slogan | nova-agents + "Your Universal AI Assistant" | |
| 版本号 | 显示当前版本如 v0.2.2 | ✓ |
| 品牌色 | 使用产品的暖棕色系（#c26d3a 等） | ✓ |
| 最小化 | 保持当前极简风格，logo + spinner 即可 | |

**User's choice:** 产品名 + slogan, 版本号, 品牌色, 还要增加品牌的icon
**Notes:** slogan 是 "一念既起，诸事皆成"

---

## Progress Visibility

| Option | Description | Selected |
|--------|-------------|----------|
| 4 阶段进度条 | System Core → Tray & API → Scheduler → Sidecar Ready（当前 Phase 07 设计） | |
| 简单状态文字 | 仅显示当前状态文字如「正在启动...」「即将就绪...」 | |
| 无进度仅品牌 | 纯品牌展示，不显示具体进度阶段 | |
| 由你决定 | 你觉得怎么体验最好就用哪种 | ✓ |

**User's choice:** 由你决定

---

## Stage Design

| Option | Description | Selected |
|--------|-------------|----------|
| 保留 4 阶段 | 保持 Phase 07 设计的 4 阶段，在 overlay 上显示每个阶段 | ✓ |
| 简化阶段 | 合并为 2-3 个更简单的阶段，减少信息量 | |
| 去掉阶段显示 | 纯品牌展示，只显示状态文字动画 | |

**User's choice:** 保留4阶段，增加动画效果

---

## Deferred Ideas

None

