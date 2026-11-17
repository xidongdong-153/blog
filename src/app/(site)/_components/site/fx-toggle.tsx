'use client'

import { useEffect, useState } from 'react'
import { readBackdropFxEnabled, SITE_FX_CHANGE_EVENT, SITE_FX_STORAGE_KEY } from './paper-canvas'

/**
 * 页脚版式栏中的背景效果（微噪点纸面与氛围光）开关。
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
        onClick={() => updateFx(false)}
        className={`cursor-pointer transition-colors duration-200 hover:text-foreground ${
          !enabled
            ? 'font-semibold text-foreground underline decoration-primary/75 underline-offset-4'
            : 'text-muted-foreground'
        }`}
      >
        关
      </button>
      <span aria-hidden="true" className="mx-1.5 text-muted-foreground/30">
        ·
      </span>
      <button
        type="button"
        role="radio"
        aria-checked={enabled}
        onClick={() => updateFx(true)}
        className={`cursor-pointer transition-colors duration-200 hover:text-foreground ${
          enabled
            ? 'font-semibold text-foreground underline decoration-primary/75 underline-offset-4'
            : 'text-muted-foreground'
        }`}
      >
        开
      </button>
    </div>
  )
}
