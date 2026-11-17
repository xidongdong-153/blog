'use client'

import { useEffect, useState } from 'react'
import { readBackdropFxEnabled, SITE_FX_CHANGE_EVENT, SITE_FX_STORAGE_KEY } from './paper-canvas'

/**
 * 页脚版式栏中的背景效果（岩石细纹与氛围光）开关。
 * 同步监听同标签自定义事件与跨标签 StorageEvent（含 localStorage.clear），保持按钮与全局状态一致。
 */
export function FxToggle() {
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    setEnabled(readBackdropFxEnabled())

    const handleFxChange = (event: Event) => {
      const custom = event as CustomEvent<{ enabled?: boolean }>
      if (typeof custom.detail?.enabled === 'boolean') {
        setEnabled(custom.detail.enabled)
      } else {
        setEnabled(readBackdropFxEnabled())
      }
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === SITE_FX_STORAGE_KEY) {
        setEnabled(readBackdropFxEnabled())
      }
    }

    window.addEventListener(SITE_FX_CHANGE_EVENT, handleFxChange)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener(SITE_FX_CHANGE_EVENT, handleFxChange)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  const updateFx = (next: boolean) => {
    setEnabled(next)
    document.documentElement.dataset.backdropFx = next ? 'on' : 'off'
    try {
      localStorage.setItem(SITE_FX_STORAGE_KEY, next ? 'on' : 'off')
    } catch {
      // 忽略隐私模式限制
    }
    window.dispatchEvent(new CustomEvent(SITE_FX_CHANGE_EVENT, { detail: { enabled: next } }))
  }

  return (
    <div role="radiogroup" aria-label="背景效果开关" className="inline-flex items-center text-xs select-none">
      <button
        type="button"
        role="radio"
        aria-checked={!enabled}
        data-active={!enabled ? 'true' : undefined}
        onClick={() => updateFx(false)}
        className="group/ink hit-expand inline-flex min-h-7 min-w-8 cursor-pointer items-center justify-center whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span
          className={`ink-line ${
            !enabled ? 'font-semibold text-foreground' : 'text-muted-foreground group-hover/ink:text-foreground'
          }`}
        >
          关
        </span>
      </button>
      <span aria-hidden="true" className="mx-1.5 text-muted-foreground/30">
        ·
      </span>
      <button
        type="button"
        role="radio"
        aria-checked={enabled}
        data-active={enabled ? 'true' : undefined}
        onClick={() => updateFx(true)}
        className="group/ink hit-expand inline-flex min-h-7 min-w-8 cursor-pointer items-center justify-center whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span
          className={`ink-line ${
            enabled ? 'font-semibold text-foreground' : 'text-muted-foreground group-hover/ink:text-foreground'
          }`}
        >
          开
        </span>
      </button>
    </div>
  )
}
