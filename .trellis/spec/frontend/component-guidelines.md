# 组件规范

## RSC / client 划分

默认全部写 Server Components，不用加任何指令。只有用到浏览器 API（localStorage、事件监听）的组件才加 `'use client'`。

现状：项目中有两个 client 组件：`src/app/(site)/_components/site/theme-toggle.tsx`（主题存储与媒体监听）和 `src/app/(site)/_components/site/site-header.tsx`（滚动感应与移动端菜单展开）。MDX 渲染走异步 RSC（`mdx-content.tsx` 的 `compileMDX`），不需要 client。

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
- 内容宽度：首页使用宽布局 `md:w-4/5 lg:w-5/6`，文章与笔记等其余页面内部使用 `mx-auto w-full max-w-3xl`。
- 不写自定义组件 CSS 类，样式全部走 Tailwind 工具类与 data 变体（如 `data-[scrolled=true]:`、`theme-system:` 等）；`src/app/globals.css` 仅用于存放设计 token、keyframes 和变体定义。

## 通用模式

- 列表渲染 key 用稳定业务键（`post.slug`、`tag`），不用数组下标。
- 日期显示统一 `<time dateTime={post.date}>{formatDate(post.date)}</time>`，见 `post-card.tsx` 和详情页。
- 链接用 `next/link` 的 `Link`，站内跳转不写 `<a>`。
- 空列表要给文案兜底（`还没有文章。`，见 `src/app/(site)/blog/page.tsx`）。

## 动态路由页

参考 `src/app/(site)/blog/[slug]/page.tsx` 的完整结构：

- `generateStaticParams` 返回全部 slug。
- `export const dynamicParams = false`，未列出的 slug 直接 404。
- `generateMetadata` 读单条数据生成 title / description。
- Next.js 16 的 `params` 是 Promise，取值要 `await`。

## draft 过滤

列表、归档、标签页过滤 `draft`；详情页不过滤（draft 文章可直接访问）。过滤逻辑在页面里做（`getAllBlogPosts().filter((post) => !post.draft)`），数据层返回全量。

## MDX 渲染

正文渲染统一走 `MdxContent`（rehype-slug + remark-gfm），不在别处再调 `compileMDX`。目录（TOC）的锚点 id 依赖 rehype-slug 生成的 id，`src/lib/content.ts` 的 `extractHeadings` / `slugifyHeading` 与之保持一致，改任何一边都要同步另一边。

## 占位页

未实现的功能统一用 `src/app/(site)/_components/placeholder/empty-state.tsx`，页面注释里写实现方案（参考 `src/app/(site)/search/page.tsx`、`giscus-comments.tsx`）。实现后删掉占位组件和注释，并把 README「功能状态」表的状态改成「已实现」。

## Metadata

- 静态标题用 `export const metadata: Metadata = { title: '文章' }`，根布局的模板会拼成「文章 - 站点标题」。
- 详情页用 `generateMetadata`，数据缺失返回 `{}`。
- 不在页面里手写完整 title 字符串。
