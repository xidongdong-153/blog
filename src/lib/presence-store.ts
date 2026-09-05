import type { PresenceReport, PresenceState } from './presence'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { parsePresenceState, PRESENCE_TTL_MS } from './presence'

export const PRESENCE_STATE_PATH = join(process.cwd(), '.cache', 'presence', 'state.json')

let writeQueue: Promise<void> = Promise.resolve()

/**
 * 读取最新活动快照。
 * 文件不存在或内容损坏时返回 null，由调用方统一显示离线。
 */
export async function readPresenceState(): Promise<PresenceState | null> {
  try {
    const content = await readFile(PRESENCE_STATE_PATH, 'utf8')
    return parsePresenceState(JSON.parse(content))
  } catch {
    return null
  }
}

/**
 * 写入一条带服务端时间和过期时间的活动快照。
 * 临时文件重命名保证 GET 不会读到半截 JSON。
 */
export function writePresenceState(report: PresenceReport, now = Date.now()): Promise<PresenceState> {
  const state: PresenceState = {
    ...report,
    receivedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + PRESENCE_TTL_MS).toISOString(),
  }

  const operation = writeQueue.then(async () => {
    const directory = dirname(PRESENCE_STATE_PATH)
    const temporaryPath = join(directory, `.state-${process.pid}-${Date.now()}.tmp`)
    await mkdir(directory, { recursive: true })
    await writeFile(temporaryPath, JSON.stringify(state), { encoding: 'utf8', mode: 0o600 })
    await rename(temporaryPath, PRESENCE_STATE_PATH)
    return state
  })
  writeQueue = operation.then(
    () => undefined,
    () => undefined,
  )
  return operation
}
