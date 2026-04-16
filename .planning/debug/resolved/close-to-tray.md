---
status: resolved
trigger: "从前后端的角度审查关闭按钮的功能 - 设置中点击关闭最小化到托盘，则关闭窗口时最小化到系统托盘而非退出应用"
created: 2026-04-16T00:00:00.000Z
updated: 2026-04-16T12:00:00.000Z
resolved: 2026-04-16T12:00:00.000Z
---

## Current Focus
next_action: "等待用户验证：确认 Windows 上点击关闭按钮时正确最小化到托盘"

## Symptoms
expected: 设置中启用"关闭最小化到托盘"时，关闭窗口应最小化到托盘；设置中关闭该选项时，关闭窗口应退出应用
actual: 在 Windows 上，点击自定义标题栏的关闭按钮会绕过 minimizeToTray 检查，直接退出应用
errors: []
reproduction: 在 Windows 上设置"最小化到托盘"为开启状态，然后点击标题栏 X 按钮，应用直接退出而非最小化到托盘
started: 一直存在（Windows 特有）

## Eliminated

## Evidence
- timestamp: 2026-04-16
  checked: "src/renderer/components/CustomTitleBar.tsx"
  found: "handleClose 函数在 Windows 上点击关闭按钮时直接 emit('tray:exit-requested')"
  implication: "CustomTitleBar 的关闭按钮总是触发退出流程"

- timestamp: 2026-04-16
  checked: "src/renderer/hooks/useTrayEvents.ts"
  found: "tray:exit-requested 事件处理器（line 140-153）直接进入退出流程，不检查 minimizeToTray"
  implication: "与 window:close-requested 处理器（line 104-128）不同，后者会检查 minimizeToTray"

- timestamp: 2026-04-16
  checked: "src-tauri/src/lib.rs"
  found: "Rust 的 on_window_event 在 CloseRequested 时会 emit window:close-requested 并 prevent_close"
  implication: "Rust 层正确地让前端决定行为，但 CustomTitleBar 绕过了这一机制"

## Resolution
root_cause: |
  Windows 上 CustomTitleBar 的 handleClose 函数直接 emit 'tray:exit-requested' 事件，
  而 useTrayEvents 对该事件的处理器（unlistenExitRequested）直接进入退出确认流程，
  完全不检查 minimizeToTray 配置。

fix: |
  修改 src/renderer/hooks/useTrayEvents.ts 中 tray:exit-requested 事件的处理器，
  在进入退出确认流程前先检查 minimizeToTray。
  如果 minimizeToTray 为 true，则隐藏窗口而不是退出。

verification: |
  TypeScript 类型检查通过
  代码逻辑对比：修复后的 tray:exit-requested 处理器现在与 window:close-requested 处理器
  行为一致，都会在退出前检查 minimizeToTray 配置

files_changed:
  - "src/renderer/hooks/useTrayEvents.ts"
