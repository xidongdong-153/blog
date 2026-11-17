import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const NUM = '[+-]?(?:\\d+(?:\\.\\d+)?|\\.\\d+)'
const PCT = `${NUM}%`
const ALPHA_LEGACY = `(?:${NUM}|${PCT})`
const ALPHA_SPACE = `(?:${NUM}|${PCT}|none)`
const RGB_COMP_LEGACY = `(?:${NUM}|${PCT})`
const RGB_COMP_SPACE = `(?:${NUM}|${PCT}|none)`
const HUE_LEGACY = `${NUM}(?:deg|rad|turn)?`
const HUE_SPACE = `(?:${NUM}(?:deg|rad|turn)?|none)`
const LAB_COMP = `(?:${NUM}|${PCT}|none)`

const SAFE_HEX_COLOR_RE = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i
const SAFE_RGB_LEGACY_RE = new RegExp(
  `^rgba?\\(\\s*${RGB_COMP_LEGACY}\\s*,\\s*${RGB_COMP_LEGACY}\\s*,\\s*${RGB_COMP_LEGACY}(?:\\s*,\\s*${ALPHA_LEGACY})?\\s*\\)$`,
  'i',
)
const SAFE_RGB_SPACE_RE = new RegExp(
  `^rgba?\\(\\s*${RGB_COMP_SPACE}\\s+${RGB_COMP_SPACE}\\s+${RGB_COMP_SPACE}(?:\\s*/\\s*${ALPHA_SPACE})?\\s*\\)$`,
  'i',
)
const SAFE_HSL_LEGACY_RE = new RegExp(
  `^hsla?\\(\\s*${HUE_LEGACY}\\s*,\\s*${PCT}\\s*,\\s*${PCT}(?:\\s*,\\s*${ALPHA_LEGACY})?\\s*\\)$`,
  'i',
)
const SAFE_HSL_SPACE_RE = new RegExp(
  `^hsla?\\(\\s*${HUE_SPACE}\\s+${LAB_COMP}\\s+${LAB_COMP}(?:\\s*/\\s*${ALPHA_SPACE})?\\s*\\)$`,
  'i',
)
const SAFE_OK_COLOR_RE = new RegExp(
  `^(?:oklch\\(\\s*${LAB_COMP}\\s+${LAB_COMP}\\s+${HUE_SPACE}|oklab\\(\\s*${LAB_COMP}\\s+${LAB_COMP}\\s+${LAB_COMP})(?:\\s*/\\s*${ALPHA_SPACE})?\\s*\\)$`,
  'i',
)

/**
 * 校验并规范化外部传入的 CSS 颜色字符串，拒绝非法语法、单位混用或未知变量，避免破坏整条渐变属性。
 */
export function sanitizeCssColor(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (
    SAFE_HEX_COLOR_RE.test(trimmed) ||
    SAFE_RGB_LEGACY_RE.test(trimmed) ||
    SAFE_RGB_SPACE_RE.test(trimmed) ||
    SAFE_HSL_LEGACY_RE.test(trimmed) ||
    SAFE_HSL_SPACE_RE.test(trimmed) ||
    SAFE_OK_COLOR_RE.test(trimmed)
  ) {
    return trimmed
  }
  return null
}
