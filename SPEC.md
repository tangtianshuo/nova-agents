# nova-agents 官网设计文档

> **版本**: 1.0.0
> **更新日期**: 2026-04-03
> **设计风格**: Dark Glass Morphism
> **参考文件**: `design-preview-dark.html`, `nova-agents-landing.html`

---

## 1. 设计理念

 nova-agents 官网采用 **Dark Glass Morphism**（深色玻璃拟态）风格，营造科技感、未来感的同时保持内容可读性。

### 核心特征

- **深色背景 + 渐变光球**：营造神秘、科技氛围
- **毛玻璃卡片**：半透明背景 + backdrop-filter 模糊
- **发光动画**：品牌色脉冲发光效果
- **渐变文字**：品牌色渐变覆盖
- **网格纹理**：微妙的背景层次

---

## 2. 颜色系统

### 2.1 背景色

| Token | 值 | 用途 |
|-------|------|------|
| `bg-gradient-start` | `#0a0a0f` | 顶部背景 |
| `bg-gradient-mid` | `#111118` | 中间背景 |
| `bg-gradient-end` | `#0f0f1a` | 底部背景 |

### 2.2 玻璃色

| Token | 值 | 用途 |
|-------|------|------|
| `glass-bg` | `rgba(255, 255, 255, 0.03)` | 玻璃背景 |
| `glass-bg-hover` | `rgba(255, 255, 255, 0.07)` | 玻璃 hover |
| `glass-border` | `rgba(255, 255, 255, 0.06)` | 玻璃边框 |
| `glass-border-hover` | `rgba(255, 255, 255, 0.12)` | 玻璃 hover 边框 |

### 2.3 玻璃卡片

| Token | 值 | 用途 |
|-------|------|------|
| `glass-card-bg` | `rgba(255, 255, 255, 0.04)` | 卡片背景 |
| `glass-card-border` | `rgba(255, 255, 255, 0.08)` | 卡片边框 |
| `glass-card-shadow` | `0 8px 32px rgba(0, 0, 0, 0.4)` | 卡片阴影 |

### 2.4 玻璃内嵌

| Token | 值 | 用途 |
|-------|------|------|
| `glass-inset-bg` | `rgba(255, 255, 255, 0.02)` | 内嵌背景 |
| `glass-inset-border` | `rgba(255, 255, 255, 0.04)` | 内嵌边框 |
| `glass-inset-hover-bg` | `rgba(255, 255, 255, 0.06)` | 内嵌 hover |

### 2.5 品牌色

| Token | 值 | 用途 |
|-------|------|------|
| `brand-primary` | `#818cf8` | 主品牌色（indigo-400） |
| `brand-secondary` | `#a5b4fc` | 次品牌色（indigo-300） |
| `brand-accent` | `#34d399` | 强调色（emerald-400） |
| `brand-glow` | `#6366f1` | 发光色（indigo-500） |

### 2.6 语义色

| Token | 值 | 用途 |
|-------|------|------|
| `success` | `#34d399` | 成功/emerald-400 |
| `error` | `#f87171` | 错误/rose-400 |
| `warning` | `#fbbf24` | 警告/amber-400 |
| `info` | `#60a5fa` | 信息/blue-400 |

---

## 3. 字体系统

### 3.1 字体族

```css
font-family: 'Inter', system-ui, sans-serif;
```

### 3.2 字号层级

| Token | 大小 | 用途 |
|-------|------|------|
| `text-xs` | 12px | 辅助文字、时间戳 |
| `text-sm` | 14px | 正文、按钮文字 |
| `text-base` | 16px | 卡片内容 |
| `text-lg` | 18px | 卡片标题 |
| `text-xl` | 20px | Section 标题 |
| `text-2xl` | 24px | 页面副标题 |
| `text-3xl` | 30px | 页面标题 |
| `text-4xl` | 36px | Hero 标题 |
| `text-5xl` | 48px | Hero 主标题 |
| `text-6xl` | 60px | Hero 响应式标题 |

### 3.3 字重

| Token | 值 | 用途 |
|-------|------|------|
| `font-light` | 300 | Hero 副标题 |
| `font-normal` | 400 | 正文 |
| `font-medium` | 500 | 次要标题、标签 |
| `font-semibold` | 600 | 标题 |
| `font-bold` | 700 | 强调 |
| `font-extrabold` | 800 | Hero 主标题 |

---

## 4. 间距系统

基于 4px 网格：

| Token | 值 | 用途 |
|-------|------|------|
| `space-1` | 4px | 紧凑间距 |
| `space-2` | 8px | 小间距 |
| `space-3` | 12px | 组件内间距 |
| `space-4` | 16px | 卡片内边距 |
| `space-5` | 20px | 区块内边距 |
| `space-6` | 24px | 大区块间距 |
| `space-8` | 32px | Section 间距 |
| `space-10` | 40px | 大分隔 |
| `space-12` | 48px | 页面区块分隔 |
| `space-16` | 64px | 大页面间距 |

---

## 5. 圆角系统

| Token | 值 | 用途 |
|-------|------|------|
| `radius-lg` | 14px | 按钮、输入框 |
| `radius-xl` | 20px | 卡片 |
| `radius-2xl` | 24px | 大卡片 |
| `radius-3xl` | 32px | 主内容区 |
| `radius-full` | 9999px | 胶囊按钮 |

---

## 6. 阴影系统

### 玻璃阴影

```css
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.05);
```

### 玻璃卡片 Hover

```css
box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.08);
```

### 图标阴影（品牌色）

```css
shadow-indigo-500/20  /* 示例 */
```

---

## 7. 动画系统

### 7.1 浮动动画（Orbs）

```css
@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(40px, -40px) scale(1.05); }
  66% { transform: translate(-30px, 30px) scale(0.95); }
}
```

**参数**：
- 动画时长：12s
- 缓动：ease-in-out
- 循环：infinite
- 延迟：orb-2 (-3s), orb-3 (-6s)

### 7.2 脉冲发光动画

```css
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 30px rgba(99, 102, 241, 0.4); }
  50% { box-shadow: 0 0 60px rgba(99, 102, 241, 0.7); }
}
```

**参数**：
- 主色（brand-primary）：3s
- 强调色（brand-accent）：4s
- 缓动：ease-in-out
- 循环：infinite

### 7.3 过渡时长

| Token | 值 | 用途 |
|-------|------|------|
| `duration-fast` | 150ms | 按钮、开关 |
| `duration-normal` | 200ms | 菜单、展开 |
| `duration-slow` | 300ms | 页面切换、模态框 |

---

## 8. 玻璃效果组件

### 8.1 Glass（导航栏、遮罩）

```css
.glass {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
```

### 8.2 Glass Card（主卡片）

```css
.glass-card {
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.05);
}
```

### 8.3 Glass Card Hover

```css
.glass-card-hover:hover {
  background: rgba(255, 255, 255, 0.07);
  border-color: rgba(255, 255, 255, 0.12);
  transform: translateY(-2px);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.08);
}
```

### 8.4 Glass Inset（内嵌元素）

```css
.glass-inset {
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.04);
}
```

### 8.5 Glass Card Hover（内嵌）

```css
.glass-inset:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.08);
}
```

---

## 9. 渐变效果

### 9.1 文字渐变

```css
.text-gradient {
  background: linear-gradient(135deg, #818cf8 0%, #a5b4fc 50%, #c4b5fd 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

### 9.2 按钮渐变

```css
/* Primary Button */
bg-gradient-to-r from-brand-primary to-indigo-500

/* Accent Button */
bg-gradient-to-r from-brand-accent to-emerald-500
```

### 9.3 图标渐变背景

```css
/* 紫色系 */
bg-gradient-to-br from-violet-600 to-purple-700

/* 蓝色系 */
bg-gradient-to-br from-indigo-600 to-blue-700

/* 绿色系 */
bg-gradient-to-br from-emerald-600 to-teal-700

/* 橙色系 */
bg-gradient-to-br from-amber-600 to-orange-700
```

---

## 10. 页面结构

### 10.1 导航栏

- 固定顶部：`fixed top-4 left-4 right-4 z-50`
- 圆角：`rounded-2xl`
- 高度：`py-4 px-6`
- 内容：Logo + 导航链接 + 右侧按钮

### 10.2 Hero Section

- 上边距：`pt-32`
- 下边距：`mb-20`
- 标题：`text-5xl md:text-7xl font-bold`
- 副标题：`text-xl md:text-2xl text-zinc-300 font-light`
- 描述：`text-base text-zinc-500`
- 按钮组：`flex flex-col sm:flex-row gap-4`

### 10.3 Feature Cards

- 网格：`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
- 卡片内边距：`p-6`
- 图标容器：`w-14 h-14 rounded-2xl`
- 标题：`text-lg font-semibold text-zinc-100`
- 描述：`text-sm text-zinc-400`

### 10.4 Download Cards

- 最大宽度：`max-w-4xl mx-auto`
- 卡片圆角：`rounded-3xl`
- 卡片内边距：`p-8`
- 平台图标：`w-16 h-16 rounded-2xl`
- 下载按钮：`w-full py-4 rounded-2xl bg-gradient-to-r from-brand-primary to-indigo-500`

### 10.5 Footer

- 上边框：`border-t border-white/5`
- 内边距：`py-12 px-4`
- 网格：`grid grid-cols-1 md:grid-cols-4 gap-8`
- 版权区：`pt-8 border-t border-white/5`

---

## 11. 响应式断点

| 断点 | 宽度 | 用途 |
|------|------|------|
| `sm` | 640px | 大手机 |
| `md` | 768px | 平板 |
| `lg` | 1024px | 小桌面 |
| `xl` | 1280px | 桌面 |
| `2xl` | 1536px | 大桌面 |

---

## 12. 组件清单

### 12.1 按钮

| 类型 | 类名 | 用途 |
|------|------|------|
| Primary | `bg-gradient-to-r from-brand-primary to-indigo-500` | 主要 CTA |
| Secondary | `glass-card` + hover | 次要操作 |
| Ghost | `glass-inset` + hover | 辅助操作 |
| Icon | `w-10 h-10 rounded-xl glass-inset` | 图标按钮 |

### 12.2 卡片

| 类型 | 类名 | 用途 |
|------|------|------|
| 主卡片 | `glass-card rounded-3xl p-8` | 下载、特性 |
| 标准卡片 | `glass-card rounded-2xl p-6` | 功能展示 |
| 内嵌卡片 | `glass-inset rounded-2xl p-4` | 子内容 |

### 12.3 输入框

| 类型 | 类名 | 用途 |
|------|------|------|
| 搜索框 | `glass-inset rounded-xl px-4 py-3` | 搜索输入 |

### 12.4 徽章

| 类型 | 类名 | 用途 |
|------|------|------|
| 主要 | `bg-gradient-to-r from-brand-primary to-indigo-500 text-white` | 版本号 |
| 成功 | `bg-emerald-500/15 text-emerald-400` | 在线状态 |
| 警告 | `bg-amber-500/15 text-amber-400` | 警告状态 |
| 次要 | `bg-white/5 text-zinc-400` | 辅助信息 |

### 12.5 标签页

| 类型 | 类名 | 用途 |
|------|------|------|
| 激活 | `bg-brand-primary/20 text-brand-secondary` | 当前标签 |
| 未激活 | `text-zinc-500 hover:bg-white/5` | 其他标签 |

---

## 13. 背景效果

### 13.1 浮动光球（Orbs）

```html
<div class="orb orb-1"></div>  <!-- 紫色，top: -150px -->
<div class="orb orb-2"></div>  <!-- 紫色，top: 30% -->
<div class="orb orb-3"></div>  <!-- 青色，bottom: -100px -->
```

**样式**：
```css
.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.3;
  animation: float 12s ease-in-out infinite;
}
```

### 13.2 网格纹理

```css
.grid-pattern {
  background-image:
    linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
  background-size: 60px 60px;
}
```

---

## 14. Tailwind 配置

```javascript
tailwind.config = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        glass: {
          white: 'rgba(255, 255, 255, 0.03)',
          whiteHover: 'rgba(255, 255, 255, 0.07)',
          border: 'rgba(255, 255, 255, 0.06)',
          borderHover: 'rgba(255, 255, 255, 0.12)',
        },
        brand: {
          primary: '#818cf8',
          secondary: '#a5b4fc',
          accent: '#34d399',
          glow: '#6366f1',
        }
      }
    }
  }
}
```

---

## 15. 浏览器兼容性

- Chrome/Edge 120+
- Firefox 121+
- Safari 17+
- 移动浏览器最新版本

**注意**：`backdrop-filter` 需要 WebKit 前缀，CDN Tailwind 会自动处理。

---

## 16. 文件结构

```
nova-agents/
├── nova-agents-landing.html    # 官网首页/下载页
├── design-preview.html         # 浅色玻璃设计预览
├── design-preview-dark.html    # 深色玻璃设计预览
├── SPEC.md                     # 本文档
└── specs/                      # 其他设计文档
    └── guides/
        └── design_guide.md     # 应用内设计系统
```

---

## 17. 设计变更日志

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| 1.0.0 | 2026-04-03 | 初始版本，定义深色玻璃设计系统 |
