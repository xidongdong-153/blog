# 执行计划：增强 MDX 渲染能力与排版交互

## 阶段一：基础体验与代码块交互 (P0)

- [x] **1.1 安装与配置代码高亮插件**
  - 安装依赖：`pnpm add rehype-pretty-code shiki`
  - 在 `src/app/(site)/_components/blog/mdx-content.tsx` 中配置 `rehype-pretty-code`
  - 设置 Catppuccin 双主题（`catppuccin-latte` / `catppuccin-mocha`）
  - 验证：在文章中包含 TypeScript 代码块，检查是否有语法高亮
- [x] **1.2 实现代码块一键复制与装饰**
  - 新建 `src/app/(site)/_components/blog/copy-button.tsx`（带复制成功状态切换与 2 秒计时器）
  - 新建或扩展代码块容器，接入复制按钮与标题
  - 验证：点击复制按钮能成功写入剪贴板
- [x] **1.3 详情页接入阅读时间展示**
  - 修改 `src/app/(site)/blog/[slug]/page.tsx`，调用 `calculateReadingTime(post.content)`
  - 在发布日期旁渲染预计用时和时钟图标
  - 验证：打开任一博客文章详情页，核对阅读时间文字与排版

## 阶段二：中文排版与专业技术排版插件 (P1)

- [x] **2.1 修复中文全角标点加粗**
  - 安装依赖：`pnpm add remark-cjk-friendly`
  - 加入 `compileMDX` 的 `remarkPlugins`
  - 验证：测试中文后接标点的加粗语句，确认不再漏渲染
- [x] **2.2 集成 LaTeX 数学公式排版**
  - 安装依赖：`pnpm add remark-math rehype-katex katex` 与 `@types/katex`
  - 在 `compileMDX` 中引入插件并在布局中引入 `katex/dist/katex.min.css`
  - 验证：在正文中编写 `$E=mc^2$` 与 `$$...$$`，检查公式渲染
- [x] **2.3 标题锚点链接与外链安全**
  - 安装依赖：`pnpm add rehype-autolink-headings rehype-external-links`
  - 配置标题锚点符号为 `#`，设置外链 `target="_blank"`
  - 优化 `src/lib/content.ts` 目录提取算法与 `github-slugger` 对齐
  - 验证：点击正文标题右侧 `#`，URL 正确切换锚点 hash

## 阶段三：组件映射与媒体交互 (P2)

- [x] **3.1 原生 HTML 标签组件映射**
  - 映射 `table`：响应式水平滚动外层包装容器
  - 映射 `a`：内部链接转 Next.js `Link`，外部链接安全打开
- [x] **3.2 正文图片灯箱缩放 (MediumZoom / Lightbox)**
  - 实现 `src/app/(site)/_components/blog/image-zoom.tsx`
  - 支持点击正文图片放大预览与遮罩关闭
  - 验证：在文章中插入大图，点击测试放大与关闭
- [x] **3.3 常用 MDX 提示组件**
  - 新增 `src/app/(site)/_components/blog/callout.tsx`（Note / Tip / Warning / Important）
  - 新增 `src/app/(site)/_components/blog/collapse.tsx`（折叠面板）
  - 传入 `compileMDX` 的 `components`
  - 验证：在文章中使用 `<Callout>` 与 `<Collapse>` 语法并测试展示

## 验证命令

每次阶段变更后依次运行项目质量门：

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
```

## 风险与回滚方案

- 若某些 remark/rehype 插件版本与 React 19 / Next.js 16 存在 ESM 兼容冲突，优先固定兼容版本或在 `mdx-content.tsx` 内部降级替代。
- 新增依赖均仅服务于静态编译阶段，若构建体积或样式异常可单项注释插件排查。
