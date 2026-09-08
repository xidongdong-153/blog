# HTTP API 路由迁移至 Hono 实施计划

## 实施清单

- [x] 1. 新增 `src/server/routes/presence.ts`
  - 迁移原 `src/app/api/presence/route.ts` 逻辑。
  - 使用 `new Hono().get('/', async (c) => ...)`。
  - 保留 1.5 秒超时、URL 校验、离线兜底、`Cache-Control: no-store, max-age=0`。
- [x] 2. 新增 `src/server/routes/links.ts`
  - 迁移原 `src/app/api/links/apply/route.ts` 逻辑。
  - 使用 `new Hono().post('/apply', async (c) => ...)`。
  - 保留 IP 频控、请求体验证、邮件投递及统一返回结构。
- [x] 3. 更新 `src/server/routes/index.ts`
  - 挂载 `presenceRoute` (`/presence`) 和 `linksRoute` (`/links`)。
  - 保持链式调用以便导出 `AppType`。
- [x] 4. 创建 Next.js 挂载入口 `src/app/api/[[...route]]/route.ts`
  - 使用 `hono/vercel` 的 `handle`。
  - 导出 `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `OPTIONS` 处理函数。
  - 声明 `export const runtime = 'nodejs'`。
- [x] 5. 移除原 Next Route Handler 文件
  - 删除 `src/app/api/presence/route.ts` 与 `src/app/api/presence/`。
  - 删除 `src/app/api/links/apply/route.ts` 与 `src/app/api/links/`。
- [x] 6. 端点集成验证
  - 验证 `GET /api/system/health` 状态码 200 与返回结构。
  - 验证 `GET /api/system/db-check` 状态码 200 与数据库查询。
  - 验证 `GET /api/presence` 状态码 200 与 `Cache-Control` 响应头。
  - 验证 `POST /api/links/apply` 非法输入校验返回 400 与频控拦截 429。
  - 运行 `node --test src/lib/presence.test.ts` 验证通过。
- [x] 7. 同步后端规范文档
  - 更新 `.trellis/spec/backend/index.md`：移除「Hono 当前未挂载」的过时说明。
  - 更新 `.trellis/spec/backend/api-design-guidelines.md`：更新 Hono 挂载状态为已通过 `src/app/api/[[...route]]/route.ts` 接入，并明确全量 API 均使用 Hono 承载。
- [x] 8. 执行项目质量门检查
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm format:check`
  - `pnpm build`

## 验证命令

```bash
# 运行新路由测试
node --test src/server/routes/routes.test.ts

# 运行现有 presence 测试
node --test src/lib/presence.test.ts

# 运行质量门
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
```

## 风险文件与回滚点

- 涉及关键删除：
  - `src/app/api/presence/route.ts`
  - `src/app/api/links/apply/route.ts`
- 回滚方式：
  - 若 Next.js catch-all 转发异常，可通过 `git checkout` 恢复原两个路由文件并移除 `src/app/api/[[...route]]/`。
