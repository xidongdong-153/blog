# Better Auth 社交评论系统实施计划

## 实施清单

- [x] 1. 安装并锁定 Better Auth、Drizzle adapter、客户端与评论图标依赖。
- [x] 2. 创建 Better Auth 配置，由同一版本 CLI 生成 SQLite schema，并聚合到现有 schema 出口。
- [x] 3. 新增认证 Hono 路由、provider 配置接口、session 与 `ADMIN_EMAIL` 站长判断。
- [x] 4. 为 `BlogPost` 增加 `commentKey` 读取和默认 slug 解析，并更新内容规范。
- [x] 5. 新增评论 schema、relations 和 migration；迁移后运行数据库检查。
- [x] 6. 实现评论 service：公开树查询、发布、单层回复、三种排序、置顶、软删除和 provider 投影。
- [x] 7. 实现评论 Hono API，覆盖 session、站长权限、参数和目标文章校验。
- [x] 8. 扩展 Resend 邮件模板与发送函数，生成一次性删除确认链接。
- [x] 9. 实现评论删除确认页，确保 GET 只读、POST 才执行删除。
- [x] 10. 实现评论客户端：登录、session、composer、排序、平铺回复、站长操作和完整状态。
- [x] 11. 将文章页切换到自建评论组件，删除 Giscus 组件、配置、主题资源和联系页旧文案。
- [x] 12. 更新 `.env.example`、后端与前端 spec、功能状态表。

## 自动化验证

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm db:check
pnpm db:verify
pnpm build
```

说明：Node 内置测试已通过 `scripts/test-loader.mjs` 具备路径别名与无后缀解析支持，运行 `pnpm test` 即可自动执行所有认证、评论 service 和路由测试。

## 手工验收

- GitHub 与 Google 分别完成首次登录、回调文章、刷新保留 session 和退出。
- 同邮箱关联后评论头像显示两个 provider 图标。
- 桌面和移动端检查登录面板、1000 字边界、直接回复、回复另一回复、三种排序与软删除占位。
- 站长可置顶和删除；普通登录用户直接调用接口返回 403。
- 评论通知邮件打开确认页，GET 不删除，确认后 POST 删除，重复使用失败。

## 风险文件与回滚点

- `src/server/infra/db/schema/auth.ts` 必须由实际 Better Auth 版本生成后复核，不手写删字段。
- 删除 Giscus 前保留一次可恢复的独立改动批次。
- OAuth 或 session 出现阻断时，先恢复 Giscus 文章入口；新增认证和评论表可保留为空。
