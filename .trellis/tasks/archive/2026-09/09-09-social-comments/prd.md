# 实现 Better Auth 社交评论系统

## Goal

用站内社交登录和评论系统替换文章详情页的 Giscus，让没有 GitHub 账号的访客也能参与讨论，并让站长直接在前台管理评论。

## Background

- 当前评论入口位于 `src/app/(site)/blog/[slug]/page.tsx`，使用 `GiscusComments`。
- Hono 已通过 Next.js catch-all Route Handler 挂载到 `/api/*`。
- Drizzle schema 按业务域拆分，并由 `src/server/infra/db/schema/index.ts` 聚合。
- starter 已实现 Better Auth + Drizzle、GitHub/Google OAuth、session cookie 与 provider 配置检测，可复用其配置边界。
- 文章 slug 来自 `content/blog/<slug>/post.mdx`，笔记 slug 来自 `content/notes/<slug>.md`。

## Requirements

1. 接入 Better Auth 与现有 Drizzle/Turso，认证路由挂到现有 Hono API；首版启用 GitHub 与 Google，未配置的 provider 不显示，Apple 不在本任务实现。
2. 未登录访客可读取评论；发布、回复和站长操作必须校验 session。
3. 评论记录包含稳定 `targetKey`、父评论、被回复评论、用户、正文、置顶和软删除状态、一次性删除凭证状态与时间戳；首版不增加笔记目标类型。
4. `src/lib/content.ts` 支持可选 `commentKey`，未配置时使用文章 slug；服务端按当前 slug 校验文章并解析实际 `targetKey`，前端不能向任意 key 写入评论。
5. 评论区支持登录状态、发布、顶级评论下单层平铺回复、默认/最新/最早排序、provider 来源标记和加载/空/失败状态。所有回复的 `parentId` 指向顶级评论；回复另一条回复时用 `replyToId` 显示“回复 用户名：正文”，不增加缩进层级。来源角标展示服务端查询到的全部已关联 provider，不声称是本次登录来源。
6. 站长身份由服务端配置的邮箱判定；删除、置顶和作者标记不能信任客户端传值。
7. 新评论通过 Resend 通知站长，邮件包含一次性删除链接；链接进入确认页后执行，凭证有过期时间且使用后失效。
8. 移除被替换的 Giscus 组件、配置读取和页面文案，不保留双评论路径。
9. 删除使用软删除：被删评论不再返回正文和操作，页面显示删除占位，其回复继续保留。
10. 每条评论或回复去除首尾空白后必须为 1 至 1000 字，前后端使用同一限制。
11. 排序规则：默认模式先显示置顶顶级评论，其余按创建时间倒序；最新模式忽略置顶按创建时间倒序；最早模式按创建时间正序；每个讨论下的回复始终按创建时间正序。

## Acceptance Criteria

- [ ] 配置的 OAuth provider 可完成登录、回调、session 读取和退出登录。
- [ ] 未配置的 provider 不显示登录按钮，且不会导致应用启动失败。
- [ ] 公开接口能按当前文章 slug 和排序返回结构稳定的评论树，`commentKey` 可在 slug 改名后继续读取历史评论。
- [ ] 未登录发布返回 401；无效目标、空内容、超长内容或无效回复关系返回明确的 4xx。
- [ ] 登录用户可发布顶级评论和回复，刷新页面后数据仍存在。
- [ ] 只有站长能删除和置顶；普通用户直接调用接口也会被拒绝。
- [ ] 文章页不再加载 Giscus iframe，评论 UI 在移动端和桌面端均可使用。
- [ ] 评论作者信息只包含公开字段和全部已关联 provider ID，不包含任何 OAuth token。
- [ ] 数据库 migration、路由测试和前端关键交互测试覆盖主要成功与失败路径。

## Out of Scope

- 独立后台、角色权限系统和批量审核界面。
- 匿名评论、密码注册、评论反应和富文本编辑器。
- 自动迁移 GitHub Discussions 中的历史评论。
