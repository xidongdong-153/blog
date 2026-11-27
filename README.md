# blog

Next.js 16 + React 19 + TypeScript 个人博客，文章、评论、友链、AI 摘要和账号认证使用 SQLite / libSQL（兼容本地文件与 Turso 云数据库），正文保留 MDX 格式，笔记使用本地 Markdown 文件。本地开发与 Docker 默认开箱即用本地 SQLite，并在启动时自动执行数据库迁移。推送 `main` 后由 GitHub Actions 检查，生产发布需手动运行工作流；站点实时活动可读取 Mac 采集器上报的最新快照，兼容旧服务。

## 本地启动

环境：Node.js 26.7.0、pnpm 11.5.0。

```bash
pnpm install
pnpm dev
```

打开 <http://localhost:4400>。服务启动时会自动建库并执行迁移（默认 `file:local.db`），无需预先配置外部数据库；未配置评论或未启动活动服务不影响浏览文章，活动服务不可用时显示离线。如需接入本地自定义路径或 Turso 云数据库，参考 `.env.example` 配置 `DATABASE_URL`（及远程所需的 `DATABASE_AUTH_TOKEN`）。

## 配置与内容

- `src/site.config.ts`：站点标题、导航、社交链接、正式域名。
- `src/profile.config.ts`：个人简介、城市、技术栈、经历与教育。
- `.env.example`：评论和活动服务配置示例；需要时在 `.env.local` 配置，不提交该文件。
- `/admin/posts`：站长文章管理、MDX 编辑预览与导入导出。
- `src/server/modules/posts/`：文章存储与发布服务。
- `content/notes/<slug>.md`：笔记。
- `src/lib/content.ts`：公开文章与本地笔记读取。

## 检查

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
```

## 维护文档

- [文档索引](docs/index.md)
- [设计规范](DESIGN.md)
- [组件约定](docs/components.md)
- [架构与目录](docs/architecture.md)
- [内容管理](docs/content.md)
- [功能状态](docs/features.md)
- [Mac 活动接口](docs/presence.md)
- [部署、排查与回滚](docs/deployment.md)
- [开发约定与检查](docs/development.md)
