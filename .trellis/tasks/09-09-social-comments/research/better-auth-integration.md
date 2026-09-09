# Better Auth 接入研究

## 结论

博客可以沿用 starter 的单体接入方式：Better Auth 复用现有 `drizzle-orm/libsql` 数据库实例，按 SQLite provider 工作；认证请求由现有 Hono 应用在 `/api/auth/*` 直接转给 `auth.handler(c.req.raw)`；评论写接口从原始请求头读取 session。首版只启用 GitHub、Google 社交登录，不接邮箱密码、RBAC、Admin 插件或用户状态扩展。

建议把认证代码拆成以下最小范围：

- `src/server/auth/config.ts`：创建 Better Auth 实例，只放数据库、URL、secret、trusted origins、账号关联和 GitHub/Google provider。
- `src/server/auth/session.ts`：提供可选 session、必需 session、站长邮箱判断三个服务端函数。
- `src/server/infra/db/schema/auth.ts`：Better Auth 的 `user`、`session`、`account`、`verification` 四张表及 relations。
- `src/server/routes/auth.ts`：`GET /config/auth` 和 `/auth/*` handler。
- `src/lib/auth-client.ts`：客户端 `createAuthClient`，供 `useSession`、`signIn.social`、`signOut` 使用。

不要复制 starter 的 `emailAndPassword`、邮件验证/重置、`status`、角色初始化、审计、`/api/me` 完整资料接口和 Admin 客户端封装。

## 当前博客边界

- Hono 入口是 `src/app/api/[[...route]]/route.ts`，使用 `hono/vercel`，Node.js runtime，并已导出认证需要的 GET、POST 等 HTTP 方法。
- `src/server/app.ts` 已设置 `.basePath('/api')`；`src/server/routes/index.ts` 中的子路由都写相对路径。因此认证 handler 在路由集合中使用 `/auth/*`，最终地址才是 `/api/auth/*`。不要照搬 starter 的绝对 `/api/auth/*` 路径，否则会与博客的 `basePath` 重复。
- 数据库由 `src/server/infra/db/client.ts` 创建，驱动是 `@libsql/client` + `drizzle-orm/libsql`；本地默认 `file:local.db`，线上使用 Turso。Better Auth 的 Drizzle adapter 仍配置 `provider: 'sqlite'`。
- Drizzle Kit 从 `src/server/infra/db/schema/index.ts` 读取聚合 schema。新增 auth schema 后必须同时在此处导出并展开到 `schema` 对象，否则 Drizzle relational query 和迁移生成看不到认证表。
- 文章详情 `src/app/(site)/blog/[slug]/page.tsx` 当前在正文、版权卡片后渲染 `GiscusComments`。`getBlogPost(slug)` 来自 `src/lib/content.ts`，这是评论接口校验文章 slug 的现成入口。
- 文章页是静态参数页面，但评论区可以作为 client component 在浏览器读取 session 和评论，不要求把文章页改成动态服务端渲染。
- 现有 `.env.example` 只有 Giscus、Resend、Turso 等配置，没有 Better Auth、OAuth 或站长身份配置。

## 最小服务端配置

starter 的可复用配置位于 `apps/api/src/modules/auth/auth.config.ts`。博客需要的部分是：

```ts
betterAuth({
  basePath: '/api/auth',
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: 'sqlite' }),
  account: {
    accountLinking: {
      enabled: true,
      requireLocalEmailVerified: false,
    },
  },
  socialProviders: {
    // 仅在 clientId 和 clientSecret 同时存在时展开 github/google
  },
  trustedOrigins: [/* 本地与生产站点 origin */],
})
```

约束：

- provider 的 ID 和 secret 必须成对存在才加入 `socialProviders`。只配置一项等同未启用，不能把空字符串传给 Better Auth。
- `GET /api/config/auth` 只返回 `{ providers: { github: boolean, google: boolean } }`。前端根据结果显示按钮；secret 不进入响应，也不使用 `NEXT_PUBLIC_*` 保存 secret。
- 不设置 `allowDifferentEmails: true`，也不设置 `trustedProviders`。沿用 starter 规范，让 Better Auth 只在 provider 确认邮箱已验证时按同邮箱关联账号。
- GitHub OAuth 必须获得用户邮箱权限。OAuth App 的回调地址是 `<BETTER_AUTH_URL>/api/auth/callback/github`；GitHub App 还需 Email addresses read-only 权限。Google 回调地址是 `<BETTER_AUTH_URL>/api/auth/callback/google`。
- 博客与 API 同源时，客户端不需要额外 CORS。若以后分域，Hono CORS 必须在 auth handler 之前注册，显式 origin、`credentials: true`，并把同一 origin 加进 `trustedOrigins`。

starter 当前锁定 `better-auth@1.6.16`，源码从 `better-auth/adapters/drizzle` 导入 adapter；该版本 package exports 确认包含此入口。Better Auth 当前在线文档改用独立的 `@better-auth/drizzle-adapter` 示例。实施时应先确定并锁定一个运行时版本，再使用该版本实际导出的入口；CLI 与运行时保持同版本，避免生成 schema 与运行时契约不一致。

## Auth Route 与客户端

官方 Hono 集成直接传递 Web Standard Request/Response：

```ts
app.all('/auth/*', (c) => auth.handler(c.req.raw))
```

该 handler 应放在可能吞掉请求的 catch-all 之前。博客现有路由没有冲突的 catch-all。provider 配置接口可与 handler 放在同一 auth route 中，挂到 `apiRoutes`。

客户端使用 `better-auth/react` 的 `createAuthClient`。评论区只需要：

- `authClient.useSession()`：渲染登录中、未登录、已登录状态。
- `authClient.signIn.social({ provider, callbackURL })`：provider 只允许 `'github' | 'google'`，`callbackURL` 返回当前文章。
- `authClient.signOut()`：退出后刷新 session/评论区状态。

同源请求默认携带 cookie。服务端评论接口不要接收客户端传入的 `userId`、邮箱、provider 或 `isOwner`。

## Session 与 provider 来源

服务端按 starter 的 `auth.service.ts` 模式读取 session：

```ts
const session = await auth.api.getSession({ headers: c.req.raw.headers })
```

- 公开评论读取允许 session 为 `null`。
- 发布、回复必须在 session 为空时返回 401，并从 `session.user.id` 写入评论作者。
- 删除、置顶先要求 session，再做站长邮箱判断；不能只根据评论接口请求体或前端状态判断。
- session 校验失败要变成稳定的 401，不把 Better Auth 内部异常直接返回给客户端。

默认 session 只有 `user` 与 `session`，没有“本次登录使用的 provider”。starter 的 `/api/me` 也是查询 `account.providerId` 后返回关联 provider 列表。因此评论中的 provider 来源标记应定义为用户已关联的 provider 列表，查询时只选择 `providerId`；不要返回 access token、refresh token 或 id token。若产品要求精确记录每次评论使用的登录 provider，需要额外设计，不能从默认 session 可靠推断。

## Drizzle Schema

最小认证 schema 直接采用 Better Auth CLI 针对所选版本生成的 SQLite 结构，再纳入博客现有 migration 流程。starter 的实际 `auth.schema.ts` 包含：

- `user`：`id`、`name`、唯一 `email`、`emailVerified`、`image`、`createdAt`、`updatedAt`。
- `session`：`id`、唯一 `token`、`expiresAt`、`ipAddress`、`userAgent`、`userId`、`createdAt`、`updatedAt`；`userId` 外键级联删除。
- `account`：`id`、`accountId`、`providerId`、`userId`、OAuth token/expiry/scope 字段、可空 `password`、时间戳；`userId` 外键级联删除。虽然首版不开邮箱密码，字段仍以 CLI 输出为准，不手删 Better Auth 核心字段。
- `verification`：`id`、`identifier`、`value`、`expiresAt`、`createdAt`、`updatedAt`。即使当前只做 OAuth，也保留 CLI 生成的核心表，避免运行时与后续 provider 流程不一致。

时间列沿用现有 SQLite schema 的 `integer(..., { mode: 'timestamp_ms' })`。表属性名保持 `user`、`session`、`account`、`verification`，避免额外 model mapping。评论表通过 `user.id` 外键关联认证用户；软删评论时不删除用户或认证记录。

## 站长邮箱校验

为授权单独使用服务端变量，例如 `SITE_OWNER_EMAIL`。不要直接复用 `FRIEND_APPLY_NOTIFY_EMAIL`：后者是友链通知收件人，修改通知地址不应改变评论管理权限。

判断规则：

```ts
normalizeEmail(session.user.email) === normalizeEmail(process.env.SITE_OWNER_EMAIL)
```

`normalizeEmail` 只做 `trim().toLowerCase()`。配置缺失、空白或格式非法时一律返回非站长，管理接口以 403 失败；不要把“未配置”解释为允许任意登录用户。接口响应可以带服务端计算的 `isOwner` 供界面显示按钮，但删除、置顶和作者标记必须在每次服务端请求中重新计算。

评论通知可以把 `SITE_OWNER_EMAIL` 作为收件人，并继续复用现有 `RESEND_API_KEY`、`RESEND_FROM_EMAIL`；友链专用的 `FRIEND_APPLY_NOTIFY_EMAIL` 保持原义。

## 测试边界

自动化测试至少覆盖：

1. provider 检测：GitHub/Google 的 ID、secret 均为空、只缺一项、两项齐全；配置接口与实际 `socialProviders` 启用结果一致。
2. auth 挂载：使用 Hono `app.request()` 检查 `/api/auth/ok`、`/api/config/auth`；确认博客的 `/api` basePath 没有重复。
3. session：无 cookie 得到 `null`；有效 session cookie 能读到用户；评论发布无 session 返回 401；无效 cookie 不造成 500。
4. 站长授权：邮箱大小写和首尾空白归一化；缺失/非法配置失败；普通用户伪造 `isOwner`、`userId` 或邮箱仍返回 403。
5. schema 与写入：本地临时 libSQL 数据库执行 migration 后可创建 OAuth 用户、account、session；session token 唯一；用户外键关系有效；评论作者取自 session。
6. provider 标记：评论读取只返回关联的 `providerId`，不返回任何 OAuth token；一个用户关联两个 provider 时协议仍稳定。
7. 回归：未配置 OAuth provider 时应用和公开评论读取仍可启动，登录按钮隐藏；现有 `/api/system`、`/api/presence`、`/api/links` 路由不受影响。

真实 GitHub/Google OAuth 无法用普通单元测试完整替代。使用真实凭据手工检查首次登录、同邮箱自动关联、回调返回文章、session cookie、退出登录，以及 provider 账号已属于其他用户时不会转移账号。

当前博客使用 `node:test` 编写 TypeScript 测试，但 `package.json` 没有 `test` script，也没有 Vitest。实施计划需要明确测试执行命令；不要默认为项目已有 starter 的 Vitest helper。

## 关键参考

starter：

- `/Users/wuwanzhu/Code/xdd/starter/.trellis/spec/api/backend/authentication-guidelines.md`
- `/Users/wuwanzhu/Code/xdd/starter/apps/api/src/modules/auth/auth.config.ts`
- `/Users/wuwanzhu/Code/xdd/starter/apps/api/src/modules/auth/auth.schema.ts`
- `/Users/wuwanzhu/Code/xdd/starter/apps/api/src/modules/auth/auth.route.ts`
- `/Users/wuwanzhu/Code/xdd/starter/apps/api/src/modules/auth/auth.service.ts`
- `/Users/wuwanzhu/Code/xdd/starter/apps/api/src/infra/db/client.ts`
- `/Users/wuwanzhu/Code/xdd/starter/apps/api/src/infra/db/schema/index.ts`
- `/Users/wuwanzhu/Code/xdd/starter/apps/admin/src/api/client.ts`
- `/Users/wuwanzhu/Code/xdd/starter/apps/admin/src/api/auth/sign-in.api.ts`
- `/Users/wuwanzhu/Code/xdd/starter/apps/admin/src/features/auth/components/SocialSignInButtons.tsx`
- `/Users/wuwanzhu/Code/xdd/starter/apps/api/src/test/auth.smoke.test.ts`

博客：

- `src/server/app.ts`
- `src/server/routes/index.ts`
- `src/app/api/[[...route]]/route.ts`
- `src/server/infra/db/client.ts`
- `src/server/infra/db/schema/index.ts`
- `src/app/(site)/blog/[slug]/page.tsx`
- `src/app/(site)/_components/comment/giscus-comments.tsx`
- `src/lib/content.ts`
- `.env.example`

官方文档：

- <https://www.better-auth.com/docs/integrations/hono>
- <https://www.better-auth.com/docs/adapters/drizzle>
- <https://www.better-auth.com/docs/authentication/github>
- <https://www.better-auth.com/docs/authentication/google>
- <https://www.better-auth.com/docs/concepts/session-management>
- <https://www.better-auth.com/docs/concepts/users-accounts>
