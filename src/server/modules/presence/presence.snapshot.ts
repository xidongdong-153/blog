import type { PresenceState, PresenceUpload } from '@/lib/presence'
import { and, eq, lt, or } from 'drizzle-orm'
import { parsePresenceState, PRESENCE_TTL_MS } from '@/lib/presence'
import { db } from '@/server/infra/db/client'
import { presenceLatest } from '@/server/infra/db/schema/presence'

export async function readPresenceSnapshot(): Promise<PresenceState | null> {
  const [row] = await db.select().from(presenceLatest).where(eq(presenceLatest.id, 1))
  if (!row) return null
  return parsePresenceState({ ...row.report, receivedAt: row.receivedAt, expiresAt: row.expiresAt })
}

export async function savePresenceSnapshot(upload: PresenceUpload): Promise<'saved' | 'stale'> {
  const now = Date.now()
  const observed = Date.parse(upload.observedAt)
  if (observed <= now - PRESENCE_TTL_MS || observed > now + 5_000) return 'stale'

  const { generation, seq, report } = upload
  const snapshot = {
    generation,
    seq,
    report,
    receivedAt: new Date(now).toISOString(),
    expiresAt: new Date(Math.min(now, observed) + PRESENCE_TTL_MS).toISOString(),
  }
  // 数据库在同一次写入中比较序号，重复或迟到的请求不会给旧状态续期。
  const saved = await db
    .insert(presenceLatest)
    .values({ id: 1, ...snapshot })
    .onConflictDoUpdate({
      target: presenceLatest.id,
      set: snapshot,
      setWhere: or(
        lt(presenceLatest.generation, generation),
        and(eq(presenceLatest.generation, generation), lt(presenceLatest.seq, seq)),
      ),
    })
    .returning({ id: presenceLatest.id })
  return saved.length ? 'saved' : 'stale'
}
