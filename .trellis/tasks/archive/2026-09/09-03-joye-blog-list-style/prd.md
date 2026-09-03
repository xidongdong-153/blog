# 复刻 Joye 博客列表页面样式细节

## 目标

以参照项目 `~/Code/blog` 的博客列表页（`src/pages/blog/[...page].astro` 及 `astro-pure` 组件）为设计标准，对当前博客的列表页面（`/blog`）进行完整样式细节复刻，使页面骨架、卡片细节、微动效与侧边栏布局高度一致。

## 事实确认

1. 参照项目使用 Astro + astro-pure + UnoCSS，当前项目使用 Next.js 16 (App Router) + React 19 + Tailwind CSS 4。
2. 参照项目的博客列表为双列响应式网格：左侧 3fr 为文章列表主区，右侧 1fr 为 Tags 侧边栏；小屏自动折叠为单列。
3. 参照项目顶部具有通用的带向左动态箭头返回按钮 `<Button title="Back" href="/" style="back" />`。
4. 参照项目的文章列表项 (`PostPreview`) 具有圆角边框卡片形态，悬浮时背景变为 `bg-muted`，右侧标题伴随 SVG 伸缩箭头动效，底部带有阅读时间估算及 Pill 胶囊标签。
5. 参照项目具有列表统计条（显示当前页及总篇数，右侧提供年份归档入口）。
6. 当前项目博客列表为单列文本列表，缺少返回按钮、侧边栏、卡片容器底色与边框、悬浮重定向箭头和统一的 Pill 按钮。

## 需求

### 1. 页面骨架与双列布局
- 列表页面宽度放宽为与整站容器一致的宽度（`max-w-[70rem]` 或对应 `max-w-5xl`），两端留有响应式内边距。
- 顶部保留返回按钮，点击返回首页，带有向左滑动的箭头动画。
- 标题区域规范为 `h1.text-3xl font-medium`，文案为 `Blog` 或中文 `文章`。
- 主体采用双列网格布局：
  - 桌面端：`sm:grid-cols-[3fr_1fr] sm:gap-x-8`。
  - 移动端：单列纵向排列，间距保持合理层次。

### 2. 列表信息条 (Header Bar)
- 位于左侧文章列表正上方，左右两侧对齐：
  - 左侧：当前展示文章与总数统计（例如：`Page 1 · 共 X 篇文章` 或 `Showing X of Y posts`）。
  - 右侧：归档页面跳转链接，带右箭头文字 `按年份查看全部 →`，链接指向 `/blog/archives`。

### 3. 文章卡片 (PostCard) 细节复刻
- 容器结构：`rounded-2xl border border-border bg-background px-5 py-2.5 max-sm:px-4 sm:py-5 transition-colors ease-in-out hover:bg-muted`。
- 布局排版：
  - 顶部/首行：日期展示，采用等宽字体 `font-mono text-xs text-muted-foreground min-w-[95px]`。
  - 标题行：两端对齐，左侧为加粗或中等粗细文章标题，右侧内嵌动态重定向箭头 SVG。
  - 悬浮动效：鼠标悬停在文章链接时，标题颜色转为 `hover:text-primary`；箭头内部横线从右侧伸展（`translate-x-4 scale-x-0` 到 `translate-x-1 scale-x-100`），折线微移（`translate-x-0` 到 `translate-x-1`），描边颜色由静止态的 `stroke-muted-foreground` 转为 `stroke-primary`。
  - 摘要描述：`line-clamp-2 pt-1 text-sm text-muted-foreground sm:line-clamp-3`。
  - 元信息栏：包含时钟图标与阅读时间估算（如 `1 min read`）。
  - 底部标签组：独立于卡片主链接之外，每个标签展示为带有边框与浅底色的胶囊按钮（Pill），悬停时微放大并高亮。

### 4. 右侧标签侧边栏 (Sidebar)
- 标题：包含标签图标与 `Tags`（或 `标签`）字样。
- 标签列表：流式排列所有已发布文章的标签，每个标签使用统一样式的 Pill 按钮。
- 底部链接：右对齐或左对齐的 `查看全部 →`（`View all →`），跳转到全部标签页 `/blog/tags`。

### 5. 分页组件 (Paginator)
- 列表底部提供分页导航结构，左右对齐分别呈现上一页与下一页按钮。
- 当页数仅有 1 页时安全隐藏或优雅处理。

## 验收标准

- [x] 页面在桌面端呈现 3fr:1fr 的双列非对称布局，小屏下标签栏自然折叠到下方。
- [x] 页面顶部存在带返回动画的返回按钮，能正确跳转回 `/`。
- [x] 列表顶部统计条完整显示当前文章数量，并提供到 `/blog/archives` 的入口。
- [x] 每篇文章以 `rounded-2xl border` 卡片形式呈现，悬浮时背景色切至 `bg-muted`。
- [x] 文章标题右侧带有 SVG 动态箭头，鼠标悬停时箭杆平滑伸展展开，箭头平移，描边变为主题色。
- [x] 文章卡片内展示基于正文字数推算的阅读时间及时钟图标。
- [x] 卡片内与侧边栏的标签均展示为标准 Pill 样式，点击标签跳转到对应标签过滤页，卡片主区域与标签点击互不干扰。
- [x] 亮色与暗色模式下对比度清晰，无文字过暗或边框突兀情况。
- [x] 执行并通过项目代码质量门：`pnpm typecheck`、`pnpm lint`、`pnpm format:check`。

## 非目标 (Out of scope)

- 不重写博客文章正文详情页（`[slug]/page.tsx`）。
- 不调整全站页头页脚的结构与业务路由。
- 不引入外部未授权的 UI 库依赖，纯使用现存 Tailwind CSS 4 与 React 19。
