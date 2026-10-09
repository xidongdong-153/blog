# 执行计划

## 顺序清单

### 阶段 1：左侧栏 SeriesChapterSidebar（`src/app/(site)/_components/blog/series-chapter-sidebar.tsx`）

- [x] 1.1 展开态头部改为「搜索框 + 折叠图标」一行；删除专栏标题链接、`// 大纲 · 共 N 讲`、连载状态徽标。
- [x] 1.2 删除底部 `// 查看系列完整大纲 →` 区块。
- [x] 1.3 折叠态改为纯图标按钮，删除文字微标与 `activeOrder/totalCountStr` 相关计算。
- [x] 1.4 章节序号由 `padStart(2,'0')` 改为直接渲染 `${order}`。
- [x] 1.5 清理不再使用的导入（`SERIES_STATUS_LABELS`、`Link` 若已无引用）。

### 阶段 2：列表卡片 SeriesBanner（`src/app/(site)/_components/blog/series-banner.tsx`）

- [x] 2.1 删除 2 行描述段，其余 meta、标签、入口保留。

### 阶段 3：专栏主页 SeriesDetailPage（`src/app/(site)/blog/series/[id]/page.tsx`）

- [x] 3.1 顶部删除描述段，保留面包屑、状态、收录数、标题、标签、仓库。
- [x] 3.2 章节卡片 `第 {formattedOrder} 讲` 改为纯数字序号，移除 `formattedOrder` 补零逻辑。

### 阶段 4：文章页微标与文末导轨

- [x] 4.1 `src/app/(site)/blog/[slug]/page.tsx` 顶部微标去掉 `· 第 {currentIndex} 讲`。
- [x] 4.2 `src/app/(site)/_components/blog/series-paginator.tsx` 去掉 `第 {currentIndex} / {totalCount} 讲`。

### 阶段 5：移动端抽屉 FloatingActionGroup（`src/app/(site)/_components/blog/floating-action-group.tsx`）

- [x] 5.1 专栏 Tab 删除专栏标题链接、`// 大纲 · 共 N 讲`、`专栏主页 →` 区块。
- [x] 5.2 章节序号改纯数字。

### 阶段 6：验证 UI 改动

- [x] 6.1 `pnpm typecheck`
- [x] 6.2 `pnpm lint`
- [x] 6.3 `pnpm format:check`
- [x] 6.4 `pnpm build`
- [x] 6.5 dev 环境截图核对：列表页、专栏主页、专栏文章左侧栏（展开/折叠）、移动端抽屉。

### 阶段 7：清理测试内容

- [x] 7.1 删除 7 篇博客文章、1 篇笔记及依赖旧文章数据的 `src/lib/series.test.ts`。
- [x] 7.2 从 `package.json` 的 `test` 命令移除已删除的系列测试文件。
- [x] 7.3 增加测试期临时文章 fixture，并接入评论路由、评论服务、访客路由、访客 WebSocket 测试。
- [x] 7.4 运行 `pnpm test`，确认 fixture 在测试后清理且内容目录没有持久化内容。
- [x] 7.5 依次运行 `pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`。

## 验证命令

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
```

## 回滚点

- 每阶段独立可回滚；整体 `git revert`。
- 风险文件：`series-chapter-sidebar.tsx`（改动最大，头部布局与折叠态需截图核对）。
