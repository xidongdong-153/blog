import type { DesktopAppId, TerminalObservation } from '../../src/lib/presence.ts'
import type { CollectorStatus } from './runtime.mts'
import { execFile, spawn } from 'node:child_process'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import {
  composePresenceReport,
  createHiddenPresenceReport,
  DESKTOP_APPS,
  parseHerdrAgentList,
} from '../../src/lib/presence.ts'
import { Reporter } from './reporter.mts'
import { startRuntime } from './runtime.mts'
import { readToken, reportEndpoint } from './settings.mts'

const execute = promisify(execFile)
const nativePath = fileURLToPath(new URL('./MacPresence', import.meta.url))
const herdrPath = process.env.PRESENCE_HERDR_BIN || join(homedir(), '.local/bin/herdr')
const bundles = new Map(Object.entries(DESKTOP_APPS).map(([id, app]) => [String(app.bundleId), id as DesktopAppId]))
const unknownTerminal: TerminalObservation = { detection: 'unknown', foregroundTool: null, backgroundTools: [] }
interface DesktopSample {
  active: boolean
  app: DesktopAppId | null
  sampledAt: number
}

const url = reportEndpoint(process.argv[2] ?? '')
const status: CollectorStatus = {
  pid: process.pid,
  version: process.env.PRESENCE_VERSION || 'local',
  desktop: 'unavailable',
  herdr: 'paused',
  lastAckAt: null,
  lastError: null,
}
const runtime = startRuntime(status)
let token: string
try {
  token = readToken(url)
} catch (error) {
  status.lastError = error instanceof Error ? error.message : '请检查钥匙串'
  runtime.save()
  throw error
}
let desktop: DesktopSample | null = null
let terminal = unknownTerminal
let terminalAt = 0
let desktopRevision = 0
let stopping = false
let querying = false
let refreshRequested = false
const childEnv: NodeJS.ProcessEnv = {
  HOME: homedir(),
  PATH: process.env.PATH,
  TMPDIR: process.env.TMPDIR,
  NODE_ENV: process.env.NODE_ENV || 'production',
  HERDR_ENV: '1',
}

function freshDesktop() {
  if (!desktop) return null
  const age = Date.now() - desktop.sampledAt
  return age >= 0 && age < 3000 ? desktop : null
}

function sample() {
  const current = freshDesktop()
  status.desktop = stopping ? 'stopped' : current ? (current.active ? 'active' : 'hidden') : 'unavailable'
  if (stopping || !current?.active) {
    status.herdr = 'paused'
    return { report: createHiddenPresenceReport(), observedAt: new Date().toISOString() }
  }
  const observation = Date.now() - terminalAt < 3500 ? terminal : unknownTerminal
  status.herdr = observation.detection
  return {
    report: composePresenceReport('active', current.app, observation),
    observedAt: new Date(current.sampledAt).toISOString(),
  }
}

const reporter = new Reporter({
  url,
  token,
  generation: runtime.generation,
  sample,
  onResult(error) {
    status.lastError = error
    if (!error) status.lastAckAt = new Date().toISOString()
    runtime.save()
  },
})

async function readTerminal() {
  if (stopping || !freshDesktop()?.active) return
  if (querying) {
    refreshRequested = true
    return
  }
  querying = true
  refreshRequested = false
  const revision = desktopRevision
  let next = unknownTerminal
  try {
    const { stdout } = await execute(herdrPath, ['agent', 'list'], {
      env: childEnv,
      encoding: 'utf8',
      timeout: 1000,
      maxBuffer: 64 * 1024,
    })
    next = parseHerdrAgentList(JSON.parse(stdout))
  } catch {
    /* 本次终端状态不可用，桌面仍可上报。 */
  }
  querying = false
  if (stopping) return
  if (revision === desktopRevision && freshDesktop()?.active) {
    terminal = next
    terminalAt = Date.now()
    reporter.update()
  }
  if (refreshRequested) void readTerminal()
}

function observe(next: DesktopSample | null) {
  const prior = freshDesktop()
  const changed = prior?.active !== next?.active || prior?.app !== next?.app
  desktop = next
  if (changed) {
    desktopRevision++
    terminal = unknownTerminal
    terminalAt = 0
  }
  reporter.update()
  if (changed && next?.active) void readTerminal()
}

let restart: NodeJS.Timeout | undefined
let child: ReturnType<typeof spawn> | undefined
function startMonitor() {
  const monitor = spawn(nativePath, [], { stdio: ['ignore', 'pipe', 'ignore'], env: childEnv })
  child = monitor
  const lines = createInterface({ input: monitor.stdout })
  lines.on('line', (line) => {
    if (stopping) return
    try {
      const row = JSON.parse(line)
      if (!Number.isSafeInteger(row?.sampledAt) || !['active', 'hidden'].includes(row.availability)) {
        observe(null)
        return
      }
      observe({
        active: row.availability === 'active',
        app: bundles.get(row.bundleId) ?? null,
        sampledAt: row.sampledAt,
      })
    } catch {
      observe(null)
    }
  })
  monitor.on('error', () => {
    if (!stopping) observe(null)
  })
  monitor.once('close', () => {
    lines.close()
    if (!stopping) {
      observe(null)
      restart = setTimeout(startMonitor, 2000)
    }
  })
}

startMonitor()
const poll = setInterval(() => void readTerminal(), 2000)
const watchdog = setInterval(() => {
  reporter.update()
  runtime.save()
}, 500)
async function stop() {
  if (stopping) return
  stopping = true
  process.stdin.pause()
  clearTimeout(restart)
  clearInterval(poll)
  clearInterval(watchdog)
  child?.kill()
  await reporter.stop()
  runtime.close()
}
process.once('SIGTERM', () => void stop())
process.once('SIGINT', () => void stop())
if (process.argv.includes('--supervised')) {
  process.stdin.once('end', () => void stop())
  process.stdin.resume()
}
