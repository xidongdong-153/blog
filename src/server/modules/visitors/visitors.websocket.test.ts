/* eslint-disable test/no-import-node-test */

import type { AddressInfo } from 'node:net'
import type { VisitorErrorMessage, VisitorSnapshotMessage } from '@/lib/visitor'
import assert from 'node:assert/strict'
import http from 'node:http'
import test from 'node:test'
import { WebSocket } from 'ws'
import { VisitorsService } from './visitors.service'
import { VisitorWebSocketHub } from './visitors.websocket'

const VALID_VISITOR_A = '00000000-0000-4000-8000-000000000001'
const VALID_VISITOR_B = '00000000-0000-4000-8000-000000000002'
const REAL_POST_SLUG = '20260615-hello-blog'

function waitForMessage<T>(ws: WebSocket): Promise<T> {
  return new Promise((resolve, reject) => {
    let onMessage: (data: Buffer | string) => void
    let onError: (err: Error) => void
    const cleanup = () => {
      ws.off('message', onMessage)
      ws.off('error', onError)
    }
    onMessage = (data: Buffer | string) => {
      cleanup()
      try {
        resolve(JSON.parse(data.toString()) as T)
      } catch (err) {
        reject(err)
      }
    }
    onError = (err: Error) => {
      cleanup()
      reject(err)
    }
    ws.on('message', onMessage)
    ws.on('error', onError)
  })
}

function waitForSnapshot(
  ws: WebSocket,
  predicate: (snap: VisitorSnapshotMessage) => boolean,
): Promise<VisitorSnapshotMessage> {
  return new Promise((resolve, reject) => {
    let onMessage: (data: Buffer | string) => void
    let onError: (err: Error) => void
    const cleanup = () => {
      ws.off('message', onMessage)
      ws.off('error', onError)
    }
    onMessage = (data: Buffer | string) => {
      try {
        const msg = JSON.parse(data.toString()) as VisitorSnapshotMessage
        if (msg.type === 'snapshot' && predicate(msg)) {
          cleanup()
          resolve(msg)
        }
      } catch (err) {
        cleanup()
        reject(err)
      }
    }
    onError = (err: Error) => {
      cleanup()
      reject(err)
    }
    ws.on('message', onMessage)
    ws.on('error', onError)
  })
}

test('VisitorWebSocketHub 实时连接与协议测试', async (t) => {
  let server: http.Server
  let hub: VisitorWebSocketHub
  let service: VisitorsService
  let port: number
  let wsBaseUrl: string

  t.beforeEach(async () => {
    service = new VisitorsService()
    service.reset()
    hub = new VisitorWebSocketHub({
      visitorsService: service,
      disableTimers: true,
    })

    server = http.createServer((_req, res) => {
      res.writeHead(200)
      res.end('ok')
    })

    server.on('upgrade', (req, socket, head) => {
      hub.handleUpgrade(req, socket, head)
    })

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve())
    })

    port = (server.address() as AddressInfo).port
    wsBaseUrl = `ws://127.0.0.1:${port}/api/visitors/socket`
  })

  t.afterEach(async () => {
    await hub.close()
    server.closeAllConnections?.()
    await new Promise<void>((resolve) => {
      server.close(() => resolve())
    })
  })

  await t.test('1. 缺少有效 site_visitor_id Cookie 拒绝升级', async () => {
    const ws = new WebSocket(wsBaseUrl)
    ws.on('error', () => {})
    await new Promise<void>((resolve) => {
      ws.on('unexpected-response', (req, res) => {
        assert.equal(res.statusCode, 401)
        res.resume()
        req.destroy()
        ws.terminate()
        resolve()
      })
      ws.on('open', () => {
        ws.terminate()
        assert.fail('不应成功建立握手')
      })
    })
  })

  await t.test('2. 伪造或不匹配的 Origin 拒绝升级', async () => {
    const ws = new WebSocket(wsBaseUrl, {
      headers: {
        Cookie: `site_visitor_id=${VALID_VISITOR_A}`,
        Origin: 'http://malicious-site.com',
      },
    })
    ws.on('error', () => {})
    await new Promise<void>((resolve) => {
      ws.on('unexpected-response', (req, res) => {
        assert.equal(res.statusCode, 403)
        res.resume()
        req.destroy()
        ws.terminate()
        resolve()
      })
      ws.on('open', () => {
        ws.terminate()
        assert.fail('不应成功建立握手')
      })
    })
  })

  await t.test('3. 正常建立连接并通过 sync 同步文章，接收广播快照', async () => {
    const ws = new WebSocket(wsBaseUrl, {
      headers: {
        Cookie: `site_visitor_id=${VALID_VISITOR_A}`,
        Origin: `http://127.0.0.1:${port}`,
      },
    })

    await new Promise<void>((resolve) => ws.on('open', () => resolve()))

    const snapshotPromise = waitForMessage<VisitorSnapshotMessage>(ws)
    ws.send(
      JSON.stringify({
        type: 'sync',
        sessionId: 'tab-client-1',
        articleSlug: REAL_POST_SLUG,
      }),
    )

    const snapshot = await snapshotPromise
    assert.equal(snapshot.type, 'snapshot')
    assert.equal(snapshot.status, 'ready')
    assert.equal(snapshot.onlineVisitorCount, 1)
    assert.equal(snapshot.articleViewerCounts[REAL_POST_SLUG], 1)

    ws.terminate()
  })

  await t.test('4. 同一访客两个不同 Tab 连接，全站人数去重为 1', async () => {
    const ws1 = new WebSocket(wsBaseUrl, {
      headers: {
        Cookie: `site_visitor_id=${VALID_VISITOR_A}`,
        Origin: `http://127.0.0.1:${port}`,
      },
    })
    const ws2 = new WebSocket(wsBaseUrl, {
      headers: {
        Cookie: `site_visitor_id=${VALID_VISITOR_A}`,
        Origin: `http://127.0.0.1:${port}`,
      },
    })

    await Promise.all([
      new Promise<void>((resolve) => ws1.on('open', () => resolve())),
      new Promise<void>((resolve) => ws2.on('open', () => resolve())),
    ])

    // Tab 1 同步首页
    const p1 = waitForSnapshot(ws1, (s) => s.onlineVisitorCount === 1)
    ws1.send(
      JSON.stringify({
        type: 'sync',
        sessionId: 'tab-client-1',
        articleSlug: null,
      }),
    )
    await p1

    // Tab 2 同步同一文章
    const p2OnWs1 = waitForSnapshot(
      ws1,
      (s) => s.onlineVisitorCount === 1 && s.articleViewerCounts[REAL_POST_SLUG] === 1,
    )
    const p2OnWs2 = waitForSnapshot(
      ws2,
      (s) => s.onlineVisitorCount === 1 && s.articleViewerCounts[REAL_POST_SLUG] === 1,
    )
    ws2.send(
      JSON.stringify({
        type: 'sync',
        sessionId: 'tab-client-2',
        articleSlug: REAL_POST_SLUG,
      }),
    )

    const [snap1, snap2] = await Promise.all([p2OnWs1, p2OnWs2])
    // 两个客户端均接收到去重后的全站人数 1，且文章人数为 1
    assert.equal(snap1.onlineVisitorCount, 1)
    assert.equal(snap2.onlineVisitorCount, 1)
    assert.equal(snap2.articleViewerCounts[REAL_POST_SLUG], 1)

    ws1.terminate()
    ws2.terminate()
  })

  await t.test('5. 独立访客加入同一文章，文章人数递增至 2', async () => {
    const ws1 = new WebSocket(wsBaseUrl, {
      headers: {
        Cookie: `site_visitor_id=${VALID_VISITOR_A}`,
        Origin: `http://127.0.0.1:${port}`,
      },
    })
    const ws2 = new WebSocket(wsBaseUrl, {
      headers: {
        Cookie: `site_visitor_id=${VALID_VISITOR_B}`,
        Origin: `http://127.0.0.1:${port}`,
      },
    })

    await Promise.all([
      new Promise<void>((resolve) => ws1.on('open', () => resolve())),
      new Promise<void>((resolve) => ws2.on('open', () => resolve())),
    ])

    const p1 = waitForMessage<VisitorSnapshotMessage>(ws1)
    ws1.send(
      JSON.stringify({
        type: 'sync',
        sessionId: 'tab-visitor-a',
        articleSlug: REAL_POST_SLUG,
      }),
    )
    await p1

    const p2 = waitForMessage<VisitorSnapshotMessage>(ws1)
    ws2.send(
      JSON.stringify({
        type: 'sync',
        sessionId: 'tab-visitor-b',
        articleSlug: REAL_POST_SLUG,
      }),
    )

    const updated = await p2
    assert.equal(updated.onlineVisitorCount, 2)
    assert.equal(updated.articleViewerCounts[REAL_POST_SLUG], 2)

    ws1.terminate()
    ws2.terminate()
  })

  await t.test('6. 发送非法 JSON 或未知文章返回安全错误码', async () => {
    const ws = new WebSocket(wsBaseUrl, {
      headers: {
        Cookie: `site_visitor_id=${VALID_VISITOR_A}`,
        Origin: `http://127.0.0.1:${port}`,
      },
    })

    await new Promise<void>((resolve) => ws.on('open', () => resolve()))

    // 发送无法解析的格式
    const errPromise1 = waitForMessage<VisitorErrorMessage>(ws)
    ws.send('not a valid json')
    const err1 = await errPromise1
    assert.equal(err1.type, 'error')
    assert.equal(err1.code, 'invalid_message')

    // 发送不存在的文章 slug
    const errPromise2 = waitForMessage<VisitorErrorMessage>(ws)
    ws.send(
      JSON.stringify({
        type: 'sync',
        sessionId: 'test-tab',
        articleSlug: 'completely-non-existent-article-slug',
      }),
    )
    const err2 = await errPromise2
    assert.equal(err2.type, 'error')
    assert.equal(err2.code, 'invalid_article')

    ws.terminate()
  })

  await t.test('7. 客户端 leave 与 close 触发在线人数回落', async () => {
    const ws1 = new WebSocket(wsBaseUrl, {
      headers: {
        Cookie: `site_visitor_id=${VALID_VISITOR_A}`,
        Origin: `http://127.0.0.1:${port}`,
      },
    })
    const ws2 = new WebSocket(wsBaseUrl, {
      headers: {
        Cookie: `site_visitor_id=${VALID_VISITOR_B}`,
        Origin: `http://127.0.0.1:${port}`,
      },
    })

    await Promise.all([
      new Promise<void>((resolve) => ws1.on('open', () => resolve())),
      new Promise<void>((resolve) => ws2.on('open', () => resolve())),
    ])

    const p1 = waitForSnapshot(ws1, (s) => s.onlineVisitorCount === 1)
    ws1.send(
      JSON.stringify({
        type: 'sync',
        sessionId: 'session-ws1',
        articleSlug: REAL_POST_SLUG,
      }),
    )
    await p1

    const p2 = waitForSnapshot(ws2, (s) => s.onlineVisitorCount === 2)
    ws2.send(
      JSON.stringify({
        type: 'sync',
        sessionId: 'session-ws2',
        articleSlug: REAL_POST_SLUG,
      }),
    )
    await p2

    // ws2 发送 leave 消息
    const leavePromise = waitForSnapshot(ws1, (s) => s.onlineVisitorCount === 1)
    ws2.send(
      JSON.stringify({
        type: 'leave',
        sessionId: 'session-ws2',
      }),
    )
    const snapAfterLeave = await leavePromise
    assert.equal(snapAfterLeave.onlineVisitorCount, 1)
    assert.equal(snapAfterLeave.articleViewerCounts[REAL_POST_SLUG], 1)

    // ws1 直接断开连接 close
    const closePromise = new Promise<void>((resolve) => {
      // 监控 service 中会话被清空
      const timer = setInterval(async () => {
        const snap = await service.getPublicSnapshot()
        if (snap.onlineVisitorCount === 0) {
          clearInterval(timer)
          resolve()
        }
      }, 20)
    })
    ws1.terminate()
    await closePromise
    ws2.terminate()
  })

  await t.test('8. 带双引号 Cookie 与代理多级 x-forwarded-host 正常升级与通信', async () => {
    const ws = new WebSocket(wsBaseUrl, {
      headers: {
        Cookie: `site_visitor_id="${VALID_VISITOR_A}"`,
        Origin: `http://127.0.0.1:${port}`,
        'x-forwarded-host': `127.0.0.1:${port}, proxy.example.com`,
      },
    })

    await new Promise<void>((resolve) => ws.on('open', () => resolve()))

    const p = waitForMessage<VisitorSnapshotMessage>(ws)
    // 故意省略 articleSlug 字段
    ws.send(
      JSON.stringify({
        type: 'sync',
        sessionId: 'session-forwarded-test',
      }),
    )

    const snap = await p
    assert.equal(snap.type, 'snapshot')
    assert.equal(snap.onlineVisitorCount, 1)
    assert.equal(Object.keys(snap.articleViewerCounts).length, 0)

    ws.terminate()
  })
})
