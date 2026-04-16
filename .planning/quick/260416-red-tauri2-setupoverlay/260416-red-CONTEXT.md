# Quick Task 260416-red: 使用tauri2 setupoverlay 注册启动页 - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Task Boundary

使用 Tauri 2 setupoverlay 替代现有的 StartupProgressOverlay React 组件，在 Rust 初始化阶段（webview 渲染前）显示品牌启动页，监听后端启动成功后进入工作台。

</domain>

<decisions>
## Implementation Decisions

### Overlay 策略
- 用 Tauri setupoverlay 完全替代 StartupProgressOverlay React 组件
- 不保留两层 overlay串联的复杂逻辑

### 隐藏时机
- 前端渲染完成且 Sidecar 就绪后隐藏（与当前 Stage 4 相同时机）
- 监听 startup:complete 事件后调用 `app.hide()`

### 进度追踪
- 保留原有的 4 阶段 Rust 事件（startup:stage 1-3）用于日志/调试
- setupoverlay 只显示品牌，不显示阶段进度（简化 Rust 层）

</decisions>

<specifics>
## Specific Ideas

- 使用 Tauri 2 官方 setupoverlay API
- 品牌 Logo 使用现有 nova-agents logo
- 隐藏调用放在 App.tsx 的 startup:complete 事件处理中

</specifics>

<canonical_refs>
## Canonical References

- Tauri 2 setupoverlay 官方文档
- 当前 StartupProgressOverlay 实现（src/renderer/components/StartupProgressOverlay.tsx）

</canonical_refs>
