'use client'

import { useEffect, useRef } from 'react'
import { paintRockTexture } from './rock-texture'

export const SITE_FX_STORAGE_KEY = 'site-backdrop-fx'
export const SITE_FX_CHANGE_EVENT = 'site-fx-change'

/** 读取背景开关；存储不可用时默认显示，沿用根布局的防闪烁约定。 */
export function readBackdropFxEnabled(): boolean {
  try {
    return localStorage.getItem(SITE_FX_STORAGE_KEY) !== 'off'
  } catch {
    return true
  }
}

function syncBackdropFxAttr() {
  document.documentElement.dataset.backdropFx = readBackdropFxEnabled() ? 'on' : 'off'
}

function createRockSeed(): number {
  try {
    return window.crypto.getRandomValues(new Uint32Array(1))[0]
  } catch {
    return Math.floor(Math.random() * 4294967296)
  }
}

/**
 * 全站静态岩石细纹。保留 PaperCanvas 名称和背景节点 ID，兼容现有开关与视图过渡。
 * 每次挂载生成随机种子；站内跳转、主题切换、尺寸变化和开关操作均沿用该种子。
 */
export function PaperCanvas() {
  const backdropRef = useRef<HTMLDivElement>(null)
  const lightRef = useRef<HTMLCanvasElement>(null)
  const darkRef = useRef<HTMLCanvasElement>(null)
  const seedRef = useRef<number | null>(null)

  useEffect(() => {
    syncBackdropFxAttr()
    const node = backdropRef.current
    const lightCanvas = lightRef.current
    const darkCanvas = darkRef.current
    if (!node || !lightCanvas || !darkCanvas) return
    seedRef.current ??= createRockSeed()
    const seed = seedRef.current

    let lastSizeKey = ''
    let resizeTimer = 0
    let pendingDraw = 0
    let usesIdleCallback = false
    let disposed = false

    const cancelDraw = () => {
      if (!pendingDraw) return
      if (usesIdleCallback) window.cancelIdleCallback(pendingDraw)
      else window.clearTimeout(pendingDraw)
      pendingDraw = 0
    }

    const draw = () => {
      pendingDraw = 0
      if (disposed || document.hidden || document.documentElement.dataset.backdropFx === 'off') return
      const width = node.clientWidth
      const height = node.clientHeight
      const dpr = window.devicePixelRatio || 1
      const sizeKey = `${width}x${height}@${dpr}`
      if (width <= 0 || height <= 0 || sizeKey === lastSizeKey) return
      try {
        if (paintRockTexture(lightCanvas, darkCanvas, width, height, dpr, seed)) lastSizeKey = sizeKey
      } catch {
        // 装饰层绘制失败时退回站点底色，不影响正文和开关。
        lightCanvas.width = darkCanvas.width = 0
        lastSizeKey = ''
      }
    }

    const scheduleDraw = () => {
      cancelDraw()
      if (disposed || document.hidden || document.documentElement.dataset.backdropFx === 'off') return
      usesIdleCallback = typeof window.requestIdleCallback === 'function'
      pendingDraw = usesIdleCallback ? window.requestIdleCallback(draw, { timeout: 800 }) : window.setTimeout(draw, 0)
    }

    const handleResize = () => {
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(scheduleDraw, 180)
    }

    const handleFxChange = (event: Event) => {
      const custom = event as CustomEvent<{ enabled?: boolean }>
      if (typeof custom.detail?.enabled === 'boolean') {
        document.documentElement.dataset.backdropFx = custom.detail.enabled ? 'on' : 'off'
      } else {
        syncBackdropFxAttr()
      }
      scheduleDraw()
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === SITE_FX_STORAGE_KEY) {
        syncBackdropFxAttr()
        scheduleDraw()
      }
    }

    const observer = new ResizeObserver(handleResize)
    observer.observe(node)
    scheduleDraw()
    window.addEventListener('resize', handleResize, { passive: true })
    window.addEventListener(SITE_FX_CHANGE_EVENT, handleFxChange)
    window.addEventListener('storage', handleStorage)
    document.addEventListener('visibilitychange', scheduleDraw)
    return () => {
      disposed = true
      observer.disconnect()
      cancelDraw()
      window.clearTimeout(resizeTimer)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener(SITE_FX_CHANGE_EVENT, handleFxChange)
      window.removeEventListener('storage', handleStorage)
      document.removeEventListener('visibilitychange', scheduleDraw)
    }
  }, [])

  return (
    <div
      id="site-film-backdrop"
      ref={backdropRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 select-none transition-opacity duration-300 print:hidden"
    >
      <canvas ref={lightRef} className="pointer-events-none absolute inset-0 block size-full dark:hidden" />
      <canvas ref={darkRef} className="pointer-events-none absolute inset-0 hidden size-full dark:block" />
    </div>
  )
}
