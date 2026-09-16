# 管理员管理面板实施计划 (Implementation Plan)

## 实施阶段与依赖图

```mermaid
%%{init: {"theme": "dark"}}%%
flowchart TD
    subgraph Phase1["阶段 1: 服务端业务层与类型"]
        T1[1.1 创建 admin.types.ts 契约] --> T2[1.2 实现 admin.service.ts 数据聚合]
        T2 --> T3[1.3 编写 admin.test.ts 单元测试]
    end

    subgraph Phase2["阶段 2: 顶栏 HeaderAuth 菜单联动"]
        H1[2.1 修改 header-auth.tsx 增加管理面板入口]
        H1 --> H2[2.2 测试下拉浮层导航与状态关闭]
    end

    subgraph Phase3["阶段 3: 管理面板专属组件构建"]
        C1[3.1 admin-header.tsx 站长与状态条]
        C2[3.2 admin-metrics.tsx 4 格数据看板]
        C3[3.3 admin-pending-links.tsx 友链待办队列]
        C4[3.4 admin-recent-comments.tsx 评论动态流]
        C5[3.5 admin-portal-matrix.tsx 5 大管理台矩阵]
        C1 & C2 & C3 & C4 & C5 --> C6[3.6 组件状态自适应与暗色样式调优]
    end

    subgraph Phase4["阶段 4: 页面路由装配与权限守卫"]
        P1[4.1 编写 src/app/(site)/admin/page.tsx]
        P1 --> P2[4.2 注入 SEO robots 与 notFound() 守卫]
    end

    subgraph Phase5["阶段 5: 验证与本地质量门"]
        Q1[5.1 运行单元测试 pnpm test]
        Q1 --> Q2[5.2 运行类型检查 pnpm typecheck]
        Q2 --> Q3[5.3 运行 Lint 检查 pnpm lint]
        Q3 --> Q4[5.4 运行格式检查 pnpm format:check]
        Q4 --> Q5[5.5 浏览器端端到端人工走查]
    end

    Phase1 --> Phase3
    Phase2 --> Phase4
    Phase3 --> Phase4
    Phase4 --> Phase5
```

## 步骤拆解与执行清单

### 步骤 1：服务端业务模块 `src/server/modules/admin/`
1. **创建 `admin.types.ts`**：
   - 导出 `AdminDashboardData`、`AdminMetric`、`AdminPendingLink`、`AdminRecentComment` 等接口。
2. **创建 `admin.service.ts`**：
   - 导出 `getAdminDashboardData(user)`；
   - 封装子查询方法：
     - `fetchFriendLinksStats()`：查询 `site_friend_links` 表统计 pending 和 approved 数量；
     - `fetchPendingFriendLinks(limit)`：获取状态为 pending 的申请列表；
     - `fetchCommentsStats()`：查询 `site_comments` 表统计有效评论数和已删除数；
     - `fetchRecentComments(limit)`：获取最新 5 条活跃评论（join `user` 获取头像和名字）；
     - 读取 `getAllBlogPosts()` 和 `getAllNotes()` 统计文章分类分布、公开数与草稿数；
     - 调用 `getAiSummaryConfig()` 获取模型与密钥状态；
     - 调用 `checkDatabase()` 和 `getSystemProcessHealth()` 获取系统环境指标。
3. **编写单元测试 `admin.test.ts`**：
   - 验证 `getAdminDashboardData` 能正确聚合所有子系统数据；
   - 测试数据库异常或配置缺失时的优雅降级逻辑。

### 步骤 2：顶栏头像菜单联动 `src/app/(site)/_components/site/header-auth.tsx`
1. 引入 `LayoutDashboard` 与 `Cpu` 图标；
2. 当 `isOwner === true` 时：
   - 在下拉菜单项中加入 **「管理面板」**（链接至 `/admin`）；
   - 保留 **「AI 摘要配置」**（链接至 `/settings/ai`）；
   - 点击任何导航项时正确重置 `menuOpen(false)`；
   - 保留作者金标和退出登录逻辑。

### 步骤 3：构建管理面板 UI 组件 `src/app/(site)/_components/admin/`
1. **`admin-header.tsx`**：
   - 展现微代码标签 `// CONSOLE / WORKSPACE`；
   - 站长头像、昵称、邮箱、作者徽章；
   - 实时环境胶囊（数据库 ping 延迟、进程运行时间、Node 版本）。
2. **`admin-metrics.tsx`**：
   - 4 格卡片大盘：公开文章/草稿、随手笔记、有效评论、友链总数/待审；
   - 细腻的悬浮微光与数字排版。
3. **`admin-pending-links.tsx`**：
   - 友链待审列表：若有 pending 记录，显示申请人、站点名、站点网址、申请时间，并附带直达审核按钮；若无待审，显示绿色就绪空状态。
4. **`admin-recent-comments.tsx`**：
   - 全站最新 5 条评论：作者头像、昵称、关联文章 slug、内容片段、相对时间戳。
5. **`admin-portal-matrix.tsx`**：
   - 5 大管理台卡片：
     - AI 摘要配置卡片（`/settings/ai`）
     - 友链管理中心卡片（`/links`）
     - 评论管理卡片（`/blog`）
     - 实时访客监控卡片（`/status`）
     - 系统运维诊断卡片（`/status`）
   - 每个卡片包含分类标签、状态徽标、描述、关键指标与跳转按钮。

### 步骤 4：主页面装配与安全拦截 `src/app/(site)/admin/page.tsx`
1. **Server Component 页面**：
   - 严格权限校验：
     ```typescript
     const reqHeaders = await headers()
     const session = await getSession(reqHeaders)
     if (!session?.user?.id || !isSiteAdmin(session.user)) {
       notFound()
     }
     ```
2. **数据加载**：
   - 调用 `getAdminDashboardData(session.user)`；
3. **SEO 与防爬**：
   - 导出 `metadata: Metadata`，配置 `robots: { index: false, follow: false, nocache: true }`；
4. **页面组装**：
   - 按照 Header -> Metrics -> 待办/动态双列流 -> Portal Matrix 的层次组装。

### 步骤 5：验证与质量门
1. 单元测试：`pnpm test`
2. 类型检查：`pnpm typecheck`
3. Lint 检查：`pnpm lint`
4. 格式检查：`pnpm format:check`
5. 生产构建测试：`pnpm build`
6. 权限边界走查：
   - 匿名访问 `http://localhost:4400/admin` 预期 404；
   - 普通登录用户访问 `http://localhost:4400/admin` 预期 404；
   - 管理员登录访问 `http://localhost:4400/admin` 正常展示控制台并可用。
