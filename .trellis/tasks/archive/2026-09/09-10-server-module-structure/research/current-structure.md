# 服务端现状与整理依据

## 结论

当前服务端适合按业务模块组织。需要移动的不只是文件：友链路由承担完整业务流程，页面仍有重复查询，认证配置按 URL 前缀拆成了独立文件。Hono、Drizzle、Better Auth 和现有 Node 测试足够完成整理，不需要新框架。

## 源码证据

| 位置                                                   | 已核对的事实                                                          | 设计影响                                                       |
| ------------------------------------------------------ | --------------------------------------------------------------------- | -------------------------------------------------------------- |
| `src/app/api/[[...route]]/route.ts:1`                  | 使用 `hono/vercel`，导出 Node runtime 和六种 HTTP 方法                | 保留这个唯一 Next API 入口，不增设其他挂载方式                 |
| `src/server/app.ts:5`、`src/server/routes/index.ts:10` | `/api` 应用与七组路由分两处组装                                       | 可在 `app.ts` 一处直接挂载模块路由，删除旧聚合文件             |
| `src/server/routes/links.ts:64`                        | 申请端点包含频控、字段校验、令牌生成、写库和邮件发送                  | 频控与请求解析归路由，申请动作归 links service                 |
| `src/server/routes/links.ts:164`、`:205`、`:256`       | 查询、审批和 `revalidatePath('/links')` 都在路由里                    | 数据与审核规则归 service，Next 缓存刷新留在路由                |
| `src/server/routes/config.ts:5`                        | `/api/config/auth` 只返回 OAuth 可用性和当前站长身份                  | 归 auth 模块，不建立独立 config 业务模块                       |
| `src/server/routes/auth.ts:4`                          | 原始 Request 直接交给 `auth.handler`                                  | 不把 Better Auth 包装成自建认证 service 或 JSON 接口           |
| `src/server/routes/comments.ts:16`                     | 主要是请求解析、身份检查和 service 调用                               | 已有职责基本合理，移动并保留模块内错误处理即可                 |
| `src/server/services/comments.ts:1`                    | 查询评论、组树、回复规则、置顶、软删除、令牌与邮件编排在同一 service  | 不机械拆 repository；将客户端使用的类型移出运行时 service      |
| `src/server/routes/ai.ts:6`                            | 路由直接识别基础设施的 `SummaryModelError`                            | AI service 负责把基础设施错误转成模块错误，路由只处理模块结果  |
| `src/server/services/ai-summary.ts:1`                  | 摘要缓存和生成服务也读取、解密模型配置                                | 把 `getReadySummaryConfig` 交给配置 service，摘要服务只调用它  |
| `src/server/routes/presence.ts:16`                     | HTTP handler 内完成地址校验、1.5 秒超时、上游读取、协议解析与离线结果 | 提取到 presence service；响应头和 JSON 输出仍归路由            |
| `src/server/routes/system.ts:15`                       | DB 探测直接写在 handler 内                                            | 与状态页共用 system service 的一次探测实现                     |
| `src/lib/email.ts:1`                                   | 邮件 HTML、文本和 Resend 发送实现被 comments、links 两处调用          | 整体移入 `src/server/infra/email.ts`，不重写模板或增加邮件框架 |

没有发现必须用 controller、DI 容器或通用 repository 才能处理的复杂度。当前维护问题是代码归属与调用边界，不是框架能力不足。

## server 目录外的调用点

| 文件                                                                 | 当前调用                                                            | 后续调整                                                   |
| -------------------------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------- |
| `src/app/(site)/links/page.tsx`                                      | 直接读 `friendLinks`，筛选 approved 并排序                          | 调 links service 的公开列表读取函数                        |
| `src/app/(site)/links/review/page.tsx`                               | 直接按 token 查库，在页面判断过期和处理状态                         | 调 links service，页面只选择对应展示状态                   |
| `src/app/(site)/status/page.tsx`                                     | `checkDatabase`、`checkPresence`、`checkEmail` 与运行时指标均在页面 | 数据探测归 system / presence service；页面保留格式化和 JSX |
| `src/app/(site)/blog/[slug]/page.tsx:13`                             | 导入摘要 service，按正文哈希选择缓存                                | 更新导入，不改成页面请求期间调用模型                       |
| `src/app/(site)/settings/ai/page.tsx`                                | 从旧 auth 目录读会话，直接调用凭据基础设施判断主密钥                | 改调 auth service 和 AI 配置 service；不修改页面准入规则   |
| `src/app/(site)/_components/comment/comment-item.tsx:3`              | 从 comments service 导入类型                                        | 改为模块纯类型文件                                         |
| `src/app/(site)/_components/comment/comment-section.tsx:3`           | 从 comments service 导入类型                                        | 改为模块纯类型文件                                         |
| `src/app/(site)/_components/settings/ai-summary-settings-form.tsx:3` | 从配置 service 导入 DTO                                             | 改为模块纯类型文件                                         |
| `scripts/sync-summaries.ts:1`                                        | 导入摘要同步 service                                                | 更新导入，命令行为与部署顺序不变                           |

`auth-modal.tsx`、`header-auth.tsx` 和 `comment-section.tsx` 读取 `/api/config/auth`。目录归属变化不要求改 URL，也不需要添加另一个地址。`src/lib/auth-client.ts` 仍是客户端 Better Auth 入口。

没有发现 `hc<AppType>` 的调用方。`AppType` 当前只在 `src/server/app.ts` 导出，整理时可直接由新应用推导，不保留旧 `apiRoutes` 类型出口。

## 必须核对的业务行为

- 友链申请频控是进程内 `Map`，每 IP 十分钟三次，频控在 JSON 解析之前计数。移动文件不能把 Map 改成每请求重建。
- 友链申请先写 pending 记录再等待邮件。邮件失败时请求失败，但记录不会回滚；本次不改成事务或队列。
- 审核 GET 只读；POST 检查 pending 与七天令牌有效期，通过或拒绝后清除令牌。只有通过时刷新 `/links`，刷新异常不撤销审核结果。
- presence API 的在线数据读取超时为 1500 ms，失败返回离线对象，并设置 `Cache-Control: no-store, max-age=0`。
- 状态页的 presence 检查超时为 800 ms，只检查 HTTP 可用性，不判断公开活动对象是否合法。它与 API 数据读取不是同一个动作。
- 评论写入后异步通知站长，邮件失败不撤销评论。删除预览不写库，确认删除才清除正文和凭证。
- Better Auth 负责 cookie、OAuth 和原始响应；业务模块不复制 session 表写入逻辑。
- AI 配置输出不包含凭据密文、IV、Tag 或明文 Key；版本变化时连接测试不能把旧版本标成 ready。
- 摘要生成只在同步入口进行；页面读取缓存，不触发模型调用。正文、主密钥、凭据和原始上游响应不能进入日志。
- AI 连接测试默认 20 秒、零重试；摘要生成默认 60 秒、两次重试。旧规范把两者写成统一 20 秒、零重试，与源码不符。

## 测试与命令约束

`package.json` 的 `test` 脚本显式列出十个文件，不会自动发现新测试。移动或新增测试必须同步修改脚本。

| 测试                                                     | 已有覆盖与风险                                                                   |
| -------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `src/server/auth/auth.test.ts`                           | 密钥检查、站长邮箱、实例和公开认证配置；使用完整 app                             |
| `src/server/services/comments.test.ts`                   | 评论树、排序、软删除、令牌；直接使用默认 db，并删除固定文章和测试用户数据        |
| `src/server/routes/comments.test.ts`                     | 缺参、未登录、基础路由；有效 slug 读取依赖数据库表存在                           |
| `src/server/services/ai-summary-config.test.ts`          | 配置加密、清除、测试启用和 revision 冲突；直接使用默认 db                        |
| `src/server/routes/ai.test.ts`                           | 创建真实测试 session，检查 401/403、参数和脱敏；会删除 `id = default` 的 AI 配置 |
| `src/server/services/ai-summary.test.ts:27`              | 自建临时 SQLite 并运行现有迁移，使用替代 fetch 测试三种协议和缓存                |
| `src/server/infra/ai/*.test.ts`                          | 密码学与模型调用边界，继续保留在基础设施旁                                       |
| `src/lib/presence.test.ts`、`src/lib/ai-summary.test.ts` | 纯协议解析和正文哈希，不随服务端目录移动                                         |

因此不能直接用现有默认库执行 `pnpm test`。实施时必须显式指定临时 SQLite，并关闭真实邮件凭据。规划阶段不执行数据测试、迁移、同步或生产构建。

当前没找到 links、system、presence Hono 路由的专门测试。AI 路由测试的权限端点数组也尚未包含 `/summary-config/models`。整理时补这些被调整入口的验证，不新增测试框架。

`scripts/test-loader.mjs` 已支持 `@/`、相对扩展名和目录 `index.ts` 解析，并把 `next/cache` 替换为空实现。路径移动不要求添加旧路径解析规则。缓存刷新是否触发不能仅凭这个空实现证明，需要检查 route 的成功分支及本地页面结果。

`drizzle.config.ts` 会加载 `.env.local`，但连接 URL 和凭据来自 `process.env`。测试命令需先显式设置临时连接和空的外部服务凭据，不能把真实环境当作测试数据来源。

## 现有规范与实际代码的冲突

- `AGENTS.md` 和 README 的概况仍称无数据库；实际已有 libSQL 表与迁移。此次只修服务端结构相关事实，不扩写 README。
- 后端 `directory-structure.md`、`service-call-guidelines.md` 写着 Hono 未挂载、无 service、无 migration；实际均已存在。
- `api-design-guidelines.md` 的开头与后文挂载章节互相矛盾。
- `database-guidelines.md` 的开头仍称只有一张表，与文末现状记录不一致。
- 归档设计 `.trellis/tasks/archive/2026-09/09-09-comment-and-ai-summary/design.md` 明确保持 Next.js 单应用，不拆独立后端；这与当前整理方向一致。历史任务文件不改写。
- 长期规则继续维护在现有 backend spec；功能状态表只改实现路径，不增加第二份功能清单。

## Hono 官方依据

已阅读 `xdd-honojs` 技能本地保存的 Hono 官方文档：`references/llms-small.txt:2302-2444`，对应 [Best Practices](https://hono.dev/docs/guides/best-practices)。

- 使用 `app.route()` 拆分与挂载功能路由。
- handler 紧邻 URL 声明，避免额外 controller 导致路径参数类型丢失。
- 链式声明能保留完整路由类型；`createApp` 返回链式结果即可。

据此采用业务模块文件夹和局部 route/service，而不是引入其他框架的分层模板。

## 调研状态

- 用户已允许当前会话完成只读调研。此前 `trellis-research` 因模型服务 HTTP 500、三次自动重试后失败，未生成文件。
- 用户明确禁止兼容设计；旧目录、导出、调用方式直接替换，不保留别名或转发实现。
- 用户确认纳入页面内服务端数据逻辑和邮件实现，不改页面布局。
- 本机实际检查环境为 Node.js `v26.7.0`、pnpm `10.29.1`；README 写的是 Node.js 24.16.0、pnpm 11.5.0。没有安装或切换工具版本。
- 本文件是源码调研记录，不表示业务测试已经执行。
