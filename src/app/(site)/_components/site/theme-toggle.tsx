'use client'

import { useEffect, useState } from 'react'

type ThemeMode = 'light' | 'system' | 'dark'

const THEME_OPTIONS: { key: ThemeMode; label: string }[] = [
  { key: 'light', label: '明' },
  { key: 'system', label: '系统' },
  { key: 'dark', label: '暗' },
]

/**
 * 页脚三态文本直选主题切换器。
 * 支持「明 · 系统 · 暗」直接点击切换，当前选中的模式高亮展示。
 * 结合 html[data-theme] 与 CSS 变体驱动，确保首屏无闪烁与状态同步。
 */
export function ThemeToggle() {
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>('system')

  useEffect(() => {
    const initial = (document.documentElement.dataset.theme as ThemeMode) || 'system'
    setCurrentTheme(initial)

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      if (document.documentElement.dataset.theme === 'system') {
        document.documentElement.classList.toggle('dark', e.matches)
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  function selectTheme(next: ThemeMode) {
    setCurrentTheme(next)
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem('theme', next)
    } catch {
      // localStorage 被禁用时只切换显示，不报错
    }

    const isDark = next === 'dark' || (next === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

    document.documentElement.classList.toggle('dark', isDark)
  }

  return (
    <div
      role="radiogroup"
      aria-label="切换明暗主题"
      className="inline-flex items-center text-xs text-muted-foreground select-none"
    >
      {THEME_OPTIONS.map((item, index) => {
        const isActive = currentTheme === item.key
        return (
          <span key={item.key} className="inline-flex items-center">
            {index > 0 && (
              <span aria-hidden="true" className="mx-1 text-muted-foreground/30">
                ·
              </span>
            )}
            <button
              type="button"
              role="radio"
              aria-checked={isActive}
              aria-label={`切换到${item.label}色主题`}
              onClick={() => selectTheme(item.key)}
              className={`cursor-pointer transition-colors duration-200 hover:text-foreground ${
                isActive
                  ? 'font-medium text-foreground underline decoration-foreground/30 underline-offset-4'
                  : 'text-muted-foreground/70'
              }`}
            >
              {item.label}
            </button>
          </span>
        )
      })}
    </div>
  )
}
