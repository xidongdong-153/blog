# 数据库规范

数据库是 Turso（libSQL），ORM 用 Drizzle，连接层在 `src/server/infra/db/client.ts`，表定义在 `src/server/infra/db/schema/`。当前只有一张表 `system_health_checks`：已定义、还没有任何代码读写它，迁移文件也从未生成过。

## 连接与环境变量

`src/server/infra/db/client.ts` 的 `createDatabase(url?, authToken?)` 返回 `{ client, db }`，取值顺序：

- URL：显式参数 → `TURSO_DATABASE_URL` → `file:local.db`
- token：显式参数 → `TURSO_AUTH_TOKEN`（本地 sqlite 文件用不到 token）

本地开发什么都不用配，自动落到 `file:local.db`（仓库根，`*.db` 在 `.gitignore` 里，不进 git）。线上在 `.env.local` 或部署环境里填 `TURSO_DATABASE_URL`（形如 `libsql://xxx.turso.io`）和 `TURSO_AUTH_TOKEN`，字段说明见 `.env.example` 的 Turso 段。

业务代码一律用单例：`import { db } from '@/server/infra/db/client'`（现有引用方是 `src/app/(site)/status/page.tsx` 和 `src/server/routes/system.ts`）。`createDatabase` 的显式参数留给测试或需要第二个实例的场景，业务代码不传参。

`src/server/infra/db/client.ts` 同时导出 `AppDatabase` 类型（`typeof db`），需要标注类型的场合用它，不要自己重算。

## schema 组织

- 一个业务域一个文件：`schema/system.ts` 放 system 域的表。
- `schema/index.ts` 是唯一聚合出口，写法固定：

```ts
import * as systemSchema from './system'

export const schema = {
  ...systemSchema,
}

export * from './system'
```

- 新表定义后必须加进 `schema/index.ts` 的 spread。`drizzle` 实例（`client.ts` 的 `drizzle(client, { schema })`）和 `drizzle.config.ts` 的 `schema` 字段都只认这个出口。
- SQL 迁移输出到 `src/server/infra/db/migrations/`（`drizzle.config.ts` 的 `out` 字段）。这个目录现在不存在，第一次跑 `pnpm db:generate` 才会生成。

## 表命名与列写法

`src/server/infra/db/schema/system.ts` 的现有定义：

```ts
export const healthChecks = sqliteTable('system_health_checks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  service: text('service').notNull().default('turso'),
  status: text('status').notNull(),
  latencyMs: integer('latency_ms').notNull(),
  checkedAt: integer('checked_at', { mode: 'timestamp_ms' }).notNull(),
})
```

从它归纳规则：

- 表名：`模块_实体复数`，snake_case。system 域的健康检查 → `system_health_checks`。表名带模块前缀，查询时一眼看出归属。
- 导出名：camelCase、不带模块前缀（`healthChecks`），代码里 import 时短。
- 列名：snake_case（`latency_ms`、`checked_at`），跟表名风格一致。
- 时间戳列：`integer` 加 `mode: 'timestamp_ms'`，代码里传 `Date` 对象，库里存毫秒整数。注意区分：内容层（`src/lib/content.ts` 的 frontmatter）日期存 ISO 字符串，那是 MDX 的约定；数据库层存毫秒整数，两边各自稳定，不要串用。

## migration 流程

改了 `schema/` 下的表定义后，按顺序执行：

```bash
pnpm db:generate   # 从 schema 生成 SQL 迁移文件到 src/server/infra/db/migrations/
pnpm db:check      # 检查迁移文件状态：有没有改了 schema 忘了 generate、迁移文件是否冲突
pnpm db:migrate    # 把未应用的迁移写进数据库
pnpm db:verify     # 跑 scripts/verify-db.mts：直连执行 SELECT 1，打印往返延迟
```

开发期查数据：

```bash
pnpm db:studio     # 打开 drizzle-kit studio，本地默认连 file:local.db
```

细节：

- `db:verify` 不经过 drizzle，用 `@libsql/client` 直接连（`scripts/verify-db.mts`），连接失败退出码 1，适合放部署前或 CI 里当连通性检查。
- 迁移文件是生成产物，进 git，迁移历史靠它共享。
- 本地首次 `pnpm db:migrate` 时 `file:local.db` 会自动创建，不用手动建。

## 现状记录

- `system_health_checks` 表已在 `schema/system.ts` 定义，给健康检查历史记录预留。
- `site_friend_links` 表已在 `schema/links.ts` 定义并接入 `schema/index.ts`，用于友链数据持久化、待审记录与一次性审核令牌流转；前台友链页（`/links`）与审批接口读写此表。
- `user`、`session`、`account`、`verification` 表已在 `schema/auth.ts` 定义并接入 `schema/index.ts`，承载 Better Auth 账号认证与会话持久化。
- `site_comments` 表已在 `schema/comments.ts` 定义并接入 `schema/index.ts`，承载文章评论树、平铺回复、置顶、软删除和邮件删除凭证哈希。
- `site_ai_summary_config` 表已在 `schema/ai.ts` 定义并接入 `schema/index.ts`，主键固定为 `default`，承载 AI 摘要模型的协议、Base URL、模型 ID、AES-256-GCM 凭据密文、随机 IV、认证 Tag、脱敏掩码、状态与并发版本 revision。
- `drizzle.config.ts` 已支持检测并自动载入 `.env.local`，执行 `pnpm db:*` 命令时自动连通线上 Turso 或本地文件库。
- `src/server/infra/db/migrations/` 已生成迁移并应用至数据库。
