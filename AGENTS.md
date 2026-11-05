# AGENTS.md

为 `blog` 项目提供工作规则。AI 代理在这个仓库里执行任务时，按这份文件处理。

## 项目概况

Next.js 16 + React 19 + Tailwind CSS 4 + TypeScript 单应用博客，App Router，文章以 MDX 原文和元数据快照存入数据库，笔记使用本地 Markdown 文件，动态功能（评论、友链、AI 摘要、账号认证）使用 libSQL/Turso 数据库与 Drizzle ORM，Blog 另提供只读活动 API。开发端口 4400（4399 是 site 和 starter web 的端口，避免冲突）。

主要目录（代码在 `src/`，内容和配置文件在仓库根）：

- `src/app/(site)/`：公开页面，页面私有组件在同级 `_components/` 按功能分组。
- `src/server/modules/`：服务端业务模块（`posts`、`auth`、`comments`、`links`、`ai`、`presence`、`visitors`、`admin`、`system`），高内聚包含 service、route、types 和对应测试。
- `src/server/infra/`：跨模块基础设施（数据库 client/schema/migrations、AI 模型客户端与加密、邮件发送等）。
- `src/lib/content.ts`：公开内容读取入口；文章异步读取数据库公开快照，笔记同步读文件。文章管理与校验在 `src/server/modules/posts/` 和 `src/lib/posts.ts`。
- `src/site.config.ts`：站点标题、导航、社交链接。
- `content/notes/`：笔记源文件；文章从 `/admin/posts` 管理，支持 MDX 导入导出。

内容约定见 [.trellis/spec/frontend/content-guidelines.md](.trellis/spec/frontend/content-guidelines.md)。

## 命令

```bash
pnpm dev           # 开发，http://localhost:4400
pnpm typecheck     # next typegen && tsc --noEmit
pnpm lint          # eslint .
pnpm format:check  # prettier --check .
pnpm build         # 生产构建
```

## 工作规则

- 涉及 README、docs、注释、JSDoc、提示词、错误提示等说明性文本，先读 `xdd-plain-docs` 技能再动笔。
- 日常开发允许直接更新 `main`；开始任务前先获取最新 `origin/main`，工作区干净时用 `git pull --ff-only origin main` 对齐。较大改动可按需切独立分支。
- 每次代码修改后按顺序过质量门：`pnpm typecheck`、`pnpm lint`、`pnpm format:check`，全过才算完成；涉及服务端业务模块或核心工具改动时必须运行 `pnpm test`。
- 推送 `main` 和目标为 `main` 的 Pull Request 自动运行质量检查，不自动发布。发布时在 Actions 手动运行 `CI/CD`，选择 `main` 并勾选「确认发布到生产环境」，检查通过后部署，无需环境人工审批。完整流程详见 [.trellis/spec/frontend/git-workflow.md](.trellis/spec/frontend/git-workflow.md)。
- 功能状态以 [.trellis/spec/frontend/feature-status.md](.trellis/spec/frontend/feature-status.md) 为唯一清单，实现后更新状态并删掉对应占位代码。README 只保留项目简介、本地启动、常用检查、核心路径和维护文档链接，不添加详细维护说明。
- 新增页面放进 `src/app/(site)/`，页面专属组件放 `src/app/(site)/_components/` 对应分组，不建第二套目录结构。
- 日期在数据层一律存 ISO 字符串，渲染时用 `src/lib/content.ts` 的 `formatDate`，不直接在组件里 new Date 再格式化。

## Git 提交与发布

- 不允许擅自提交或推送代码：执行 `git commit`、`git push`、`git merge` 前，必须先向用户展示改动摘要并获得明确确认。
- 用户未确认前，改动停留在工作区或暂存区，不提交、不推送。
- 获得提交与推送授权后，可直接推送 `main`；Pull Request 按需使用，使用时等待 `Quality` 通过后再合并。
- 生产发布另需明确授权。手动运行 Actions 默认只检查，勾选发布确认后才会在检查通过后部署，不把推送代码视为发布授权。
