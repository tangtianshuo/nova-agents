# nova-agents 垂直领域产品分裂方案

> 基于 nova-agents 基础平台，探索垂直领域产品化路径
> 文档版本：v0.1.57
> 最后更新：2026-04-02

---

## 1. 产品分裂思路

### 1.1 平台化架构回顾

nova-agents 的核心能力是一个**通用的 AI Agent 运行时**：

```
┌─────────────────────────────────────────────────────┐
│                   React 前端 (UI)                     │
├─────────────────────────────────────────────────────┤
│              Tauri Rust 层 (系统桥接)                  │
├─────────────────────────────────────────────────────┤
│            Bun Sidecar (Agent 运行时)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ Claude SDK  │  │ MCP Tools   │  │ Skills    │ │
│  │ (大脑)      │  │ (工具)      │  │ (技能)    │ │
│  └──────────────┘  └──────────────┘  └────────────┘ │
└─────────────────────────────────────────────────────┘
```

**产品化分裂点**：

| 分裂维度 | 通用产品 | → 垂直产品 |
|---------|---------|-----------|
| **L1 身份** | 通用 AI 助手 | 领域专家身份 |
| **L2 交互方式** | 桌面客户端 | 桌面 + IM Bot |
| **L3 场景指令** | 无 | 领域工作流 |
| **Skills** | 通用技能 | 领域专用技能 |
| **MCP 工具** | 通用工具 | 领域 API |
| **默认配置** | 空白 | 预配置 Provider |

### 1.2 分裂策略

```
nova-agents (基础平台)
    │
    ├── nova-pm/          # 产品经理垂直版
    │   ├── 预设 Prompt (L1 身份)
    │   ├── PRD/SRD 技能库
    │   ├── Jira/飞书集成 MCP
    │   └── 产品工作流 Skills
    │
    ├── nova-ecommerce/  # 电商垂直版
    │   ├── 预设 Prompt
    │   ├── 电商数据 MCP
    │   ├── 客服/订单 Skills
    │   └── 淘宝/抖音/小红书 IM
    │
    └── nova-creator/    # 自媒体垂直版
        ├── 预设 Prompt
        ├── 内容创作 Skills
        ├── 平台数据 MCP
        └── 微信公众号/小红书 IM
```

---

## 2. 垂直产品设计

### 2.1 nova-pm (产品经理版)

**目标用户**：产品经理、需求分析师、UX 设计师

**核心价值主张**：
> "你的专属产品顾问，从需求采集到 PRD 输出，一气呵成"

**产品形态差异**：

| 维度 | 通用版 | PM 版 |
|------|--------|-------|
| **预设身份** | 通用 AI 助手 | 产品规划专家 |
| **默认 Skills** | agent-browser, download-anything | PRD 生成器、竞品分析、用户故事映射 |
| **MCP 预配** | 空白 | Jira MCP、飞书多维表格、Axure Cloud |
| **IM Channel** | Telegram/飞书通用 | 飞书群机器人（需求评审通知） |
| **默认工作区** | 空白 mino | 产品文档模板库 |
| **Prompt 模板** | 无 | PRD 模板、用户访谈记录、需求池管理 |

**L1+L2+L3 Prompt 设计**：

```
L1 (身份): 你是一位资深产品经理，具备 10 年互联网产品经验...
L2 (交互): 桌面客户端模式，擅长从模糊需求中提炼清晰的产品方案
L3 (场景): 当用户提供一个需求时，你会主动拆解为：用户故事 → 功能列表 → 优先级排序 → PRD 草稿
```

**垂直 Skills 示例**：

```
skills/
├── prd-generator/
│   └── SKILL.md         # 根据需求描述生成 PRD 文档
├── competitor-analysis/
│   └── SKILL.md         # 竞品功能对比分析
├── user-story-mapping/
│   └── SKILL.md         # 需求 → 用户故事 → 验收标准
├── sprint-planning/
│   └── SKILL.md         # 冲刺计划生成
└── feedback-analysis/
    └── SKILL.md         # 用户反馈聚类分析
```

**MCP 工具预配**：

```json
{
  "mcpServers": [
    {
      "id": "feishu-bitable",
      "name": "飞书多维表格",
      "type": "http",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-feahu-bitable"]
    },
    {
      "id": "jira",
      "name": "Jira",
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-jira"]
    }
  ]
}
```

**商业模式**：
- 免费版：基础 PRD 生成、Jira 集成
- Pro 版：飞书深度集成、自动需求追踪、团队协作
- Enterprise 版：私有化部署、定制 MCP

---

### 2.2 nova-ecommerce (电商版)

**目标用户**：电商运营、店主、供应链管理者

**核心价值主张**：
> "7x24 小时智能电商助手，客服、选品、数据分析全覆盖"

**产品形态差异**：

| 维度 | 通用版 | 电商版 |
|------|--------|-------|
| **预设身份** | 通用 AI 助手 | 电商运营专家 |
| **默认 Skills** | 通用 | 客服话术生成、选品分析、库存预警 |
| **MCP 预配** | 空白 | 淘宝/抖音/小红书 API |
| **IM Channel** | Telegram/飞书 | 微信客服、抖音私信、淘宝千牛 |
| **默认工作区** | 空白 | 电商数据仪表盘模板 |
| **定时任务** | 无 | 定时销售播报、库存检查 |

**L1+L2+L3 Prompt 设计**：

```
L1 (身份): 你是一位资深电商运营专家，精通淘宝、抖音、小红书的运营策略...
L2 (交互): IM Bot 模式，支持多平台私信聚合回复
L3 (场景): 自动处理买家咨询、生成营销话术、分析销售数据、库存预警
```

**垂直 Skills 示例**：

```
skills/
├── customer-service/
│   └── SKILL.md         # 智能客服：问题分类 → 话术匹配 → 自动回复
├── product-selection/
│   └── SKILL.md         # 选品分析：趋势数据 → 竞品分析 → 利润估算
├── inventory-warning/
│   └── SKILL.md         # 库存预警：低于阈值自动提醒
├── sales-report/
│   └── SKILL.md         # 日/周/月报自动生成
└── flash-deal-planning/
    └── SKILL.md         # 秒杀活动策划
```

**IM Channel 集成**：

```
┌─────────────┐
│  微信客服   │ ←── nova-agents IM Bridge
├─────────────┤
│  抖音私信   │ ←── OpenClaw 插件 (@openclaw-douyin)
├─────────────┤
│  淘宝千牛   │ ←── OpenClaw 插件 (@openclaw-taobao)
├─────────────┤
│  小红书     │ ←── OpenClaw 插件 (@openclaw-xiaohongshu)
└─────────────┘
```

**商业模式**：
- 免费版：单平台客服、单店管理
- 多店版：多平台聚合、 unified inbox
- 企业版：供应链管理、ERP 集成

---

### 2.3 nova-creator (自媒体创作者版)

**目标用户**：内容创作者、自媒体运营、KOL

**核心价值主张**：
> "你的内容创作伙伴，从选题到发布，一站式搞定"

**产品形态差异**：

| 维度 | 通用版 | 创作者版 |
|------|--------|---------|
| **预设身份** | 通用 AI 助手 | 内容创作专家 |
| **默认 Skills** | 通用 | 爆款标题、选题库、配图生成 |
| **MCP 预配** | 空白 | 微信公众号、小红书、抖音数据 |
| **IM Channel** | Telegram/飞书 | 微信公众号自动回复 |
| **默认工作区** | 空白 | 内容素材库 |
| **定时任务** | 无 | 定时发布、热点追踪 |

**L1+L2+L3 Prompt 设计**：

```
L1 (身份): 你是一位资深内容创作者，精通短视频、图文、直播多种形态...
L2 (交互): 桌面 + IM 模式，支持公众号自动回复
L3 (场景): 选题建议 → 标题生成 → 内容撰写 → 配图建议 → 定时发布
```

**垂直 Skills 示例**：

```
skills/
├── headline-generator/
│   └── SKILL.md         # 爆款标题：A/B 测试、情绪分析、SEO 优化
├── content-ideation/
│   └── SKILL.md         # 选题库：热点追踪、竞品监控、粉丝画像
├── script-writer/
│   └── SKILL.md         # 脚本生成：短视频脚本、直播话术
├── image-suggestion/
│   └── SKILL.md         # 配图建议：根据内容推荐图片/设计
├── performance-analysis/
│   └── SKILL.md         # 账号分析：播放/阅读/互动数据解读
└── scheduler/
    └── SKILL.md         # 内容排期：日历管理、定时发布
```

**平台数据 MCP**：

```json
{
  "mcpServers": [
    {
      "id": "xiaohongshu",
      "name": "小红书数据",
      "type": "http",
      "command": "bun",
      "args": ["x", "@xiaohongshu-mcp/server"]
    },
    {
      "id": "wechat-official",
      "name": "微信公众号",
      "type": "http",
      "command": "bun",
      "args": ["x", "@wechat-mcp/server"]
    }
  ]
}
```

**商业模式**：
- 免费版：基础内容生成、单平台发布
- 创作者版：多平台管理、数据分析、热点追踪
- MCN 版：多账号管理、团队协作

---

## 3. 技术实现路径

### 3.1 分支策略

```
main (通用基础)
    │
    ├── product-pm (PM 产品线)
    │   ├── 预设 Skills
    │   ├── 预设 MCP
    │   └── 预设 Prompt
    │
    ├── product-ecommerce (电商产品线)
    │
    └── product-creator (创作者产品线)
```

**版本同步策略**：

| 组件 | 同步方式 |
|------|---------|
| Tauri/Rust 层 | 从 main cherry-pick 或 merge |
| Bun Sidecar 核心 | 从 main merge |
| 前端 UI | 从 main merge，垂直版做主题定制 |
| Skills | 垂直版独立维护 |
| MCP 预设配置 | 垂直版独立维护 |
| 预设 Prompt | 垂直版独立维护 |

### 3.2 工作区模板机制

**核心设计**：工作区模板是垂直产品化的关键

```
~/.nova-agents/
├── workspace/
│   ├── mino/                    # 通用默认工作区
│   ├── nova-pm/                 # PM 版工作区
│   │   ├── templates/
│   │   │   ├── prd-template.md
│   │   │   ├── user-story-template.md
│   │   │   └── competitor-analysis-template.md
│   │   ├── CLAUDE.md           # 预设 L1+L2+L3 Prompt
│   │   └── skills/              # PM 专用 Skills
│   │
│   ├── nova-ecommerce/
│   │   ├── templates/
│   │   ├── CLAUDE.md
│   │   └── skills/
│   │
│   └── nova-creator/
│       ├── templates/
│       ├── CLAUDE.md
│       └── skills/
```

### 3.3 配置预置

**垂直产品的 config.json 预置**：

```json
// nova-pm 预置配置
{
  "defaultWorkspacePath": "~/.nova-agents/workspace/nova-pm",
  "mcpServers": [
    { "id": "feishu-bitable", "enabled": true },
    { "id": "jira", "enabled": true }
  ],
  "agents": [
    {
      "id": "pm-agent",
      "name": "产品顾问",
      "workspacePath": "~/.nova-agents/workspace/nova-pm",
      "channels": [
        { "type": "feishu-group", "config": { "groupId": "xxx" } }
      ]
    }
  ]
}
```

### 3.4 多品牌 UI 定制

**主题差异化**：

| 品牌 | 主题色 | Logo | 启动页文案 |
|------|--------|------|-----------|
| nova-agents | #c26d3a (暖棕) | nova-agents | 通用 AI 助手 |
| nova-pm | #6366f1 (靛蓝) | nova-pm | 产品经理的智能搭档 |
| nova-ecommerce | #10b981 (翠绿) | nova-ecommerce | 电商运营利器 |
| nova-creator | #f59e0b (金橙) | nova-creator | 内容创作伙伴 |

**实现方式**：

```typescript
// 根据安装的产品设置不同主题
const THEMES = {
  'nova-agents': { accent: '#c26d3a', logo: 'nova-logo.svg' },
  'nova-pm': { accent: '#6366f1', logo: 'pm-logo.svg' },
  'nova-ecommerce': { accent: '#10b981', logo: 'ecom-logo.svg' },
  'nova-creator': { accent: '#f59e0b', logo: 'creator-logo.svg' },
}
```

---

## 4. 平台与垂直产品的边界

### 4.1 平台层（不可变）

```
┌─────────────────────────────────────────────────┐
│                   平台层                         │
├─────────────────────────────────────────────────┤
│  • Tauri 桌面框架                                │
│  • Session-Centric Sidecar 架构                  │
│  • MCP 协议支持                                  │
│  • OpenClaw Plugin Bridge                        │
│  • 定时任务系统                                   │
│  • SSE 事件系统                                  │
│  • 配置持久化                                     │
│  • IM Channel 抽象                               │
└─────────────────────────────────────────────────┘
```

**原则**：平台层代码保持单一来源，所有垂直产品从同一平台层构建。

### 4.2 垂直差异层

```
┌─────────────────────────────────────────────────┐
│                   差异层                          │
├─────────────────────────────────────────────────┤
│  • L1 身份 Prompt                                │
│  • L2 交互方式配置                              │
│  • L3 场景指令                                  │
│  • 预设 Skills                                   │
│  • 预设 MCP 配置                                 │
│  • 工作区模板                                    │
│  • UI 主题定制                                   │
└─────────────────────────────────────────────────┘
```

### 4.3 能力共享与定制

**共享能力**（平台层）：
- 多 Tab 会话管理
- Claude SDK 集成
- MCP 工具执行
- 定时任务调度
- 统一日志

**垂直定制**（差异层）：
- 身份与 Prompt
- 预置工具链
- IM 频道选择
- 工作流模板

---

## 5. 实施建议

### 5.1 推荐优先级

| 优先级 | 产品 | 理由 |
|--------|------|------|
| **P0** | nova-pm | PM 场景与 AI 能力高度契合，PRD/用户故事是强需求 |
| **P1** | nova-creator | 内容创作市场大，移动端 IM 集成价值高 |
| **P2** | nova-ecommerce | 电商复杂度高，可先做单一平台再扩展 |

### 5.2 MVP 定义

**nova-pm MVP**：
- 预置产品经理身份 Prompt
- PRD 生成 Skill
- 飞书多维表格 MCP（需求管理）
- 基础工作区模板
- 桌面端 + 飞书 Bot

**nova-creator MVP**：
- 预置创作者身份 Prompt
- 标题生成 + 内容撰写 Skill
- 小红书 MCP（数据）
- 微信公众号 IM Channel
- 定时发布功能

### 5.3 潜在挑战

| 挑战 | 影响 | 应对策略 |
|------|------|---------|
| 平台代码同步 | 垂直产品可能落后平台 | 建立 CI/CD 自动同步机制 |
| MCP 生态碎片化 | 各平台 API 差异大 | 先支持主流平台，再逐步扩展 |
| IM Channel 成本 | 微信/抖音官方 API 可能收费 | 选择开放平台，提供增值服务 |
| 品牌认知 | 用户可能混淆产品线 | 明确产品定位，加强品牌区隔 |

---

## 6. 扩展阅读

| 文档 | 内容 |
|------|------|
| `docs/FUNCTIONAL_DOC.md` | nova-agents 功能规格 |
| `docs/ARCHITECTURE_DESIGN.md` | nova-agents 架构设计 |
| `bundled-agents/nova-agent/CLAUDE.md` | 内置小助理架构 |
| `bundled-skills/*/SKILL.md` | 现有 Skills 结构参考 |
| `specs/tech_docs/architecture.md` | Session-Centric Sidecar 架构 |
