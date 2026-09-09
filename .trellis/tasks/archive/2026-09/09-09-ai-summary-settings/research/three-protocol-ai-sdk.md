# AI SDK 7 三协议接入研究

## 结论

当前 npm 已发布且彼此匹配的版本是：

- `ai@7.0.94`
- `@ai-sdk/openai@4.0.62`
- `@ai-sdk/anthropic@4.0.50`
- 间接依赖 `@ai-sdk/provider@4.0.11`、`@ai-sdk/provider-utils@5.0.37`
- 三个直接包都要求 Node.js `>=22`，并声明 `zod@^3.25.76 || ^4.1.8` 为 peer dependency

本项目协议枚举与 AI SDK model factory 应固定映射如下：

| 项目协议 | Provider 构造函数 | Model factory | HTTP 路径 |
| --- | --- | --- | --- |
| `openai-completions` | `createOpenAI` | `provider.chat(modelId)` | `<baseURL>/chat/completions` |
| `openai-responses` | `createOpenAI` | `provider.responses(modelId)` | `<baseURL>/responses` |
| `anthropic-messages` | `createAnthropic` | `provider.messages(modelId)` | `<baseURL>/messages` |

`openai-completions` 在本项目中表示 OpenAI Chat Completions，不是旧式 Text Completions。这里必须调用 `.chat(modelId)`，不能调用 `.completion(modelId)`。后者请求的是 `/completions`。

OpenAI provider 的可调用默认 factory `provider(modelId)` 和 `.languageModel(modelId)` 在当前发布源码中都返回 Responses model。自定义中转只实现 Chat Completions 时，不能依赖默认 factory，必须显式调用 `.chat(modelId)`。

Anthropic 的可调用默认 factory、`.languageModel()`、`.chat()` 和 `.messages()` 当前都创建同一个 Messages model。为保持协议枚举与代码含义一致，建议显式使用 `.messages(modelId)`。

## Provider 构造与 URL 规则

### OpenAI Chat Completions 和 Responses

```ts
import { createOpenAI } from '@ai-sdk/openai'

const provider = createOpenAI({
  baseURL,
  apiKey,
})

const chatModel = provider.chat(modelId)
const responsesModel = provider.responses(modelId)
```

`createOpenAI` 的相关选项：

- `baseURL?: string`：默认 `https://api.openai.com/v1`。
- `apiKey?: string`：显式传入时使用该值，否则读取 `OPENAI_API_KEY`。
- `headers?: Record<string, string>`：追加或覆盖请求头。
- `fetch?: typeof globalThis.fetch`：可注入测试 fetch 或受限网络 fetch。
- `name?: string`：只改变 provider 名称，不改变协议和路径。

请求头至少包含：

```text
Authorization: Bearer <apiKey>
Content-Type: application/json
```

Provider 会去掉 `baseURL` 最后一个 `/`，再追加：

```text
/chat/completions
/responses
```

因此保存 `https://relay.example.com/v1` 时，最终请求分别是：

```text
https://relay.example.com/v1/chat/completions
https://relay.example.com/v1/responses
```

### Anthropic Messages

```ts
import { createAnthropic } from '@ai-sdk/anthropic'

const provider = createAnthropic({
  baseURL,
  apiKey,
})

const model = provider.messages(modelId)
```

`createAnthropic` 的相关选项：

- `baseURL?: string`：默认 `https://api.anthropic.com/v1`。
- `apiKey?: string`：通过 `x-api-key` 发送；没有显式传入时读取 `ANTHROPIC_API_KEY`。
- `authToken?: string`：改用 `Authorization: Bearer`；不能与显式 `apiKey` 同时传入。本项目只有一个 API key 字段，应只使用 `apiKey`。
- `headers?: Record<string, string>`、`fetch?: typeof globalThis.fetch`：用途与 OpenAI provider 相同。

请求头至少包含：

```text
x-api-key: <apiKey>
anthropic-version: 2023-06-01
Content-Type: application/json
```

Anthropic provider 会去掉末尾 `/` 并追加 `/messages`。只有 `baseURL` 精确等于官方根地址 `https://api.anthropic.com` 时，provider 才自动改成 `https://api.anthropic.com/v1`。自定义中转不会自动补 `/v1`：

```text
baseURL=http://127.0.0.1:43210/v1 -> /v1/messages
baseURL=http://127.0.0.1:43210    -> /messages
```

设置页需要说明 Base URL 是路径前缀；中转服务暴露 `/v1/messages` 时，用户必须把 `/v1` 填进 Base URL。

## `generateText` 调用和结果

三种协议可以共用一次非流式调用：

```ts
import { generateText } from 'ai'

const result = await generateText({
  model,
  prompt,
  maxOutputTokens: 256,
  maxRetries: 0,
  timeout: { totalMs: 30_000 },
  telemetry: { isEnabled: false },
})
```

与摘要直接相关的返回字段：

- `result.text` 是最后一步所有 text part 的拼接；没有 text part 时是空字符串，不会仅因空文本自动抛错。
- `result.finishReason` 是跨 provider 统一后的终止原因，取值为 `stop | length | content-filter | tool-calls | error | other`。
- `result.rawFinishReason` 位于 `result.finalStep.rawFinishReason`。
- `result.usage.inputTokens`、`outputTokens`、`totalTokens` 是标准化 token 数，字段可能为 `undefined`。
- `result.finalStep` 包含最后一步结果；`result.steps` 包含所有步骤。
- request body、request messages 和 response body 默认不放进 step result。不要开启 `include.requestBody` 或 `include.responseBody`。

摘要和连接测试都应在写库或标记测试成功前检查：

```ts
const text = result.text.trim()

if (text.length === 0) {
  throw new Error('模型返回了空文本')
}

if (result.finishReason !== 'stop') {
  throw new Error('模型未正常完成文本生成')
}
```

三种协议的截断映射如下：

| 上游协议 | 上游终止值 | `result.finishReason` |
| --- | --- | --- |
| Chat Completions | `length` | `length` |
| Responses | `incomplete_details.reason = "max_output_tokens"` | `length` |
| Anthropic Messages | `max_tokens` 或 `model_context_window_exceeded` | `length` |

Anthropic 的 `end_turn`、`stop_sequence`、`pause_turn` 映射为 `stop`；`refusal` 映射为 `content-filter`。Responses 的 `incomplete_details` 为空且没有函数调用时映射为 `stop`。摘要场景没有工具调用，最简单可靠的成功条件就是非空文本且 `finishReason === 'stop'`。

## 三种协议的请求与最小成功响应

测试服务器应读取真实 HTTP 请求，不要只测试协议枚举或 mock `generateText`。

### Chat Completions

请求特征：

```json
{
  "model": "test-model",
  "messages": [{ "role": "user", "content": "只回复：摘要测试成功" }],
  "max_tokens": 64
}
```

对于被 SDK 识别为 reasoning model 的模型，`max_tokens` 可能改成 `max_completion_tokens`。测试使用不在内置列表中的 `test-model`，可稳定断言 `max_tokens`。

最小成功响应：

```json
{
  "id": "chatcmpl-test",
  "created": 1788912000,
  "model": "test-model",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "摘要测试成功"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 3,
    "completion_tokens": 4,
    "total_tokens": 7
  }
}
```

### OpenAI Responses

请求特征：

```json
{
  "model": "test-model",
  "input": [
    {
      "role": "user",
      "content": [{ "type": "input_text", "text": "只回复：摘要测试成功" }]
    }
  ],
  "max_output_tokens": 64
}
```

最小成功响应：

```json
{
  "id": "resp-test",
  "object": "response",
  "created_at": 1788912000,
  "status": "completed",
  "model": "test-model",
  "output": [
    {
      "type": "message",
      "id": "msg-test",
      "status": "completed",
      "role": "assistant",
      "content": [
        {
          "type": "output_text",
          "text": "摘要测试成功",
          "annotations": []
        }
      ]
    }
  ],
  "incomplete_details": null,
  "usage": {
    "input_tokens": 3,
    "output_tokens": 4,
    "total_tokens": 7
  }
}
```

### Anthropic Messages

请求特征：

```json
{
  "model": "test-model",
  "max_tokens": 64,
  "messages": [
    {
      "role": "user",
      "content": [{ "type": "text", "text": "只回复：摘要测试成功" }]
    }
  ]
}
```

最小成功响应：

```json
{
  "type": "message",
  "id": "msg-test",
  "model": "test-model",
  "role": "assistant",
  "content": [{ "type": "text", "text": "摘要测试成功" }],
  "stop_reason": "end_turn",
  "stop_sequence": null,
  "usage": {
    "input_tokens": 3,
    "output_tokens": 4
  }
}
```

## 可执行的本地 HTTP 集成验证方案

项目已有测试使用 `node:test`，不需要为这项验证引入另一套测试框架。实现阶段可新增一个 TypeScript 测试文件，并用 Node.js 22 以上直接执行：

```bash
node --test <ai-provider-integration-test.ts>
```

测试结构：

1. 用 `node:http` 的 `createServer` 监听 `127.0.0.1` 和随机端口 `0`。
2. Base URL 统一传 `http://127.0.0.1:<port>/v1/`，末尾 `/` 用来验证 provider 的路径拼接。
3. 逐个 case 创建 model，并调用同一个 `generateText`：

```ts
const model = createSummaryModel({
  protocol,
  baseURL,
  modelId: 'test-model',
  apiKey: 'test-secret',
})

const result = await generateText({
  model,
  prompt: '只回复：摘要测试成功',
  maxOutputTokens: 64,
  maxRetries: 0,
  timeout: { totalMs: 1_000 },
  telemetry: { isEnabled: false },
})
```

每个 case 在服务端断言：

| 协议 | 方法与路径 | 认证头 | body 关键字段 |
| --- | --- | --- | --- |
| Chat Completions | `POST /v1/chat/completions` | `authorization === "Bearer test-secret"` | `model`、`messages`、`max_tokens === 64` |
| Responses | `POST /v1/responses` | `authorization === "Bearer test-secret"` | `model`、`input`、`max_output_tokens === 64` |
| Anthropic Messages | `POST /v1/messages` | `x-api-key === "test-secret"` 且 `anthropic-version === "2023-06-01"` | `model`、`messages`、`max_tokens === 64` |

服务端返回上一节对应的 JSON 后，客户端统一断言：

```ts
assert.equal(result.text, '摘要测试成功')
assert.equal(result.finishReason, 'stop')
assert.equal(result.usage.inputTokens, 3)
assert.equal(result.usage.outputTokens, 4)
assert.equal(requestCount, 1)
```

需要覆盖的错误 case：

- 空文本：返回正常 stop reason，但文本是空白；SDK 成功返回，业务检查必须拒绝。
- 截断：三种协议分别返回 `length`、`max_output_tokens`、`max_tokens`；业务检查必须拒绝。
- 认证失败：返回 `401` 和协议合法的错误 JSON；断言规范化结果是认证错误，公开消息不含上游 body、prompt 或 key。
- 上游失败：返回 `500`；`maxRetries: 0` 时断言只收到一次请求。
- 非法成功响应：返回 `200` 但缺少协议必要字段；SDK 抛出 `APICallError`，公开消息不能包含原始响应。
- 超时：服务端延迟超过 `timeout`；断言错误 `name === "TimeoutError"`，并确认请求被中止。
- 主动取消：传入单独的 `AbortController.signal`，先主动 `abort()`；断言 `name === "AbortError"`，不能归类为超时。
- 路径：为三个 case 记录原始 `req.url`，保证没有双斜杠，也没有把 Chat Completions 错发到 `/responses` 或 `/completions`。

测试 teardown 必须在 `finally` 中关闭 HTTP server，避免失败断言遗留监听端口。

## 已执行的临时验证

研究阶段已在 `/tmp` 安装上述精确版本，并用 Node.js `v26.7.0` 启动本地 `node:http` 服务执行三个真实 `generateText` 调用。验证结果：

- 请求依次命中 `/v1/chat/completions`、`/v1/responses`、`/v1/messages`。
- 三个请求体与本文列出的结构一致。
- OpenAI 两种协议发送 `Authorization: Bearer test-secret`。
- Anthropic 发送 `x-api-key: test-secret` 和 `anthropic-version: 2023-06-01`。
- 三个结果均为 `text === '摘要测试成功'`、`finishReason === 'stop'`、`inputTokens === 3`、`outputTokens === 4`。
- 本次临时安装和服务都位于 `/tmp`，没有修改项目依赖或产品代码。

## 超时、重试与错误处理

`generateText` 的默认 `maxRetries` 是 2。一次可重试故障最多产生三次调用。连接测试和调用次数集成测试应显式使用 `maxRetries: 0`。摘要同步是否允许自动重试需要在实现设计中明确；不能依赖默认值。

`timeout` 可以是毫秒数字，也可以是 `{ totalMs, stepMs }`。非流式摘要只需要总超时：

```ts
timeout: { totalMs: configuredTimeoutMs }
```

AI SDK 用 `AbortSignal.timeout` 生成总超时信号，并与调用方传入的 `abortSignal` 合并。最先触发的 signal 决定错误原因：

- SDK 超时通常抛出名称为 `TimeoutError` 的 `DOMException`。
- 调用方主动取消通常抛出名称为 `AbortError` 的错误。
- abort 和 timeout 不会重试。

普通 HTTP、网络和响应解析错误通常是 `APICallError`，可用 `APICallError.isInstance(error)` 判断。它包含：

- `statusCode`
- `isRetryable`
- `url`
- `requestBodyValues`
- `responseBody`
- `data`
- `cause`

默认可重试状态是 `408`、`409`、`429` 和 `>=500`；网络连接错误没有 status code，但标为可重试。开启重试并耗尽次数后，外层可能变成 `RetryError`，需要从 `lastError` 或 `errors` 中找最终 `APICallError`。

这些错误对象包含 prompt、完整上游响应、请求 URL 和底层 cause，不能原样进入日志、数据库或客户端。业务层只提取安全分类：

```text
401/403                         -> AUTH_FAILED
TimeoutError                    -> UPSTREAM_TIMEOUT
AbortError                      -> REQUEST_ABORTED
APICallError，无 statusCode      -> UPSTREAM_UNAVAILABLE
APICallError，其他 statusCode    -> UPSTREAM_ERROR
无效 2xx JSON / schema 不匹配    -> UPSTREAM_INVALID_RESPONSE
```

Provider 的错误 parser 会把上游 JSON 中的 `error.message` 用作 SDK error message，因此连 `error.message` 也不能直接返回客户端。

## 自定义 Base URL 的安全边界

AI SDK 当前的 `validateBaseURL` 只拒绝空字符串；它不负责解析 URL，也不检查协议、用户名、密码、query、fragment、私网地址或 metadata 地址。`postJsonToApi` 直接调用全局或注入的 `fetch`，默认 fetch 还会跟随重定向。

因此项目自己的配置校验仍是必要条件：

- 只接受 `http:` 或 `https:`。
- 拒绝 URL 用户名、密码、query 和 fragment。
- 生产环境拒绝 loopback、私网、link-local、保留地址和云 metadata 地址。
- 调用前再次使用已验证的持久化配置，不能信任客户端回传的 Base URL。
- 生产调用应拒绝跨目标重定向；只检查初始 URL 不能阻止重定向到内网。
- 如部署网络允许任意出站连接，还要防止域名在校验后解析到内网。优先使用受限出站代理或能在连接时校验解析地址的 fetch 实现。

Provider 的 `fetch` 选项可以承载受限 fetch，但不应为三种协议各写一套网络安全逻辑。三种 provider 应复用同一个受限 fetch 和同一个超时、错误分类函数。

凭据规则沿用前置任务要求：只从服务端解密后的配置传入 provider；保存凭据存在但解密失败时直接失败，不能静默改读 `OPENAI_API_KEY` 或 `ANTHROPIC_API_KEY`。为避免这种环境变量回退，调用 provider 前必须保证解密出的 `apiKey` 是非空字符串。

连接测试和摘要生成建议显式设置 `telemetry: { isEnabled: false }`。AI SDK 7 在注册 telemetry integration 后默认发出事件，并默认记录输入和输出；摘要正文和生成结果不应进入意外启用的 telemetry integration。

## 实现建议

三协议只需要一个 model factory 和一个 `generateText` 调用，不需要实现自定义 Provider：

```ts
function createSummaryModel(config: {
  protocol: 'openai-completions' | 'openai-responses' | 'anthropic-messages'
  baseURL: string
  modelId: string
  apiKey: string
  fetch?: typeof globalThis.fetch
}) {
  if (config.protocol === 'anthropic-messages') {
    return createAnthropic(config).messages(config.modelId)
  }

  const openai = createOpenAI(config)
  return config.protocol === 'openai-completions'
    ? openai.chat(config.modelId)
    : openai.responses(config.modelId)
}
```

实际实现给 `createOpenAI` / `createAnthropic` 传参时应只取它们认识的字段，不要直接展开数据库行。共享流程负责 timeout、`maxRetries`、非空文本、finish reason 和安全错误分类。

## 来源

官方文档：

- [OpenAI Provider](https://ai-sdk.dev/providers/ai-sdk-providers/openai)
- [Anthropic Provider](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic)
- [`generateText`](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text)
- [AI SDK Core Settings](https://ai-sdk.dev/docs/ai-sdk-core/settings)
- [AI SDK Core Error Handling](https://ai-sdk.dev/docs/ai-sdk-core/error-handling)
- [`AI_APICallError`](https://ai-sdk.dev/docs/reference/ai-sdk-errors/ai-api-call-error)
- [`AI_RetryError`](https://ai-sdk.dev/docs/reference/ai-sdk-errors/ai-retry-error)

已发布 npm 包源码核对位置：

- `@ai-sdk/openai@4.0.62`: `src/openai-provider.ts`、`src/chat/openai-chat-language-model.ts`、`src/chat/openai-chat-api.ts`、`src/responses/openai-responses-language-model.ts`、`src/responses/openai-responses-api.ts`
- `@ai-sdk/anthropic@4.0.50`: `src/anthropic-provider.ts`、`src/anthropic-language-model.ts`、`src/anthropic-api.ts`
- `ai@7.0.94`: `src/generate-text/generate-text.ts`、`src/generate-text/generate-text-result.ts`、`src/prompt/request-options.ts`
- `@ai-sdk/provider@4.0.11`: `src/errors/api-call-error.ts`
- `@ai-sdk/provider-utils@5.0.37`: `src/post-to-api.ts`、`src/response-handler.ts`、`src/handle-fetch-error.ts`、`src/is-abort-error.ts`、`src/validate-base-url.ts`

包版本来自 `npm view`，源码来自对应版本的 `npm pack` tarball。

项目安全边界参考：

- `/Users/wuwanzhu/Code/xdd/starter/.trellis/spec/api/backend/ai-integration-guidelines.md`
