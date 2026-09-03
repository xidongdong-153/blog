# 首页和站点观感对齐 joye 博客

## Goal

把参照项目 `~/Code/blog`（joyehuang/blog）的视觉层移植到当前 Next.js 博客：语义色 token 双主题、简历式首页、sticky 胶囊页头、三态主题切换、列表卡片动效。

用户价值：现在的站点是 Tailwind 默认灰阶排版，没有个人主页感。改完之后首页能当个人名片用，全站配色和交互有统一的一套约定，后续加页面照抄 token 和圆角规则就行。

## Background

### 参照项目现状（`~/Code/blog`，Astro 5 + astro-pure 1.3.0 + UnoCSS presetMini）

- 色 token：`src/assets/styles/app.css:19-71` 定义 21 个裸 HSL 三元组变量（`--background: 210 33% 99%` 这种不带 `hsl()` 包装的写法），`:root` 亮色、`.dark` 暗色各一套；`uno.config.ts:128-162` 把它们映射成 `theme.colors` 的语义名，组件只写 `bg-muted`、`text-muted-foreground`、`hover:text-primary`。裸三元组的用途是配 alpha：`hsl(var(--foreground) / 0.06)`。
- `presetWind3` 被刻意关掉（`uno.config.ts:184-187`），`text-red-500` 这类原色类在参照项目里根本不存在。
- 首页 `src/pages/index.astro`：头像（`h-28 w-auto rounded-full border p-1`）+ 名字（`text-3xl font-bold`）+ 图标标签行（位置、GitHub）+ Connect Me 脉冲圆点徽章，下面是一串 Section：About / Blog / Notes / Talks / Experience / Open Source / Education / Skills，末尾 SiteStats + Quote。
- `src/components/home/Section.astro`：`flex flex-col gap-y-5 md:flex-row`，左标题列 `text-xl font-semibold md:min-w-36`，右内容列 `flex-1 flex-col gap-y-3`。桌面双列、移动端堆叠。
- `src/components/home/LinkCard.astro`：`rounded-2xl border bg-muted px-5 py-3 hover:border-foreground/25 hover:shadow-sm`。
- `src/components/home/SiteStats.astro`：`grid grid-cols-2 sm:grid-cols-4`，单卡 `rounded-xl border bg-muted/30 px-4 py-3 text-center`，数字 `text-2xl font-medium tabular-nums`。参照项目的浏览量来自 Waline，取不到时显示破折号而不是 0。
- `src/components/home/SkillLayout.astro`：`md:flex-row`，标题占 `w-1/5`，pill 容器 `flex-wrap gap-x-4 gap-y-2 md:w-4/5`；每个 pill 用 `--skill-index` 算 `animation-delay: calc(var(--skill-index) * 28ms + 60ms)`，320ms 淡入上移，hover 时 `translateY(-2px) scale(1.04)`。
- 文章列表项 `src/components/blog/PostPreviewEn.astro`：`rounded-2xl border bg-background px-5 py-2.5 hover:bg-muted`，日期 `min-w-[95px] py-1 text-xs`，右侧箭头 SVG 由 `group-hover/link` 驱动，横线从 `scale-x-0 translate-x-4` 展开到 `scale-x-100 translate-x-1`，300ms。
- 页头 `src/components/Header.astro:38`：`sticky top-4 z-[70] rounded-xl sm:rounded-2xl border-transparent`。滚动超过 20px 加 `.not-top` 类，补上边框、背景、左右 padding、`margin-inline: 8%`（@800px 以上）和四层 rgba 阴影；向下滚且超过 350px 时整条 `translateY(-5rem)` 移出视口。移动端菜单靠 `grid-template-rows: 0fr → 1fr` 展开。
- 主题切换是 system / light / dark 三态，`data-theme` 属性驱动，三个图标绝对定位叠在同一位置，非活跃态 `opacity: 0; filter: blur(4px); transform: scale(0.6)`，0.25s ease 过渡，`prefers-reduced-motion: reduce` 下去掉 transition（`Header.astro:273-318`）。切换时弹一条 toast。
- 圆角约定（`DESIGN.md` Shapes 一节）：控件 `rounded-md`(6px)、卡片和列表项 `rounded-lg`(8px)、hero 级容器 `rounded-xl`/`rounded-2xl`、头像和 pill `rounded-full`。
- 字体 Satoshi 变量字体自托管，`public/fonts/Satoshi-Variable.ttf`（127KB）和 `Satoshi-VariableItalic.ttf`（130KB）。Fontshare 出品，ITF Free Font License，个人和商用都免费，复制到本项目没有授权问题。Satoshi 没有中文字形，参照项目的中文也是走系统 fallback。
- 参照项目的 `node_modules` 没装，astro-pure 里的 `Button`、`Label`、`Card`、`Quote`、`PostPreview` 源码读不到。这几个只能按 `DESIGN.md` 的约定和 joye 自己写的等价组件（`LinkCard.astro`、`PostPreviewEn.astro`、`SkillLayout.astro`）复刻，不做像素级还原。

### 当前项目现状

- `src/app/globals.css` 只有 `--background`、`--foreground` 两个 hex token，通过 `@theme inline` 映射。
- 硬编码 `stone-*` 共 36 处，分布在 `post-card.tsx`、`note-card.tsx`、`site-header.tsx`、`site-footer.tsx`、`empty-state.tsx`、`toc.tsx`、`(site)/page.tsx`。`note-card.tsx` 的四个状态徽章另外用了 blue / amber / green / stone 原色。
- `src/app/(site)/layout.tsx` 用 `max-w-3xl` 限宽，页头是静态 `border-b`，不 sticky。
- `theme-toggle.tsx` 是两态切换，按钮内容是「暗」/「亮」两个汉字，无过渡动画。
- `src/app/layout.tsx` 的防闪烁内联脚本只认 `'dark'` 和系统偏好，没有 `'system'` 显式态，也没监听 `prefers-color-scheme` 变化。
- `src/lib/content.ts` 已有 `getAllBlogPosts`、`getAllNotes`、`getAllBlogTags`、`formatDate`，站点统计要的数据全在，不用新写数据层函数。
- frontend spec `.trellis/spec/frontend/component-guidelines.md` 的 Tailwind 一节写着「色系统一用 stone」「不写自定义 CSS 类」。本任务要改这两条，收尾时同步 spec。
- 无测试框架，验证手段是 `pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build` 加本地手查。
- ESLint 基座 `@antfu/eslint-config`（`nextjs: true`），`@typescript-eslint/no-explicit-any` 是 error。Prettier：无分号、单引号、行宽 120。

### 技术验证

- Tailwind 4 文档「Referencing other variables」：theme 变量的值引用别的变量时必须用 `@theme inline`，否则工具类会在变量定义处解析，拿到意外值。当前项目已经是 `@theme inline`，写法不用换。
- Tailwind 4 的透明度修饰符编译成 `color-mix(in oklab, <color> <alpha>, transparent)`（v4 发布博客的示例）。所以 `--color-muted: hsl(var(--muted))` 加 `bg-muted/30` 可行，但要在实现第一步用 `pnpm build` 的产物 CSS 确认，不能只靠文档推断。
- 本机 `/opt/homebrew/bin/woff2_compress` 可用，ttf 转 woff2 是一条命令。
- `next/font/local` 支持变量字体，自动 preload 并生成 fallback 度量，比手写 `@font-face` 少一层维护。

## Requirements

### R1 语义色 token 双主题

- `src/app/globals.css` 用裸 HSL 三元组定义 token，`:root` 亮色、`.dark` 暗色，值取参照项目 `app.css:19-71`，去掉 `--term-*`（本任务不搬 terminal）。
- `@theme inline` 把每个 token 映射成 `--color-*`，组件只用语义类名。
- 保留 `--code-bg`、`--code-fg`。代码块高亮是 README 功能状态表里的待办，先把颜色位置留出来。

### R2 组件去掉硬编码色

- 36 处 `stone-*` 全部换成语义类。
- `note-card.tsx` 四个状态徽章落到 token 上：`in-progress`、`incomplete`、`ready` 用 primary / destructive / muted 组合区分，`archived` 用 muted。四态在亮色和暗色下都要能区分开。

### R3 简历式首页

- hero：头像、名字（`text-3xl font-bold`）、图标标签行（位置、GitHub）、Connect Me 脉冲徽章。
- Section 双列布局组件，桌面左标题右内容，移动端堆叠。
- Blog、Notes 换成紧凑列表项（日期 + 标题 + hover 箭头），不再用现在的摘要卡。摘要卡形态保留给 `/blog`、`/notes` 列表页。
- Skills pill 行，按 `--skill-index` 交错淡入。
- 站点统计卡：文章数、笔记数、标签数，数据走 `src/lib/content.ts` 现有函数，不接外部服务。

### R4 sticky 胶囊页头

- 默认透明无边框；滚动过 20px 加边框、背景、阴影和左右 padding，桌面收进 `margin-inline`。
- 向下滚且超过 350px 时整条移出视口，向上滚立刻回来。
- 移动端导航折叠成展开菜单，点菜单外区域收起。

### R5 三态主题切换

- system / light / dark 循环，`data-theme` 属性驱动图标模糊淡出淡入，0.25s ease。
- `src/app/layout.tsx` 的防闪烁脚本支持 `'system'` 显式值，`prefers-color-scheme` 变化时 `system` 态跟随。
- 所有新增动效都要有 `prefers-reduced-motion: reduce` 分支：状态照常切，动画不播。
- 不搬参照项目的切换 toast，一个提示浮层的收益不值一套 toast 机制。

### R6 内容宽度和圆角约定

- 首页放宽到参照项目的 `md:w-4/5 lg:w-5/6` 量级；文章和笔记详情页保持窄栏。
- 圆角按控件 `rounded-md`、卡片和列表项 `rounded-lg`、hero 级容器 `rounded-xl`/`rounded-2xl`、头像和 pill `rounded-full` 执行。

### R7 个人信息与结构分离

新建 `src/profile.config.ts` 存首页的个人信息，页面组件只读它，不把文案写进 JSX。文件和 `src/site.config.ts` 平级，不新建顶层目录（`directory-structure.md` 的反模式一节禁止建新顶层源码目录）。

- 字段：`about`、`location`、`avatar`、`skills`（分组的技术栈）、`experience`、`education`、`openSource`。
- 空数组或空值的 Section 整段不渲染，不出现「暂无经历」这类占位文案。
- 首稿只填 `about`、`location`、`skills`，`experience`、`education`、`openSource` 留空数组，用户填了自动出现。
- 首稿内容取自仓库既有事实：名字用 `src/site.config.ts` 的 `喜东东`，技能取 TypeScript、Next.js、React、Tailwind CSS 这类项目实际在用的栈。凭空编造的履历一律不写。
- `avatar` 为 `null` 时 hero 渲染名字首字的圆形占位块；用户把图片放进 `public/` 再填路径。类型是 `string | null` 并显式给宽高，避免文件不存在时构建报错。

### R8 字体

- 从参照项目复制 `Satoshi-Variable.ttf`，用 `woff2_compress` 转成 woff2 放进项目，走 `next/font/local` 引入，挂到 `<html>`。
- 只引正体，不引斜体：博客正文极少用斜体，浏览器合成够用，省一个 130KB 的文件。
- Satoshi 无中文字形，中文继续走系统 fallback。字体只影响拉丁字母、数字和 UI 标签。

## Acceptance Criteria

- [x] `pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build` 四条全过。
- [x] `grep -rn 'stone-' src/` 无结果。
- [x] 构建产物 CSS 里 `bg-muted/30` 这类带透明度的自定义 token 类编译成了 `color-mix`，且首页统计卡在浏览器里确实是半透明底色，不是纯色或透明。
- [x] 亮色和暗色下逐页目测：首页、`/blog`、`/blog/[slug]`、`/notes`、`/notes/[slug]`、`/blog/archives`、`/blog/tags/[tag]`、四个占位页，没有对比度不足或色块错位。
- [x] 笔记四个状态徽章在亮色和暗色下都能相互区分。
- [x] 页头在页面顶部无边框；滚动后变成带边框背景阴影的胶囊；向下滚过 350px 隐藏、向上滚出现。
- [x] 移动端宽度下导航折叠，点按钮展开，点菜单外收起。
- [x] 主题按钮点三次回到起点，图标是模糊淡入淡出不是硬切；`localStorage.theme` 依次写入 light、dark、system。
- [x] `theme` 为 `system` 时改系统主题页面跟着变；为 `light` / `dark` 时不变。
- [x] 开 macOS 减弱动态效果后刷新，页头过渡、图标切换、pill 淡入都不动画，状态照常切换。
- [x] 首页 Blog / Notes 列表项 hover 时箭头横线从左展开，标题变 primary 色。
- [x] `profile.config.ts` 里 `experience` 置空数组时首页没有 Experience 段，填一条示例数据后该段出现。
- [x] 首页拉丁字母和数字用的是 Satoshi（DevTools 的 Computed 里 font-family 命中），中文走系统字体。
- [x] `.trellis/spec/frontend/component-guidelines.md` 的 Tailwind 一节改成语义 token 约定，`state-management.md` 的主题机制一节改成三态，`directory-structure.md` 补新增位置，README 里相关描述同步。

## Out of Scope

不搬的东西，理由分三类：

- 依赖参照项目专有内容或外部服务：Waline 浏览量、GitHub contributions 热图、Talks / Curated / Lab / Agent-teams 页面（当前项目没有这些内容集合）。
- 工作量远超观感对齐：terminal dev mode（`src/components/terminal/` 共 16 个文件）、JoJo 吉祥物、intro overlay 三个变体、Summer of Agents 弹窗、首页 Quote 组件。
- 与当前项目结构冲突：双语路由和 i18n 层。

README 功能状态表里的 RSS、搜索、评论、OG 图、代码块高亮仍然是未开始，本任务只改观感不动这些。`about`、`projects`、`links`、`contact` 四个页面继续用 `EmptyState` 占位，只跟着换配色。
