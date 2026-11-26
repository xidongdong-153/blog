---
description: 'libSQL/Turso 连接、生产环境保护、Drizzle Schema 与数据库迁移边界'
status: implemented
paths:
  - 'src/server/infra/db/**'
  - 'src/server/modules/posts/**'
  - 'drizzle.config.ts'
  - 'scripts/verify-db.mts'
  - '.env.example'
---

# 数据库

连接在 [client.ts](../src/server/infra/db/client.ts)，Schema 聚合在 [schema/index.ts](../src/server/infra/db/schema/index.ts)，迁移配置在 [drizzle.config.ts](../drizzle.config.ts)。本轮核对仓库定义和配置，不读取实际数据库、不确认迁移已应用。

## 连接与生产限制

`createDatabase(url?, authToken?)` 返回 client 与 db。URL 取显式参数、TURSO_DATABASE_URL 或开发回退 file:local.db；token 取显式参数或 TURSO_AUTH_TOKEN。选择后去首尾空白。

开发缺省落到仓库根 local.db，Git 忽略数据库文件。生产（NODE_ENV=production）必须有非空 TURSO_DATABASE_URL；非 CI 生产拒绝 file: URL，且必须提供非空 token。CI 例外允许指定本地文件，但仍不能缺少 URL。Drizzle 配置有同样的生产保护，不能把开发回退写成生产容错。

业务 Service 使用单例 db；需要独立实例的已有场景才调用 createDatabase。数据库类型用导出的 AppDatabase，不另算类型。字段说明查 [.env.example](../.env.example)，不要复制真实环境值。

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
