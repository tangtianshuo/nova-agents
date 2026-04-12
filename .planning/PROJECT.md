# Settings 页面组件化拆分

## What This Is

nova-agents 设置页面的**组件化重构项目**。将 5707 行的 Settings.tsx 单文件组件拆分为 16 个模块化组件架构。

**现状：** ✅ 完成 — Settings.tsx 已拆分为模块化组件结构，所有文件 <500 行，TypeScript/ESLint 全部通过。

## Core Value

**开发者能够高效维护 Settings 页面，单文件代码量 <500 行，组件职责清晰，状态局部化。**

## Requirements

### Validated

| Requirement | Phase | Validated |
|-------------|-------|-----------|
| **ARCH-01**: SettingsLayout + SettingsSidebar | Phase 01 | ✓ |
| **ARCH-02**: 目录结构（sections/、components/、hooks/） | Phase 01 | ✓ |
| **ARCH-03**: index.tsx 重构为组合根组件 | Phase 01 | ✓ |
| **SECTION-01**: AccountSection | Phase 01 | ✓ |
| **SECTION-05**: AboutSection | Phase 01 | ✓ |
| **SHARE-01**: ProviderCard | Phase 02 | ✓ |
| **SHARE-02**: McpServerCard | Phase 02 | ✓ |
| **SECTION-03**: ProvidersSection | Phase 03 | ✓ |
| **SECTION-04**: McpSection | Phase 03 | ✓ |
| **SECTION-02**: GeneralSection | Phase 04 | ✓ |
| **DIALOG-01**: CustomProviderDialog | Phase 04 | ✓ |
| **DIALOG-02**: CustomMcpDialog | Phase 04 | ✓ |
| **DIALOG-03**: PlaywrightConfigPanel | Phase 04 | ✓ |
| **DIALOG-04**: EdgeTtsConfigPanel | Phase 04 | ✓ |
| **DIALOG-05**: GeminiImageConfigPanel | Phase 04 | ✓ |
| **QA-01**: 功能回归测试通过 | Phase 04 | ✓ |
| **QA-02**: TypeScript 无 any 类型 | Phase 04 | ✓ |
| **QA-03**: 单文件代码量 <500 行 | Phase 04 | ✓ |
| **QA-04**: ESLint 无警告 | Phase 04 | ✓ |

### Active

（None — milestone complete）

## Current State

**v1.0 SHIPPED** — Settings 组件化重构完成（2026-04-12）

**交付成果：**
- 16 个组件文件，共 4062 行代码，平均 254 行/文件
- 所有单文件 <500 行
- TypeScript strict mode 全部通过
- ESLint react-hooks 全部通过
- Props 接口全部有 JSDoc 注释
- React Stability Rules 100% 合规

**目录结构：**
```
src/renderer/pages/Settings/
├── index.tsx                    # 组合根组件 (~150行)
├── SettingsLayout.tsx           # 布局容器
├── SettingsSidebar.tsx          # 导航侧边栏
├── sections/                   # 设置区块
│   ├── AccountSection.tsx
│   ├── GeneralSection.tsx
│   ├── ProvidersSection.tsx
│   ├── McpSection.tsx
│   └── AboutSection.tsx
├── components/                 # 共享组件
│   ├── ProviderCard.tsx
│   ├── McpServerCard.tsx
│   ├── DeleteConfirmDialog.tsx
│   └── dialogs/
│       ├── CustomProviderDialog.tsx
│       ├── CustomMcpDialog.tsx
│       ├── PlaywrightConfigPanel.tsx
│       ├── EdgeTtsConfigPanel.tsx
│       └── GeminiImageConfigPanel.tsx
```

## Out of Scope

- **功能变更** — 仅重构，不改功能
- **样式修改** — 保持现有 UI 设计
- **性能优化** — 不做针对性优化
- **全局状态管理迁移** — 仍使用 useConfig

## Context

### 已有资产

- **Settings/**（16 个组件）— 模块化后的完整实现
- **设计系统** — Paper/Ink 色系，`specs/guides/design_guide.md`
- **配置系统** — useConfig hook，disk-first 持久化

### 技术约束

- **架构合规** — `specs/tech_docs/architecture.md`
- **设计规范** — `specs/guides/design_guide.md`
- **React 稳定性** — `specs/tech_docs/react_stability_rules.md`

## Constraints

- **功能完整性** — 所有功能必须保持，不能有任何回归
- **渐进迁移** — 分阶段迁移，每阶段可独立验收
- **UI 一致性** — 拆分后 UI 与原设计完全一致
- **类型安全** — 所有 Props 接口必须有明确类型定义

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 组件化拆分 | 单文件过大，维护困难 | ✓ 完成 |
| 状态局部化 | 减少 Props 传递，提高可维护性 | ✓ 完成 |
| 共享组件 | ProviderCard、McpServerCard 等 | ✓ 完成 |
| 渐进迁移 | 4 个阶段，每阶段可独立验收 | ✓ 完成 |
| Dual-mode 对话框 | CustomMcpDialog 支持 form/JSON 切换 | ✓ 完成 |
| Click-outside 关闭 | DeleteConfirmDialog 使用 SessionStatsModal 模式 | ✓ 完成 |

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
*Last updated: 2026-04-12 after v1.0 milestone completion*
