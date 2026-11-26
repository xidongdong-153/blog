---
description: 'Hono HTTP 路由、ApiResponse、进程内 Service 调用与外部适配边界'
status: implemented
paths:
  - 'src/server/app.ts'
  - 'src/app/api/**'
  - 'src/server/modules/**'
  - 'src/server/shared/response.ts'
  - 'src/server/infra/email.ts'
  - 'server.ts'
---

# API 与服务调用

[Hono 应用](../src/server/app.ts)使用 `basePath('/api')`，通过 `src/app/api/[[...route]]/route.ts` 的 `hono/vercel` 适配器接入 Next.js，runtime 为 nodejs，导出 GET/POST/PUT/PATCH/DELETE/OPTIONS。

普通 HTTP API 统一在 Hono 内承载；RSS 等非 /api 协议端点保留 Next Route Handler。访客 `/api/visitors/socket` 是 [server.ts](../server.ts)直接处理的 WebSocket upgrade，不是 Hono HTTP 端点。总体数据流见[架构](architecture.md)。

## 路由装配

| URL                | 模块文件                                       | app.ts 挂载    |
| ------------------ | ---------------------------------------------- | -------------- |
| `/api/system`      | system/system.route.ts                         | /system        |
| `/api/admin/posts` | posts/posts.route.ts                           | /admin/posts   |
| `/api/presence`    | presence/presence.route.ts                     | /presence      |
| `/api/links`       | links/links.route.ts                           | /links         |
| `/api/visitors`    | visitors/visitors.route.ts                     | /visitors      |
| `/api/config/auth` | auth/auth-config.route.ts，内部路径 /auth      | /config        |
| `/api/comments`    | comments/comments.route.ts                     | /comments      |
| `/api/auth`        | auth/auth.route.ts                             | /auth          |
| `/api/ai`          | ai/summary-config.route.ts、ai/agents.route.ts | 两者均挂在 /ai |

表中模块路径相对于 `src/server/modules/`。新增端点放对应域，route 解析并校验请求，Service 承担业务逻辑。新增独立域在 app.ts 链式挂载；URL 小写，多词用 kebab-case。

## 响应封装

系统和通用接口使用 [response.ts](../src/server/shared/response.ts)：

```ts
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  code?: string
  meta: {
    timestamp: number
    requestId?: string
  }
}

export function createSuccessResponse<T>(data: T, requestId?: string): ApiResponse<T>
export function createFailureResponse(error: string, requestId?: string, code?: string): ApiResponse<never>
```

`meta.timestamp` 是毫秒时间戳。前端保留 HTTP 状态与稳定错误码，不靠提示文案匹配恢复入口。

已有协议例外保持原样：活动 GET 直接返回 PublicPresence，友链返回 success/message 或 success/error，认证由 Better Auth 原生 Handler 处理，AI 对话使用 SDK 原生 UI message SSE。不能给这些协议机械套同一外壳。

route 捕获 Service 的领域错误并映射状态码；文章版本冲突、评论、友链与 AI 的错误范围以各 route 和公共 Schema 为准。不把数据库异常或上游敏感响应原样透传给浏览器。AI 的稳定错误码见[AI 文档](ai.md)。

## Service 调用

RSC、Server Actions 和离线脚本直接 import Service，例如 links 页面调用 getApprovedFriendLinks，status 页面调用 getStatusPageData，文章详情调用 getArticleSummaryBySlug，摘要脚本调用 syncAllArticleSummaries。公开内容保留 `src/lib/content.ts` 入口。

浏览器的评论、登录、友链申请、文章管理和 AI 设置通过 /api 发 HTTP。页面不直接拼复杂 SQL、不向自己的 localhost API 发 fetch；业务查询与状态转换归 Service。跨模块调用公开 Service 或类型，不访问私有状态。

## 外部服务

- 博客通过 `PUT /api/presence/report` 接受采集器鉴权上报，通过 `GET /api/presence` 提供公开状态。读取模式、白名单和过期规则见[活动接口](presence.md)。
- 邮件适配在 [email.ts](../src/server/infra/email.ts)，通过 Resend HTTP API 发送友链审批和评论通知。未配置凭据或目标邮箱时日志 Mock 不代表真实投递成功；不能用本地模拟响应证明收件人收到邮件。
- 模型协议、Base URL 安全校验、重定向、凭据和错误分类由[AI 文档](ai.md)维护。Service 用安全错误码与消息隔离上游异常。

外部调用设置明确超时或取消信号，凭据来自环境变量或加密存储；日志不打印原始 Key、正文、提示词或上游响应。
