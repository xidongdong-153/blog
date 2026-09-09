# 组件规范

## RSC / client 划分

默认全部写 Server Components，不用加任何指令。只有用到浏览器 API（localStorage、事件监听）的组件才加 `'use client'`。

现状：项目中的 client 组件包括：

- `src/app/(site)/_components/site/theme-toggle.tsx`（主题存储与媒体监听）
- `src/app/(site)/_components/site/site-header.tsx`（滚动感应与移动端菜单展开）
- `src/app/(site)/_components/blog/toc.tsx`（TOC 目录展开折叠、点击互斥锁、侧栏自滚动与 RAF 进度更新）
- `src/app/(site)/_components/blog/floating-action-group.tsx`（移动端抽屉唤出与返回顶部百分比计算）
- `src/app/(site)/_components/comment/comment-section.tsx`（社交登录、评论树读取、平铺回复与前台管理）
- `src/app/(site)/_components/home/presence.tsx`（活动接口轮询、在线状态和后台工具展开）

MDX 渲染走异步 RSC（`mdx-content.tsx` 的 `compileMDX`），不需要 client。高频滚动联动场景使用 `requestAnimationFrame` 调度，直接更新对应节点的样式（如 TOC 进度条、SiteHeader 连续水膜插值），避免高频触发 React 整体组件树重新渲染。SiteHeader 不使用布尔阈值硬切与布局重排（如动态 margin），改用 0~80px 连续进度驱动独立背景水膜层透明度、渐进遮罩与微缩放；显隐判断加入滚动死区累积位移（向下 12px、向上 8px 缓冲及顶部 200px 常驻安全区），彻底避免慢拖滚动条时的方向震荡；显隐动画使用可中断的纯 GPU Transition（下滑 160ms ease-out 平滑微缩淡出，上滑 240ms 阻尼曲线聚显并带表面张力平息静止）。

判断标准：组件要 `useState` / `useEffect` / 浏览器 API 才转 client；只展示数据、拼接 className 的都留在 server。client 边界收得越小越好，不要为了方便把整棵子树标成 client。

## 导出方式

- 页面：`export default function XxxPage()`。
- 组件：具名导出 `export function PostCard()`，消费方 `import { PostCard }`。

参考：`src/app/(site)/_components/blog/post-card.tsx`。

## Props

- 简单组件用内联类型：`export function PostCard({ post }: { post: BlogPost })`。
- 页面组件的 params 等结构用 interface（如 `BlogPostPageProps`，见 `src/app/(site)/blog/[slug]/page.tsx`）。
- props 类型从数据层 import（`BlogPost`、`Note` 来自 `src/lib/content.ts`，`Profile` 来自 `src/profile.config.ts`），不在组件里重复定义数据形状。

## 注释

每个组件、每个导出函数写中文 JSDoc，说明它做什么、关键约定是什么（存储键、锚点规则、防闪烁时序这类）。参考 `mdx-content.tsx`、`theme-toggle.tsx` 的注释风格。

## Tailwind

- 色系统一使用 HSL 语义 token（`background`、`foreground`、`muted`、`muted-foreground`、`primary`、`border` 等），组件禁止硬编码 `stone-*` 或其他原色阶。
- 正文排版用 `prose prose-stone dark:prose-invert`（@tailwindcss/typography），见 `mdx-content.tsx`。
- 圆角约定：控件用 `rounded-md`，卡片和列表项用 `rounded-lg` 或 `rounded-2xl`，头像与 pill 用 `rounded-full`。
- 提示框与卡片避免使用 `border-l-4` 等单侧粗边框（side-tab 反模式），采用完整微边框 `rounded-xl border` 配合语义背景色。
- 内容宽度：首页使用宽布局 `md:w-4/5 lg:w-5/6`；博客列表页使用双列宽布局 `max-w-5xl`（左侧 3fr 文章、右侧 1fr 标签栏）；详情页与笔记内页内部使用 `mx-auto w-full max-w-3xl`。
- 不写自定义组件 CSS 类，样式全部走 Tailwind 工具类与 data 变体（如 `data-[scrolled=true]:`、`theme-system:` 等）；`src/app/globals.css` 仅用于存放设计 token、keyframes 和变体定义。

## 通用模式与组件

- 通用按钮组件 `Button`（`src/app/(site)/_components/blog/button.tsx`）：统一支持 `back`（向左动态展开箭头）、`pill`（圆角胶囊标签）、`ahead`（向右动态展开箭头）及普通样式。
- 文章卡片 `PostCard`（`src/app/(site)/_components/blog/post-card.tsx`）：采用出版物排版与技术等宽眉标（`// ARTICLE / DATE / READING_TIME`），标题配备 SVG 动态伸缩展开箭头，底部标签组采用低饱和等宽微标（`#TAG`），替换通用圆角胶囊块。
- 目录导轨 `TableOfContents`（`src/app/(site)/_components/blog/toc.tsx`）：采用贯穿式 1px 细线垂直导轨与章节刻度锚点（Rail Wayfinding），当前视口对应章节高亮并带平滑缩放与文字明度反馈。
- 字体排版体系：大标题（Hero 主标与文章详情页 H1）使用西文高切角锐度衬线体 `Newsreader`（`font-serif`），元数据使用打字机等宽体（`font-mono`），正文使用中性克制的现代无衬线体 `Satoshi`。
- 列表渲染 key 用稳定业务键（`post.slug`、`tag`），不用数组下标。
- 日期显示统一 `<time dateTime={post.date}>{formatDate(post.date)}</time>`，见 `post-card.tsx` 和详情页。
- 链接用 `next/link` 的 `Link`，站内跳转不写 `<a>`。
- 空列表要给文案兜底（`No posts yet.` 或 `还没有文章。`）。

## 动态路由页

参考 `src/app/(site)/blog/[slug]/page.tsx` 的完整结构：

- `generateStaticParams` 返回全部 slug。
- `export const dynamicParams = false`，未列出的 slug 直接 404。
- `generateMetadata` 读单条数据生成 title / description。
- Next.js 16 的 `params` 是 Promise，取值要 `await`。

## draft 过滤

列表、归档、标签页过滤 `draft`；详情页不过滤（draft 文章可直接访问）。过滤逻辑在页面里做（`getAllBlogPosts().filter((post) => !post.draft)`），数据层返回全量。

## MDX 渲染

正文渲染统一走 `MdxContent`（`src/app/(site)/_components/blog/mdx-content.tsx`），不在别处再调 `compileMDX`。

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
  - OAuth 凭证：`GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`、`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`；成对存在才启用对应 provider。
  - 前端通过 `/api/config/auth` 检测已启用的登录渠道，仅渲染已配置 provider 的登录按钮。
  - 未登录访客可公开读取评论列表；提交评论、回复和站长操作必须校验 session。
- **数据与交互契约**：
  - 内容关联：通过文章 `slug` 由服务端校验文章并解析实际 `commentKey`（改名文章在 frontmatter 保留旧 `commentKey` 承接历史评论）。
  - 层级结构：顶级评论与平铺单层回复；回复回复时通过 `replyToId` 提示被回复人，不产生多级缩进。
  - 排序规则：默认置顶优先且时间倒序，最新模式纯倒序，最早模式正序；讨论下的回复始终按时间正序。
  - 容错与限制：评论去除首尾空白后限制 1 至 1000 字；支持软删除占位。
- **客户端依赖边界**：评论等 client component 不直接 import `src/lib/content.ts`，因为该模块包含 `node:fs` 内容读取逻辑，会被 Turbopack 尝试打进浏览器包。客户端需要日期格式化时使用无 Node 依赖的 `src/lib/date.ts`；内容层从该文件 re-export `formatDate`，服务端页面仍可从 `src/lib/content.ts` 引用。
- **邮件提醒与安全管理**：
  - 新评论触发 Resend 邮件投递至 `ADMIN_EMAIL`，包含 7 天有效期的一次性删除链接。
  - 确认页（`/comments/delete`）GET 只读，POST 经 SHA-256 哈希比对后执行软删除并销毁凭证。

## 占位页

未实现的功能统一用 `src/app/(site)/_components/placeholder/empty-state.tsx`，页面注释里写实现方案（参考 `src/app/(site)/search/page.tsx`）。实现后删掉占位组件和注释，并把[功能状态](./feature-status.md)中的状态改成「已实现」。

## Metadata

- 静态标题用 `export const metadata: Metadata = { title: '文章' }`，根布局的模板会拼成「文章 - 站点标题」。
- 详情页用 `generateMetadata`，数据缺失返回 `{}`。
- 不在页面里手写完整 title 字符串。

## 页面切换视图过渡 (View Transitions)

- 采用 Next.js 路由模板 `src/app/(site)/template.tsx` 重新挂载机制驱动入场，并在 `next.config.ts` 开启 `experimental.viewTransition: true` 配合原生 CSS 视图过渡。禁止引入 Framer Motion 等额外客户端动画库。
- 动效采用纯交叉溶解（Pure Cross-Dissolve）：零空间位移、零虚化滤镜，`.page-transition-enter` 与 `::view-transition-new(root)` 统一执行 160ms 快速平滑透明度淡入，退场执行 120ms 加速淡出，专注抹平浏览器硬切白闪。
- 常驻组件（`header`、`footer`、`#global-ambient-backdrop`）留在 `src/app/(site)/layout.tsx`，通过 `view-transition-name: persistent-site-chrome` 配合 `animation: none;` 隔离，避免页面切换时导航栏与背景发生晃动。
- 必须包含 `@media (prefers-reduced-motion: reduce)` 无障碍媒体查询，在用户开启减少动态效果时回退至即时切换。

## 全站出版物设计语言与排版规范

- **圆角规范收敛**：
  - 容器与卡片统一采用 `rounded-lg`（`border border-border/60 bg-card/30`），微交互悬浮态为 `hover:border-foreground/30 hover:bg-muted/30`。
  - 交互按钮与小徽标统一收敛至 `rounded-md`。
  - 严禁在页面卡片、列表行或标签云中使用 `rounded-2xl` 或 `rounded-full` 胶囊，杜绝通用消费级 App 质感。
- **全大写等宽技术微标（Mono Metadata System）**：
  - 文章分类、笔记状态、日期、阅读耗时、分类索引、小标题一律采用 `font-mono text-xs uppercase tracking-wider text-muted-foreground`。
  - 结构前缀统一采用双斜杠，如 `// ARTICLE / DATE / READ_TIME`、`// NOTE / STATUS: READY`、`// TAGS`。
  - 标签一律统一为 `#TAG` 无实心背景微标格式。
- **全域贯通西文衬线排版（Serif Headline System）**：
  - 全站所有一级路由 H1 标题与文章详情 H1 统一挂载 `font-serif` 衬线字体（Newsreader），字重采用 `font-medium tracking-tight text-foreground`。
  - 页面顶部标题统一由技术等宽眉标、衬线大标题与描述段落三层结构组成。
- **结构化页面规范**：
  - 项目页（`/projects`）、关于页（`/about`）、友链页（`/links`）、联系页（`/contact`）必须具备结构化内容与响应式网格排版，不得退回粗糙的泛用型 EmptyState。
- **Hero 无界融入全站顶光规范**：
  - 首页 Hero 采用完全无边框的自然沉浸结构，不设容器外围边框、实色背景与卡片阴影，保持正文出版物排版纯净无界。
  - 背景动效 Canvas（`SpatialField`）突破父容器限制横向全宽铺展（`w-screen left-1/2 -translate-x-1/2`），通过大椭圆径向 CSS `mask-image` / `-webkit-mask-image` 衰减 Alpha 通道向四周柔和羽化；严禁在 Canvas 上方叠加使用 `--background` 实色的纯色或半透渐变层，让全站底层 `AmbientBackdrop` 的漫射顶光无界贯通。
- **首页 Hero 署名式元数据**：
  - Hero 顶部身份信息为单行元数据（如 `上海 / 独立开发者 / 联系我 ↗`）：两侧细横线锚点、`/` 分隔、`font-mono text-xs tracking-wider text-muted-foreground`。
  - 不使用状态圆点、胶囊底色和 `pulse` / `ping` 循环动画伪装在线状态；「联系我」为指向 `/contact` 的文字链接，靠颜色与下划线表达可点击。
- **首页纵向 Section 编排**：
  - `Section` 组件接收必填 `index` 序号，Label 为等宽小字 `h2`（序号 + `/` + 标题，如 `01 / 最近写的`），行尾细线 `flex-1` 延展，Label 恒在内容上方。
  - 桌面端不切换左右分栏，内容占满可用宽度；三个 Section 共用同一套间距节奏，不加卡片背景或外围边框。
- **首页最近写作时间线**：
  - `page.tsx` 将已过滤 draft 的文章与笔记映射为 `{ kind, slug, title, date }`，按 ISO `date` 倒序后取前 8 条，再传给 `WritingTimeline`。
  - `WritingTimeline` 用 `${kind}-${slug}` 作为 key，根据 `kind` 生成 `/blog/<slug>` 或 `/notes/<slug>` 链接；日期显示使用 `formatTimelineDate`，不在组件中直接格式化日期。
  - 时间线分类微标使用 `font-mono text-xs uppercase tracking-wider`，列表行用 `divide-y` 细线，不给每行添加卡片底色。

## 友链申请弹窗与邮件通知规范

友链页面（`/links`）提供交互式申请弹窗（`src/app/(site)/_components/links/friend-apply-modal.tsx`）与轻量触发按键（`friend-apply-button.tsx`）：

- **交互与无障碍契约**：
  - 弹窗外层使用 `role="dialog"`、`aria-modal="true"`，进入时聚焦首个输入项，支持 ESC 键与点击遮罩退出，并自动锁定背景 `body` 滚动。
  - 内置「本站信息参考卡片」，提供一键复制站点名称、网址与简介功能，降低对方添加本站链接的摩擦。
  - 文案遵循亲切客观的技术交流口吻，提交按钮采用「发送 ↗」。
- **API 与邮件投递契约**：
  - 后端接口：`POST /api/links/apply`，校验 `nickname`、`siteName`、`siteUrl`、`email`、`description` 等必填字段与合法 URL / 邮箱格式，并附带基于 IP 的简易滑动窗口频控（10 分钟最多 3 次）。
  - 邮件服务：在 `src/lib/email.ts` 中通过原生 `fetch` 投递 Resend API（环境变量 `RESEND_API_KEY`、`FRIEND_APPLY_NOTIFY_EMAIL`），零外部 npm 邮件包依赖。
  - 本地环境容错：未配置凭证时自动回退为控制台格式化打印（Mock 模式），返回模拟成功，不影响本地预览与前端测试。

