# Settings 页面组件化拆分

## What This Is

nova-agents 设置页面的**组件化重构项目**。将当前 5707 行的 Settings.tsx 单文件组件拆分为模块化、可维护的组件架构。

**现状：** Settings.tsx 是一个巨大的单文件组件（5707 行），包含 9 个设置区块、30+ useState、复杂的状态管理和交互逻辑，可维护性低，修改风险高。

## Core Value

**开发者能够高效维护 Settings 页面，单文件代码量 <500 行，组件职责清晰，状态局部化。**

## Requirements

### Validated

| Requirement | Phase | Validated |
|-------------|-------|-----------|
| **QA-01**: 所有功能回归测试通过 | Phase 04 | ✓ |
| **QA-02**: TypeScript 无 any 类型 | Phase 04 | ✓ |
| **QA-03**: 单文件代码量 <500 行 | Phase 04 | ✓ |
| **QA-04**: ESLint 无警告 | Phase 04 | ✓ |
| **SECTION-02**: GeneralSection | Phase 04 | ✓ |
| **DIALOG-01**: CustomProviderDialog | Phase 04 | ✓ |
| **DIALOG-02**: CustomMcpDialog | Phase 04 | ✓ |
| **DIALOG-03**: PlaywrightConfigPanel | Phase 04 | ✓ |
| **DIALOG-04**: EdgeTtsConfigPanel | Phase 04 | ✓ |
| **DIALOG-05**: GeminiImageConfigPanel | Phase 04 | ✓ |

### Active

### 布局与架构
- [ ] **ARCH-01**: 创建 Settings 布局结构（SettingsLayout + SettingsSidebar）
- [ ] **ARCH-02**: 创建 Settings/ 目录结构（sections/、components/、hooks/）
- [ ] **ARCH-03**: 重构主入口为组合组件（index.tsx ~200 行）

### 共享组件
- [ ] **SHARE-01**: 提取 ProviderCard 组件（供应商卡片）
- [ ] **SHARE-02**: 提取 McpServerCard 组件（MCP 服务器卡片）
- [ ] **SHARE-03**: 提取 ApiKeyInput 组件（API 密钥输入）
- [ ] **SHARE-04**: 提取 VerifyStatusIndicator 组件（验证状态指示器）

### 设置区块
- [ ] **SECTION-01**: 创建 AccountSection（账户设置）
- [ ] **SECTION-02**: 创建 GeneralSection（通用设置）
- [ ] **SECTION-03**: 创建 ProvidersSection（供应商管理）
- [ ] **SECTION-04**: 创建 McpSection（MCP 工具管理）
- [ ] **SECTION-05**: 创建 AboutSection（关于页面）

### 对话框与配置面板
- [ ] **DIALOG-01**: 提取 CustomProviderDialog（自定义供应商对话框）
- [ ] **DIALOG-02**: 提取 CustomMcpDialog（自定义 MCP 对话框）
- [ ] **DIALOG-03**: 提取 PlaywrightConfigPanel（Playwright 配置面板）
- [ ] **DIALOG-04**: 提取 EdgeTtsConfigPanel（Edge TTS 配置面板）
- [ ] **DIALOG-05**: 提取 GeminiImageConfigPanel（Gemini Image 配置面板）

### Hooks
- [ ] **HOOK-01**: 提取 useProviderVerify hook（供应商验证逻辑）
- [ ] **HOOK-02**: 提取 useMcpServers hook（MCP 服务器管理）
- [ ] **HOOK-03**: 提取 useSubscription hook（订阅状态管理）

### 质量保证
- [ ] **QA-01**: 所有功能回归测试通过
- [ ] **QA-02**: TypeScript 无 any 类型
- [ ] **QA-03**: 单文件代码量 <500 行
- [ ] **QA-04**: ESLint 无警告

## Current State

**Design complete** — 详细设计文档已创建在 `docs/settings-componentization.md`，包含：
- 现状分析（5707 行，30+ useState）
- 架构设计（目录结构、依赖关系图）
- 组件设计（Props 接口、状态管理）
- 迁移计划（6 个阶段）
- 风险与对策

## Out of Scope

- **功能变更** — 仅重构，不改功能
- **样式修改** — 保持现有 UI 设计
- **性能优化** — 不做针对性优化，组件化自然带来提升
- **全局状态管理迁移** — 仍使用 useConfig，不引入 Redux/Zustand

## Context

### 已有资产

- **Settings.tsx**（5707 行）— 包含 9 个设置区块的完整实现
- **已提取组件**（5 个）— GlobalSkillsPanel、GlobalAgentsPanel、UsageStatsPanel、BotPlatformRegistry、WorkspaceConfigPanel
- **设计系统** — Paper/Ink 色系，规范在 `specs/guides/design_guide.md`
- **配置系统** — useConfig hook，disk-first 持久化

### 技术约束

- **架构合规** — 遵循项目架构规范（`specs/tech_docs/architecture.md`）
- **设计规范** — 遵循设计指南（`specs/guides/design_guide.md`）
- **类型安全** — TypeScript 严格模式，无 any 类型
- **功能不变** — 所有现有功能必须保持正常工作

### 技术栈

- React 19 + TypeScript 5.9
- Tauri v2
- TailwindCSS v4
- Lucide React Icons

## Constraints

- **功能完整性** — 所有功能必须保持，不能有任何回归
- **渐进迁移** — 分阶段迁移，每阶段可独立验收
- **UI 一致性** — 拆分后 UI 与原设计完全一致
- **类型安全** — 所有 Props 接口必须有明确类型定义

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 组件化拆分 | 单文件过大，维护困难 | ✓ 采用 |
| 状态局部化 | 减少 Props 传递，提高可维护性 | ✓ 采用 |
| 共享组件 | ProviderCard、McpServerCard 等 | ✓ 采用 |
| Hook 封装 | useProviderVerify、useMcpServers 等 | ✓ 采用 |
| 渐进迁移 | 6 个阶段，每阶段可独立验收 | ✓ 采用 |

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
*Last updated: 2026-04-12 after Phase 04 completion*
