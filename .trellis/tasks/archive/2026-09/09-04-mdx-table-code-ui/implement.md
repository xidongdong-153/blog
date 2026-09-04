# 执行计划

## 实现

- [x] 调整 `CustomTable` 的滚动容器与表格工具类，清除表格内部多余外边距，并加入最小宽度、表头、单元格和行分隔样式。
- [x] 为表格滚动容器补充键盘焦点与无障碍名称，确认不会把页面根节点撑宽。
- [x] 重做 `CodeFigure` 与 `CodeTitle`，统一代码背景、边框、圆角和紧凑文件名头部。
- [x] 调整 `CopyButton` 的常驻可见样式与 focus-visible 状态，保留复制成功反馈。
- [x] 调整 `CodePre` 和 `globals.css` 中语言标识、行高亮的空间关系，避免控件或标识覆盖代码。
- [x] 只清理本次修改产生的无用样式或导入，不改其他 MDX 组件。

## 自动检查

按顺序执行：

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm format:check`
4. `pnpm build`
5. `node /Users/wuwanzhu/Code/xdd/blog/.pi/skills/impeccable/scripts/detect.mjs --json 'src/app/(site)/_components/blog/mdx-content.tsx' 'src/app/(site)/_components/blog/code-block.tsx' 'src/app/(site)/_components/blog/copy-button.tsx' src/app/globals.css`

## 浏览器检查

使用 `/blog/20260615-hello-blog` 的真实内容检查：

- [x] 1440x900 亮色：带标题代码块、无标题代码块、四列表格。
- [x] 1440x900 暗色：文件名层级、复制按钮、语言标识和行高亮。
- [x] 390x844 亮色：表格局部横向滚动、长文件名、代码水平滚动。
- [x] 390x844 暗色：触屏布局中复制按钮始终可见，无文字或控件重叠。
- [x] 用 DOM 尺寸确认页面根节点无横向溢出，表格容器 `scrollWidth > clientWidth`。
- [x] 用键盘聚焦表格滚动容器和复制按钮，检查 focus-visible 与复制反馈。

## 风险与检查点

- `@tailwindcss/typography` 会给 `table`、`pre`、`code` 添加默认样式。实现后检查生成样式的优先级，不使用 `!important` 处理普通覆盖。
- `CopyButton` 通过最近的 `figure` 查询 `code` 文本。改变视觉结构时不移动按钮到 `figure` 外部。
- `rehype-pretty-code` 只在有标题时生成 `figcaption`。无标题代码块必须单独检查首行右侧空间。
- 若视觉改动影响其他 MDX 元素，先恢复对应选择器，再缩小选择器范围，不扩大重构范围。
