'use client'

import { useEffect } from 'react'

export const SITE_FX_STORAGE_KEY = 'site-backdrop-fx'
export const SITE_FX_CHANGE_EVENT = 'site-fx-change'

const FILM_GRAIN_SVG_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180' viewBox='0 0 180 180'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23g)' opacity='0.55'/%3E%3C/svg%3E\")"

function syncBackdropFxAttr() {
  try {
    const enabled = localStorage.getItem(SITE_FX_STORAGE_KEY) !== 'off'
    document.documentElement.dataset.backdropFx = enabled ? 'on' : 'off'
  } catch {
    document.documentElement.dataset.backdropFx = 'on'
  }
}

/**
 * 全局静态微噪点胶片纸面底纹组件。
 * 采用无缝重复 SVG 颗粒底纹平铺视口，无 rAF 循环开销，配合页脚背景开关即时切换显隐。
 */
export function PaperCanvas() {
  useEffect(() => {
    syncBackdropFxAttr()

    const handleFxChange = (event: Event) => {
      const custom = event as CustomEvent<{ enabled?: boolean }>
      if (typeof custom.detail?.enabled === 'boolean') {
        document.documentElement.dataset.backdropFx = custom.detail.enabled ? 'on' : 'off'
      } else {
        syncBackdropFxAttr()
      }
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === SITE_FX_STORAGE_KEY) {
        syncBackdropFxAttr()
      }
    }

    window.addEventListener(SITE_FX_CHANGE_EVENT, handleFxChange)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener(SITE_FX_CHANGE_EVENT, handleFxChange)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  return (
    <div
      id="site-film-backdrop"
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 select-none opacity-[0.045] transition-opacity duration-300 dark:opacity-[0.055] print:hidden"
      style={{
        backgroundImage: FILM_GRAIN_SVG_URI,
        backgroundRepeat: 'repeat',
        backgroundSize: '180px 180px',
      }}
    />
  )
}
