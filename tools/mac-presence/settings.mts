import { spawnSync } from 'node:child_process'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const stateDir = process.env.PRESENCE_HOME || join(homedir(), 'Library/Application Support/XDD/MacPresence')
const keychainService = 'com.xdd.mac-presence.report'
const endpointError = '请输入博客的 HTTPS 地址或完整的 /api/presence/report 地址。本机可使用 HTTP。'
const bearerFormat = /^[\w.~+/-]+=*$/

export function reportEndpoint(input: string): URL {
  let url: URL
  try {
    url = new URL(input.trim())
  } catch {
    throw new Error(endpointError)
  }
  const local = ['127.0.0.1', '[::1]', 'localhost'].includes(url.hostname)
  if (
    (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) ||
    !/^[\w.:[\]-]+$/.test(url.hostname) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(endpointError)
  }
  if (url.pathname === '/') url.pathname = '/api/presence/report'
  if (url.pathname !== '/api/presence/report') throw new Error(endpointError)
  return url
}

export function readToken(url: URL, initialize = false, supplied = ''): string {
  if (supplied && (supplied.length > 1024 || !bearerFormat.test(supplied)))
    throw new Error('凭据需为 1 至 1024 个 Bearer token 字符，请检查空格或换行。')
  const account = url.origin
  const args = ['find-generic-password', '-s', keychainService, '-a', account, '-w']
  const lookup = () => spawnSync('/usr/bin/security', args, { encoding: 'utf8', timeout: 5000 })
  let result = lookup()
  if (supplied || (result.status === 44 && initialize)) {
    const token = supplied || randomBytes(32).toString('hex')
    // security 通过标准输入接收命令，原始凭据不会出现在进程参数中。
    const input = `add-generic-password -U -s ${keychainService} -a ${account} -w ${token}\n`
    spawnSync('/usr/bin/security', ['-i'], { input, encoding: 'utf8', timeout: 5000 })
    result = lookup()
    if (result.status !== 0 || result.stdout.trim() !== token)
      throw new Error('无法保存上报凭据，请解锁登录钥匙串后重试。')
  }
  const token = result.stdout?.trim() ?? ''
  if (result.status !== 0 || !bearerFormat.test(token))
    throw new Error('无法读取上报凭据，请解锁登录钥匙串并重新保存地址。')
  return token
}

function seedPreferences(input?: string) {
  const path = join(stateDir, 'preferences.json')
  if (existsSync(path) && !input) return
  const url = input ? reportEndpoint(input) : null
  const existing = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null
  const enabled = existing ? existing.enabled === true : Boolean(url)
  if (url && existing?.endpoint === url.href && typeof existing.enabled === 'boolean') return
  mkdirSync(stateDir, { recursive: true, mode: 0o700 })
  const temporary = `${path}.${randomUUID()}`
  writeFileSync(temporary, JSON.stringify({ endpoint: url?.href ?? '', enabled }), { mode: 0o600 })
  renameSync(temporary, path)
}

if (import.meta.main) {
  try {
    const command = process.argv[2]
    if (command === '--install') {
      seedPreferences(process.argv[3])
    } else if (command === '--save' || command === '--digest') {
      const input = JSON.parse(readFileSync(0, 'utf8'))
      const url = reportEndpoint(input.endpoint)
      const token = readToken(url, command === '--save', command === '--save' ? (input.token ?? '') : '')
      console.info(JSON.stringify({ endpoint: url.href, digest: createHash('sha256').update(token).digest('hex') }))
    } else {
      const url = reportEndpoint(command ?? '')
      console.info(`PRESENCE_REPORT_TOKEN_SHA256=${createHash('sha256').update(readToken(url, true)).digest('hex')}`)
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : '无法保存上报设置')
    process.exitCode = 1
  }
}
