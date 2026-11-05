# AI Agent 与 Tool

## 1. 适用范围

`/admin/ai` 管理默认模型、内置写作 Agent 和 Tool。HTTP 接口统一由 `src/server/modules/ai/agents.route.ts` 挂载到 Hono；初始页面数据由 RSC 直接调用 service。

共享 schema、DTO 和限制位于 `src/lib/ai-agent.ts`。服务端注册及执行在 `src/server/modules/ai/`，不把执行函数或解密后的凭据传给客户端。

## 2. 接口与存储

| 接口                              | 请求与结果                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------ |
| `GET /api/ai/agents`              | 返回 `AiAgentDto[]`，目前只有 `writer`。                                                   |
| `PUT /api/ai/agents/writer`       | 接收 `{ revision, modelConfigId: 'default', systemPrompt, toolIds }`，返回更新后的 Agent。 |
| `GET /api/ai/tools`               | 返回注册 Tool 的名称、用途、输入输出说明。                                                 |
| `POST /api/ai/agents/writer/chat` | 接收 SDK 的 `{ messages }`，返回原生 UI message SSE。                                      |

`getAiAgents(database?)` 读取配置，没有记录时返回内置默认值，不在 GET 中写库。`saveWriterAgent(input, database?)` 在 revision 为 0 时首次插入，后续以旧 revision 为条件更新。

`site_ai_agent_configs` 保存 Agent ID、默认模型引用、提示词、Tool ID 列表、revision 和 ISO 时间。`site_ai_summary_config` 仍保存唯一默认模型及加密凭据，不维护第二份模型配置。

## 3. 执行契约

- `writer` 当前支持 `article-summary`、`post-draft`，允许列表由服务端读取。目录和执行使用同一注册信息。
- `article-summary` 输入 `{ content }`，输出 `{ summary }`。调用纯 `generateSummaryText`，不写 `site_article_summaries`。原 `generateSummaryForPost` 仍负责公开缓存写入。
- `post-draft` 输入 `{ overview }`，输出 `{ draft }`。复用 `generatePostDraft` 与内部 `submit_post_draft` 结构/MDX 校验，不自动保存或发布。
- 使用 AI SDK 7 `ToolLoopAgent`、`createAgentUIStreamResponse` 与客户端 `useChat`。不要另造 SSE 协议或解析器。
- 每轮固定模型和 Agent 配置快照；metadata 包含 `runId`、`modelId`、`modelRevision`、`agentRevision`。
- 请求最多 512 KiB、40 条历史消息、单条文字最多 32000 字符；提示词最多 12000 字符。初稿概述继续限制 4000 字符。
- 每轮最多 4 步、2 次业务 Tool 调用，串行执行，总期限 180 秒。取消信号传入模型、摘要和初稿。受限 fetch 的网络期限与任务期限协调。
- 上游 Base URL、重定向、凭据和响应大小限制沿用 `src/server/infra/ai/`。不输出 Key、正文或原始上游响应。
- 普通 HTTP 失败保持 `ApiResponse.error` 并增加可选 `code`；流内错误为安全的 `{ code, message }` JSON 文本。前端按 code 提供恢复入口，不匹配错误文案。

## 4. 校验与错误

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

## 5. 正常、初始与失败场景

- 正常：对话产生完整初稿，用户点击「保存为草稿并编辑」，适配为既有 `{ slug, document }` 后创建草稿，进入原编辑器。
- 初始：数据库没有 Agent 记录时显示内置角色；没有可用模型时显示配置入口。
- 失败：停止生成后保留已收到的内容，未完成调用显示中断，不提供保存。创建草稿响应丢失时先核对文章列表，不自动重复 POST。

## 6. 真实路径验收

不新增测试文件。由未编写被验收功能的人或代理，走真实 Admin 对话、Tool 状态、摘要缓存隔离、初稿保存和编辑器；另构造鉴权、超限、未知 Tool、配置并发、取消、重放和重复保存反例，记录实际输出。

静态检查、构建和历史测试只提供变更线索，不能替代用户路径。交付报告写明 oracle、Hacker 与未验范围。

## 7. 错误与正确做法

错误：聊天摘要直接调用 `generateSummaryForPost`，把一次试写更新到公开缓存。

正确：聊天调用 `generateSummaryText`；公开摘要同步继续通过缓存包装函数处理正文哈希和落库。

错误：以 `error.includes('AI 设置')` 判断是否展示配置入口。

正确：客户端保留 HTTP 状态和稳定错误码，使用 `isAiModelError(code)` 选择入口。
