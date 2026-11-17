'use client'

import type { MouseEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

type ThemeMode = 'light' | 'system' | 'dark'

interface ViewTransitionHandle {
  ready: Promise<void>
  finished: Promise<void>
  updateCallbackDone?: Promise<void>
  skipTransition?: () => void
}

const THEME_OPTIONS: { key: ThemeMode; label: string }[] = [
  { key: 'light', label: '浅色' },
  { key: 'system', label: '随系统' },
  { key: 'dark', label: '深色' },
]

/**
 * 页脚三态文本直选主题切换器。
 * 支持「浅色 · 随系统 · 深色」点击切换，并在支持的浏览器上以按钮坐标为圆心触发 View Transitions 圆形扩散切换。
 */
export function ThemeToggle() {
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>('system')
  const groupRef = useRef<HTMLDivElement>(null)
  const activeTransitionRef = useRef<ViewTransitionHandle | null>(null)

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

  function applyTheme(next: ThemeMode) {
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

  // Chromium 在 root View Transition 期间会把指针命中拦截在 html 根元素上；
  // 若用户在动画尚未结束时快速连击其他主题项，立刻跳过当前过渡并用真实坐标兜底提交目标主题。
  useEffect(() => {
    const handlePointerDownCapture = (event: PointerEvent) => {
      const active = activeTransitionRef.current
      if (!active) return

      active.skipTransition?.()
      activeTransitionRef.current = null
      delete document.documentElement.dataset.themeTransition

      if (event.target === document.documentElement) {
        const hit = document.elementFromPoint(event.clientX, event.clientY)
        const targetButton = hit?.closest<HTMLButtonElement>('button[data-theme-option]')
        if (targetButton && groupRef.current?.contains(targetButton)) {
          const nextMode = targetButton.dataset.themeOption as ThemeMode | undefined
          if (nextMode) {
            flushSync(() => {
              applyTheme(nextMode)
            })
          }
        }
      }
    }

    window.addEventListener('pointerdown', handlePointerDownCapture, true)
    return () => window.removeEventListener('pointerdown', handlePointerDownCapture, true)
  }, [])

  function selectTheme(next: ThemeMode, event: MouseEvent<HTMLButtonElement>) {
    if (document.documentElement.dataset.theme === next) {
      return
    }

    activeTransitionRef.current?.skipTransition?.()

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => ViewTransitionHandle
    }

    if (reducedMotion || typeof doc.startViewTransition !== 'function') {
      applyTheme(next)
      return
    }

    const x = event.clientX || window.innerWidth / 2
    const y = event.clientY || window.innerHeight - 40
    const endRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))

    let applied = false
    const commitTheme = () => {
      if (applied) return
      applied = true
      flushSync(() => {
        applyTheme(next)
      })
    }

    document.documentElement.dataset.themeTransition = 'true'
    let transition: ViewTransitionHandle
    try {
      transition = doc.startViewTransition(commitTheme)
      activeTransitionRef.current = transition
    } catch {
      delete document.documentElement.dataset.themeTransition
      applyTheme(next)
      return
    }

    transition.updateCallbackDone?.catch(() => {
      commitTheme()
    })

    transition.ready
      .then(() => {
        if (activeTransitionRef.current !== transition) return
        document.documentElement.animate(
          {
            clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`],
          },
          {
            duration: 460,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            pseudoElement: '::view-transition-new(root)',
          },
        )
      })
      .catch(() => {
        commitTheme()
      })

    transition.finished
      .finally(() => {
        if (activeTransitionRef.current === transition) {
          activeTransitionRef.current = null
          delete document.documentElement.dataset.themeTransition
        }
        commitTheme()
      })
      .catch(() => {
        // 忽略清理异常
      })
  }

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label="切换明暗主题"
      className="inline-flex items-center text-xs text-muted-foreground select-none"
    >
      {THEME_OPTIONS.map((item, index) => {
        const isActive = currentTheme === item.key
        return (
          <span key={item.key} className="inline-flex items-center">
            {index > 0 && (
              <span aria-hidden="true" className="mx-1.5 text-muted-foreground/30">
                ·
              </span>
            )}
            <button
              type="button"
              role="radio"
              data-theme-option={item.key}
              aria-checked={isActive}
              aria-label={`切换到${item.label}主题`}
              onClick={(e) => selectTheme(item.key, e)}
              className="group/ink hit-expand inline-flex min-h-7 min-w-8 cursor-pointer items-center justify-center whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              data-active={isActive ? 'true' : undefined}
            >
              <span
                className={`ink-line ${
                  isActive ? 'font-semibold text-foreground' : 'text-muted-foreground group-hover/ink:text-foreground'
                }`}
              >
                {item.label}
              </span>
            </button>
          </span>
        )
      })}
    </div>
  )
}
