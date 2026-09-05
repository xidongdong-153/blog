export const PRESENCE_SCHEMA_VERSION = 1 as const
export const PRESENCE_TTL_MS = 15_000

export const DESKTOP_APPS = {
  qq: {
    bundleId: 'com.tencent.qq',
    icon: '/images/presence/qq.png',
    label: 'QQ',
  },
  vscode: {
    bundleId: 'com.microsoft.VSCode',
    icon: '/images/presence/vscode.png',
    label: 'VS Code',
  },
  ghostty: {
    bundleId: 'com.mitchellh.ghostty',
    icon: '/images/presence/ghostty.png',
    label: 'Ghostty',
  },
  chatgpt: {
    bundleId: 'com.openai.codex',
    icon: '/images/presence/chatgpt.png',
    label: 'ChatGPT',
  },
  antigravity: {
    bundleId: 'com.google.antigravity',
    icon: '/images/presence/antigravity.png',
    label: 'Antigravity',
  },
  qqmusic: {
    bundleId: 'com.tencent.QQMusicMac',
    icon: '/images/presence/qqmusic.png',
    label: 'QQ 音乐',
  },
  workbuddy: {
    bundleId: 'com.workbuddy.workbuddy',
    icon: '/images/presence/workbuddy.png',
    label: 'WorkBuddy',
  },
} as const

export const TERMINAL_TOOLS = {
  pi: { label: 'Pi' },
  agy: { label: 'agy' },
  claude: { label: 'Claude' },
} as const

export type DesktopAppId = keyof typeof DESKTOP_APPS
export type TerminalToolId = keyof typeof TERMINAL_TOOLS
export type PresenceAvailability = 'active' | 'hidden'
export type TerminalDetection = 'known' | 'unknown'

export interface PresenceReport {
  schemaVersion: typeof PRESENCE_SCHEMA_VERSION
  availability: PresenceAvailability
  desktopApp: DesktopAppId | null
  foregroundTool: TerminalToolId | null
  backgroundTools: TerminalToolId[]
  terminalDetection: TerminalDetection
}

export interface TerminalObservation {
  detection: TerminalDetection
  foregroundTool: TerminalToolId | null
  backgroundTools: readonly TerminalToolId[]
}

/**
 * 从 Herdr 的 agent 列表中只提取 CLI 身份和焦点状态。
 * 无法解析或同时存在多个焦点时不猜测当前 CLI。
 */
export function parseHerdrAgentList(value: unknown): TerminalObservation {
  const unknownResult: TerminalObservation = { detection: 'unknown', foregroundTool: null, backgroundTools: [] }
  if (!isRecord(value) || !isRecord(value.result) || !Array.isArray(value.result.agents)) return unknownResult

  const agents: Array<{ agent: TerminalToolId; focused: boolean }> = []
  for (const item of value.result.agents) {
    if (!isRecord(item) || !isTerminalToolId(item.agent)) continue
    agents.push({ agent: item.agent, focused: item.focused === true })
  }

  const backgroundTools = [...new Set(agents.map(({ agent }) => agent))]
  const focusedTools = [...new Set(agents.filter(({ focused }) => focused).map(({ agent }) => agent))]
  if (focusedTools.length > 1) return { detection: 'unknown', foregroundTool: null, backgroundTools }
  return { detection: 'known', foregroundTool: focusedTools[0] ?? null, backgroundTools }
}

export interface PresenceState extends PresenceReport {
  receivedAt: string
  expiresAt: string
}

export interface PublicActivityItem {
  id: DesktopAppId | TerminalToolId
  kind: 'desktop' | 'terminal'
  label: string
  icon: string | null
}

export interface PublicPresence {
  status: 'active' | 'offline'
  desktopApp: PublicActivityItem | null
  foregroundTool: PublicActivityItem | null
  backgroundTools: PublicActivityItem[]
  terminalDetection: TerminalDetection
  receivedAt: string | null
  expiresAt: string | null
}

const DESKTOP_APP_IDS = Object.keys(DESKTOP_APPS) as DesktopAppId[]
const TERMINAL_TOOL_IDS = Object.keys(TERMINAL_TOOLS) as TerminalToolId[]
const REPORT_KEYS = [
  'schemaVersion',
  'availability',
  'desktopApp',
  'foregroundTool',
  'backgroundTools',
  'terminalDetection',
] as const
const STATE_KEYS = [...REPORT_KEYS, 'receivedAt', 'expiresAt'] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort()
  return actual.length === keys.length && actual.every((key, index) => key === [...keys].sort()[index])
}

function isDesktopAppId(value: unknown): value is DesktopAppId {
  return typeof value === 'string' && DESKTOP_APP_IDS.includes(value as DesktopAppId)
}

function isTerminalToolId(value: unknown): value is TerminalToolId {
  return typeof value === 'string' && TERMINAL_TOOL_IDS.includes(value as TerminalToolId)
}

function uniqueTools(value: unknown): TerminalToolId[] | null {
  if (!Array.isArray(value) || value.length > TERMINAL_TOOL_IDS.length) return null
  const result: TerminalToolId[] = []
  for (const item of value) {
    if (!isTerminalToolId(item) || result.includes(item)) return null
    result.push(item)
  }
  return result
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
}

/**
 * 创建不公开任何活动的报告。
 * 采集器停止、Hammerspoon 锁定或读取失败时都使用这个形状。
 */
export function createHiddenPresenceReport(): PresenceReport {
  return {
    schemaVersion: PRESENCE_SCHEMA_VERSION,
    availability: 'hidden',
    desktopApp: null,
    foregroundTool: null,
    backgroundTools: [],
    terminalDetection: 'unknown',
  }
}

/**
 * 校验并归一化采集端报告。
 * 只接受固定字段和白名单 ID，避免本地采集器把窗口、路径或任意文本传到服务端。
 */
export function parsePresenceReport(value: unknown): PresenceReport | null {
  if (!isRecord(value) || !hasExactKeys(value, REPORT_KEYS)) return null
  if (value.schemaVersion !== PRESENCE_SCHEMA_VERSION) return null
  if (value.availability !== 'active' && value.availability !== 'hidden') return null
  if (value.desktopApp !== null && !isDesktopAppId(value.desktopApp)) return null
  if (value.foregroundTool !== null && !isTerminalToolId(value.foregroundTool)) return null
  const backgroundTools = uniqueTools(value.backgroundTools)
  if (!backgroundTools || (value.terminalDetection !== 'known' && value.terminalDetection !== 'unknown')) return null
  if (value.foregroundTool !== null && (value.desktopApp !== 'ghostty' || value.terminalDetection !== 'known'))
    return null

  if (value.availability === 'hidden') return createHiddenPresenceReport()

  return {
    schemaVersion: PRESENCE_SCHEMA_VERSION,
    availability: 'active',
    desktopApp: value.desktopApp,
    foregroundTool: value.foregroundTool,
    backgroundTools: backgroundTools.filter((tool) => tool !== value.foregroundTool),
    terminalDetection: value.terminalDetection,
  }
}

/**
 * 校验磁盘中的状态文件。
 * 磁盘文件也视为边界输入，损坏或字段漂移时返回 null，让公开接口显示离线。
 */
export function parsePresenceState(value: unknown): PresenceState | null {
  if (!isRecord(value) || !hasExactKeys(value, STATE_KEYS)) return null
  const report = parsePresenceReport({
    availability: value.availability,
    backgroundTools: value.backgroundTools,
    desktopApp: value.desktopApp,
    foregroundTool: value.foregroundTool,
    schemaVersion: value.schemaVersion,
    terminalDetection: value.terminalDetection,
  })
  if (!report || !isIsoDate(value.receivedAt) || !isIsoDate(value.expiresAt)) return null
  return { ...report, expiresAt: value.expiresAt, receivedAt: value.receivedAt }
}

/**
 * 根据桌面前台应用和终端只读观察结果组装一条上报。
 * 只有 Ghostty 在前台且焦点已知时，终端工具才会成为当前活动。
 */
export function composePresenceReport(
  availability: PresenceAvailability,
  desktopApp: DesktopAppId | null,
  terminal: TerminalObservation,
): PresenceReport {
  if (availability === 'hidden') return createHiddenPresenceReport()
  const foregroundTool = desktopApp === 'ghostty' && terminal.detection === 'known' ? terminal.foregroundTool : null
  return {
    schemaVersion: PRESENCE_SCHEMA_VERSION,
    availability: 'active',
    desktopApp,
    foregroundTool,
    backgroundTools: terminal.backgroundTools.filter((tool) => tool !== foregroundTool),
    terminalDetection: terminal.detection,
  }
}

function desktopActivity(id: DesktopAppId): PublicActivityItem {
  const app = DESKTOP_APPS[id]
  return { id, kind: 'desktop', label: app.label, icon: app.icon }
}

function terminalActivity(id: TerminalToolId): PublicActivityItem {
  return { id, kind: 'terminal', label: TERMINAL_TOOLS[id].label, icon: null }
}

/**
 * 将服务端内部状态投影为公开响应，并在服务端统一处理过期。
 */
export function toPublicPresence(state: PresenceState | null, now: number): PublicPresence {
  if (!state || state.availability !== 'active' || Date.parse(state.expiresAt) <= now) {
    return {
      status: 'offline',
      desktopApp: null,
      foregroundTool: null,
      backgroundTools: [],
      terminalDetection: 'unknown',
      receivedAt: null,
      expiresAt: null,
    }
  }

  return {
    status: 'active',
    desktopApp: state.desktopApp ? desktopActivity(state.desktopApp) : null,
    foregroundTool: state.foregroundTool ? terminalActivity(state.foregroundTool) : null,
    backgroundTools: state.backgroundTools.map(terminalActivity),
    terminalDetection: state.terminalDetection,
    receivedAt: state.receivedAt,
    expiresAt: state.expiresAt,
  }
}

/**
 * 创建公开的离线响应。
 */
export function createOfflinePresence(): PublicPresence {
  return toPublicPresence(null, Date.now())
}

/**
 * 校验浏览器从公开接口读到的响应，失败时由组件回退到离线状态。
 */
export function parsePublicPresence(value: unknown): PublicPresence | null {
  if (!isRecord(value) || !['active', 'offline'].includes(String(value.status))) return null
  if (value.status === 'offline') return toPublicPresence(null, Date.now())
  if (!isRecord(value.desktopApp) && value.desktopApp !== null) return null
  if (!isRecord(value.foregroundTool) && value.foregroundTool !== null) return null
  if (!Array.isArray(value.backgroundTools) || !isIsoDate(value.receivedAt) || !isIsoDate(value.expiresAt)) return null
  if (value.terminalDetection !== 'known' && value.terminalDetection !== 'unknown') return null

  const item = (raw: unknown, kind: PublicActivityItem['kind']): PublicActivityItem | null => {
    if (!isRecord(raw) || raw.kind !== kind || typeof raw.label !== 'string') return null

    if (kind === 'desktop') {
      if (!isDesktopAppId(raw.id) || typeof raw.icon !== 'string') return null
      const expected = DESKTOP_APPS[raw.id]
      if (expected.label !== raw.label || expected.icon !== raw.icon) return null
      return { id: raw.id, kind, label: raw.label, icon: raw.icon }
    }

    if (!isTerminalToolId(raw.id) || raw.icon !== null) return null
    const expected = TERMINAL_TOOLS[raw.id]
    if (expected.label !== raw.label) return null
    return { id: raw.id, kind, label: raw.label, icon: null }
  }

  const desktopApp = value.desktopApp === null ? null : item(value.desktopApp, 'desktop')
  const foregroundTool = value.foregroundTool === null ? null : item(value.foregroundTool, 'terminal')
  const backgroundTools = value.backgroundTools.map((tool) => item(tool, 'terminal'))
  if (value.desktopApp !== null && !desktopApp) return null
  if (value.foregroundTool !== null && !foregroundTool) return null
  if (backgroundTools.includes(null)) return null
  if (foregroundTool && (desktopApp?.id !== 'ghostty' || value.terminalDetection !== 'known')) return null
  return {
    status: 'active',
    desktopApp,
    foregroundTool,
    backgroundTools: backgroundTools as PublicActivityItem[],
    terminalDetection: value.terminalDetection,
    receivedAt: value.receivedAt,
    expiresAt: value.expiresAt,
  }
}
