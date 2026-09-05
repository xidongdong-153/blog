/* eslint-disable test/no-import-node-test */

import type { PresenceState } from './presence.ts'
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  composePresenceReport,
  DESKTOP_APPS,
  parseHerdrAgentList,
  parsePresenceReport,
  parsePublicPresence,
  TERMINAL_TOOLS,
  toPublicPresence,
} from './presence.ts'

const baseReport = {
  availability: 'active' as const,
  backgroundTools: [] as ('pi' | 'agy' | 'claude')[],
  desktopApp: null,
  foregroundTool: null,
  schemaVersion: 1 as const,
  terminalDetection: 'known' as const,
}

test('接受白名单桌面应用和终端工具', () => {
  for (const desktopApp of Object.keys(DESKTOP_APPS)) {
    const parsed = parsePresenceReport({ ...baseReport, desktopApp })
    assert.equal(parsed?.desktopApp, desktopApp)
  }
  for (const foregroundTool of Object.keys(TERMINAL_TOOLS)) {
    const parsed = parsePresenceReport({ ...baseReport, desktopApp: 'ghostty', foregroundTool })
    assert.equal(parsed?.foregroundTool, foregroundTool)
  }
})

test('拒绝任意名称、未知字段和重复后台工具', () => {
  assert.equal(parsePresenceReport({ ...baseReport, desktopApp: 'Safari' }), null)
  assert.equal(parsePresenceReport({ ...baseReport, extra: true }), null)
  assert.equal(parsePresenceReport({ ...baseReport, backgroundTools: ['pi', 'pi'] }), null)
})

test('拒绝与焦点状态冲突的当前终端', () => {
  assert.equal(parsePresenceReport({ ...baseReport, desktopApp: 'vscode', foregroundTool: 'pi' }), null)
  assert.equal(
    parsePresenceReport({ ...baseReport, desktopApp: 'ghostty', foregroundTool: 'pi', terminalDetection: 'unknown' }),
    null,
  )
})

test('Herdr 三种 CLI 按身份去重并区分焦点', () => {
  assert.deepEqual(
    parseHerdrAgentList({
      result: {
        agents: [
          { agent: 'pi', focused: true },
          { agent: 'agy', focused: false },
          { agent: 'claude', focused: false },
          { agent: 'agy', focused: false },
        ],
      },
    }),
    { detection: 'known', foregroundTool: 'pi', backgroundTools: ['pi', 'agy', 'claude'] },
  )
  assert.deepEqual(
    parseHerdrAgentList({
      result: {
        agents: [
          { agent: 'pi', focused: true },
          { agent: 'claude', focused: true },
        ],
      },
    }),
    { detection: 'unknown', foregroundTool: null, backgroundTools: ['pi', 'claude'] },
  )
})

test('拒绝非法公开活动对象', () => {
  const basePublic = {
    backgroundTools: [],
    desktopApp: null,
    expiresAt: '2026-09-05T00:00:10.000Z',
    foregroundTool: null,
    receivedAt: '2026-09-05T00:00:00.000Z',
    status: 'active' as const,
    terminalDetection: 'known' as const,
  }
  assert.equal(parsePublicPresence({ ...basePublic, desktopApp: { id: 'unknown' } }), null)
  assert.equal(parsePublicPresence({ ...basePublic, foregroundTool: { id: 'pi' } }), null)
})

test('只有 Ghostty 在前台且终端焦点已知时才显示当前工具', () => {
  const terminal = {
    backgroundTools: ['pi', 'claude'] as const,
    detection: 'known' as const,
    foregroundTool: 'pi' as const,
  }
  assert.deepEqual(composePresenceReport('active', 'ghostty', terminal), {
    ...baseReport,
    backgroundTools: ['claude'],
    desktopApp: 'ghostty',
    foregroundTool: 'pi',
  })
  assert.deepEqual(composePresenceReport('active', 'vscode', terminal), {
    ...baseReport,
    backgroundTools: ['pi', 'claude'],
    desktopApp: 'vscode',
  })
  assert.deepEqual(
    composePresenceReport('active', 'ghostty', {
      backgroundTools: ['pi'],
      detection: 'unknown',
      foregroundTool: null,
    }),
    { ...baseReport, backgroundTools: ['pi'], desktopApp: 'ghostty', terminalDetection: 'unknown' },
  )
})

test('隐藏报告会清空当前和后台活动', () => {
  assert.deepEqual(
    composePresenceReport('hidden', 'ghostty', {
      backgroundTools: ['pi'],
      detection: 'known',
      foregroundTool: 'pi',
    }),
    { ...baseReport, availability: 'hidden', terminalDetection: 'unknown' },
  )
})

test('过期状态公开为离线并且不带旧活动', () => {
  const state: PresenceState = {
    ...baseReport,
    desktopApp: 'chatgpt',
    expiresAt: '2026-09-05T00:00:10.000Z',
    receivedAt: '2026-09-05T00:00:00.000Z',
  }
  assert.equal(toPublicPresence(state, Date.parse('2026-09-05T00:00:10.001Z')).status, 'offline')
  const active = toPublicPresence(state, Date.parse('2026-09-05T00:00:05.000Z'))
  assert.equal(active.desktopApp?.label, 'ChatGPT')
  assert.equal(active.desktopApp?.icon, '/images/presence/chatgpt.png')
})
