# 执行计划

## 前置状态

- 调研已完成，事实清单见 `prd.md` 的「背景与现状」。
- 工作区干净，基线提交 `7b48875`。

## 步骤

1. 写 `.trellis/spec/backend/directory-structure.md`
   - `src/server/` 四个目录（`routes/`、`infra/db/`、`shared/`、根 `app.ts`）的职责与放置规则。
2. 写 `.trellis/spec/backend/api-design-guidelines.md`
   - `ApiResponse` 封装用法（引用 `src/server/shared/response.ts` 真实签名）。
   - 路由命名与注册方式（引用 `routes/index.ts` 的挂载写法）。
   - Hono 挂载约定：当前未挂载的事实、接入 Next.js 的方式（`src/app/api/[[...route]]/route.ts` 转发）。
   - Hono 与 Next Route Handler 的分工判断规则。
3. 写 `.trellis/spec/backend/service-call-guidelines.md`
   - 直连 `db` 与走 API 的判断边界（以 status 页为现有直连案例）。
   - 何时拆 service 层（当前无 service，给出触发条件而不是提前建层）。
   - 外部服务调用的现有案例（presence 代理 + `PRESENCE_SOURCE_URL` 校验、邮件发送）。
4. 写 `.trellis/spec/backend/database-guidelines.md`
   - schema 组织（`schema/index.ts` 聚合 + 按域拆文件）、表命名（`system_health_checks` 的 `模块_实体` 模式）。
   - 时间戳列写法（`integer` + `mode: 'timestamp_ms'`）。
   - migration 流程：`db:generate` → `db:check` → `db:migrate` → `db:verify`，开发期 `db:studio`。
   - 环境变量 `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN`，本地回退 `file:local.db`。
   - `system_health_checks` 已定义未使用的现状。
5. 写 `.trellis/spec/backend/index.md`
   - 适用范围、开发前检查、质量检查、关键入口、文件索引（索引必须与 1-4 的实际文件名一致，最后写）。
6. 验证（见下）。

## 验证命令

```bash
# spec 层被识别
python3 .trellis/scripts/get_context.py --mode packages

# 引用路径真实存在（抽出 spec 里的 src/ 路径逐一核对）
grep -rhoE 'src/[a-zA-Z0-9/._-]+' .trellis/spec/backend/ | sort -u | while read -r p; do [ -e "$p" ] || echo "MISSING: $p"; done

# 格式检查（若 .trellis 在 prettier 范围内）
pnpm format:check
```

## 回滚点

- 全部产物在 `.trellis/spec/backend/`，回滚等于删除该目录；不涉及代码改动。

## 完成标准

见 `prd.md` 的 Acceptance Criteria。
