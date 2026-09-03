# Joye 博客列表页面对比与技术细节调研

## 调研对象

- 参照项目：`~/Code/blog`（即 `/Users/wuwanzhu/Code/blog`，Astro + astro-pure + UnoCSS）
- 关键源码：
  - `src/pages/blog/[...page].astro`（博客列表页模板）
  - `astro-pure` 组件包中 `components/pages/PostPreview.astro`（文章卡片）
  - `astro-pure` 组件包中 `components/pages/Paginator.astro`（分页器）
  - `astro-pure` 组件包中 `components/user/Button.astro`（通用按钮/胶囊/返回按钮）
  - `astro-pure` 组件包中 `components/user/FormattedDate.astro`（日期展示）
- 当前项目：`/Users/wuwanzhu/Code/xdd/blog`（Next.js 16 + React 19 + Tailwind CSS 4）
- 当前代码：
  - `src/app/(site)/blog/page.tsx`
  - `src/app/(site)/_components/blog/post-card.tsx`

## 布局对比

### 1. 整体骨架与网格

参照项目：
- 容器宽度遵循站点头尾最大宽度 `max-w-[70rem]`（1120px），左右边距 `px-4 sm:px-7 lg:px-10`。
- 页面顶部设有返回首页按钮：`<Button title="Back" href="/" style="back" />`。
- 大标题：`h1` 样式为 `mb-6 mt-6 text-3xl font-medium sm:mt-10`。
- 双列非对称网格：`grid gap-y-16 sm:grid-cols-[3fr_1fr] sm:gap-x-8`。
  - 左侧主区域（3fr）：承载列表信息条、文章卡片列表、分页器。
  - 右侧侧边栏（1fr）：承载标签云与查看全部标签导航。

当前项目：
- 容器为居中单列 `max-w-3xl flex flex-col gap-10`，内容宽度窄（768px），且全部内容单列垂直堆叠。
- 顶部无返回上一级按钮。
- 大标题为 `text-2xl font-bold tracking-tight`，无副信息行。
- 标签直接水平罗列在大标题下方，挤占首屏垂直高度。
- 缺少侧边栏分区。

### 2. 列表信息条

参照项目：
- 结构：`mb-3 flex flex-col justify-between text-sm sm:mb-5 sm:flex-row`。
- 左侧：当前页与总数统计，`text-muted-foreground`，文本形如 `Page 1 - Showing 8 of 24 posts`。
- 右侧：按年份查看归档链接，带有右箭头：`View all posts by years →`，链接到 `/archives`（在当前项目为 `/blog/archives`）。

当前项目：
- 仅在标题右侧孤立放置了一个普通文本链接「归档」。

### 3. 右侧标签侧边栏

参照项目：
- 侧边栏结构：`<aside id="sidebar">`。
- 标题：`<h2 class="mb-4 flex items-center text-lg font-semibold"><Icon name="tag-2" class="me-2" />Tags</h2>`。
- 标签列表：`<ul class="flex flex-wrap gap-2">`。
- 标签项：每个标签渲染为 Pill 胶囊按钮（`<Button title={tag} href={"/tags/" + tag} style="pill" />`）。
- 底部链接：`<span class="mt-4 block sm:text-end"><a href="/tags">View all →</a></span>`。

当前项目：
- 没有侧边栏，标签堆砌在主内容区上方。

## 组件对比

### 1. 文章卡片 (`PostPreview` vs `PostCard`)

参照项目结构与样式：
- 根元素为 `li`：
  `post-preview group/card flex flex-col relative rounded-2xl border bg-background transition-colors ease-in-out px-5 py-2.5 hover:bg-muted max-sm:px-4 sm:py-5`
- 链接包裹文章主要内容：
  `group/link w-full flex flex-col transition-all hover:text-primary`
- 日期格式：
  `<span class="text-muted-foreground font-mono min-w-[95px] py-1 text-xs"><time dateTime={post.date}>{formatDate(post.date)}</time></span>`
- 标题与动态悬浮箭头：
  - 标题容器为 `flex justify-between`，文字样式为 `font-medium`。
  - 右侧配备动态重定向箭头 SVG：
    - 箭杆（`line`）：`translate-x-4 scale-x-0 transition-all duration-300 ease-in-out group-hover/link:translate-x-1 group-hover/link:scale-x-100`。
    - 箭头尖（`polyline`）：`translate-x-0 transition-all duration-300 ease-in-out group-hover/link:translate-x-1`。
    - 描边颜色：默认 `stroke-muted-foreground`，在 `group-hover/link` 时变为 `stroke-primary`。
- 描述文本：
  `line-clamp-2 pt-1 text-sm text-muted-foreground sm:line-clamp-3`
- 阅读时间与图标：
  `flex items-center gap-2 py-1.5 text-sm italic leading-4 text-muted-foreground sm:py-3`
  内嵌时钟图标与计算出的分钟数，如 `1 min read`。
- 底部标签组：
  位于卡片底部且独立于文章 `<a>` 标签之外，防止 HTML 嵌套错误；每个标签为 Pill 胶囊按钮。

当前项目：
- 仅为一个没有边框、没有背景色、没有悬浮态的 `article`。
- 标题是普通文本链接，缺少右侧动态重定向箭头。
- 无阅读时间计算与展示。
- 标签仅以 `#tag` 文字平铺在日期旁边。

### 2. 交互按钮组件 (`Button`)

参照项目支持多种样式：
- `style="button"`：圆角 `rounded-lg bg-muted border px-2 py-1 text-sm text-muted-foreground hover:bg-primary-foreground hover:text-primary`。
- `style="pill"`：圆角加大为 `rounded-xl`。
- `style="back"`：前置向左展开的 SVG 箭头（hover 时箭杆由 `translate-x-3 scale-x-0` 展开至 `translate-x-0 scale-x-100`，箭头尖平移）。
- `style="ahead"`：后置向右展开的 SVG 箭头。

当前项目：
- 尚无统一的带动效 `Button` / `Pill` 组件，各处样式零散。

### 3. 分页导航器 (`Paginator`)

参照项目：
- 左右两端对齐导航（`prevUrl` 在 `me-auto`，`nextUrl` 在 `ms-auto`）。
- 文本支持前缀与后缀符号，如 `← Previous Posts` 与 `Next Posts →`。

当前项目：
- 缺失分页组件。
