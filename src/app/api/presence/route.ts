import { toPublicPresence } from '@/lib/presence'
import { readPresenceState } from '@/lib/presence-store'

export const dynamic = 'force-dynamic'

/**
 * 返回当前公开活动，不缓存过期快照。
 */
export async function GET() {
  const state = await readPresenceState()
  const response = Response.json(toPublicPresence(state, Date.now()))
  response.headers.set('Cache-Control', 'no-store, max-age=0')
  return response
}
