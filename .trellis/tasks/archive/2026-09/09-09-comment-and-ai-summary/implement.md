# 社交评论与 AI 自动摘要总体实施计划

## 实施清单

- [x] 1. 完成并验收 `09-09-social-comments`。
- [x] 2. 完成并验收 `09-09-ai-summary-settings`。
- [x] 3. 完成并验收 `09-09-ai-summary-sync-display`。
- [x] 4. 检查父子任务的 migration 顺序、环境变量、页面组合和失败边界。
- [x] 5. 更新 frontend/backend spec、内容字段说明和功能状态表。
- [x] 6. 执行全仓质量检查与生产构建。

## 整体验证

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm db:check
pnpm db:migrate
pnpm db:verify
pnpm build
```

实际执行结果：

```text
pnpm typecheck       通过
pnpm lint            通过
pnpm format:check   通过
pnpm test            通过，70/70
pnpm db:check        通过
pnpm db:verify       通过，只读 SELECT 1
pnpm build           通过
```

本次未执行 `pnpm db:migrate`、真实 OAuth、Resend 投递或生产 AI 模型调用，避免在归档复核中改变数据库或触发外部服务。

## 集成验收

- GitHub/Google 登录、评论发布和站长权限使用同一 Better Auth session。
- AI 设置接口与页面使用同一站长邮箱判断，不引入第二套权限来源。
- 文章页只显示当前正文哈希对应的摘要，并能独立加载评论。
- 未配置 OAuth、Resend、AI 加密主密钥或 AI 模型时，文章正文和公开评论读取仍可用。

## 回滚点

- 评论子任务完成前不删除 Giscus。
- AI 设置迁移完成但同步未上线时，新增表可以空置。
- 摘要同步异常时先移除部署中的 `summary:sync`，不删除缓存数据。
