---
name: 喜东东的博客
description: 个人技术沉淀和成长记录
colors:
  background-light: "#fbfbfd"
  foreground-light: "#4e5264"
  primary-light: "#3478f6"
  muted-light: "#f1f1f4"
  muted-foreground-light: "#6a6e80"
  border-light: "#dddde2"
  background-dark: "#0f1019"
  foreground-dark: "#c4cde0"
  primary-dark: "#8db4f8"
  muted-dark: "#1a1b24"
  muted-foreground-dark: "#9da3b8"
  border-dark: "#2e2f38"
  destructive: "#d63a3a"
  emerald-accent: "#10b981"
typography:
  display:
    fontFamily: "Satoshi Variable, sans-serif"
    fontSize: "clamp(1.875rem, 5vw, 3rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  heading:
    fontFamily: "Satoshi Variable, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Satoshi Variable, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Satoshi Variable, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.5
rounded:
  sm: "0.25rem"
  md: "0.5rem"
  lg: "0.75rem"
  xl: "1rem"
  full: "9999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  section: "3rem"
components:
  button-primary:
    backgroundColor: "{colors.foreground-light}"
    textColor: "{colors.background-light}"
    rounded: "{rounded.xl}"
    padding: "10px 20px"
  button-secondary:
    backgroundColor: "{colors.muted-light}"
    textColor: "{colors.foreground-light}"
    rounded: "{rounded.xl}"
    padding: "10px 20px"
  card-entry:
    backgroundColor: "{colors.background-light}"
    textColor: "{colors.foreground-light}"
    rounded: "{rounded.xl}"
    padding: "10px 20px"
  chip-skill:
    backgroundColor: "{colors.muted-light}"
    textColor: "{colors.foreground-light}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
---

# Design System: 喜东东的博客

## Overview

**Creative North Star: "静处手记"**

安静、克制、留白充裕的阅读空间。不追求视觉冲击，让文字自己传达重量。整个界面像一本干净的技术手记 -- 信息清晰可寻，版面宽松舒展，装饰只在必要时出现。

Satoshi 的 geometric sans 特质提供了技术感但不冷硬，可变字重让标题和正文之间的对比自然而不突兀。配色策略以近白和深灰蓝为底色，唯一的色彩强调来自蓝色 primary 和极少量的 emerald 状态指示。

**Key Characteristics:**
- 留白充裕，段落和模块之间的空间大于模块内部
- 文字层次通过字重和字号区分，不依赖颜色差异
- 装饰性元素近乎为零，所有视觉元素都承载信息
- 暗色模式与亮色模式同等重视，token 完整对称

## Colors

柔和的蓝灰色调，亮暗模式下色彩温度一致。

### Primary
- **静蓝** (#3478f6 light / #8db4f8 dark): 链接、按钮主色、hover 强调。用于引导视线到可交互元素。

### Neutral
- **近白纸面** (#fbfbfd light): 页面背景，微带冷调避免纯白刺眼。
- **深夜蓝** (#0f1019 dark): 暗色背景，带蓝调的深色。
- **墨色** (#4e5264 light / #c4cde0 dark): 正文色。亮色下偏灰蓝而非纯黑。
- **哑光灰** (#6a6e80 light / #9da3b8 dark): 次要文字、日期、标签。
- **细线灰** (#dddde2 light / #2e2f38 dark): 边框和分割线。
- **薄雾灰** (#f1f1f4 light / #1a1b24 dark): 卡片底色、芯片底色、muted 背景。

### Semantic
- **危险红** (#d63a3a): destructive 操作和 important 提示框。
- **状态绿** (#10b981): 在线状态指示点。

**The Quiet Palette Rule.** Primary 蓝以外的色相不出现在界面中。所有强调通过字重、字号或 primary 蓝实现，不引入第三色。

## Typography

**Display / Body / Label Font:** Satoshi Variable (self-hosted, woff2)

**Character:** Geometric sans，字形均匀利落。可变字重 300-900 覆盖从细体标签到粗体标题的所有需求，单一字体家族减少视觉噪音。

### Hierarchy
- **Display** (600, clamp(1.875rem, 5vw, 3rem), 1.1): Hero 主标题，tracking -0.025em。
- **Heading** (600, 1.25rem, 1.3): Section 标题（关于、文章、技能等），tracking -0.025em。
- **Body** (400-500, 0.875rem, 1.625): 正文和描述。medium(500) 用于列表项标题。
- **Label** (500, 0.75rem, 1.5): 日期、标签、统计标签、辅助信息。

**The One Family Rule.** 整站只用 Satoshi 一个字体家族。代码块使用浏览器默认 monospace，不引入第二套显示字体。

## Layout

首页采用双列 Section 布局：左侧固定宽度标题（md:min-w-36），右侧弹性内容区。移动端堆叠为单列。

页面容器 `mx-auto w-full px-6`，桌面端 `md:w-4/5 lg:w-5/6`，内容不会铺满全宽。

Hero 区域是例外：负边距全宽延展（-mx-6 到 -mx-16），占据 70vh-82vh，包含动态 SpatialField 背景。

模块间距 `gap-12`（3rem），模块内元素间距 `gap-2.5` 到 `gap-4`（0.625rem-1rem）。模块间空间约为模块内空间的 3-4 倍。

**The Breathing Room Rule.** 模块之间的间距始终大于模块内元素的间距。标题上方空间大于标题下方空间。

## Elevation & Depth

系统整体扁平。shadow 仅在两处出现：

- `shadow-sm` 用于头像和少数卡片的 hover 状态
- SpatialField 动态背景通过渐变遮罩营造深度感，而非阴影

深度通过色调分层表达：`muted/30` → `muted/60` → `background` 三级不透明度。

**The Flat-By-Default Rule.** 元素静止时无阴影。shadow-sm 只在 hover 状态短暂出现，作为交互反馈而非装饰。

## Shapes

圆角策略温和统一：

- 按钮和入口列表项：`rounded-xl`（1rem），手感柔软
- 统计卡片和头像：`rounded-xl` 到 `rounded-2xl`（1rem-1.25rem）
- 技能标签和徽章：`rounded-full`（药丸形），与方角容器形成对比
- 代码块和内联代码：`rounded`（0.25-0.5rem），保持紧凑

边框 1px，使用 `border-border` token。hover 时 `border-foreground/25` 微微加深。

## Components

### Buttons
- **Shape:** 柔和圆角 (rounded-xl, 1rem)
- **Primary:** 反色（bg-foreground, text-background），hover 降低 opacity 至 90%
- **Secondary:** 半透明 muted 底色（bg-muted/65），hover 加深至 bg-muted
- **Ghost:** 无底色，hover 时出现 muted/60 底色（GitHub 链接按钮）

### Entry List Item
- **Style:** 圆角边框卡片（rounded-2xl, border, bg-background），hover 时 bg-muted/50
- **Layout:** 左侧日期（tabular-nums），右侧标题（truncate），右端箭头
- **Motion:** hover 时箭头从隐藏状态向右滑出（duration-300, ease-in-out），motion-reduce 时静态

### Link Card
- **Style:** 圆角边框卡片（rounded-2xl, border, bg-muted/30）
- **Hover:** border-foreground/25 + shadow-sm，过渡自然

### Skill Chip
- **Style:** 药丸形（rounded-full），border + bg-muted/60
- **Motion:** 入场交错淡入（animate-skill-fade-in, 28ms 间隔），hover 时微上浮 + 微放大

### Stats Card
- **Style:** 圆角边框（rounded-xl, border, bg-muted/30）
- **Layout:** 3 列网格，数字居中，标签在下

### Callout
- **Style:** 圆角卡片（rounded-r-xl），左侧 2px 语义色细线
- **Variants:** note (muted-foreground), tip (primary), warning (accent), important (destructive)

## Do's and Don'ts

### Do:
- **Do** 用 CSS 变量（`hsl(var(--xxx))`）引用颜色，保持暗色模式一致性。
- **Do** 用 `text-muted-foreground` 处理次要文字，用 `text-foreground` 处理主要内容。
- **Do** 用 `transition-colors` 或 `transition-all` 做状态切换，保持 hover/focus 过渡平滑。
- **Do** 用 `motion-reduce:` 前缀为动画提供无障碍降级。

### Don't:
- **Don't** 使用 `border-l-4` 或更粗的侧边装饰线（side-tab 反模式），用 `border-l-2` 或纯背景色区分。
- **Don't** 引入 primary 蓝以外的强调色。
- **Don't** 在正文区域使用 Satoshi 以外的显示字体。
- **Don't** 给静止状态的元素加阴影（shadow 只在 hover 时出现）。
- **Don't** 用硬编码的颜色值替代语义 token。
