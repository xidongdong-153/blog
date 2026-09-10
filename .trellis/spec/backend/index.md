# 后端开发规范

本目录管 `src/server/` 和 `src/app/api/` 下的 server 端代码：Hono 应用、Drizzle + Turso 数据库、Next Route Handler。写 server 端代码前先读相关文件，规范描述的是现状，不是理想状态。

## 技术栈

Hono 4 + Drizzle ORM + Turso（libSQL）。Hono 应用已通过 `src/app/api/[[...route]]/route.ts` 挂载到 Next.js，全站 HTTP API 路由均由 Hono 统一承载。本地开发数据库自动回退 `file:local.db`，不需要配环境变量。

## 规范索引

| 文件                                     | 内容                                                            |
| ---------------------------------------- | --------------------------------------------------------------- |
| [目录结构](./directory-structure.md)     | `src/server/` 各目录职责、放置规则速查、反模式                  |
| [API 设计](./api-design-guidelines.md)   | `ApiResponse` 封装、路由注册、Hono 挂载、端点选型               |
| [服务调用](./service-call-guidelines.md) | 直连 `db` 与走 API 的边界、service 层触发条件、外部服务调用模式 |
| [数据库](./database-guidelines.md)       | schema 组织、表命名、migration 流程、环境变量与本地回退         |

## 开发前检查清单

- [ ] 新增业务功能或端点 → 在 `src/server/modules/<module>/` 下按高内聚模式增加或扩展 service、route 与 types，并在 `src/server/app.ts` 链式挂载路由
- [ ] 要动表结构 → 按 [数据库](./database-guidelines.md) 在 `src/server/infra/db/schema/` 增加或修改定义，并在 `schema/index.ts` 导出后走 migration 流程
- [ ] 页面或脚本要取数据 → 按 [服务调用](./service-call-guidelines.md) 的规则通过 `src/server/modules/<module>/<module>.service.ts` 调用，避免直接在页面中发自调用 HTTP 或绕过 service 层

## 质量检查

```bash
pnpm typecheck     # next typegen && tsc --noEmit
pnpm lint          # eslint .
pnpm format:check  # prettier --check .
pnpm test          # 单元与集成测试（14 个测试文件）
pnpm build         # 生产构建（31 个路由静态/动态验证）
pnpm db:verify     # 改了连接配置或执行迁移后跑
```

前三条代码质量门按顺序全部通过才算修改完成：类型检查 → lint → format。

## 关键入口

| 入口              | 文件                                                               |
| ----------------- | ------------------------------------------------------------------ |
| API 挂载入口      | `src/app/api/[[...route]]/route.ts`                                |
| Hono 应用与路由装配 | `src/server/app.ts`                                              |
| auth 模块         | `src/server/modules/auth/` (`auth.service.ts`, `auth.route.ts`)    |
| comments 模块     | `src/server/modules/comments/` (`comments.service.ts`, `comments.route.ts`) |
| links 模块        | `src/server/modules/links/` (`links.service.ts`, `links.route.ts`) |
| ai 模块           | `src/server/modules/ai/` (`summary.service.ts`, `summary-config.service.ts`, `summary-config.route.ts`) |
| presence 模块     | `src/server/modules/presence/` (`presence.service.ts`, `presence.route.ts`) |
| system 模块       | `src/server/modules/system/` (`system.service.ts`, `system.route.ts`) |
| 数据库基础设施    | `src/server/infra/db/client.ts`、`src/server/infra/db/schema/index.ts` |
| AI 模型与凭据基础设施 | `src/server/infra/ai/` (`summary-model.ts`, `credential-crypto.ts`, `types.ts`) |
| 邮件发送基础设施  | `src/server/infra/email.ts`                                        |
| 统一响应封装      | `src/server/shared/response.ts`                                    |
