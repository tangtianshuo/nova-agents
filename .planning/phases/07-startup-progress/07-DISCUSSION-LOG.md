# Phase 07: Startup Progress Bar - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-16
**Phase:** 07-startup-progress
**Areas discussed:** Startup Stages, Progress Reporting, Visual Style, Dismissal Behavior, Rust Stages, Branding Elements, Progress Animation, Timeout Config, Config Location

---

## Area: Startup Stages

| Option | Description | Selected |
|--------|-------------|----------|
| 完整流水线 | Rust初始化 → 前端加载 → Sidecar启动 → 就绪（精确反馈） | ✓ |
| 前端为主 | 仅前端可见阶段（Sidecar连接、配置加载），Rust阶段静默 | |
| 简化单阶段 | 仅一个「正在启动...」动画，不分阶段 | |

**User's choice:** 完整流水线
**Notes:** User wants full pipeline visibility

---

## Area: Progress Reporting

| Option | Description | Selected |
|--------|-------------|----------|
| Tauri事件驱动 | Rust通过emit()发送事件，前端监听并更新UI（精确但实现复杂） | ✓ |
| 前端自驱动动画 | 前端显示固定时长动画（如3秒），不依赖Rust报告（简单但非精确） | |
| 混合模式 | Rust发送「完成」信号，前端用动画填充过程 | |

**User's choice:** Tauri事件驱动
**Notes:** Precise event-driven approach

---

## Area: Visual Style

| Option | Description | Selected |
|--------|-------------|----------|
| 匹配关闭动画 | 与ShutdownProgressOverlay一致：全屏遮罩 + 旋转图标 + 进度条 + 文字 | |
| 品牌化启动页 | 居中nova-agents Logo + 进度条，底部版本信息 | ✓ |
| 最小化内嵌 | 顶部细进度条，不遮挡主界面内容 | |

**User's choice:** 品牌化启动页
**Notes:** Brand-focused design with logo, progress, status, and step list

---

## Area: Dismissal Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| 不可取消 | 必须等待进度完成或超时（如10秒）才能进入 | |
| 可关闭按钮 | 用户可以点击跳过，直接进入主界面 | |
| 超时时自动消失 | 进度完成后自动消失，无需用户操作 | ✓ |

**User's choice:** 超时时自动消失
**Notes:** Auto-dismiss on completion, no user cancel button

---

## Area: Rust Stages

| Option | Description | Selected |
|--------|-------------|----------|
| 全部关键节点 | 日志系统 → 锁文件 → 系统托盘 → Cron管理器 → IM Bots → Agent通道 → 全局Sidecar → 管理API | |
| 核心子系统 | 初始化完成（托盘/Cron/Sidecar）分为3-4个大阶段 | ✓ |
| 仅Sidecar就绪 | 仅报告「全局Sidecar已启动」一个关键节点 | |

**User's choice:** 核心子系统 (3-4 stages)
**Notes:** System Core, Tray & Management API, Scheduler & Monitors, Sidecar Ready

---

## Area: Branding Elements

| Option | Description | Selected |
|--------|-------------|----------|
| Logo + 进度 + 版本 | 居中Logo + 进度条 + 底部版本号 | |
| Logo + 进度 + 状态 + 版本 | 居中Logo + 进度条 + 当前阶段文字 + 底部版本号 | |
| Logo + 进度 + 状态 + 步骤列表 | 居中Logo + 进度条 + 实时阶段文字 + 已完成步骤勾选列表 | ✓ |

**User's choice:** Logo + 进度 + 状态 + 步骤列表
**Notes:** Full step checklist with checkmarks

---

## Area: Progress Animation

| Option | Description | Selected |
|--------|-------------|----------|
| 连续动画 | 平滑连续动画，从0%到100% | |
| 分段时间动画 | 每阶段跳跃式推进（如25% → 50% → 75% → 100%） | |
| 不确定进度 | 无限循环动画，直到完成信号 | ✓ |

**User's choice:** 不确定进度
**Notes:** Indeterminate/infinite animation until completion

---

## Area: Timeout Config

| Option | Description | Selected |
|--------|-------------|----------|
| 10秒 | 标准超时，适合大多数情况 | |
| 15秒 | 较长超时，给慢速机器留余地 | |
| 无超时 | 永不超时，直到所有阶段完成 | |
| 通过配置文件进行设置 | 配置项可由用户自定义 | ✓ |

**User's choice:** 通过配置文件进行设置
**Notes:** Configurable via env variable

---

## Area: Config Location

| Option | Description | Selected |
|--------|-------------|----------|
| config.json | 放在~/.nova-agents/config.json，showStartupProgress布尔字段 | |
| 内嵌设置页 | 在设置页（通用标签）添加「启动时显示进度条」开关 | |
| 仅代码配置 | 仅代码硬编码，不提供用户配置选项 | |

**User's choice:** 暂时放置在env中
**Notes:** Temporary - use environment variable for now

---

## Deferred Ideas

None

