import type { DesktopAppId, PresenceAvailability, PresenceReport, TerminalObservation } from '../../src/lib/presence.ts'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import {
  composePresenceReport,
  createHiddenPresenceReport,
  DESKTOP_APPS,
  parseHerdrAgentList,
} from '../../src/lib/presence.ts'

const DEFAULT_ENDPOINT = 'http://127.0.0.1:4400/api/presence/report'
const POLL_INTERVAL_MS = 2_000
const COMMAND_TIMEOUT_MS = 1_000
const MAX_COMMAND_OUTPUT = 16 * 1024
const HIDDEN_REPORT = createHiddenPresenceReport()

interface HammerspoonSnapshot {
  availability: PresenceAvailability
  desktopApp: DesktopAppId | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function runCommand(command: string, args: string[]): string | null {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    maxBuffer: MAX_COMMAND_OUTPUT,
    timeout: COMMAND_TIMEOUT_MS,
  })
  const stdout: unknown = result.stdout
  if (result.error || result.status !== 0) return null
  return typeof stdout === 'string' ? stdout : stdout ? String(stdout) : ''
}

function readDesktopAppId(value: unknown): DesktopAppId | null | undefined {
  if (value === null || value === '') return null
  if (typeof value !== 'string' || !Object.hasOwn(DESKTOP_APPS, value)) return undefined
  return value as DesktopAppId
}

function readHammerspoonSnapshot(): HammerspoonSnapshot | null {
  const command = [
    'local tracker = presence or presenceTest',
    'local snapshot = tracker and tracker.getSnapshot and tracker.getSnapshot()',
    'if snapshot then print(hs.json.encode(snapshot)) end',
  ].join('; ')
  const output = runCommand('hs', ['-c', command])
  if (!output) return null

  for (const line of output.split(/\r?\n/).reverse()) {
    const start = line.indexOf('{')
    if (start < 0) continue
    try {
      const value: unknown = JSON.parse(line.slice(start))
      if (!isRecord(value) || (value.availability !== 'active' && value.availability !== 'hidden')) continue
      const desktopApp = readDesktopAppId(value.desktopApp)
      if (desktopApp === undefined) continue
      return { availability: value.availability, desktopApp }
    } catch {
      continue
    }
  }
  return null
}

function readHerdrObservation(): TerminalObservation {
  if (process.env.HERDR_ENV !== '1') {
    return { detection: 'unknown', foregroundTool: null, backgroundTools: [] }
  }

  const output = runCommand('herdr', ['agent', 'list'])
  if (!output) return { detection: 'unknown', foregroundTool: null, backgroundTools: [] }

  try {
    return parseHerdrAgentList(JSON.parse(output))
  } catch {
    return { detection: 'unknown', foregroundTool: null, backgroundTools: [] }
  }
}

/**
 * 读取两端的最小状态并生成上报报告。
 * Hammerspoon 不可用时直接隐藏，避免把上一次状态留在网页上。
 */
export function collectPresenceReport(): PresenceReport {
  const desktop = readHammerspoonSnapshot()
  if (!desktop) return HIDDEN_REPORT
  const terminal = readHerdrObservation()
  return composePresenceReport(desktop.availability, desktop.desktopApp, terminal)
}

function printReport(report: PresenceReport): void {
  console.info(JSON.stringify(report))
}

function readLocalEnv(name: 'PRESENCE_ENDPOINT' | 'PRESENCE_TOKEN'): string | null {
  try {
    const line = readFileSync('.env.local', 'utf8')
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith(`${name}=`))
    if (!line) return null
    const value = line.slice(name.length + 1).trim()
    return value.replace(/^(['"])(.*)\1$/, '$2') || null
  } catch {
    return null
  }
}

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]'])

function endpoint(): string {
  const value = process.env.PRESENCE_ENDPOINT?.trim() || readLocalEnv('PRESENCE_ENDPOINT')
  if (!value) return DEFAULT_ENDPOINT

  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' || !LOOPBACK_HOSTS.has(url.hostname) || url.username || url.password)
      throw new Error('invalid local endpoint')
    return url.toString()
  } catch {
    throw new Error('PRESENCE_ENDPOINT 必须是本机 HTTP 回环地址')
  }
}

function token(): string | null {
  const value = process.env.PRESENCE_TOKEN?.trim() || readLocalEnv('PRESENCE_TOKEN')
  return value || null
}

async function postReport(report: PresenceReport): Promise<void> {
  const secret = token()
  if (!secret) throw new Error('缺少 PRESENCE_TOKEN，未发送活动状态')
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), COMMAND_TIMEOUT_MS)
  try {
    const response = await fetch(endpoint(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(report),
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`活动接口返回 HTTP ${response.status}`)
  } finally {
    clearTimeout(timeout)
  }
}

function startHammerspoon(): void {
  const command = [
    'local tracker = presence or presenceTest',
    'if tracker and tracker.start then tracker.start() end',
  ].join('; ')
  runCommand('hs', ['-c', command])
}

function stopHammerspoon(): void {
  const command = [
    'local tracker = presence or presenceTest',
    'if tracker and tracker.stop then tracker.stop() end',
  ].join('; ')
  runCommand('hs', ['-c', command])
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function runOnce(dryRun: boolean): Promise<void> {
  const report = collectPresenceReport()
  printReport(report)
  if (!dryRun) await postReport(report)
}

async function runCollector(): Promise<void> {
  if (!token()) throw new Error('缺少 PRESENCE_TOKEN，无法启动持续上报')
  endpoint()
  startHammerspoon()
  let stopping = false
  const shutdown = async () => {
    if (stopping) return
    stopping = true
    stopHammerspoon()
    try {
      await postReport(HIDDEN_REPORT)
    } catch (error) {
      console.error(error instanceof Error ? error.message : '停止时清除活动失败')
    }
  }
  process.once('SIGINT', () => void shutdown())
  process.once('SIGTERM', () => void shutdown())

  while (true) {
    try {
      await runOnce(false)
    } catch (error) {
      console.error(error instanceof Error ? error.message : '活动上报失败')
    }
    if (stopping) break
    await wait(POLL_INTERVAL_MS)
  }
}

function printHelp(): void {
  console.info(`用法：
  pnpm presence:status       读取一次状态，只打印，不上报
  pnpm presence:once         读取一次状态并上报
  pnpm presence:start        每 2 秒读取并上报
  pnpm presence:stop         停止 Hammerspoon 监听并清除服务端状态

环境变量：
  PRESENCE_TOKEN             服务端活动接口密钥
  PRESENCE_ENDPOINT          可选，默认 http://127.0.0.1:4400/api/presence/report
  HERDR_ENV=1                在 Herdr 管理的终端中运行，启用终端焦点识别`)
}

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2))
  if (args.has('--help')) {
    printHelp()
    return
  }
  if (args.has('--stop')) {
    stopHammerspoon()
    if (token()) await postReport(HIDDEN_REPORT)
    console.info('已停止本地监听，并请求清除活动状态')
    return
  }
  if (args.has('--once')) {
    await runOnce(args.has('--dry-run'))
    return
  }
  await runCollector()
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : '活动采集器启动失败')
  process.exitCode = 1
})
