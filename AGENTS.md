# AGENTS.md

为 `blog` 项目提供工作规则。AI 代理在这个仓库里执行任务时，按这份文件处理。

## 项目概况

Next.js 16 + React 19 + Tailwind CSS 4 + TypeScript 单应用博客，App Router，文章与笔记用 MDX 文件管理，动态功能（评论、友链、AI 摘要、账号认证）使用 libSQL/Turso 数据库与 Drizzle ORM，Blog 另提供只读活动 API。开发端口 4400（4399 是 site 和 starter web 的端口，避免冲突）。

主要目录（代码在 `src/`，内容和配置文件在仓库根）：

- `src/app/(site)/`：公开页面，页面私有组件在同级 `_components/` 按功能分组。
- `src/server/modules/`：服务端业务模块（`auth`、`comments`、`links`、`ai`、`presence`、`system`），高内聚包含 service、route、types 和对应测试。
- `src/server/infra/`：跨模块基础设施（数据库 client/schema/migrations、AI 模型客户端与加密、邮件发送等）。
- `src/lib/content.ts`：MDX 内容读取层，frontmatter 校验在这里。
- `src/site.config.ts`：站点标题、导航、社交链接。
- `content/blog/`、`content/notes/`：文章和笔记源文件。

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
- 严禁在 `main` 分支上直接开发与提交：开始任务前必须拉取最新 `origin/main` 并切出独立分支（`feat/*`、`fix/*` 等）。
- 每次代码修改后按顺序过质量门：`pnpm typecheck`、`pnpm lint`、`pnpm format:check`，全过才算完成；涉及服务端业务模块或核心工具改动时必须运行 `pnpm test`。
- 所有改动必须通过 Pull Request 流程合入 `main`；合并后必须核验生产 `Deployment` 环境审批并对齐本地分支。完整流程详见 [.trellis/spec/frontend/git-workflow.md](.trellis/spec/frontend/git-workflow.md)。
- 功能状态以 [.trellis/spec/frontend/feature-status.md](.trellis/spec/frontend/feature-status.md) 为唯一清单，实现后更新状态并删掉对应占位代码。README 只保留项目简介、本地启动、常用检查、核心路径和维护文档链接，不添加详细维护说明。
- 新增页面放进 `src/app/(site)/`，页面专属组件放 `src/app/(site)/_components/` 对应分组，不建第二套目录结构。
- 日期在数据层一律存 ISO 字符串，渲染时用 `src/lib/content.ts` 的 `formatDate`，不直接在组件里 new Date 再格式化。

## Git 提交与发布

- 不允许擅自提交或推送代码：执行 `git commit`、`git push`、`git merge` 前，必须先向用户展示改动摘要并获得明确确认。
- 用户未确认前，改动停留在工作区或暂存区，不提交、不推送。
- 严禁直接向 `main` 执行 `git push`（远端已设保护规则拦截）；提交后必须推送到特性分支并通过 `gh pr create` 发起 Pull Request。
- PR 需等待 CI `Quality` 检查全绿后方可执行 `gh pr merge --merge --delete-branch`，并在合并后提醒用户或协助通过 `Deployment` 部署审批。
