'use client'

import { useEffect } from 'react'

const ICON_CLASS =
  'pointer-events-none absolute inset-0 m-auto size-4.5 scale-[0.6] opacity-0 blur-[4px] transition-all duration-[250ms] ease-out motion-reduce:transition-none group-hover:text-primary'

/**
 * 主题切换按钮。支持 system / light / dark 三态循环。
 * 图标可见性完全由 html[data-theme] 和 CSS 自定义变体驱动，
 * 避免 React hydration mismatch 和切换闪烁。
 */
export function ThemeToggle() {
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      if (document.documentElement.dataset.theme === 'system') {
        document.documentElement.classList.toggle('dark', e.matches)
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  function toggle() {
    const current = (document.documentElement.dataset.theme as 'system' | 'light' | 'dark') || 'system'
    const next = current === 'system' ? 'light' : current === 'light' ? 'dark' : 'system'

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
    <button
      type="button"
      aria-label="切换主题"
      onClick={toggle}
      className="group relative box-content size-4.5 rounded-md border border-border p-1.5 transition-colors hover:bg-muted"
    >
      {/* 电脑 / 系统图标 */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`${ICON_CLASS} theme-system:scale-100 theme-system:opacity-100 theme-system:blur-0`}
      >
        <rect width="20" height="14" x="2" y="3" rx="2" />
        <line x1="8" x2="16" y1="21" y2="21" />
        <line x1="12" x2="12" y1="17" y2="21" />
      </svg>

      {/* 太阳 / 亮色图标 */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`${ICON_CLASS} theme-light:scale-100 theme-light:opacity-100 theme-light:blur-0`}
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
      </svg>

      {/* 月亮 / 暗色图标 */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`${ICON_CLASS} theme-dark:scale-100 theme-dark:opacity-100 theme-dark:blur-0`}
      >
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </svg>
    </button>
  )
}
