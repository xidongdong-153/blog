# 全站文案中文化与本土化优化

## 目标

将全站英文及混合文案进行中文化改造，统一全站中文阅读体验。首页根据配置保留具有设计感的英文标语，列表页、详情页、系统状态及配置项全面中文本土化。

## 待优化文案清单与涉及文件

### 1. 文章列表页 (`src/app/(site)/blog/page.tsx`)
- 页面 Title：`Blog` -> `文章`
- 头部主标题：`Blog` -> `文章`
- 返回按钮：`Back` -> `返回`
- 统计条：`Page {currentPage} - Showing {posts.length} of {totalPosts} posts` -> `第 {currentPage} 页 · 共 {totalPosts} 篇`
- 归档入口：`View all posts by years →` -> `按年份查看全部文章 →`
- 分页按钮：`← Previous Posts` -> `← 上一页`，`Next Posts →` -> `下一页 →`
- 空状态提示：`No posts yet.` -> `暂无文章。`

### 2. 标签与侧边栏 (`src/app/(site)/_components/blog/blog-sidebar.tsx`)
- 侧栏标题：`Tags` -> `标签`
- 查看全部链接：`View all →` -> `查看全部 →`

### 3. 分页器默认值 (`src/app/(site)/_components/blog/paginator.tsx`)
- 默认文本 fallback：`← Previous Posts` -> `← 上一页`，`Next Posts →` -> `下一页 →`

### 4. 阅读时间估算 (`src/lib/content.ts`)
- `calculateReadingTime` 返回值：`{minutes} min read` -> `预计阅读 {minutes} 分钟`

### 5. 首页与个人资料（待用户确认范围）
- 涉及文件：`src/app/(site)/_components/home/hero.tsx`、`src/profile.config.ts`
- 待定项：
  - Hero 状态徽章：`Engineering & Systems` 是否中文化（如 `软件工程与系统`）
  - Hero 操作链接：`Connect Me` -> `联系我`，`About Me` -> `关于我`
  - Hero 主标语：`Hi, I'm ...` 与 `Building with TypeScript, AI Agents and the Web.` 是否保留英文排版
  - 技能分组：`Languages`、`Frameworks`、`Tools & Ecosystem` 是否中文化

## 验收标准

- [x] 文章列表页（/blog）中无遗留无意英文展示，包含页面标题、列表摘要、分页及侧栏。
- [x] 文章阅读时间显示为规范中文格式。
- [x] 首页根据用户确认的选项完成指定文案调整。
- [x] 全站技术名词保留规范大小写（如 TypeScript、React、Git）。
- [x] 依次通过质量门：`pnpm typecheck`、`pnpm lint`、`pnpm format:check`。
