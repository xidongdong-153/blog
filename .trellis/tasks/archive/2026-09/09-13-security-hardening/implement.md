# 项目与 CI/CD 综合安全加固实施计划

## 执行清单

### 阶段一：应用鉴权、存储安全与防呆（代码与数据层）
- [x] 修改 `src/server/infra/db/client.ts`、`drizzle.config.ts` 与 `scripts/verify-db.mts`，生产环境严禁静默回退 `file:local.db`。
- [x] 修改 `src/server/modules/auth/auth.service.ts` 和 `auth.config.ts`，站长判断增加 `emailVerified` 校验，开启 `encryptOAuthTokens`。
- [x] 修改 `src/server/modules/links/links.service.ts`，审批 Token 改为数据库仅存 SHA-256 哈希值，核验接口按哈希查询。
- [x] 修改 `src/server/modules/ai/summary-config.service.ts`，Base URL 变更时强制要求重新输入 API Key，禁止向新地址外泄旧凭证。
- [x] 修改 `src/server/modules/system/system.route.ts`，脱敏 `/api/system/db-check` 接口，屏蔽底层驱动返回和异常细节。

### 阶段二：运行时频控、资源上限与日志脱敏（业务防护层）
- [x] 修改 `src/server/modules/visitors/visitors.route.ts`、`visitors.service.ts` 和 `visitors.websocket.ts`，增加访客 bootstrap IP 限流、递增计数优化、单连接绑定单个 session、全局最大连接数（1000）与活跃会话淘汰机制。
- [x] 修改 `src/server/modules/links/links.rate-limit.ts`，为友链限流内存表增加 5000 条硬上限及溢出防护。
- [x] 新增 `src/server/modules/comments/comments.rate-limit.ts` 并在 `comments.route.ts` 接入发表频控。
- [x] 修改 `src/server/infra/email.ts`，生产环境降级时不向控制台打印申请人姓名、邮箱及申请内容。

### 阶段三：CI/CD 部署流水线加固（部署与供应链）
- [x] 修改 `.github/workflows/ci-cd.yml`，将 `actions/checkout`、`pnpm/action-setup`、`actions/setup-node` 固定到 40 位 commit SHA。
- [x] 移除 `pnpm-workspace.yaml` 与 workflow 中 `@prisma/client` 与 `better-sqlite3` 的构建权限白名单，验证仅保留 `esbuild` 与 `sharp` 时正常安装与构建。
- [x] 重构 `.github/workflows/ci-cd.yml` 中部署阶段的 SSH 凭据传递逻辑，取消 argv 命令行位置参数传递，改用受保护的标准输入（stdin）流安全注入。

## 验证命令

每一阶段实施后按顺序运行以下验证：

```bash
# 1. 质量门检查
pnpm typecheck
pnpm lint
pnpm format:check

# 2. 单元测试与覆盖验证
pnpm test

# 3. 生产构建模拟验证
TURSO_DATABASE_URL=file:local.db TURSO_AUTH_TOKEN=ci-test-token BETTER_AUTH_SECRET=12345678901234567890123456789012 pnpm build

# 4. 任务文档与规范校验
python3 ./.trellis/scripts/task.py validate 09-13-security-hardening
```

## 检查重点

1. **生产防呆熔断**：设置 `NODE_ENV=production` 且不传 `TURSO_DATABASE_URL` 时，启动或校验脚本必须立即抛错非零退出，不得生成或连接本地 SQLite。
2. **友链审批 Token 兼容性**：确保新生成的申请其数据库字段为哈希，审批邮件中的链接仍能正常核验并审批通过，审批后该 Token 立即失效。
3. **访客 WebSocket 内存安全**：模拟单连接持续发送不同 `sessionId` 时，内存中的 `sessions` 集合不会无节制膨胀，旧会话正常淘汰。
4. **CI/CD SSH argv 脱敏**：检查 workflow 脚本，`ssh` 命令行参数中仅允许包含必要的主机、端口与目标 SHA，所有环境变量改走 stdin。

## 回退策略

- 若某个模块加固引发不可预期的类型冲突或单测破坏，单模块回滚对应文件，保持各阶段改动的原子性。
- `pnpm-workspace.yaml` 的改动需经过本地 `pnpm install --frozen-lockfile` 完整测试验证，若发现遗漏必要原生依赖则回退并精确调整。
