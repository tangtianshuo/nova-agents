# GSD Debug Knowledge Base

Resolved debug sessions. Used by `gsd-debugger` to surface known-pattern hypotheses at the start of new investigations.

---

## close-to-tray-windows — 修复 Windows 上关闭按钮忽略最小化到托盘设置
- **Date:** 2026-04-16
- **Error patterns:** Windows, close button, minimize to tray, CustomTitleBar, tray:exit-requested
- **Root cause:** Windows 上 CustomTitleBar 的 handleClose 函数直接 emit 'tray:exit-requested' 事件，而 useTrayEvents 对该事件的处理器直接进入退出确认流程，完全不检查 minimizeToTray 配置
- **Fix:** 修改 src/renderer/hooks/useTrayEvents.ts 中 tray:exit-requested 事件的处理器，在进入退出确认流程前先检查 minimizeToTray，如果 minimizeToTray 为 true 则隐藏窗口而不是退出
- **Files changed:** src/renderer/hooks/useTrayEvents.ts
---