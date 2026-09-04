# 首页风格重设计

## Goal

参考 innei.in / joyehuang.me / pear.no 的设计手法，把首页从「左对齐 Hero + 双列 Section 平铺」升级为「居中卷首 Hero + 杂志式内容编排」的出版物风格，强化暖纸底 + 衬线排印的差异化人设。

## Background

当前首页（`src/app/(site)/page.tsx`）结构：Hero（左对齐，64-74vh）→ 关于 → 文章（5 条）→ 笔记（5 条）→ 技能 → 经历/开源/教育（均为空数组，不渲染）→ 站点统计（3 列卡片）。

参考站核心手法：

- innei.in：居中头像 + 衬线巨标题（斜体强调词 + 高亮词）、全大写小字副标题、斜体金句、人文统计（381 篇 · 137 万字 · 2922 天）、社交图标排。
- joyehuang.me：技能分组徽章墙、Product 推广卡、站点统计。
- pear.no：一句话衬线巨标题、全大写小字段落标签、黑白胶囊按钮、细线框秩序感。

## Requirements

R1. 居中卷首 Hero（约 85-90vh）

- 布局从左对齐改居中：徽章排（保留现有：方向徽章 + 位置 + 联系我）、头像（可选装饰性圆形头像，带微边框）、衬线巨标题、全大写小字副标题、斜体金句（一行，从 profile 配置读取）、CTA 按钮排（阅读文章=黑底胶囊、关于我=描边胶囊、GitHub 图标链接）、向下滚动提示（细线 + 三角，呼吸动效）。
- 巨标题改为「用 TypeScript 构建 / AI 智能体与 Web 产品。」，放大至 `text-5xl` 到 `text-7xl` 区间，第二行用 `text-primary` 色并保持斜体。
- 保留 SpatialField 动态背景与边缘羽化 mask，仅调整为居中构图适配。
- 副标题用中文小字，内容为站点定位：「专注构建界面、工作流与小型智能系统。」——具体文案由实现时从 profile 配置读取，使用 `tagline` 字段。
- 金句用 Newsreader 斜体，内容从 profile 的 `quote` 字段读取，当前文案为「建造工具的工具，打磨自动化的自动化。」。
- 首页面向访客的说明性文案统一使用中文；`TypeScript`、`Next.js`、`GitHub`、`Web` 等技术名词和品牌名保留原写法。

R2. 最近写作：文章 + 笔记合并时间线

- 新 Section「最近写作」，合并文章与笔记为一条按日期倒序的时间线，取最新 8 条。
- 列表项新样式：左侧大号衬线日期（`font-serif text-lg`，格式「07 / 25」），右侧标题 + 类型小徽章（文章 / 笔记），行间用 `divide-y` 细线分隔；hover 时标题变 primary 色 + 行尾箭头滑出（保留现有箭头动效语言）。
- 去掉现有「文章」「笔记」两个独立 Section 及各自的 `// 查看全部文章 →` 尾巴；新 Section 底部保留一个「全部文章 →」右下链接（样式沿用现有 mono uppercase 小字）。

R3. 技能徽章墙

- 沿用现有 SkillList 分组结构（网页前端 / 后端数据 / 智能体工程），升级为徽章墙视觉：分组标题改为 mono 全大写小字（uppercase tracking-wider），徽章 hover 增加 border-foreground/30 高亮，保留交错淡入动效。
- Section 标题「技能」保留。

R4. 关于 Section 精简

- 保留双列 Section「关于」，内容不变（profile.about 段落），位置移到「最近写作」之后、「技能」之前。

R5. 人文统计收尾

- SiteStats 从 3 列卡片改为一行衬线大字人文表达，参考 innei.in：「N 篇文章 · N 篇笔记 · N 个标签」，数字用衬线大号（`font-serif text-3xl`），标签用 muted 小字，整体居中，作为页面收尾。
- 去掉卡片边框与底色。

R6. 约束与保留项

- 不改配色系统（暖纸亮色 + 墨色暗色 + 蓝 accent）、不改字体（Satoshi + Newsreader）、不改页头页脚、不引入暗色粒子/大字入场页。
- 保留 `prefers-reduced-motion` 适配；新动效（滚动提示呼吸、箭头滑出）均需 motion-reduce 降级。
- 数据层不动：文章/笔记仍走 `getAllBlogPosts` / `getAllNotes`，日期格式化仍用 `formatDate`（如时间线需要新格式，在数据层新增格式化函数，不在组件里 new Date）。
- profile.config.ts 新增 `tagline`、`quote` 字段，类型同步更新。

## Out of Scope

- 终端 CLI 彩蛋（joye 式 `` ` `` 唤起 shell）：二期独立任务。
- 经历/开源/教育 Section：数据为空，本次不处理；后续有数据时迁移到 /about 页是另一个任务。
- 深色粒子背景、粒子大字入场页、大幅插画。
- 配色、字体、页头页脚、路由结构的任何改动。

## Acceptance Criteria

- [x] 首页首屏为居中卷首布局：徽章排、巨标题（斜体词蓝色）、全大写副标题、斜体金句、CTA 排、滚动提示，在 1440px 与 375px 视口下均居中且不溢出。
- [x] 「最近写作」Section 合并展示文章与笔记，按日期倒序最多 8 条，列表项为衬线日期 + 标题 + 类型徽章 + 细线分隔，底部有「全部文章 →」链接。
- [x] 「技能」Section 为分组徽章墙，分组标题为 mono 全大写小字。
- [x] 「关于」Section 保留，位于「最近写作」与「技能」之间。
- [x] 统计收尾为一行居中衬线大字人文表达，无卡片边框。
- [x] 原「文章」「笔记」两个独立 Section 从首页移除。
- [x] `profile.config.ts` 新增 `tagline`、`quote` 字段并有实际内容。
- [x] 所有新动效在 `prefers-reduced-motion: reduce` 下降级为无动效。
- [x] `pnpm typecheck`、`pnpm lint`、`pnpm format:check` 全部通过。
- [x] 亮色与暗色主题下均无对比度/可读性问题（标题、副标题、金句、时间线日期）。
- [x] 首页面向访客的说明性文案使用中文，技术名词与品牌名保留原写法。
