import { spawnSync } from 'node:child_process'
import { globSync, mkdtempSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'

const directory = mkdtempSync(path.join(os.tmpdir(), 'blog-tests-'))
const url = `file:${path.join(directory, 'test.db')}`
const client = createClient({ url })
try {
  await migrate(drizzle(client), { migrationsFolder: './src/server/infra/db/migrations' })
  client.close()
  const result = spawnSync(
    process.execPath,
    ['--loader', './scripts/test-loader.mjs', '--test', '--test-concurrency=1', ...globSync('src/**/*.test.ts').sort()],
    {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'test', TURSO_DATABASE_URL: url, TURSO_AUTH_TOKEN: '' },
    },
  )
  process.exitCode = result.status ?? 1
} finally {
  client.close()
  rmSync(directory, { recursive: true, force: true })
}
