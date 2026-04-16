---
name: Phase 06 - Shutdown Progress Overlay
description: 关闭应用时显示进度提示框
phase: 06
milestone: v1.0
status: planning
created: 2026-04-16
---

# Phase 06 Plan: Shutdown Progress Overlay

## Objective

当用户关闭应用时，显示一个进度提示框，展示关闭进度，提升用户体验。

## Background

### User Requirement
> 关闭的时候，需要弹出一个提示框，展示关闭进度，尽量复用现有组件。

### Design Decisions (from discuss-phase)
1. **步骤设计**：由实现方自行设计，用户体验优先
2. **组件**：创建新组件 `ShutdownProgressOverlay`

## Shutdown Steps Design

设计的步骤（用户体感优先，7秒完成）：

| 进度 | 提示文字 |
|------|---------|
| 0-25% | 正在关闭会话... |
| 25-50% | 正在保存配置... |
| 50-75% | 正在清理资源... |
| 75-100% | 即将完成... |

## Component Design

### ShutdownProgressOverlay Component

**文件**：`src/renderer/components/ShutdownProgressOverlay.tsx`

**Props**：
```typescript
interface ShutdownProgressOverlayProps {
  /** Whether to show the overlay */
  visible: boolean;
  /** Optional: version text to show (for update scenario) */
  version?: string;
}
```

**UI 元素**：
- 半透明黑色背景 (`bg-black/50 backdrop-blur-sm`)
- 居中卡片
- 旋转图标 (`RefreshCw` 或 `Loader2`)
- 进度条（暖棕色调，与设计系统一致）
- 当前步骤文字
- 百分比显示

**动画**：内部动画驱动，7秒内完成所有步骤

## Implementation Approach

### Frontend Changes

1. **创建 `ShutdownProgressOverlay` 组件**
   - 复用 `UpdateRestartOverlay` 的样式模式
   - 内部动画驱动进度
   - 4个步骤，每步约1.75秒

2. **在 `App.tsx` 中集成**
   - 当 `tray:confirm-exit` 事件触发时显示覆盖层
   - 覆盖层显示期间阻止应用退出
   - 进度完成后触发实际退出

### Rust Changes (if needed)

暂时使用前端内部动画，Rust 不需要发送进度事件。如果后续需要真实进度，可以扩展。

## Files to Create

| File | Description |
|------|-------------|
| `src/renderer/components/ShutdownProgressOverlay.tsx` | 新组件 |

## Files to Modify

| File | Change |
|------|--------|
| `src/renderer/App.tsx` | 集成 ShutdownProgressOverlay |
| `src/renderer/hooks/useTrayEvents.ts` | 修改关闭逻辑以支持进度覆盖层 |

## Verification Criteria

### VC-06-01: 正常关闭时显示进度
1. 点击窗口 X 按钮
2. **预期**：显示 ShutdownProgressOverlay，进度条动画从0到100%

### VC-06-02: 进度完成后应用退出
1. 等待7秒
2. **预期**：进度到100%后，应用退出

### VC-06-03: 进度文字正确显示
1. 观察进度文字变化
2. **预期**：依次显示"正在关闭会话..." → "正在保存配置..." → "正在清理资源..." → "即将完成..."

## Tasks

- [x] T-06-01: 创建 `ShutdownProgressOverlay` 组件
- [x] T-06-02: 在 `App.tsx` 中集成组件
- [x] T-06-03: 修改 `useTrayEvents` 关闭逻辑
- [x] T-06-04: TypeScript 类型检查
- [x] T-06-05: 已提交 - commit 78cef7f
