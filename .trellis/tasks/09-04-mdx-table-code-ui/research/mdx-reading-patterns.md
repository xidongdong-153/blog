# 技术文档表格与代码块调研

## 本地证据

- `src/app/(site)/_components/blog/mdx-content.tsx` 将 GFM 表格包在 `overflow-x-auto` 容器中，但表格使用 `w-full` 且没有最小宽度。
- 390px 视口实测：表格容器和表格宽度都是 340px，四列被直接压缩，`scrollWidth` 没有超过 `clientWidth`，所以当前横向滚动实际上不会出现。
- `@tailwindcss/typography` 给表格本身保留了上下外边距。当前表格位于带边框容器内部，实测表格顶部与容器顶部相差约 29px，形成不必要的空白。
- `src/app/(site)/_components/blog/code-block.tsx` 使用 `bg-muted/40` 文件名栏、`bg-card/60` 外层和透明 `pre`。三层材质在暗色主题下彼此割裂。
- 复制按钮依赖 `group-hover` 才显示；触屏设备没有稳定的 hover 状态。
- 代码语言标识通过绝对定位放在右下角，正文底部需要保留足够空间，避免覆盖最后一行。

## 外部参考

- MDN 的响应式布局与 `min-width` 文档确认：元素可用最小宽度保护内容尺寸，再由父级滚动容器处理窄视口。参考：
  - https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/min-width
  - https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design
- Docusaurus 将代码块标题、复制按钮、行高亮和主题视为同一代码块组件的能力，标题通过 fenced code metadata 提供。参考：
  - https://docusaurus.io/docs/markdown-features/code-blocks

## 采用的做法

- 表格保持原生 `<table>` 语义，不转换成卡片。
- 表格设置适合技术内容的最小宽度；窄屏由局部容器横向滚动，描述列仍可自然换行。
- 清除 `prose` 给表格本身添加的外边距，间距只由外层容器负责。
- 代码块文件名与正文使用同一背景，只通过细分隔线、字重和留白区分层级。
- 文件名采用站内已有的 `//` 等宽元数据语言；复制按钮始终可见，静止状态弱化，hover 与 focus 时提高对比度。

## 调研限制

搜索结果可以访问，但当前网络代理把 Docusaurus 解析到保留地址段，正文抓取被 SSRF 保护拦截。本任务只采用搜索摘要确认的公开功能，不引用未读取的实现细节。
