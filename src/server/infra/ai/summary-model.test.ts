/* eslint-disable test/no-import-node-test */
import type { AddressInfo } from 'node:net'
import assert from 'node:assert/strict'
import http from 'node:http'
import test from 'node:test'
import {
  createRestrictedFetch,
  SummaryModelError,
  testSummaryModelConnection,
  validateAiBaseUrl,
  validateAiBaseUrlAsync,
} from './summary-model'

test('Base URL 规则与安全校验', () => {
  // 合法 URL
  assert.equal(validateAiBaseUrl('https://api.openai.com/v1'), 'https://api.openai.com/v1')
  assert.equal(validateAiBaseUrl('http://127.0.0.1:8080/v1', { isProduction: false }), 'http://127.0.0.1:8080/v1')

  // 非法协议
  assert.throws(
    () => validateAiBaseUrl('ftp://example.com/v1'),
    (err) => err instanceof SummaryModelError && err.code === 'INVALID_BASE_URL',
  )

  // 包含账号密码
  assert.throws(
    () => validateAiBaseUrl('https://user:pass@example.com/v1'),
    (err) => err instanceof SummaryModelError && err.code === 'INVALID_BASE_URL',
  )

  // 包含 query
  assert.throws(
    () => validateAiBaseUrl('https://example.com/v1?token=123'),
    (err) => err instanceof SummaryModelError && err.code === 'INVALID_BASE_URL',
  )

  // 包含 hash
  assert.throws(
    () => validateAiBaseUrl('https://example.com/v1#section'),
    (err) => err instanceof SummaryModelError && err.code === 'INVALID_BASE_URL',
  )

  // 生产环境拒绝私网与保留 IP / 域名
  const prodRejects = [
    'http://localhost:3000',
    'http://127.0.0.1:8000',
    'http://10.0.0.1:8080',
    'http://172.16.0.1/v1',
    'http://192.168.1.1/v1',
    'http://169.254.169.254/latest/meta-data',
    'http://metadata.google.internal/computeMetadata/v1',
  ]

  for (const url of prodRejects) {
    assert.throws(
      () => validateAiBaseUrl(url, { isProduction: true }),
      (err) => err instanceof SummaryModelError && err.code === 'INVALID_BASE_URL',
      `应该在生产环境拒绝: ${url}`,
    )
  }

  // 生产环境拒绝 IPv4-mapped IPv6 地址
  const prodMappedIpv6Rejects = [
    'http://[::ffff:127.0.0.1]:8080/v1',
    'http://[::ffff:10.0.0.1]/v1',
    'http://[::ffff:172.16.0.1]/v1',
    'http://[::ffff:192.168.1.1]/v1',
    'http://[::ffff:169.254.169.254]/v1',
    'http://[::ffff:7f00:0001]/v1',
  ]

  for (const url of prodMappedIpv6Rejects) {
    assert.throws(
      () => validateAiBaseUrl(url, { isProduction: true }),
      (err) => err instanceof SummaryModelError && err.code === 'INVALID_BASE_URL',
      `应该在生产环境拒绝 IPv4-mapped IPv6: ${url}`,
    )
    // 非生产环境允许本地测试
    assert.equal(validateAiBaseUrl(url, { isProduction: false }), url)
  }
})

test('生产环境 DNS 解析与安全拦截', async () => {
  // 无法解析的域名在生产环境下返回安全的 UPSTREAM_UNAVAILABLE
  await assert.rejects(
    () => validateAiBaseUrlAsync('https://this-domain-does-not-exist-xyz12345.invalid/v1', { isProduction: true }),
    (err) => {
      assert(err instanceof SummaryModelError)
      assert.equal(err.code, 'UPSTREAM_UNAVAILABLE')
      assert.equal(err.message, '无法解析上游服务域名，请检查 Base URL')
      return true
    },
  )

  // 非生产环境不强制要求外网域名可解析
  assert.equal(
    validateAiBaseUrl('http://custom-local-proxy:8080/v1', { isProduction: false }),
    'http://custom-local-proxy:8080/v1',
  )
})

test('三协议真实本地 HTTP 集成测试与错误边界', async (t) => {
  interface RecordedBody {
    model?: string
    messages?: Array<{ role?: string; content?: string | Array<{ type?: string; text?: string }> }>
    input?: Array<{ role?: string; content?: Array<{ type?: string; text?: string }> }>
    max_tokens?: number
    max_output_tokens?: number
  }

  interface RecordedRequest {
    method: string
    url: string
    headers: http.IncomingHttpHeaders
    bodyText: string
    bodyJson: RecordedBody | null
  }

  let recordedRequests: RecordedRequest[] = []
  let handlerMode:
    | 'normal'
    | 'empty_text'
    | 'truncated'
    | 'auth_error'
    | 'server_error'
    | 'invalid_json'
    | 'delay_timeout'
    | 'large_content_length'
    | 'large_body_stream' = 'normal'

  const server = http.createServer((req, res) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      let bodyJson = null
      try {
        bodyJson = JSON.parse(body)
      } catch {
        // ignore
      }

      recordedRequests.push({
        method: req.method || '',
        url: req.url || '',
        headers: req.headers,
        bodyText: body,
        bodyJson,
      })

      if (handlerMode === 'delay_timeout') {
        // 故意延迟 2 秒超过测试超时
        setTimeout(() => {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: true }))
        }, 1500)
        return
      }

      if (handlerMode === 'large_content_length') {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Content-Length': '2097152',
        })
        res.end(JSON.stringify({ choices: [{ message: { content: 'SECRET_UPSTREAM_BODY_CONTENT' } }] }))
        return
      }

      if (handlerMode === 'large_body_stream') {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Transfer-Encoding': 'chunked',
        })
        // 发送两块各 700 KiB 的数据，累计 1.4 MiB > 1 MiB
        const chunk = 'B'.repeat(700 * 1024)
        res.write(chunk)
        res.write(chunk)
        res.end()
        return
      }

      if (handlerMode === 'auth_error') {
        res.writeHead(401, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: { message: 'Invalid API key or unauthorized' } }))
        return
      }

      if (handlerMode === 'server_error') {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: { message: 'Internal server failure' } }))
        return
      }

      if (handlerMode === 'invalid_json') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end('NOT_A_JSON_RESPONSE')
        return
      }

      // 正常或特定内容返回
      const url = req.url || ''

      if (url.startsWith('/v1/chat/completions')) {
        const textContent = handlerMode === 'empty_text' ? '   ' : '摘要测试成功'
        const finishReason = handlerMode === 'truncated' ? 'length' : 'stop'
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            id: 'chatcmpl-test',
            created: 1788912000,
            model: 'test-model',
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: textContent },
                finish_reason: finishReason,
              },
            ],
            usage: { prompt_tokens: 3, completion_tokens: 4, total_tokens: 7 },
          }),
        )
        return
      }

      if (url.startsWith('/v1/responses')) {
        const textContent = handlerMode === 'empty_text' ? '' : '摘要测试成功'
        const incompleteDetails = handlerMode === 'truncated' ? { reason: 'max_output_tokens' } : null
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            id: 'resp-test',
            object: 'response',
            created_at: 1788912000,
            status: 'completed',
            model: 'test-model',
            output: [
              {
                type: 'message',
                id: 'msg-test',
                status: 'completed',
                role: 'assistant',
                content: [{ type: 'output_text', text: textContent, annotations: [] }],
              },
            ],
            incomplete_details: incompleteDetails,
            usage: { input_tokens: 3, output_tokens: 4, total_tokens: 7 },
          }),
        )
        return
      }

      if (url.startsWith('/v1/messages')) {
        const textContent = handlerMode === 'empty_text' ? '' : '摘要测试成功'
        const stopReason = handlerMode === 'truncated' ? 'max_tokens' : 'end_turn'
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            type: 'message',
            id: 'msg-test',
            model: 'test-model',
            role: 'assistant',
            content: [{ type: 'text', text: textContent }],
            stop_reason: stopReason,
            stop_sequence: null,
            usage: { input_tokens: 3, output_tokens: 4 },
          }),
        )
        return
      }

      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'not found' }))
    })
  })

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve())
  })

  const port = (server.address() as AddressInfo).port
  const baseURL = `http://127.0.0.1:${port}/v1/`

  try {
    // 1. 测试 OpenAI Chat Completions
    await t.test('协议 1: openai-completions 正常请求与断言', async () => {
      recordedRequests = []
      handlerMode = 'normal'

      const result = await testSummaryModelConnection({
        protocol: 'openai-completions',
        baseURL,
        modelId: 'test-model',
        apiKey: 'test-openai-key',
      })

      assert.equal(result.text, '摘要测试成功')
      assert.equal(result.finishReason, 'stop')
      assert.equal(result.usage?.inputTokens, 3)
      assert.equal(result.usage?.outputTokens, 4)

      assert.equal(recordedRequests.length, 1)
      const req = recordedRequests[0]
      assert(req.bodyJson)
      assert.equal(req.method, 'POST')
      assert.equal(req.url, '/v1/chat/completions')
      assert.equal(req.headers.authorization, 'Bearer test-openai-key')
      assert.equal(req.bodyJson.model, 'test-model')
      assert.equal(req.bodyJson.messages?.[0]?.content, '只回复：摘要测试成功')
      assert.equal(req.bodyJson.max_tokens, 64)
    })

    // 2. 测试 OpenAI Responses
    await t.test('协议 2: openai-responses 正常请求与断言', async () => {
      recordedRequests = []
      handlerMode = 'normal'

      const result = await testSummaryModelConnection({
        protocol: 'openai-responses',
        baseURL,
        modelId: 'test-model',
        apiKey: 'test-openai-key',
      })

      assert.equal(result.text, '摘要测试成功')
      assert.equal(result.finishReason, 'stop')
      assert.equal(result.usage?.inputTokens, 3)
      assert.equal(result.usage?.outputTokens, 4)

      assert.equal(recordedRequests.length, 1)
      const req = recordedRequests[0]
      assert(req.bodyJson)
      assert.equal(req.method, 'POST')
      assert.equal(req.url, '/v1/responses')
      assert.equal(req.headers.authorization, 'Bearer test-openai-key')
      assert.equal(req.bodyJson.model, 'test-model')
      assert.equal(req.bodyJson.input?.[0]?.content?.[0]?.text, '只回复：摘要测试成功')
      assert.equal(req.bodyJson.max_output_tokens, 64)
    })

    // 3. 测试 Anthropic Messages
    await t.test('协议 3: anthropic-messages 正常请求与断言', async () => {
      recordedRequests = []
      handlerMode = 'normal'

      const result = await testSummaryModelConnection({
        protocol: 'anthropic-messages',
        baseURL,
        modelId: 'test-model',
        apiKey: 'test-anthropic-key',
      })

      assert.equal(result.text, '摘要测试成功')
      assert.equal(result.finishReason, 'stop')
      assert.equal(result.usage?.inputTokens, 3)
      assert.equal(result.usage?.outputTokens, 4)

      assert.equal(recordedRequests.length, 1)
      const req = recordedRequests[0]
      assert(req.bodyJson)
      assert.equal(req.method, 'POST')
      assert.equal(req.url, '/v1/messages')
      assert.equal(req.headers['x-api-key'], 'test-anthropic-key')
      assert.equal(req.headers['anthropic-version'], '2023-06-01')
      assert.equal(req.bodyJson.model, 'test-model')
      const msgContent = req.bodyJson.messages?.[0]?.content
      const actualText = Array.isArray(msgContent) ? msgContent[0]?.text : msgContent
      assert.equal(actualText, '只回复：摘要测试成功')
      assert.equal(req.bodyJson.max_tokens, 64)
    })

    // 4. 空文本返回
    await t.test('异常: 空文本返回被拒绝', async () => {
      recordedRequests = []
      handlerMode = 'empty_text'

      await assert.rejects(
        () =>
          testSummaryModelConnection({
            protocol: 'openai-completions',
            baseURL,
            modelId: 'test-model',
            apiKey: 'test-key',
          }),
        (err) => err instanceof SummaryModelError && err.code === 'UPSTREAM_EMPTY_RESPONSE',
      )
    })

    // 5. 截断截流
    await t.test('异常: 文本生成截断被拒绝', async () => {
      recordedRequests = []
      handlerMode = 'truncated'

      await assert.rejects(
        () =>
          testSummaryModelConnection({
            protocol: 'openai-completions',
            baseURL,
            modelId: 'test-model',
            apiKey: 'test-key',
          }),
        (err) => err instanceof SummaryModelError && err.code === 'UPSTREAM_TRUNCATED',
      )
    })

    // 6. 认证失败 401
    await t.test('异常: 上游 401 认证失败分类', async () => {
      recordedRequests = []
      handlerMode = 'auth_error'

      await assert.rejects(
        () =>
          testSummaryModelConnection({
            protocol: 'anthropic-messages',
            baseURL,
            modelId: 'test-model',
            apiKey: 'invalid-key',
          }),
        (err) => {
          assert(err instanceof SummaryModelError)
          assert.equal(err.code, 'AUTH_FAILED')
          // 确保错误消息不包含 key、原始 body
          assert.equal(err.message.includes('invalid-key'), false)
          assert.equal(err.message.includes('Invalid API key'), false)
          return true
        },
      )
    })

    // 7. 上游 500 且 maxRetries: 0 只发起一次请求
    await t.test('异常: 上游 500 且无自动重试', async () => {
      recordedRequests = []
      handlerMode = 'server_error'

      await assert.rejects(
        () =>
          testSummaryModelConnection({
            protocol: 'openai-completions',
            baseURL,
            modelId: 'test-model',
            apiKey: 'test-key',
          }),
        (err) => err instanceof SummaryModelError && err.code === 'UPSTREAM_ERROR',
      )

      assert.equal(recordedRequests.length, 1)
    })

    // 8. 非法 JSON 响应
    await t.test('异常: 上游返回非法 JSON 格式', async () => {
      recordedRequests = []
      handlerMode = 'invalid_json'

      await assert.rejects(
        () =>
          testSummaryModelConnection({
            protocol: 'openai-completions',
            baseURL,
            modelId: 'test-model',
            apiKey: 'test-key',
          }),
        (err) =>
          err instanceof SummaryModelError &&
          (err.code === 'UPSTREAM_INVALID_RESPONSE' || err.code === 'UPSTREAM_ERROR'),
      )
    })

    // 9. 超时错误
    await t.test('异常: 请求超时识别为 UPSTREAM_TIMEOUT', async () => {
      recordedRequests = []
      handlerMode = 'delay_timeout'

      await assert.rejects(
        () =>
          testSummaryModelConnection(
            {
              protocol: 'openai-completions',
              baseURL,
              modelId: 'test-model',
              apiKey: 'test-key',
            },
            { timeoutMs: 200 },
          ),
        (err) => err instanceof SummaryModelError && err.code === 'UPSTREAM_TIMEOUT',
      )
    })

    // 10. 主动取消
    await t.test('异常: 主动取消识别为 REQUEST_ABORTED', async () => {
      recordedRequests = []
      handlerMode = 'delay_timeout'
      const ac = new AbortController()

      const promise = testSummaryModelConnection(
        {
          protocol: 'openai-completions',
          baseURL,
          modelId: 'test-model',
          apiKey: 'test-key',
        },
        { signal: ac.signal, timeoutMs: 10_000 },
      )

      setTimeout(() => ac.abort(), 50)

      await assert.rejects(promise, (err) => err instanceof SummaryModelError && err.code === 'REQUEST_ABORTED')
    })

    // 11. Content-Length 超过 1 MiB
    await t.test('安全: Content-Length 超出 1 MiB 上限被拒绝且不泄露正文与凭据', async () => {
      recordedRequests = []
      handlerMode = 'large_content_length'

      await assert.rejects(
        () =>
          testSummaryModelConnection({
            protocol: 'openai-completions',
            baseURL,
            modelId: 'test-model',
            apiKey: 'sensitive-api-key-999',
          }),
        (err) => {
          assert(err instanceof SummaryModelError)
          assert.equal(err.code, 'UPSTREAM_RESPONSE_TOO_LARGE')
          assert.equal(err.statusCode, 502)
          assert.equal(err.message, '上游模型服务响应内容超出安全大小限制 (1 MiB)')
          assert.equal(err.message.includes('sensitive-api-key-999'), false)
          assert.equal(err.message.includes('SECRET_UPSTREAM_BODY_CONTENT'), false)
          return true
        },
      )
    })

    // 12. 流式读取超过 1 MiB
    await t.test('安全: 无 Content-Length 流式传输超出 1 MiB 被中断且不泄露正文与凭据', async () => {
      recordedRequests = []
      handlerMode = 'large_body_stream'

      await assert.rejects(
        () =>
          testSummaryModelConnection({
            protocol: 'openai-completions',
            baseURL,
            modelId: 'test-model',
            apiKey: 'sensitive-api-key-999',
          }),
        (err) => {
          assert(err instanceof SummaryModelError)
          assert.equal(err.code, 'UPSTREAM_RESPONSE_TOO_LARGE')
          assert.equal(err.statusCode, 502)
          assert.equal(err.message, '上游模型服务响应内容超出安全大小限制 (1 MiB)')
          assert.equal(err.message.includes('sensitive-api-key-999'), false)
          return true
        },
      )
    })

    // 13. createRestrictedFetch timeoutMs 生效
    await t.test('受限 fetch: timeoutMs 生效并在超时时正确归类', async () => {
      recordedRequests = []
      handlerMode = 'delay_timeout'
      const restrictedFetch = createRestrictedFetch({ timeoutMs: 150 })

      await assert.rejects(
        () =>
          restrictedFetch(`${baseURL}chat/completions`, {
            method: 'POST',
            body: JSON.stringify({ model: 'test' }),
          }),
        (err) => {
          assert(err instanceof SummaryModelError)
          assert.equal(err.code, 'UPSTREAM_TIMEOUT')
          return true
        },
      )
    })
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
})
