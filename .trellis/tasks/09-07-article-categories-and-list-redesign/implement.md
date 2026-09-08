# 实施计划 (implement.md)

## 1. 实施检查清单

- [x] **步骤 1：数据层扩展与文章 Frontmatter 更新**
  - [x] 修改 `src/lib/content.ts`：增加 `BlogCategory` 类型及 `BLOG_CATEGORY_LABELS` 映射。
  - [x] 在 `BlogPost` 接口中加入必填字段 `category: BlogCategory`。
  - [x] 添加 `requireCategory` 校验逻辑，缺省或非法即报错。
  - [x] 添加 `sortBlogPosts` 辅助排序函数。
  - [x] 更新 `content/blog/` 下 4 篇文章的 `post.mdx`，补充对应 `category`。
  - [x] 运行 `pnpm typecheck` 验证数据契约。

- [x] **步骤 2：重构文章列表项组件 (去卡片化)**
  - [x] 重构 `src/app/(site)/_components/blog/post-card.tsx`。
  - [x] 移除卡片容器样式（`bg-card`、`rounded-xl`、外层 `border`）。
  - [x] 调整为底部分割线与开阔留白排版。
  - [x] 眉标中呈现 `// [分类中文名] / [日期] / [阅读时长]`。

- [x] **步骤 3：实现分类筛选与多维排序交互**
  - [x] 创建 `src/app/(site)/_components/blog/blog-toolbar.tsx`。
  - [x] 渲染分类按钮（技术、捣鼓、随想），支持点击筛选与再次点击取消。
  - [x] 渲染排序切换（最新、最早、最近更新）。
  - [x] 在 `src/app/(site)/blog/page.tsx` 中集成工具栏，并实现列表的过滤与排序联动。

- [x] **步骤 4：规范文档同步与质量门验收**
  - [x] 更新 `.trellis/spec/frontend/content-guidelines.md` 记录 `category` 规范。
  - [x] 更新 `.trellis/spec/frontend/feature-status.md` 反映分类功能状态。
  - [x] 运行完整质量检查命令。

---

## 2. 验证与检查命令

按顺序执行质量门检查：

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
```

---

## 3. 风险评估与回滚方案

- **涉及文件**：
  - `src/lib/content.ts`
  - `content/blog/*/post.mdx`
  - `src/app/(site)/blog/page.tsx`
  - `src/app/(site)/_components/blog/post-card.tsx`
  - `.trellis/spec/frontend/content-guidelines.md`
- **风险点**：
  - Frontmatter 必填校验如果在已有文章未全部更新时运行，会导致 `getAllBlogPosts()` 抛出异常阻断构建。实施时必须先改文章 frontmatter 或同步改动。
- **回滚方式**：
  - 任务实施全部在 Git 工作区进行，如有异常可通过 `git checkout -- <file>` 或 `git restore` 恢复。
