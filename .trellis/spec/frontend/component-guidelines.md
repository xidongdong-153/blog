# 组件规范

## RSC / client 划分

默认全部写 Server Components，不用加任何指令。只有用到浏览器 API（localStorage、事件监听）的组件才加 `'use client'`。

现状：项目中的 client 组件包括：
- `src/app/(site)/_components/site/theme-toggle.tsx`（主题存储与媒体监听）
- `src/app/(site)/_components/site/site-header.tsx`（滚动感应与移动端菜单展开）
- `src/app/(site)/_components/blog/toc.tsx`（TOC 目录展开折叠、点击互斥锁、侧栏自滚动与 RAF 进度更新）
- `src/app/(site)/_components/blog/floating-action-group.tsx`（移动端抽屉唤出与返回顶部百分比计算）
- `src/app/(site)/_components/comment/giscus-comments.tsx`（Giscus 客户端脚本挂载、主题 DOM 监听与 postMessage 免重载变色）

MDX 渲染走异步 RSC（`mdx-content.tsx` 的 `compileMDX`），不需要 client。高频滚动联动场景使用 `requestAnimationFrame` 调度，直接更新对应节点的样式（如 TOC 进度条、SiteHeader 连续水膜插值），避免高频触发 React 整体组件树重新渲染。SiteHeader 不使用布尔阈值硬切与布局重排（如动态 margin），改用 0~80px 连续进度驱动独立背景水膜层透明度、渐进遮罩与微缩放。

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
- 文章卡片 `PostCard`（`src/app/(site)/_components/blog/post-card.tsx`）：采用 `rounded-2xl border border-border bg-background hover:bg-muted` 卡片形态，标题配备 SVG 动态重定向箭头，正文阅读时间由 `src/lib/content.ts` 的 `calculateReadingTime` 统一推算，卡片底部标签采用独立 Pill 组。
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
  - `figure` / `figcaption` / `pre`：封装代码块标题、语言标识与复制按钮（`src/app/(site)/_components/blog/code-block.tsx`、`copy-button.tsx`）。
  - `a`：站内链接走 Next.js `Link`，外部链接安全打开。
  - `table`：包裹响应式水平横向滚动外层容器。
  - `img`：点击可唤起全屏平滑放大灯箱预览（`image-zoom.tsx`）。
  - 内置提示与折叠组件：`<Callout>`（`callout.tsx`）与 `<Collapse>`（`collapse.tsx`）。
- **阅读时间**：
  - 博客详情页统一通过 `calculateReadingTime` 推算正文用时并在 Hero 日期旁呈现。

## 评论组件

文章详情页挂载基于 GitHub Discussions 的 Giscus 评论组件（`src/app/(site)/_components/comment/giscus-comments.tsx`）：

- **配置契约**：
  - 核心环境变量：`NEXT_PUBLIC_GISCUS_REPO`、`NEXT_PUBLIC_GISCUS_REPO_ID`、`NEXT_PUBLIC_GISCUS_CATEGORY_ID`。
  - 可选环境变量：`NEXT_PUBLIC_GISCUS_CATEGORY`（默认 `General`）、`NEXT_PUBLIC_GISCUS_MAPPING`（默认 `pathname`）、`NEXT_PUBLIC_GISCUS_REACTIONS_ENABLED`（默认 `1`）、`NEXT_PUBLIC_GISCUS_INPUT_POSITION`（默认 `top`）、`NEXT_PUBLIC_GISCUS_LANG`（默认 `zh-CN`）。
  - 变量模板放置在根目录 `.env.example`，在 `.gitignore` 中配置 `!.env.example` 允许提交。
- **容错降级**：
  - 未配置核心环境变量时，渲染带有配置说明的虚线卡片，不执行外部脚本注入，不抛出异常或白屏。
- **主题联动**：
  - 初始化时依据 `document.documentElement.classList.contains('dark')` 传入明暗主题。
  - 运行时通过 `MutationObserver` 监听 `html` 的 `class` 与 `data-theme` 属性，发生变化时通过 `postMessage({ giscus: { setConfig: { theme } } }, 'https://giscus.app')` 通知 iframe 更新样式，无需重新渲染组件或重新加载页面。

## 占位页

未实现的功能统一用 `src/app/(site)/_components/placeholder/empty-state.tsx`，页面注释里写实现方案（参考 `src/app/(site)/search/page.tsx`）。实现后删掉占位组件和注释，并把 README「功能状态」表的状态改成「已实现」。

## Metadata

- 静态标题用 `export const metadata: Metadata = { title: '文章' }`，根布局的模板会拼成「文章 - 站点标题」。
- 详情页用 `generateMetadata`，数据缺失返回 `{}`。
- 不在页面里手写完整 title 字符串。

