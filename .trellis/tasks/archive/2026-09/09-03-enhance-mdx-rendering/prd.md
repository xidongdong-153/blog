# 增强 MDX 渲染能力与排版交互

## 目标

参考参照项目 `~/Code/blog` 的排版质量与交互体验，对当前博客项目的 MDX 渲染层进行分阶段系统性增强。补齐代码块语法高亮与交互、中文与专业排版插件支持、HTML 标签与自定义组件映射，以及正文阅读统计与交互细节，使技术内容呈现达到生产级标准。

## 现状与事实确认

1. 当前项目使用 Next.js 16 (App Router) + React 19 + Tailwind CSS 4，内容渲染位于 `src/app/(site)/_components/blog/mdx-content.tsx`。
2. 当前 `compileMDX` 仅配置了 `remark-gfm` 与 `rehype-slug` 两个基础插件，未传递任何自定义 `components`。
3. 代码块目前无语法着色，无语言标识，无标题，无行号，无一键复制代码按钮。
4. 中文写作中紧贴全角标点的加粗文本因 CommonMark flanking 限制出现解析异常。
5. 数学公式（LaTeX）、标题悬停直达锚点与外部链接安全新窗口打开均未支持。
6. `src/lib/content.ts` 已实现 `calculateReadingTime` 函数，但博客详情页未接入展示。
7. 正文图片为原生 `<img>` 标签，未适配大图点击灯箱放大（MediumZoom）。

## 需求拆解与阶段规划

### 阶段一：基础体验与代码块交互（P0）

1. **代码块语法高亮**：
   - 引入 `rehype-pretty-code`（基于 Shiki）或 `@shikijs/rehype`。
   - 配置浅色与深色双主题适配（如 `catppuccin-latte` 与 `catppuccin-mocha`，或 `github-light` 与 `github-dark`）。
   - 支持代码块语言标识（Language Badge）与代码块标题（`title="filename.ts"`）。
   - 支持行高亮、行号与 Diff 标记。
2. **代码块一键复制**：
   - 为代码块右上角注入复制按钮组件，点击后将代码写入剪贴板，带有复制成功状态反馈（2 秒恢复）。
3. **阅读时间与字数统计落地**：
   - 在 `src/app/(site)/blog/[slug]/page.tsx` 详情页头部引入 `calculateReadingTime`，展示预估用时与阅读时钟图标。

### 阶段二：中文排版与专业技术排版插件（P1）

1. **CJK 全角标点加粗修复**：
   - 引入 `remark-cjk-friendly`，解决中文排版中 `**加粗**，` 无法渲染的问题。
2. **LaTeX 数学公式排版**：
   - 引入 `remark-math` 与 `rehype-katex`，在布局中引入 `katex/dist/katex.min.css`，支持行内 `$公式$` 与块级 `$$公式$$`。
3. **正文标题锚点链接**：
   - 引入 `rehype-autolink-headings`，为正文 h2~h4 标题自动生成带 `#` 的锚点直达链接，支持鼠标悬停显示。
4. **外部链接安全处理**：
   - 引入 `rehype-external-links`，自动为外链追加 `target="_blank"` 和 `rel="noopener noreferrer"`，并可选外链提示图标。
5. **TOC 提取算法对齐**：
   - 对齐 `src/lib/content.ts` 中的 `extractHeadings` 与 `rehype-slug`（`github-slugger`）的命名规则，杜绝重复标题或复杂标点导致的锚点不匹配。

### 阶段三：组件映射与媒体交互（P2）

1. **原生 HTML 标签组件映射**：
   - `a` 标签：内部链接转为 Next.js `Link` 客户端路由预加载，外部链接保持安全外链。
   - `table` 标签：外层包裹响应式水平滚动容器（`<div className="overflow-x-auto">`），防止小屏撑破页面。
   - `img` 标签：优化展示，防止布局抖动。
2. **正文图片灯箱缩放**：
   - 引入轻量图片放大功能（类 MediumZoom），支持点击正文图片全屏平滑放大预览与遮罩关闭。
3. **常用 MDX 提示组件**：
   - 实现 `<Callout type="note|tip|warning|important">` 警示卡片组件，支持在 MDX 中直接调用。
   - 实现 `<Collapse title="...">` 手风琴折叠面板，用于收纳长日志与参考配置。

## 验收标准

- [x] 文章中各种编程语言的代码块均能按主题着色，支持代码块标题与复制按钮。
- [x] 博客文章详情页头部正确显示预估阅读时间与字数。
- [x] 中文紧贴全角标点的加粗能够正常呈现为粗体，无多余星号。
- [x] LaTeX 数学公式正确以矢量符号排版渲染。
- [x] 正文标题悬停时显示锚点图标，点击可复制或跳转锚点。
- [x] MDX 正文支持调用 `<Callout>` 与 `<Collapse>` 组件。
- [x] 正文图片支持点击放大查看，表格在小屏支持横向滑动不撑破布局。
- [x] 执行并通过项目代码质量门：`pnpm typecheck`、`pnpm lint`、`pnpm format:check`。

## 非目标 (Out of scope)

- 不替换 `next-mdx-remote` 的底层架构，保持静态生成与无数据库依赖。
- 不影响已有文章和笔记的元数据字段与文件组织结构。
