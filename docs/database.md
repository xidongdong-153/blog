---
description: 'SQLite 与 Turso/libSQL 统一连接配置、生产校验、自动迁移、Drizzle Schema 与维护命令'
status: implemented
paths:
  - 'src/server/infra/db/**'
  - 'src/server/modules/posts/**'
  - 'drizzle.config.ts'
  - 'scripts/verify-db.mts'
  - 'server.ts'
  - '.env.example'
---

# 数据库

配置解析在 [config.ts](../src/server/infra/db/config.ts)，连接与初始化在 [client.ts](../src/server/infra/db/client.ts)，自动迁移在 [migrate.ts](../src/server/infra/db/migrate.ts)，Schema 聚合在 [schema/index.ts](../src/server/infra/db/schema/index.ts)，迁移配置在 [drizzle.config.ts](../drizzle.config.ts)。

## 连接与配置规则

项目通过 `@libsql/client` 统一支持本地 SQLite 文件、Turso 云数据库及自建 libSQL，环境变量为 `DATABASE_URL`、`DATABASE_AUTH_TOKEN` 与可选开关 `DATABASE_AUTO_MIGRATE`（不再读取旧的 `TURSO_*` 键）。

`createDatabase(url?, authToken?)` 返回 `client`、`db` 与解析后的 `config`。配置解析规则由 `resolveDatabaseConfig()` 统一维护，供应用、Drizzle CLI 与连通性检查共用：

- **本地 SQLite（`sqlite`）**：支持 `file:local.db`、`file:./data/blog.db`、`file:/app/data/blog.db`，也兼容直接写本地文件路径（如 `./data/blog.db`，自动补全 `file:` 前缀）或 `:memory:`。本地文件模式在生产环境可用，不需要 `DATABASE_AUTH_TOKEN`，连接前会自动创建缺失的父目录，并在服务启动初始化阶段设置 `WAL`、`busy_timeout=5000`、`foreign_keys=ON`、`synchronous=NORMAL`。
- **远程 Turso / libSQL（`turso` / `libsql`）**：支持 `libsql://`、`https://`、`http://`、`wss://`、`ws://`。生产环境（非 CI）连接 `libsql://` 或 `.turso.io` 域名时，必须提供非空 `DATABASE_AUTH_TOKEN`。
- **未配置 `DATABASE_URL` 时**：本地开发（`NODE_ENV !== 'production'`）默认回退到仓库根 `file:local.db`（Git 已忽略）；Docker 运行镜像在 [Dockerfile](../Dockerfile) 中默认设为 `file:/app/data/blog.db` 并通过 [compose.yaml](../compose.yaml) 挂载持久化卷 `blog-data:/app/data`；裸机生产环境若缺少 `DATABASE_URL` 会直接报错拦截，防止漏配环境变量写入意外目录。
- **启动自动迁移**：[server.ts](../server.ts) 在加载 Next.js 前调用 `initializeDatabase()`，默认自动执行 `src/server/infra/db/migrations/` 下的 Drizzle 幂等增量迁移；将 `DATABASE_AUTO_MIGRATE` 设为 `false` / `0` 可关闭自动迁移。

业务 Service 使用单例 `db` 与 `databaseConfig`；需要独立实例的场景才调用 `createDatabase`。数据库类型用导出的 `AppDatabase`，不另算类型。字段说明查 [.env.example](../.env.example)，不要复制真实环境值。

## Schema

一个业务域一个 Schema 文件；新增定义加入 schema/index.ts 的聚合和导出。连接层和 drizzle.config.ts 都只使用该聚合入口，SQL 与 meta 迁移文件一起进 Git。

| 文件               | 现有存储                                                            |
| ------------------ | ------------------------------------------------------------------- |
| schema/posts.ts    | site_posts：稳定 ID、slug、工作稿与公开快照、revision、ISO 时间     |
| schema/auth.ts     | Better Auth 的 user、session、account、verification                 |
| schema/comments.ts | site_comments：评论、平铺回复、置顶、软删除与删除凭证哈希           |
| schema/links.ts    | site_friend_links：友链、待审状态与一次性审核令牌                   |
| schema/ai.ts       | 默认模型配置、文章摘要缓存、写作 Agent 配置                         |
| schema/visitors.ts | 访客与文章访问数据；实际表名以该文件为准                            |
| schema/system.ts   | system_health_checks：健康检查历史预留表                            |
| schema/presence.ts | site_presence_latest：单台 Mac 的最新活动、启动代次、序号与过期时间 |

现有带域前缀的表使用 snake_case，导出名用 camelCase，列名用 snake_case；Better Auth 等既有命名例外保留。新数据时间存 ISO 字符串，已有毫秒时间戳列不随文档迁移改动。表定义存在不证明已有数据或业务正在写入。

## 迁移与维护命令

以下是数据库维护步骤，不是文档任务要执行的命令。先确认目标数据库；配置会自动加载本地 .env.local，不能以为默认一定连接临时库。

```bash
pnpm db:generate
pnpm db:check
pnpm db:migrate
pnpm db:verify
```

- generate 从 Schema 生成 SQL 和 meta，输出到 src/server/infra/db/migrations/。
- check 检查迁移文件一致性，不能当作实际迁移状态或 Schema 已落库的证明。
- migrate 写入目标数据库；首次本地执行可创建 SQLite 文件。
- verify 由 [scripts/verify-db.mts](../scripts/verify-db.mts)直连执行 SELECT 1，报告连通性与延迟，不证明全部业务表正确。
- db:studio 打开 Drizzle Studio，连接的仍是当前配置数据库。

## 博文快照

[posts.ts](../src/server/infra/db/schema/posts.ts)以稳定 ID 关联评论，以唯一 slug 提供 URL。document 保存工作稿，published 保存整份公开快照；正文、标签和元数据不能跨快照拼接。

保存与发布分离。发布完成 MDX 校验后通过 revision 条件更新，避免覆盖校验期间的编辑；首次发布后锁定 slug。撤回清空公开快照，保留工作稿和评论；删除通过事务清理关联数据。并发冲突返回 409，不把冲突当成功。

字段、MDX 与导入导出规则只在[内容管理](content.md)维护；AI 表的凭据、缓存哈希和同步行为见 [AI](ai.md)。
