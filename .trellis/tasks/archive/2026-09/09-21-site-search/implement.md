# 实施清单

## 有序步骤

1. **新建 `src/lib/blog-meta.ts`**
   从 `content.ts` 原样搬入 `BlogCategory`、`BlogSortOrder` 类型，`BLOG_CATEGORIES`、`BLOG_CATEGORY_LABELS`、`BLOG_SORT_LABELS` 常量，`calculateReadingTime` 函数。逻辑不动，只搬家。

2. **改 `src/lib/content.ts`**
   删掉上一步移出的定义，补上 re-export。跑 `pnpm typecheck`，确认 `blog-toolbar.tsx`、`blog/[slug]/page.tsx`、`admin/admin-metrics.tsx` 这些既有导入方不受影响。

3. **新建 `src/lib/search.ts`**
   实现 `buildSearchIndex`、`searchPosts`、`splitByRanges`，按 design.md 的接口契约。剥离规则和打分权重写在函数 JSDoc 里。

4. **新建 `src/lib/search.test.ts`，并把文件加进 `package.json` 的 `test` 脚本**
   覆盖 design.md 测试策略列出的五组用例。跑 `pnpm test`。

5. **改 `src/app/(site)/_components/blog/post-card.tsx`**
   加可选 `hit` prop；标题和描述位支持 `splitByRanges` 渲染；import 路径从 `content.ts` 换成 `blog-meta.ts`（`formatDate` 换成从 `@/lib/date` 导入）。

6. **新建 `src/app/(site)/_components/blog/blog-search.tsx`**
   client 组件，接收 `posts` 和 `children`。`useMemo` 建索引，`useState` 存 query，query 非空时渲染结果列表，否则渲染 `children`。

7. **改 `src/app/(site)/blog/page.tsx`**
   用 `BlogSearch` 包住工具栏与列表的容器，传 `posts={allPosts}`，原列表结构作为 `children` 保留不动。

8. **收尾删除与清理**
   删 `src/app/(site)/search/page.tsx`（连带 `search` 目录）和 `_components/placeholder/empty-state.tsx`（若无其他引用则连 `placeholder` 目录一起删）；`robots.ts` 的 `disallow` 去掉 `/search`。

9. **更新 `.trellis/spec/frontend/feature-status.md`**
   「站内搜索」一行的状态从「占位页，方案见页面注释」改为「已实现」，位置改为 `src/app/(site)/_components/blog/blog-search.tsx`。

10. **跑完整质量门**

## 验证命令

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm build
```

`pnpm build` 必跑：它会验证 `PostCard` 进浏览器包后没有残留 Node 依赖，这是本次改动最容易出问题的地方。

## 手动验证

`pnpm dev` 后打开 `http://localhost:4400/blog`，按 PRD 验收标准逐条核对，重点四条：

- 输入 `react`，列表即时过滤，DevTools Network 面板没有新请求
- 输入某篇正文里独有、标题和描述都没有的词，能命中该篇（证明正文进了索引）
- 输入只出现在代码块里的标识符，不命中（证明代码被剥离）
- 清空输入，分页器与分类筛选恢复原状

## 风险点

| 风险                               | 处理                                                                    |
| ---------------------------------- | ----------------------------------------------------------------------- |
| 抽 `blog-meta.ts` 波及面广         | re-export 保持所有既有路径有效；`pnpm typecheck` 全绿才继续下一步       |
| `PostCard` 残留 Node 依赖          | `pnpm build` 会暴露；`import type` 保证 `BlogPost` 类型不产生运行时导入 |
| 高亮区间错位                       | `toLowerCase()` 后长度变化时退回大小写敏感匹配，测试覆盖该分支          |
| 搜索结果替换 `children` 后布局塌陷 | 结果列表复用列表容器类名，空结果时补空状态文案                          |

## 回滚点

改动集中在单个分支 `feat/site-search`。`content.ts` 的 re-export 是唯一触及既有公共模块的改动，单独回滚它即可让项目退回改动前状态；其余都是新增文件加可选 prop。

## 开工前确认

- [ ] `prd.md`、`design.md`、`implement.md` 三份文档评审通过
- [ ] 用户批准最终规划摘要
- [ ] `task.py start` 已执行（status 变为 `in_progress`）
