import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { stateDir } from './settings.mts'

const path = join(stateDir, 'runtime.sqlite')

export interface CollectorStatus {
  pid: number
  version: string
  desktop: 'active' | 'hidden' | 'unavailable' | 'stopped'
  herdr: 'known' | 'unknown' | 'paused'
  lastAckAt: string | null
  lastError: string | null
}

export function startRuntime(status: CollectorStatus) {
  process.umask(0o077)
  mkdirSync(stateDir, { recursive: true, mode: 0o700 })
  const db = new DatabaseSync(path)
  db.exec(
    'PRAGMA busy_timeout=3000; CREATE TABLE IF NOT EXISTS runtime (id INTEGER PRIMARY KEY, generation INTEGER NOT NULL, status TEXT NOT NULL)',
  )
  const row = db
    .prepare(
      `INSERT INTO runtime VALUES (1, ?, ?)
    ON CONFLICT(id) DO UPDATE SET generation = max(runtime.generation + 1, excluded.generation), status = excluded.status
    RETURNING generation`,
    )
    .get(Date.now(), JSON.stringify(status))
  const generation = Number(row?.generation)
  const update = db.prepare('UPDATE runtime SET status = ? WHERE id = 1 AND generation = ?')
  let previous = JSON.stringify(status)
  return {
    generation,
    save() {
      const next = JSON.stringify(status)
      if (previous !== next) {
        update.run(next, generation)
        previous = next
      }
    },
    close() {
      db.close()
    },
  }
}

if (import.meta.main) {
  const preferencesPath = join(stateDir, 'preferences.json')
  if (existsSync(preferencesPath)) {
    const preferences = JSON.parse(readFileSync(preferencesPath, 'utf8'))
    console.info(`活动上报${preferences.enabled ? '已开启' : '已暂停'}，目标 ${preferences.endpoint || '尚未配置'}`)
  }
  if (existsSync(path)) {
    const db = new DatabaseSync(path, { readOnly: true })
    const row = db.prepare('SELECT generation, status FROM runtime WHERE id = 1').get()
    if (row) console.info(JSON.stringify({ generation: row.generation, ...JSON.parse(String(row.status)) }, null, 2))
    db.close()
  } else {
    console.info('尚无采集记录')
  }
}
