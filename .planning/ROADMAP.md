# Settings Componentization Roadmap

**Project:** nova-agents Settings 页面组件化重构
**Version:** v1.0
**Created:** 2026-04-09
**Granularity:** Coarse (3-5 phases)

---

## Overview

将当前 5707 行的 Settings.tsx 单文件组件拆分为模块化、可维护的组件架构，采用 React 19 + TypeScript 5.9 最佳实践，不引入新依赖库。

**目标：** 单文件代码量 <500 行，组件职责清晰，状态局部化，所有功能无回归。

---

## Phases

- [x] **Phase 1: Foundation & Static Sections** - 布局架构 + 目录结构 + 静态区块
- [ ] **Phase 2: Shared Components & Business Logic** - 共享组件 + 业务逻辑 Hooks
- [ ] **Phase 3: Complex Sections Migration** - 供应商管理 + MCP 工具管理
- [ ] **Phase 4: Dialogs & Quality Assurance** - 对话框组件 + 质量验证 + 清理

---

## Phase Details

### Phase 1: Foundation & Static Sections

**Goal:** 建立组件化基础设施，完成布局和简单区块迁移

**Depends on:** Nothing (first phase)

**Requirements:** ARCH-01, ARCH-02, ARCH-03, ARCH-04, SECTION-01, SECTION-05

**Success Criteria** (what must be TRUE):
1. Settings/ 目录结构创建完成（sections/、components/、hooks/）
2. SettingsLayout + SettingsSidebar 组件渲染正常，侧边栏导航可切换区块
3. AccountSection 和 AboutSection 从原 Settings.tsx 迁移完成，功能无回归
4. index.tsx 重构为组合根组件，代码量 <200 行
5. 布局响应式设计正常（移动端侧边栏可折叠）

**Plans:** 5 plans

Plans:
- [x] 01-foundation-01-PLAN.md — Create Settings/ directory structure
- [x] 01-foundation-02-PLAN.md — Create SettingsLayout component
- [x] 01-foundation-03-PLAN.md — Create SettingsSidebar component
- [x] 01-foundation-04-PLAN.md — Migrate AccountSection
- [x] 01-foundation-05-PLAN.md — Refactor index.tsx as composition root + Migrate AboutSection

---

### Phase 2: Shared Components & Business Logic

**Goal:** 提取可复用组件和业务逻辑 Hooks，为复杂区块迁移打好基础

**Depends on:** Phase 1

**Requirements:** SHARE-01, SHARE-02, SHARE-03, SHARE-04, HOOK-01, HOOK-02, HOOK-03

**Success Criteria** (what must be TRUE):
1. ProviderCard、McpServerCard、ApiKeyInput、VerifyStatusIndicator 组件提取完成
2. useProviderVerify、useMcpServers、useSubscription Hooks 提取完成
3. 所有共享组件有明确的 TypeScript Props 接口定义
4. Hooks 遵循 React Stability Rules（useCallback、useMemo 正确使用）
5. 共享组件可在不同区块中复用，无 Props drilling 超过 3 层

**Plans:** TBD

---

### Phase 3: Complex Sections Migration

**Goal:** 迁移最复杂的两个区块（供应商管理和 MCP 工具管理），验证架构可行性

**Depends on:** Phase 2

**Requirements:** SECTION-03, SECTION-04

**Success Criteria** (what must be TRUE):
1. ProvidersSection 迁移完成，供应商 CRUD 功能正常（添加、编辑、删除、切换）
2. McpSection 迁移完成，MCP 服务器管理功能正常（启用、禁用、配置）
3. 供应商验证流程正常（API key 验证、状态显示）
4. MCP 配置面板集成正常（Playwright、Edge TTS、Gemini Image）
5. 区块内状态局部化，无全局状态污染

**Plans:** 1/3 plans executed

Plans:
- [x] 03-01-PLAN.md — Extract ProviderSection container
- [ ] 03-02-PLAN.md — Extract McpSection container
- [ ] 03-03-PLAN.md — Extract ProviderCard and McpServerCard components

**UI hint:** yes

---

### Phase 4: Dialogs & Quality Assurance

**Goal:** 提取复杂对话框组件，完成质量验证，清理旧代码

**Depends on:** Phase 3

**Requirements:** SECTION-02, DIALOG-01, DIALOG-02, DIALOG-03, DIALOG-04, DIALOG-05, QA-01, QA-02, QA-03, QA-04, QA-05, QA-06

**Success Criteria** (what must be TRUE):
1. 所有对话框组件提取完成（CustomProviderDialog、CustomMcpDialog、3 个配置面板）
2. GeneralSection 迁移完成（最后一个简单区块）
3. 所有功能回归测试通过（无破坏性变更）
4. TypeScript 严格模式通过，无 any 类型
5. 所有单文件代码量 <500 行，ESLint react-hooks/exhaustive-deps 通过
6. 旧 Settings.tsx 删除，导入路径全部更新

**Plans:** 5/6 plans executed

Plans:
- [x] 04-01-PLAN.md — Create DeleteConfirmDialog component
- [x] 04-02-PLAN.md — Extract CustomProviderDialog
- [x] 04-03-PLAN.md — Extract CustomMcpDialog with dual-mode input (bug fix: db10cf7)
- [x] 04-04-PLAN.md — Extract builtin MCP config panels (Playwright, EdgeTTS, GeminiImage)
- [ ] 04-05-PLAN.md — Extract GeneralSection
- [ ] 04-06-PLAN.md — Quality verification and cleanup

**UI hint:** yes

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Static Sections | 5/5 | Done | 2026-04-10 |
| 2. Shared Components & Business Logic | 0/5 | Not started | - |
| 3. Complex Sections Migration | 1/3 | In Progress|  |
| 4. Dialogs & Quality Assurance | 5/6 | In Progress|  |

---

## Risk Mitigation

### High-Risk Areas

**Phase 3 - Complex Sections:**
- **Risk:** 供应商验证和 MCP 启用/禁用的异步逻辑可能在迁移中破坏
- **Mitigation:** 提取 Hooks 时完整保留 useEffect 依赖链，使用 useCallback 稳定回调引用

**Phase 4 - Dialogs:**
- **Risk:** 复杂表单的 Props 接口可能定义错误，导致类型错误
- **Mitigation:** 先定义接口，再实现组件，使用 TypeScript strict mode 验证

### Quality Gates

每个 Phase 结束时必须验证：
1. 所有迁移的功能回归测试通过
2. TypeScript 无编译错误
3. ESLint 无警告（特别是 react-hooks/exhaustive-deps）
4. 单文件代码量 <500 行

---

## Coverage Summary

**Total v1 requirements:** 27
**Coverage:** 27/27 (100%)

| Category | Count | Phases |
|----------|-------|--------|
| ARCH (架构) | 4 | Phase 1 |
| SHARE (共享组件) | 4 | Phase 2 |
| HOOK (业务逻辑) | 3 | Phase 2 |
| SECTION (设置区块) | 5 | Phase 1, 3, 4 |
| DIALOG (对话框) | 5 | Phase 4 |
| QA (质量保证) | 6 | Phase 4 |

---

## Dependencies

```
Phase 1 (Foundation)
    ↓
Phase 2 (Shared Components + Hooks)
    ↓
Phase 3 (Complex Sections)
    ↓
Phase 4 (Dialogs + QA)
```

**关键依赖路径：**
- Phase 3 必须等 Phase 2 完成（需要共享组件和 Hooks）
- Phase 4 必须等 Phase 3 完成（需要先迁移复杂区块才能提取对话框）

---

## Research Alignment

本路线图基于 research/SUMMARY.md 的 7 阶段建议，结合"粗粒度"设置压缩为 4 个阶段：

| Research Phase | Roadmap Phase | Rationale |
|----------------|---------------|-----------|
| Phase 1 (Foundation) | Phase 1 | 布局架构 + 静态区块 |
| Phase 2 (Shared Components) | Phase 2 | 共享组件提取 |
| Phase 3 (Business Logic Hooks) | Phase 2 | Hooks 提取（与共享组件合并） |
| Phase 4 (Complex Sections) | Phase 3 | 供应商 + MCP 区块 |
| Phase 5 (Simple Sections) | Phase 4 | GeneralSection（与对话框合并） |
| Phase 6 (Dialogs) | Phase 4 | 对话框组件提取 |
| Phase 7 (Cleanup) | Phase 4 | 质量验证（与对话框合并） |

---

## Success Metrics

项目成功标准：
1. ✅ Settings/ 目录结构清晰，职责分离
2. ✅ 所有单文件代码量 <500 行
3. ✅ 所有功能无回归（100% 兼容原 Settings.tsx）
4. ✅ TypeScript 严格模式，无 any 类型
5. ✅ 遵循项目 React Stability Rules
6. ✅ 代码可维护性显著提升（新增/修改功能风险降低）

---

*Roadmap created: 2026-04-09*
*Last updated: 2026-04-11 (Phase 4 plans created)*
