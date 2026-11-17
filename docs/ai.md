---
description: '默认模型与凭据、摘要缓存、写作 Agent、Tool 和安全错误契约'
status: implemented
paths:
  - 'src/server/modules/ai/**'
  - 'src/server/infra/ai/**'
  - 'src/server/infra/db/schema/ai.ts'
  - 'src/lib/ai-agent.ts'
  - 'src/lib/ai-summary.ts'
  - 'src/app/(site)/admin/ai/**'
  - 'src/app/(site)/_components/admin/ai/**'
  - 'scripts/sync-summaries.ts'
---

# AI 模型、摘要与写作

## 默认模型与凭据

/admin/ai 管理唯一 default 模型，摘要、文章初稿和写作 Agent 共用，不维护第二套模型配置。site_ai_summary_config 保存协议、Base URL、模型 ID、凭据密文/IV/认证 Tag/掩码、状态与 revision；site_ai_agent_configs 保存 Agent 配置和 ISO 时间。表定义见 [AI Schema](../src/server/infra/db/schema/ai.ts)。

协议为 openai-completions、openai-responses、anthropic-messages。模型适配与安全边界在 [summary-model.ts](../src/server/infra/ai/summary-model.ts)，凭据使用 [credential-crypto.ts](../src/server/infra/ai/credential-crypto.ts)的 AES-256-GCM 与 32 字节 Base64 主密钥。

Base URL 必须经过 validateAiBaseUrlAsync 校验：不含账号密码、查询或 hash；生产阻断内网、私有网段和云元数据地址。受限 fetch 设置明确期限、响应大小上限与 redirect manual；模型错误分类为安全 code，不向浏览器传 Key、Prompt 或原始上游响应。连接检查只能证明对应文本请求可用，不能证明支持 Tool calling。

## 公开摘要缓存

[summary.service.ts](../src/server/modules/ai/summary.service.ts)生成摘要并管理缓存，[sync-summaries.ts](../scripts/sync-summaries.ts)是显式命令入口，正文哈希来自 [ai-summary.ts](../src/lib/ai-summary.ts)。页面只读取缓存，不在用户请求中调用模型，也不把摘要写回 MDX。

```bash
pnpm summary:sync
```

部署脚本在迁移、连通性检查后和 build 前执行同步；通用 pnpm build 不调用模型。正文修改后旧哈希失效，需显式同步，不能声称保存正文会自动生成新摘要。

缓存以 slug 为主键，保存正文 UTF-8 SHA-256、摘要、协议、模型与时间。只哈希正文，frontmatter/属性变化不单独触发生成。结果计数为 total/generated/skipped/disabled/failed。

摘要目标为中文纯文本 2–3 句，约 120–180 字；当前校验允许 80–260 字，拒绝空文本、代码围栏、标题、列表和非 stop 结束。不是完整 Markdown 解析器，不能据此声称拒绝所有行内 Markdown。

| 条件                         | 当前处理                                  |
| ---------------------------- | ----------------------------------------- |
| disableAiSummary 为 true     | 计入 disabled，不生成，页面不显示         |
| 缓存哈希等于当前正文         | 计入 skipped，不调用模型                  |
| 没有 ready 配置              | 跳过调用并统计，保留正文可读              |
| 单篇模型或写缓存错误         | try 内计入 failed，保留旧记录，继续下一篇 |
| 配置读取或读取缓存异常       | 可能中断整轮；命令顶层捕获并最终退出 0    |
| 详情读取失败或正文哈希不匹配 | 不显示摘要，继续渲染正文                  |

成功生成、通过校验后才 upsert，不先删旧缓存。命令退出 0 只代表 best-effort 不阻断部署，不证明全部生成成功，也不证明模型或数据库在线。

## 写作 Agent 范围

`/admin/ai` 管理默认模型、内置写作 Agent 和 Tool。HTTP 接口统一由 `src/server/modules/ai/agents.route.ts` 挂载到 Hono；初始页面数据由 RSC 直接调用 service。

共享 schema、DTO 和限制位于 `src/lib/ai-agent.ts`。服务端注册及执行在 `src/server/modules/ai/`，不把执行函数或解密后的凭据传给客户端。

## Agent 接口与存储

| 接口                              | 请求与结果                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------ |
| `GET /api/ai/agents`              | 返回 `AiAgentDto[]`，目前只有 `writer`。                                                   |
| `PUT /api/ai/agents/writer`       | 接收 `{ revision, modelConfigId: 'default', systemPrompt, toolIds }`，返回更新后的 Agent。 |
| `GET /api/ai/tools`               | 返回注册 Tool 的名称、用途、输入输出说明。                                                 |
| `POST /api/ai/agents/writer/chat` | 接收 SDK 的 `{ messages }`，返回原生 UI message SSE。                                      |

`getAiAgents(database?)` 读取配置，没有记录时返回内置默认值，不在 GET 中写库。`saveWriterAgent(input, database?)` 在 revision 为 0 时首次插入，后续以旧 revision 为条件更新。

`site_ai_agent_configs` 保存 Agent ID、默认模型引用、提示词、Tool ID 列表、revision 和 ISO 时间。`site_ai_summary_config` 仍保存唯一默认模型及加密凭据，不维护第二份模型配置。

## 对话与 Tool 执行

- `writer` 当前支持 `article-summary`、`post-draft`，允许列表由服务端读取。目录和执行使用同一注册信息。
- `article-summary` 输入 `{ content }`，输出 `{ summary }`。调用纯 `generateSummaryText`，不写 `site_article_summaries`。原 `generateSummaryForPost` 仍负责公开缓存写入。
- `post-draft` 输入 `{ overview }`，输出 `{ draft }`。复用 `generatePostDraft` 与内部 `submit_post_draft` 结构/MDX 校验，不自动保存或发布。
- 使用 AI SDK 7 `ToolLoopAgent`、`createAgentUIStreamResponse` 与客户端 `useChat`。不要另造 SSE 协议或解析器。
- 每轮固定模型和 Agent 配置快照；metadata 包含 `runId`、`modelId`、`modelRevision`、`agentRevision`。
- 请求最多 512 KiB、40 条历史消息、单条文字最多 32000 字符；提示词最多 12000 字符。初稿概述继续限制 4000 字符。
- 每轮最多 4 步、2 次业务 Tool 调用，串行执行，总期限 180 秒。取消信号传入模型、摘要和初稿。受限 fetch 的网络期限与任务期限协调。
- 上游 Base URL、重定向、凭据和响应大小限制沿用 `src/server/infra/ai/`。不输出 Key、正文或原始上游响应。
- 普通 HTTP 失败保持 `ApiResponse.error` 并增加可选 `code`；流内错误为安全的 `{ code, message }` JSON 文本。前端按 code 提供恢复入口，不匹配错误文案。

## 校验与错误

| 条件                                              | 行为                                                            |
| ------------------------------------------------- | --------------------------------------------------------------- |
| 未登录 / 非站长                                   | 401 `AI_AUTH_REQUIRED` / 403 `AI_FORBIDDEN`。                   |
| 跨来源请求                                        | 403 `AI_ORIGIN_REJECTED`。                                      |
| 请求体超限                                        | 413 `AI_REQUEST_TOO_LARGE`。                                    |
| 空消息、system 角色、未知 Tool、重复消息或调用 ID | 400 `AI_INVALID_MESSAGES`。                                     |
| 消息含上轮未完成或失败的 Tool                     | 转成明确的未完成/失败历史文字，不重新执行旧调用。               |
| 无已启用模型                                      | `AI_MODEL_NOT_READY`，提供模型配置入口。                        |
| 并发保存 Agent 配置                               | 条件更新失败返回 409 `AI_REVISION_CONFLICT`。                   |
| Tool 停用 / 达到调用上限                          | `AI_TOOL_DISABLED` / `AI_TOOL_LIMIT`，不执行该 Tool。           |
| 停止 / 超时                                       | `AI_RUN_CANCELLED` / `AI_RUN_TIMEOUT`，不把部分结果当成功初稿。 |

连接检查只证明文本请求可用，不能据此宣称模型支持 Tool calling。

在首个文字返回前停止时，SDK 会留下 `parts: []` 的助手消息。服务端忽略这类历史空助手消息，使下一轮能够恢复；原始请求末条仍必须是非空用户消息，不能把尾部空助手消息过滤后当作新请求。不要对全部消息使用 `parts.min(1)`，否则停止后的正常重发会被拒绝。

## 正常、初始与失败场景

- 正常：对话产生完整初稿，用户点击「保存为草稿并编辑」，适配为既有 `{ slug, document }` 后创建草稿，进入原编辑器。
- 初始：数据库没有 Agent 记录时显示内置角色；没有可用模型时显示配置入口。
- 失败：停止生成后保留已收到的内容，未完成调用显示中断，不提供保存。创建草稿响应丢失时先核对文章列表，不自动重复 POST。

## 业务变更的真实路径

不新增测试文件。由未编写被验收功能的人或代理，走真实 Admin 对话、Tool 状态、摘要缓存隔离、初稿保存和编辑器；另构造鉴权、超限、未知 Tool、配置并发、取消、重放和重复保存反例，记录实际输出。

静态检查、构建和历史测试只提供变更线索，不能替代用户路径。交付报告写明 oracle、Hacker 与未验范围。

## 容易写错的地方

错误：聊天摘要直接调用 `generateSummaryForPost`，把一次试写更新到公开缓存。

正确：聊天调用 `generateSummaryText`；公开摘要同步继续通过缓存包装函数处理正文哈希和落库。

错误：以 `error.includes('AI 设置')` 判断是否展示配置入口。

正确：客户端保留 HTTP 状态和稳定错误码，使用 `isAiModelError(code)` 选择入口。

源码入口：[共享 Agent Schema](../src/lib/ai-agent.ts)、[对话路由](../src/server/modules/ai/agents.route.ts)、[配置 Service](../src/server/modules/ai/agents.service.ts)、[Tool 注册](../src/server/modules/ai/tools.registry.ts)。
