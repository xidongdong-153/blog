# 实现社交评论与 AI 自动摘要

## Goal

以 `COMMENT_AND_AI_SUMMARY_DESIGN.md` 为需求来源，为博客增加自建社交评论和文章 AI 摘要，降低访客参与门槛，并避免正文未变化时重复调用模型。

## Background

- 项目使用 Next.js 16、React 19、Hono、Drizzle ORM 和 Turso。
- `/api/*` 已通过 `src/app/api/[[...route]]/route.ts` 挂载到 Hono。
- 文章和笔记继续保存在 `content/`，不迁入数据库。
- 当前文章详情页使用 Giscus；本任务完成后由自建评论组件替换。
- starter 的 Better Auth 实现可作为 GitHub、Google OAuth、Drizzle 适配器和 session 接入参考。

## Task Map

- `09-09-social-comments`：认证、评论数据、Hono 接口、评论 UI、通知和站长操作。
- `09-09-ai-summary-settings`：管理 AI 模型配置、凭据加密和连接测试。
- `09-09-ai-summary-sync-display`：按内容哈希生成和展示摘要，并接入部署同步流程。

三个子任务独立规划和验收。实施顺序为：先完成评论任务中的 Better Auth 与站长身份，再完成 AI 模型配置，最后完成摘要同步与展示。

## Requirements

1. 评论与博客文章使用 `commentKey` 绑定，未配置时取 slug；写入前由服务端根据当前文章 slug 解析并校验，首版不开放笔记评论。
2. 评论写操作要求有效社交登录 session，读取保持公开；评论树只保留顶级评论与一层平铺回复；每条正文最多 1000 字；默认排序为置顶优先，其余顶级评论按创建时间倒序，回复按创建时间正序。
3. AI 摘要配置只允许站长管理，支持 OpenAI Chat Completions、OpenAI Responses 和 Anthropic Messages；API key 使用环境主密钥加密后存入数据库。
4. 摘要同步通过 Vercel AI SDK 读取已测试并启用的配置，只有正文哈希变化时重新生成，并允许单篇文章关闭。
5. 数据库变化使用现有 Drizzle schema 与 migration 流程。
6. 新评论邮件包含一次性删除链接，经过确认页执行，凭证过期或使用后不得再次删除。
7. 模型或数据库不可用时不阻止部署，旧摘要不覆盖；页面仅展示哈希与当前正文一致的摘要。
8. AI 摘要为中文纯文本 2 至 3 句，约 120 至 180 字。
9. 新增界面沿用当前站点主题、响应式布局和无障碍约定。
10. 首版 OAuth provider 为 GitHub 与 Google；Apple 留待后续任务。

## Acceptance Criteria

- [x] 三个子任务均有独立且可测试的需求、技术设计和实施计划。
- [x] 评论功能与 AI 摘要功能的代码、接口和服务测试已通过各自验收范围。
- [x] 评论和摘要能同时出现在文章详情页，互不阻塞页面主体渲染。
- [x] `pnpm typecheck`、`pnpm lint`、`pnpm format:check` 和 `pnpm build` 全部通过。

## 归档核验

- 本次复核通过 `pnpm test`，共 70 个测试全部通过；`pnpm db:check`、`pnpm db:verify` 和生产构建也通过。
- 本次未执行真实 GitHub/Google OAuth、Resend 邮件投递和生产 AI 模型调用。它们仍需在部署环境做人工验收。

## Out of Scope

- Apple OAuth、笔记评论和笔记摘要。
- 多 Provider 目录、模型白名单、用量审计和完整 Admin Dashboard。
- 将 MDX 内容迁入数据库。
- 与本需求无关的页面或后端重构。
