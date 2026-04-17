---
name: Phase 05 - Auto Update Flow Optimization
description: 优化自动更新流程，确认并规范化更新就绪时的窗口关闭行为
phase: 05
milestone: v1.0
status: planning
created: 2026-04-16
updated: 2026-04-16
---

# Phase 05 Plan: Auto Update Flow Optimization

## Objective

确认并规范化自动更新流程中的窗口关闭行为：
1. **开启时**：自动检测版本号，落后则下载，完成后提醒用户（已有，不改）
2. **关闭时**：不再检测更新
3. **下次开启时**：检测已下载的 pending update 文件，直接进行更新

## Background

### User Requirement (from discuss-phase)
> 自动更新，首先是开启时自动检测版本号是否一致，如果正在使用落后版本，则进行自动下载，下载完成后提醒用户进行更新，用户可以选择现在更新或者是稍后更新，此处逻辑已经实现，不做变动。 关闭的时候或者点击关闭按钮的时候 将不再检测更新。而是再下一次打开的时候，检测上次下载好的文件，直接进行更新。

### Current Behavior (verified)
| Event | Behavior |
|-------|----------|
| App starts | `check_update_on_startup()` → 落后则静默下载 → `updater:ready-to-restart` 事件 |
| Download complete | 显示"现在更新"按钮，用户可点击或选择"稍后" |
| User clicks "Now" | `applyUpdateNow()` → 覆盖层 → 重启安装 |
| User clicks "Later" | `deferUpdateScheduled=true`，下次退出时更新 |
| Window X button (minimizeToTray=true, no update) | 隐藏到托盘 |
| Window X button (minimizeToTray=false, no update) | 退出应用 |

### Current Issues (from debug session)
1. **Issue 1**: 当 `minimizeToTray=true` 且 `updateReady=true` 时，点击 X 按钮隐藏到托盘，而不是触发更新
2. **Issue 2**: 当 `updateReady=true` 时，`tray:exit-requested` 处理器不尊重 `minimizeToTray` 设置

## Scope

### What This Phase Covers
1. 修复 `useTrayEvents` 中 `tray:exit-requested` 处理器（已在本会话 debug 中修复）
2. 确保当 `updateReady=true` 时，无论 `minimizeToTray` 设置如何，都触发更新而非最小化到托盘
3. 验证下次开启时 pending update 检测逻辑正确（`check_pending_update` + `pendingUpdateOnStartup`）

### What This Phase Does NOT Cover
- 修改自动检测和下载逻辑（已有，行为正确）
- 修改更新提醒 UI
- 修改"现在更新"/"稍后更新"逻辑

## Requirements

### R-05-01: 更新就绪时禁止最小化到托盘
**描述**：当 `updateReady=true` 时，无论 `minimizeToTray` 设置如何，点击关闭按钮都应该触发更新重启流程，而不是最小化到托盘。

**当前状态**：已在 `useTrayEvents.ts` 中修复 `tray:exit-requested` 处理器的 `minimizeToTray` 检查。

### R-05-02: 窗口关闭时不检测更新
**描述**：点击关闭按钮或最小化到托盘时，不触发任何更新检测逻辑。

**当前状态**：已验证，代码中没有在关闭时触发更新检测。

### R-05-03: 下次开启时检测 pending update
**描述**：下次应用启动时，检测是否存在上次下载的 pending update 文件。如果存在，直接显示更新对话框。

**当前状态**：
- Windows: `check_pending_update()` + `pendingUpdateOnStartup` 状态
- 需要验证 macOS 行为（无磁盘 pending update）

## Verification Criteria

### VC-05-01: 更新就绪 + minimizeToTray=true + 点击 X
1. 启用"最小化到托盘"
2. 下载更新使 `updateReady=true`
3. 点击 X 按钮
4. **预期**：显示更新重启覆盖层或触发更新，而不是最小化到托盘

### VC-05-02: 更新就绪 + minimizeToTray=false + 点击 X
1. 禁用"最小化到托盘"
2. 下载更新使 `updateReady=true`
3. 点击 X 按钮
4. **预期**：显示更新重启覆盖层

### VC-05-03: 无更新 + 点击 X
1. 没有可用更新 (`updateReady=false`)
2. 点击 X 按钮
3. **预期**：应用正常退出（minimizeToTray 设置生效）

### VC-05-04: 下次开启时 pending update
1. 下载更新后关闭应用（不重启）
2. 重新打开应用
3. **预期**：检测到 pending update，显示更新对话框

## Tasks

- [x] T-05-00: Debug session - 已修复 `tray:exit-requested` 处理器
- [x] T-05-01: 修复 `window:close-requested` 处理器 - 增加 `updateReady` 检查
- [x] T-05-02: 修复 `tray:exit-requested` 处理器 - 增加 `updateReady` 检查
- [x] T-05-03: 传递 `updateReady` 和 `applyUpdateNow` 从 App.tsx 到 useTrayEvents
- [x] T-05-04: TypeScript 类型检查 - 通过
- [x] T-05-05: 已提交 - commit 37ce65d

## Files to Verify

| File | Change |
|------|--------|
| `src/renderer/hooks/useTrayEvents.ts` | 已修复 `tray:exit-requested` 处理器 |
| `src/renderer/hooks/useUpdater.ts` | 已有的 `pendingUpdateOnStartup` 逻辑 |

## Decision Summary

1. **关闭时不检测更新**：确认，代码中无此逻辑
2. **下次开启时 pending update**：Windows 已实现，macOS 无此机制（直接 download_and_install）
3. **更新就绪时忽略 minimizeToTray**：已在 debug 中修复
