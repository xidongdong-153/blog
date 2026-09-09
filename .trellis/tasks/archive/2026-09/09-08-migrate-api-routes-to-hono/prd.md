# 将 HTTP API 路由迁移至 Hono

## Goal

将站点现有的全部 HTTP API 路由迁移到 Hono 应用集中管理，通过 Next.js 的 catch-all Route Handler 挂载，统一接口分发与类型导出。

## Background

当前仓库存在两套接口形态：
1. `src/server/`：定义了基于 Hono 4 的应用工厂与路由（`systemRoute` 提供 `/api/system/health` 与 `/api/system/db-check`），但尚未挂载到 Next.js，外部无法访问。
2. `src/app/api/`：散落两个独立 Next Route Handler：
   - `src/app/api/presence/route.ts`：活动状态代理接口（GET `/api/presence`）。
   - `src/app/api/links/apply/route.ts`：友链申请提交接口（POST `/api/links/apply`）。

本次任务将 `presence` 和 `links/apply` 迁移进 `src/server/routes/`，并在 `src/app/api/[[...route]]/route.ts` 挂载 Hono，彻底移除原独立 Route Handler 文件。

## Requirements

1. **Hono 路由迁移**：
   - 新建 `src/server/routes/presence.ts`：实现 GET `/presence`，保留 1.5 秒超时控制、上游请求代理、离线兜底以及 `Cache-Control: no-store, max-age=0` 响应头。
   - 新建 `src/server/routes/links.ts`：实现 POST `/links/apply`，保留 IP 频控（10 分钟最多 3 次）、参数校验和邮件发送逻辑，返回格式保持原样。
   - 更新 `src/server/routes/index.ts`：挂载 `/presence` 与 `/links` 域路由，导出包含所有路由的 `apiRoutes`。
2. **Next.js 适配挂载**：
   - 新建 `src/app/api/[[...route]]/route.ts`，使用 `hono/vercel` 的 `handle` 将所有 `/api/*` 请求转发至 `src/server/app.ts`。
   - 删除 `src/app/api/presence/route.ts` 与 `src/app/api/links/apply/route.ts`。
3. **接口兼容保证**：
   - `/api/presence` 维持现有 `PublicPresence` 数据结构，不包装外层 `ApiResponse`，确保前端组件无感知。
   - `/api/links/apply` 维持现有 `{ success: boolean, message?: string, error?: string }` 结构与状态码（400/429/500/200），确保前端表单与弹窗无感知。
4. **自动化测试**：
   - 新增 `src/server/routes/routes.test.ts`，使用 Hono 的 `app.request()` 覆盖 `/api/system/health`、`/api/presence`、`/api/links/apply` 的基础与校验逻辑。
5. **文档与规范同步**：
   - 更新 `.trellis/spec/backend/api-design-guidelines.md` 与 `.trellis/spec/backend/index.md`，更新挂载状态与路由位置描述。

## Out of Scope

- `src/app/rss.xml/route.ts`：属于站点 RSS feed，不是 `/api` 下的 HTTP API 路由，保持现状。
- 修改数据库 schema 或新增其他业务 API。
- 调整前端调用逻辑与 UI。

## Acceptance Criteria

- [x] `GET /api/presence` 通过 Hono 正常响应，上游不可用时返回离线结构，带 `Cache-Control: no-store, max-age=0` 标头。
- [x] `POST /api/links/apply` 通过 Hono 正常完成参数校验、频控拦截与邮件发送处理。
- [x] `GET /api/system/health` 与 `GET /api/system/db-check` 可通过 catch-all 正常访问。
- [x] 原 `src/app/api/presence/route.ts` 与 `src/app/api/links/apply/route.ts` 已安全移除。
- [x] 项目质量门通过：`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build` 无错误。

