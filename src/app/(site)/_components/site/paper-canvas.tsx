'use client'

import type { RockScene } from './rock-texture'
import { useEffect, useRef } from 'react'
import { createRockScene, paintRockTexture } from './rock-texture'

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
 * 全站岩石细纹背景。保留 PaperCanvas 名称和背景节点 ID，兼容现有开关与视图过渡。
 * 进入页面或重新开启特效时从 0 到 1 裂开延展，完成后定格为静态纹理；
 * 每次挂载生成随机种子，站内跳转、主题切换和尺寸变化沿用同一种子。
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

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    let scene: RockScene | null = null
    let sceneSizeKey = ''
    let settledSizeKey = ''
    let animProgress = 0
    let isSettled = false
    let lastFrameTime = 0
    let resizeTimer = 0
    let startFrame = 0
    let animFrame = 0
    let disposed = false
    let isFxOn = document.documentElement.dataset.backdropFx !== 'off'

    const isDarkActive = () => document.documentElement.classList.contains('dark')
    const isThemeTransitioning = () => document.documentElement.dataset.themeTransition === 'true'

    const cancelStart = () => {
      if (!startFrame) return
      window.cancelAnimationFrame(startFrame)
      startFrame = 0
    }

    const cancelAnim = () => {
      if (!animFrame) return
      window.cancelAnimationFrame(animFrame)
      animFrame = 0
    }

    const disposeScene = () => {
      scene?.dispose()
      scene = null
      sceneSizeKey = ''
    }

    const clearCanvases = () => {
      lightCanvas.width = darkCanvas.width = 0
      settledSizeKey = ''
    }

    const getViewportMetrics = () => {
      const width = node.clientWidth
      const height = node.clientHeight
      const rawDpr = window.devicePixelRatio
      const dpr = Number.isFinite(rawDpr) && rawDpr > 0 ? rawDpr : 1
      return { width, height, dpr, sizeKey: `${width}x${height}@${dpr}` }
    }

    const ensureScene = (): boolean => {
      const { width, height, dpr, sizeKey } = getViewportMetrics()
      if (width <= 0 || height <= 0) return false
      if (scene && sceneSizeKey === sizeKey) return true

      disposeScene()
      const next = createRockScene(width, height, dpr, seed, animProgress)
      if (!next) return false
      scene = next
      sceneSizeKey = sizeKey
      return true
    }

    const paintSettled = () => {
      cancelStart()
      cancelAnim()
      animProgress = 1
      isSettled = true
      lastFrameTime = 0
      if (disposed || document.hidden || !isFxOn) return
      const { width, height, dpr, sizeKey } = getViewportMetrics()
      if (width <= 0 || height <= 0 || settledSizeKey === sizeKey) return

      try {
        if (scene && sceneSizeKey === sizeKey) {
          scene.clearParticles()
          scene.render(lightCanvas, false, 1)
          scene.render(darkCanvas, true, 1)
          settledSizeKey = sizeKey
          disposeScene()
          return
        }
        disposeScene()
        if (paintRockTexture(lightCanvas, darkCanvas, width, height, dpr, seed)) {
          settledSizeKey = sizeKey
        }
      } catch {
        // 装饰层绘制失败时退回站点底色，不影响正文和开关。
        disposeScene()
        clearCanvases()
      }
    }

    const step = (now: number) => {
      animFrame = 0
      if (disposed || document.hidden || !isFxOn || isThemeTransitioning()) {
        lastFrameTime = 0
        return
      }
      if (reducedMotionQuery.matches || isSettled) {
        paintSettled()
        return
      }

      try {
        if (!ensureScene() || !scene) return
        const dtMs = lastFrameTime > 0 ? Math.min(100, Math.max(0, now - lastFrameTime)) : 0
        lastFrameTime = now
        const durationMs = scene.totalDurationMs > 0 ? scene.totalDurationMs : 1400
        animProgress = Math.min(1, animProgress + dtMs / durationMs)
        const hasActiveParticles = scene.stepParticles(dtMs / 1000, animProgress)

        if (animProgress >= 1 && !hasActiveParticles) {
          paintSettled()
          return
        }

        const dark = isDarkActive()
        scene.render(dark ? darkCanvas : lightCanvas, dark, animProgress)
        animFrame = window.requestAnimationFrame(step)
      } catch {
        disposeScene()
        clearCanvases()
      }
    }

    const scheduleRun = () => {
      cancelStart()
      cancelAnim()
      lastFrameTime = 0
      if (disposed || document.hidden || !isFxOn || isThemeTransitioning()) return

      startFrame = window.requestAnimationFrame((startNow) => {
        startFrame = 0
        if (disposed || document.hidden || !isFxOn || isThemeTransitioning()) return
        if (reducedMotionQuery.matches || isSettled) {
          paintSettled()
          return
        }
        try {
          if (!ensureScene() || !scene) return
          scene.stepParticles(0, animProgress)
          const dark = isDarkActive()
          scene.render(dark ? darkCanvas : lightCanvas, dark, animProgress)
          lastFrameTime = startNow
          animFrame = window.requestAnimationFrame(step)
        } catch {
          disposeScene()
          clearCanvases()
        }
      })
    }

    const handleResize = () => {
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => {
        if (disposed || document.hidden || !isFxOn) return
        const { width, height, sizeKey } = getViewportMetrics()
        if (width <= 0 || height <= 0) return

        if (isSettled) {
          if (settledSizeKey !== sizeKey) paintSettled()
          return
        }
        if (sceneSizeKey !== sizeKey) {
          try {
            if (!ensureScene() || !scene) return
            const dark = isDarkActive()
            ;(dark ? lightCanvas : darkCanvas).width = 0
            scene.render(dark ? darkCanvas : lightCanvas, dark, animProgress)
            if (!animFrame && !startFrame && !isThemeTransitioning()) scheduleRun()
          } catch {
            disposeScene()
            clearCanvases()
          }
        }
      }, 180)
    }

    const applyFxState = (nextEnabled: boolean) => {
      if (nextEnabled === isFxOn) {
        if (nextEnabled && !document.hidden) {
          if (isSettled) paintSettled()
          else if (!animFrame && !startFrame && !isThemeTransitioning()) scheduleRun()
        }
        return
      }

      isFxOn = nextEnabled
      if (!nextEnabled) {
        cancelStart()
        cancelAnim()
        disposeScene()
        settledSizeKey = ''
        animProgress = 0
        isSettled = false
        lastFrameTime = 0
        return
      }

      disposeScene()
      clearCanvases()
      animProgress = 0
      isSettled = false
      lastFrameTime = 0
      if (!document.hidden && !reducedMotionQuery.matches) {
        try {
          if (ensureScene() && scene) {
            const dark = isDarkActive()
            scene.render(dark ? darkCanvas : lightCanvas, dark, 0)
          }
        } catch {
          disposeScene()
          clearCanvases()
        }
      }
      scheduleRun()
    }

    const handleFxChange = (event: Event) => {
      const custom = event as CustomEvent<{ enabled?: boolean }>
      const nextEnabled = typeof custom.detail?.enabled === 'boolean' ? custom.detail.enabled : readBackdropFxEnabled()
      document.documentElement.dataset.backdropFx = nextEnabled ? 'on' : 'off'
      applyFxState(nextEnabled)
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === SITE_FX_STORAGE_KEY) {
        syncBackdropFxAttr()
        applyFxState(document.documentElement.dataset.backdropFx !== 'off')
      }
    }

    const handleVisibility = () => {
      if (document.hidden) {
        cancelStart()
        cancelAnim()
        lastFrameTime = 0
        return
      }
      if (!isFxOn) return
      if (isSettled) paintSettled()
      else scheduleRun()
    }

    const handleMotionChange = () => {
      if (reducedMotionQuery.matches && isFxOn && !isSettled) {
        paintSettled()
      }
    }

    const themeObserver = new MutationObserver(() => {
      if (disposed || document.hidden || !isFxOn || isSettled) return
      if (reducedMotionQuery.matches) {
        paintSettled()
        return
      }
      try {
        if (!ensureScene() || !scene) return
        const dark = isDarkActive()
        scene.render(dark ? darkCanvas : lightCanvas, dark, animProgress)
        if (isThemeTransitioning()) {
          cancelStart()
          cancelAnim()
          lastFrameTime = 0
        } else if (!animFrame && !startFrame) {
          scheduleRun()
        }
      } catch {
        disposeScene()
        clearCanvases()
      }
    })
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme-transition'],
    })

    const observer = new ResizeObserver(handleResize)
    observer.observe(node)
    if (isFxOn && !document.hidden) scheduleRun()
    window.addEventListener('resize', handleResize, { passive: true })
    window.addEventListener(SITE_FX_CHANGE_EVENT, handleFxChange)
    window.addEventListener('storage', handleStorage)
    document.addEventListener('visibilitychange', handleVisibility)
    reducedMotionQuery.addEventListener('change', handleMotionChange)

    return () => {
      disposed = true
      themeObserver.disconnect()
      observer.disconnect()
      cancelStart()
      cancelAnim()
      disposeScene()
      window.clearTimeout(resizeTimer)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener(SITE_FX_CHANGE_EVENT, handleFxChange)
      window.removeEventListener('storage', handleStorage)
      document.removeEventListener('visibilitychange', handleVisibility)
      reducedMotionQuery.removeEventListener('change', handleMotionChange)
    }
  }, [])

  return (
    <div
      id="site-film-backdrop"
      ref={backdropRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 select-none transition-opacity duration-300 motion-reduce:transition-none print:hidden"
    >
      <canvas ref={lightRef} className="pointer-events-none absolute inset-0 block size-full dark:hidden" />
      <canvas ref={darkRef} className="pointer-events-none absolute inset-0 hidden size-full dark:block" />
    </div>
  )
}
