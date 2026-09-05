import { timingSafeEqual } from 'node:crypto'
import { parsePresenceReport } from '@/lib/presence'
import { writePresenceState } from '@/lib/presence-store'

export const dynamic = 'force-dynamic'

const MAX_REPORT_BYTES = 2048

function hasValidToken(request: Request): boolean {
  const expected = process.env.PRESENCE_TOKEN?.trim()
  const authorization = request.headers.get('authorization')
  if (!expected || !authorization?.startsWith('Bearer ')) return false
  const received = authorization.slice('Bearer '.length).trim()
  const expectedBuffer = Buffer.from(expected)
  const receivedBuffer = Buffer.from(received)
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer)
}

async function readRequestBody(request: Request): Promise<{ text: string; tooLarge: boolean }> {
  if (!request.body) return { text: '', tooLarge: false }

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let byteLength = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      byteLength += value.byteLength
      if (byteLength > MAX_REPORT_BYTES) {
        await reader.cancel()
        return { text: '', tooLarge: true }
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  const body = new Uint8Array(byteLength)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return { text: new TextDecoder().decode(body), tooLarge: false }
}

/**
 * 接收本地采集器的固定活动快照。
 * 只有持有服务端密钥的采集器可以写入，公开页面只读取 GET 接口。
 */
export async function POST(request: Request) {
  if (!hasValidToken(request)) {
    return Response.json({ error: '活动上报未授权' }, { status: 401 })
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (Number.isFinite(contentLength) && contentLength > MAX_REPORT_BYTES) {
    return Response.json({ error: '活动上报数据过大' }, { status: 413 })
  }

  let body: unknown
  try {
    const result = await readRequestBody(request)
    if (result.tooLarge) return Response.json({ error: '活动上报数据过大' }, { status: 413 })
    body = JSON.parse(result.text) as unknown
  } catch {
    return Response.json({ error: '活动上报不是有效 JSON' }, { status: 400 })
  }

  const report = parsePresenceReport(body)
  if (!report) {
    return Response.json({ error: '活动上报字段无效' }, { status: 400 })
  }

  try {
    await writePresenceState(report)
  } catch {
    return Response.json({ error: '活动状态暂时无法保存' }, { status: 500 })
  }

  const response = Response.json({ ok: true })
  response.headers.set('Cache-Control', 'no-store, max-age=0')
  return response
}
