# 后端开发规范

本目录管 `src/server/` 和 `src/app/api/` 下的 server 端代码：Hono 应用、Drizzle + Turso 数据库、Next Route Handler。写 server 端代码前先读相关文件，规范描述的是现状，不是理想状态。

## 技术栈

Hono 4 + Drizzle ORM + Turso（libSQL）。Hono 应用当前未挂载到 Next.js，端点从外部访问不到，见 [API 设计](./api-design-guidelines.md)的挂载一节。本地开发数据库自动回退 `file:local.db`，不需要配环境变量。

## 规范索引

| 文件                                     | 内容                                                            |
| ---------------------------------------- | --------------------------------------------------------------- |
| [目录结构](./directory-structure.md)     | `src/server/` 各目录职责、放置规则速查、反模式                  |
| [API 设计](./api-design-guidelines.md)   | `ApiResponse` 封装、路由注册、Hono 挂载、端点选型               |
| [服务调用](./service-call-guidelines.md) | 直连 `db` 与走 API 的边界、service 层触发条件、外部服务调用模式 |
| [数据库](./database-guidelines.md)       | schema 组织、表命名、migration 流程、环境变量与本地回退         |

## 开发前检查清单

- [ ] 新增 API 端点 → 先按 [API 设计](./api-design-guidelines.md)的判断规则选 Hono 还是 Next Route Handler
- [ ] 要动表结构 → 按 [数据库](./database-guidelines.md)的 schema 组织加文件，再走 migration 流程
- [ ] 页面要取数据 → 按 [服务调用](./service-call-guidelines.md)的规则判断直连 `db` 还是走 API
- [ ] Hono 端点上线前确认挂载状态（当前未挂载）

## 质量检查

```bash
pnpm typecheck     # next typegen && tsc --noEmit
pnpm lint          # eslint .
pnpm format:check  # prettier --check .
pnpm build         # 改动路由或数据层后跑
pnpm db:verify     # 改了连接配置或执行迁移后跑
```

前三条全过才算完成，顺序：类型 → lint → format。

## 关键入口

| 入口          | 文件                                  |
| ------------- | ------------------------------------- |
| Hono 应用工厂 | `src/server/app.ts`                   |
| 路由聚合      | `src/server/routes/index.ts`          |
| system 域路由 | `src/server/routes/system.ts`         |
| 数据库实例    | `src/server/infra/db/client.ts`       |
| 表定义聚合    | `src/server/infra/db/schema/index.ts` |
| 响应封装      | `src/server/shared/response.ts`       |
| 活动代理 API  | `src/app/api/presence/route.ts`       |
| 友链申请 API  | `src/app/api/links/apply/route.ts`    |
| db 直连页面   | `src/app/(site)/status/page.tsx`      |
