---
description: 'RSC/client 边界、和纸背景体系、MDX、评论、后台 AI、交互与无障碍组件约定'
status: implemented
paths:
  - 'src/app/(site)/_components/**'
  - 'src/app/(site)/layout.tsx'
  - 'src/app/(site)/template.tsx'
  - 'src/app/layout.tsx'
  - 'src/app/globals.css'
  - 'next.config.ts'
---

# 组件约定

## RSC / client 划分

默认全部写 Server Components，不用加任何指令。只有用到浏览器 API（`localStorage`、Canvas、DOM 事件监听或前端局部交互状态）的组件才加 `'use client'`。

现状：项目中的公开/通用 client 组件包括：

- `src/app/(site)/_components/site/paper-canvas.tsx`（全视口静态和纸纤维 Canvas 绘制、DPR 胶片颗粒生成、`site-backdrop-fx` 与跨标签 `storage` 同步）
- `src/app/(site)/_components/site/fx-toggle.tsx`（页脚背景效果开关及同/跨标签状态同步）
- `src/app/(site)/_components/site/theme-toggle.tsx`（主题三态切换、圆形 View Transition 扩散与媒体监听）
- `src/app/(site)/_components/site/site-header.tsx`（滚动显隐、文章下拉菜单、命令搜索唤起与移动端抽屉）
- `src/app/(site)/_components/site/command-search-modal.tsx`（全站 `⌘K` 命令搜索弹窗与焦点捕获）
- `src/app/(site)/_components/site/header-auth.tsx` / `auth-modal.tsx`（页头登录状态与社交登录弹窗）
- `src/app/(site)/_components/home/presence.tsx` / `hero-live-badge.tsx`（Mac 活动接口轮询、自定义事件广播与 Hero 工位状态复用）
- `src/app/(site)/_components/home/yearly-timeline.tsx`（首页年度双轨季度刻度与节点浮卡交互）
- `src/app/(site)/_components/blog/blog-search.tsx`（站内文章搜索、内存索引过滤与结果渲染）
- `src/app/(site)/_components/blog/article-reader-shell.tsx`（专注阅读模式切换与 `data-reader-focus` 驱动）
- `src/app/(site)/_components/blog/toc.tsx`（TOC 展开折叠、点击互斥锁、侧栏自滚动与 RAF 进度更新）
- `src/app/(site)/_components/blog/floating-action-group.tsx` / `series-chapter-sidebar.tsx`（移动端抽屉与专栏大纲导航）
- `src/app/(site)/_components/comment/comment-section.tsx`（社交登录、评论树读取、平铺回复与前台管理）
- `src/app/(site)/_components/links/friends-constellation.tsx` / `friend-apply-modal.tsx`（友邻拓扑星图与友链申请弹窗）

MDX 渲染走异步 RSC（`mdx-content.tsx` 的 `compileMDX`），不需要 client。高频滚动联动场景（如 TOC 进度条）使用 `requestAnimationFrame` 直接更新 DOM 样式，避免高频触发 React 整树重渲染。`SiteHeader` 通过滚动偏移死区避免方向震荡，借助 `data-scrolled` 与 `data-visible` 驱动 `backdrop-blur-md` 边框与纯 GPU 平移/透明度过渡，不使用会引发重排的动态 margin。

判断标准：组件要 `useState` / `useEffect` / 浏览器 API 才转 client；只展示数据、拼接 className 的都留在 server（如 `AmbientBackdrop`、`PaperSurface`、`PageHeader`、`SiteFooter`、`PostCard`、`NoteCard`）。client 边界收得越小越好，不要为了方便把整棵子树标成 client。

## 导出方式

- 页面：`export default function XxxPage()`。
- 组件：具名导出 `export function PostCard()`，消费方 `import { PostCard }`。

参考：`src/app/(site)/_components/blog/post-card.tsx`。

## Props

- 简单组件用内联类型：`export function PostCard({ post }: { post: BlogPost })`。
- 页面组件的 params 等结构用 interface（如 `BlogPostPageProps`，见 `src/app/(site)/blog/[slug]/page.tsx`）。
- props 类型从数据层 import（`BlogPost`、`Note` 来自 `src/lib/content.ts`，`Profile` 来自 `src/profile.config.ts`），不在组件里重复定义数据形状。

## 注释

每个组件、每个导出函数写中文 JSDoc，说明它做什么、关键约定是什么（存储键、锚点规则、防闪烁时序这类）。参考 `mdx-content.tsx`、`paper-canvas.tsx`、`theme-toggle.tsx` 的注释风格。

## Tailwind 与设计系统对齐

- 常规色系统一使用 HSL 语义 token（`background`、`foreground`、`muted`、`muted-foreground`、`primary`、`border`、`hair` 等），不硬编码底色。既有状态色是设计规范列明的例外，必须伴随文字并检查对比度。
- 正文排版用 `prose prose-stone dark:prose-invert`（`@tailwindcss/typography`），笔记详情使用 `.field-note-prose`（`globals.css`）。
- 颜色、字号、间距、圆角与页面宽度以[设计规范](../DESIGN.md)为准。
- 提示框与卡片避免使用 `border-l-4` 等单侧粗边框，采用完整发丝线 `border-hair`（或配合 `PaperSurface`）与语义背景色。
- 公开一级页面外框统一 `max-w-5xl`；狭幅阅读区在外框内左对齐。文章列表有标签时 `lg` 起双栏，无标签时单列；搜索前后列宽一致。首页与五个一级页面共用 `max-w-5xl` 主外框，详情页保留各自阅读宽度，不在共享 `<main>` 上硬编码限宽。
- 样式走 Tailwind 工具类与 `data-*` 变体（如 `data-[scrolled=true]:`、`data-[reader-focus=true]:`、`theme-system:` 等）；`src/app/globals.css` 仅存放 `@property` 注册、设计 token、prose 映射、keyframes 与视图过渡规则。

## 通用模式与组件

- **全站背景底座（`AmbientBackdrop` + `PaperCanvas` + `PaperSurface`）**：
  - `SiteLayout`（`src/app/(site)/layout.tsx`）先挂载 `AmbientBackdrop`（`-z-20`），再挂载 `PaperCanvas`（`-z-10`），确保颗粒与纤维层叠于氛围光之上。
  - `AmbientBackdrop` 接收可选 `color` 或读取 `--page-highlight`，通过 `src/lib/utils.ts` 的 `sanitizeCssColor` 与 `globals.css` 的 `@property` `<color>` 校验双层兜底；文章页与预览页注入 `post.heroColor` 时同样经 `sanitizeCssColor` 过滤。
  - `PaperCanvas` 仅在挂载及防抖 `resize` 时绘制静态和纸纤维 `<canvas>`，并一次性生成 `211×211` DPR 感知双极性微噪点；`FxToggle` 与 `PaperCanvas` 共同通过 `readBackdropFxEnabled`、`site-fx-change` 自定义事件及 `storage`（含 `key === null`）保持同标签与跨标签状态一致，配合 `src/app/layout.tsx` 隔离 `try/catch` 的防闪烁脚本同步 `html.dataset.backdropFx`。
  - `PaperSurface` 用于需要纸卡质感的容器（父节点须带 `relative isolate`），通过 `1px border-hair`、`--surface-shadow` 与微内高光构建边界，并为非 `bg-popover` 卡片附加顶部主色微光。
- **一级页面标题 `PageHeader`**（`src/app/(site)/_components/site/page-header.tsx`）：接收 `eyebrow`、`title`、`description`，输出等宽眉标、衬线 H1、说明和分隔线，保持 Server Component。
- **文章搜索 `BlogSearch`**：接收 RSC 的 `sourceSwitch`、`toolbar`、`sidebar` 和列表 `children`；不把整个页面改成 client，详情见[站内搜索](search.md)。
- **通用按钮组件 `Button`**（`src/app/(site)/_components/blog/button.tsx`）：支持 `back`、`pill`、`ahead` 及普通样式。
- **文章卡片 `PostCard`**（`src/app/(site)/_components/blog/post-card.tsx`）：采用出版物排版与技术等宽眉标，标题配备 SVG 动态伸缩箭头，底部标签组采用低饱和等宽微标（`#TAG`）。可选 `hit` prop 接收搜索命中区间，标题按区间高亮，正文命中片段替换摘要位；组件自身不感知搜索状态。
- **目录导轨 `TableOfContents`**（`src/app/(site)/_components/blog/toc.tsx`）：采用贯穿式 `1px` 细线垂直导轨与章节刻度锚点，当前视口对应章节高亮并带平滑缩放与明度反馈。
- **笔记档案卡 `NoteCard`**（`src/app/(site)/_components/notes/note-card.tsx`）：左侧展示编号（`NOTE #001`）、日期与语义状态铭牌，右侧展示标题与正文摘要，底衬 `PaperSurface`。
- 列表渲染 key 用稳定业务键（`post.slug`、`tag`、`note.slug`），不用数组下标。
- 日期显示统一 `<time dateTime={post.date}>{formatDate(post.date)}</time>`，见 `post-card.tsx` 和详情页。
- 链接用 `next/link` 的 `Link`，站内跳转不写 `<a>`。
- 空列表使用中文说明，区分没有内容和筛选无匹配；保留适用的清除、来源切换或申请入口。

## 动态路由页

参考 `src/app/(site)/blog/[slug]/page.tsx` 的完整结构：

- 文章、标签、专栏及聚合页使用 `dynamic = 'force-dynamic'`，支持数据库运行时新增内容。
- 不在构建时枚举文章或标签；公开数据只来自已发布快照。笔记继续静态生成。
- `generateMetadata` 读单条数据生成 title / description。
- Next.js 16 的 `params` 是 Promise，取值要 `await`。

## draft 过滤

博文公开查询在 service 层只返回已发布快照，详情也不能直接访问草稿。管理读取必须走站长鉴权。笔记保留原有文件 draft 过滤。

## MDX 渲染

正文渲染统一走 `MdxContent`，管理预览复用同一组件。共享编译配置在 `src/server/modules/posts/mdx-options.ts`；发布前进行 AST 与编译校验，不能等公开访问时才发现错误。

- **插件链**：
  - Remark：`remark-gfm`（表格/任务列表）、`remark-math`（数学公式）、`remark-cjk-friendly`（修复全角标点加粗）。
  - Rehype：`rehype-slug`（标题语义 id）、`rehype-autolink-headings`（标题悬停直达锚点 `#`）、`rehype-katex`（LaTeX 渲染）、`rehype-external-links`（外链新标签打开与安全防护）、`rehype-pretty-code`（Shiki 双主题语法高亮）。
- **目录（TOC）一致性**：
  - 目录提取必须使用 `github-slugger` 实例生成 id（见 `src/lib/content.ts` 的 `extractHeadings`），与 `rehype-slug` 生成规则及重名序号处理严格一致。
- **自定义组件映射**：
  - `figure` / `figcaption` / `pre`：封装代码块标题、语言标识与复制按钮（`src/app/(site)/_components/blog/code-block.tsx`、`copy-button.tsx`）。代码块外层统一使用 `bg-code-bg` 与 `rounded-lg`；文件名头部保持同一背景，以 `//` 等宽前缀和细分隔线建立层级；复制按钮始终可见。`pre` 必须为右上复制按钮和右下语言标识保留内边距。
  - `a`：站内链接走 Next.js `Link`，外部链接安全打开。
  - `table`：使用带 `role="region"`、`aria-label` 和 `tabIndex={0}` 的局部横向滚动容器，原生 `<table>` 保持 `w-full` 和 `min-w-[40rem]`。表头不换行，数据单元格允许自然换行；窄屏滚动表格，不撑宽页面根节点。`@tailwindcss/typography` 会给 `table` 添加上下外边距，必须在 `globals.css` 的 `.prose :where(table)` 中设置 `margin-block: 0`，避免边框容器内出现空白。
  - `img`：点击可唤起全屏平滑放大灯箱预览（`image-zoom.tsx`）。
  - 内置提示与折叠组件：`<Callout>`（`callout.tsx`）与 `<Collapse>`（`collapse.tsx`）。
- **阅读时间**：
  - 博客详情页统一通过 `calculateReadingTime` 推算正文用时并在 Hero 日期旁呈现。

## 评论组件

文章详情页挂载自建 Better Auth 社交评论组件（`src/app/(site)/_components/comment/comment-section.tsx`）：

- **认证与会话契约**：
  - 核心环境变量：`BETTER_AUTH_URL`、`BETTER_AUTH_SECRET`、`ADMIN_EMAIL`。
  - OAuth 凭证：`OAUTH_GITHUB_CLIENT_ID` / `OAUTH_GITHUB_CLIENT_SECRET`、`OAUTH_GOOGLE_CLIENT_ID` / `OAUTH_GOOGLE_CLIENT_SECRET`；成对存在才启用对应 provider。
  - 前端通过 `/api/config/auth` 检测已启用的登录渠道，仅渲染已配置 provider 的登录按钮。
  - 未登录访客可公开读取评论列表；提交评论、回复和站长操作必须校验 session。
- **数据与交互契约**：
  - 内容关联：通过文章 `slug` 由服务端校验公开快照，实际 `targetKey` 使用文章数据库 ID。撤回后不再允许公开评论查询和提交。
  - 层级结构：顶级评论与平铺单层回复；回复回复时通过 `replyToId` 提示被回复人，不产生多级缩进。
  - 排序规则：默认置顶优先且时间倒序，最新模式纯倒序，最早模式正序；讨论下的回复始终按时间正序。
  - 容错与限制：评论去除首尾空白后限制 1 至 1000 字；支持软删除占位。
- **客户端依赖边界**：评论等 client component 不直接 import `src/lib/content.ts`，因为该模块包含 `node:fs` 内容读取逻辑，会被 Turbopack 尝试打进浏览器包。客户端需要日期格式化时使用无 Node 依赖的 `src/lib/date.ts`，需要分类标签或阅读时间时使用 `src/lib/blog-meta.ts`；内容层从这两个文件 re-export，服务端页面仍可从 `src/lib/content.ts` 引用。
- **邮件提醒与安全管理**：
  - 新评论触发 Resend 邮件投递至 `ADMIN_EMAIL`，包含 7 天有效期的一次性删除链接。
  - 确认页（`/comments/delete`）GET 只读，POST 经 SHA-256 哈希比对后执行软删除并销毁凭证。

## 占位页

未实现的功能在页面注释里写实现方案，用一个临时占位组件渲染「待实现」状态，并登记到[功能状态](features.md)。实现后删掉占位组件和注释，把状态改成「已实现」。

## Admin AI 组件

- `/admin/ai` 的业务组件位于 `_components/admin/ai/`。交互复用 `admin/ui` 的 shadcn/Radix；布局、排版、头像、状态和滚动使用 Radix Themes，表单语义使用 Radix Form。业务 JSX 不直接拼原生标签，也不新建 Div/Box 等同义包装规避要求。
- `AiThemeProvider` 限制组件库主题范围，并同步站点明暗主题；Portal 内使用 Themes 组件时也需提供主题。公开页面不依赖该 provider。
- Agent 角色条由真实 DTO 驱动，当前仅内置写作 Agent，不渲染虚构角色或未实现按钮。头像资源来源与授权保留在 SVG metadata 中。
- 对话、输入、Agent 配置和模型表单状态由 workspace 持有，切换 Tabs 不丢状态。临时会话刷新后清空，新建对话在存在未保存初稿时确认。
- 使用 AI SDK 官方 `useChat` 与 typed tool parts；只有成功且通过 schema 的完整初稿显示保存入口，取消或半成品不允许保存。普通 Enter 换行，Ctrl/Meta+Enter 发送，输入法组合期间不发送。
- 窄屏同时检查滚动区内部内容的实际宽度。Radix Themes 未分层的 `.rt-ScrollAreaViewport > * { width: fit-content }` 会覆盖 Tailwind 层内的普通 `w-full`，即使整页 `scrollWidth` 正常也会裁切消息。聊天竖向滚动区局部约束内部内容宽度，不全局改写库样式；长中文、模型 ID 和 Tool 结果都必须在 viewport 内完整换行。除元素边界外，还要比较文字容器的 `scrollWidth/clientWidth`，避免 Badge 外框正常但内部 `white-space: nowrap` 仍裁切文字。
- AI 错误按稳定 code 选择恢复入口，不通过提示文案匹配。新 API/存储/取消边界见[AI Agent 与 Tool](ai.md)。

## Metadata

- 静态标题用 `export const metadata: Metadata = { title: '文章' }`，根布局的模板会拼成「文章 - 站点标题」。
- 详情页用 `generateMetadata`，数据缺失返回 `{}`。
- 不在页面里手写完整 title 字符串。

## 页面切换视图过渡 (View Transitions)

- 采用 Next.js 路由模板 `src/app/(site)/template.tsx` 重新挂载机制驱动入场，并在 `next.config.ts` 开启 `experimental.viewTransition: true` 配合原生 CSS 视图过渡，不引入 Framer Motion 等客户端动画库。
- 原生视图过渡在 `globals.css` 中定义：`::view-transition-old(root)` 为 `180ms` 微上移淡出，`::view-transition-new(root)` 为 `340ms` 微上移聚显；模板节点对不含 `[data-page-entrance]` 的页面执行 `240ms` `.page-transition-enter` 透明度淡入，避免与首页和 `/blog` 的区块入场动画叠加（排除条件写在原 CSS 选择器上，不用 Tailwind 分层工具类覆盖）。
- 首页与文章列表中的分段元素使用共享工具类 `entrance` 执行 `520ms var(--ease-spring)` 淡入与 `10px` 上移，通过 `--entrance-delay`（`PostCard` 从 `180ms` 起每项增加 `60ms`、封顶 `360ms`）控制交错节奏。主列表 `section` 的 key 包含来源、分类、排序和页码，搜索结果以 `slug` 作 key 以保留输入状态。
- `entrance` 使用 `backwards` 填充，结束后不保留 `transform` 或 `opacity`；键盘焦点进入时强制立即可见。
- **常驻组件隔离与主题切换解耦**：`#site-header`、`#site-footer`、`#global-ambient-backdrop` 与 `#site-film-backdrop` 仅在 `html:not([data-theme-transition='true'])` 时各自挂载 `view-transition-name`（`site-header` / `site-footer` / `site-ambient-backdrop` / `site-film-backdrop`）且 `animation: none`，保证路由切换时顶栏、页脚与背景静止稳定，而在点击 `ThemeToggle` 触发全屏圆形扩散切换主题时不遮挡扩散层。
- 必须包含 `@media (prefers-reduced-motion: reduce)` 无障碍媒体查询，开启减少动态效果时禁用 `.page-transition-enter` 并将视图过渡时长缩至 `0.01ms`。

## 页面设计约定

五个一级页面的视觉值统一见[设计规范](../DESIGN.md)。这里仅保留组件行为与首页特有结构：

- 文章和笔记的标题、摘要组成主要链接，分类及可点击标签独立；不嵌套链接。
- 项目卡片不假设整卡可点击，只为真实目的地提供反馈；友链为单一目标，整卡链接。
- 元信息保留等宽字体和必要的 `//` 或 `/` 刻度，不重复页面或模块标题。纯展示技术标签与可点击标签区分；筛选控件可以用边框，不强制所有标签为同一种文本样式。
- `SiteHeader` 的移动菜单关闭时使用 `inert`，`Escape` 关闭并恢复按钮焦点；展开时保持页头可见，路由切换后关闭。
- **首页非对称造物室 Hero**（`src/app/(site)/_components/home/hero.tsx`）：
  - 桌面端采用 `lg:grid-cols-[minmax(0,1fr)_272px]` 非对称双栏：左栏依次呈现 `HeroLiveBadge`（细线锚点 + 城市 + 终端图标 + 实时 `presence` 快照，无循环脉冲圆点）、衬线宣言主标题、简介、技术标语与动作行（主书签按钮、`关于我` 下划线链、`⌘K` 搜索触发按钮与线性图标列）；右栏以 `PaperSurface` 站点索引卡收敛头像、三栏内容数（文章 / 笔记 / 标签）与技术栈直达链接。
  - 原 `spatial-field.tsx` 当前未在首页挂载，Hero 直接透出底层 `AmbientBackdrop` 与 `PaperCanvas` 的和纸与顶光质感。
- **首页双栏主体与年度创作脉络**（`src/app/(site)/page.tsx`）：
  - Hero 下方采用 `lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)]` 双栏主体：左栏 `RECENT / 最近更新` 渲染按 ISO 日期倒序合并文章与笔记后的前 5 条条目（`WritingTimeline`，使用 `${kind}-${slug}` 作 key 与 `divide-y divide-hair` 细线台账）；右栏以左侧发丝线分隔，依次排布 `01 / 随记`（最新 3 篇笔记，日期使用 `formatDate`）与 `02 / 关于与技术栈`。
  - 主体下方接入 `YearlyTimeline` 双轨季度脉络（上轨文章实心节点、下轨笔记空心节点，带 `Q1–Q4` 刻度与当年进度指针）以及底部快速导航收尾条。

## 友链申请弹窗与邮件通知规范

友链页面（`/links`）提供交互式申请弹窗（`src/app/(site)/_components/links/friend-apply-modal.tsx`）与轻量触发按键（`friend-apply-button.tsx`）：

- **交互与无障碍契约**：
  - 弹窗外层使用 `role="dialog"`、`aria-modal="true"`，进入时聚焦首个输入项，支持 ESC 键与点击遮罩退出，并自动锁定背景 `body` 滚动。
  - 内置「本站信息参考卡片」，提供一键复制站点名称、网址与简介功能，降低对方添加本站链接的摩擦。
  - 文案遵循亲切客观的技术交流口吻，提交按钮采用「发送 ↗」。
- **API 与邮件投递契约**：
  - 后端接口：`POST /api/links/apply`，校验 `nickname`、`siteName`、`siteUrl`、`email`、`description` 等必填字段与合法 URL / 邮箱格式，并附带基于 IP 的简易滑动窗口频控（10 分钟最多 3 次）。
  - 邮件服务：在 `src/server/infra/email.ts` 中通过原生 `fetch` 投递 Resend API（环境变量 `RESEND_API_KEY`、`FRIEND_APPLY_NOTIFY_EMAIL`），零外部 npm 邮件包依赖。
  - 本地环境容错：未配置凭证时自动回退为控制台格式化打印（Mock 模式），返回模拟成功，不影响本地预览；模拟响应不代表实际投递成功。

## 界面文案规范

全站界面文本（含顶栏菜单、管理面板、按钮、眉标、卡片说明、空状态和弹窗提示）遵循克制、直观和事实优先原则，不堆砌营销与管理话术。

- **文风基准**：
  - 用词直接陈述功能或状态。例如写"文章"不写"文章资产"；写"快捷入口"不写"控制台矩阵"；写"审核"不写"处理审核"。
  - 严禁互联网八股词汇与黑话：大盘、矩阵、资产、全链路、赋能、抓手、闭环、护城河、体感、心智、赛道等。
  - 严禁在界面代码、文案、标题和占位提示中写入 emoji。
- **结构化文案约定**：
  - **技术眉标**：保持打字机等宽格式，仅包含必要的位置或编号标示，如 `// ADMIN • 控制台`、`// 01. 总览`、`// 02. 待审友链`，不堆叠多层修饰短语。
  - **标题与说明**：主标题只标明当前模块功能；说明段落只写实际数据或直接用途（如"查看内容数据、待办审批与系统状态。"），不写假大空愿景。
  - **操作按钮**：动词 + 宾语或单一明确动作，如"审核"、"管理友链"、"退出登录"、"前往配置"。
  - **空状态**：客观陈述当前为空的实际原因（如"暂无待审核的友链申请。"、"暂无评论。"），不写过度包装的修饰句。

源码入口：[根布局](../src/app/layout.tsx)、[站点布局](../src/app/%28site%29/layout.tsx)、[和纸底纹](../src/app/%28site%29/_components/site/paper-canvas.tsx)、[MDX 渲染](../src/app/%28site%29/_components/blog/mdx-content.tsx)、[全局样式](../src/app/globals.css)。字体与五页视觉值以 [DESIGN.md](../DESIGN.md) 为准；Newsreader 和 Satoshi 的西文字形不代表中文也使用这些字体。
