import { createHash, timingSafeEqual } from 'node:crypto'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { parsePresenceUpload } from '@/lib/presence'
import { createFailureResponse } from '@/server/shared/response'
import { getPublicPresenceData } from './presence.service'
import { savePresenceSnapshot } from './presence.snapshot'

export const presenceRoute = new Hono()
  .get('/', async (c) => {
    const presence = await getPublicPresenceData()
    c.header('Cache-Control', 'no-store, max-age=0')
    return c.json(presence)
  })
  .put(
    '/report',
    async (c, next) => {
      c.header('Cache-Control', 'no-store')
      const digest = process.env.PRESENCE_REPORT_TOKEN_SHA256?.trim()
      if (!digest || !/^[\da-f]{64}$/i.test(digest))
        return c.json(createFailureResponse('采集上报尚未配置', undefined, 'REPORT_DISABLED'), 503)
      const token = /^Bearer (\S+)$/i.exec(c.req.header('Authorization') ?? '')?.[1]
      if (!token || !timingSafeEqual(createHash('sha256').update(token).digest(), Buffer.from(digest, 'hex'))) {
        return c.json(createFailureResponse('检查采集器的上报凭据', undefined, 'UNAUTHORIZED'), 401)
      }
      await next()
    },
    bodyLimit({
      maxSize: 4096,
      onError: (c) => c.json(createFailureResponse('上报超过 4 KiB', undefined, 'REPORT_TOO_LARGE'), 413),
    }),
    async (c) => {
      const upload = parsePresenceUpload(await c.req.json().catch(() => null))
      if (!upload)
        return c.json(createFailureResponse('检查上报字段、版本和白名单 ID', undefined, 'INVALID_REPORT'), 400)
      try {
        if ((await savePresenceSnapshot(upload)) === 'stale')
          return c.json(createFailureResponse('请重新采样并检查系统时间和启动代次', undefined, 'STALE_REPORT'), 409)
        return c.body(null, 204)
      } catch {
        return c.json(createFailureResponse('检查活动数据库连接和迁移状态', undefined, 'STORE_UNAVAILABLE'), 503)
      }
    },
  )
