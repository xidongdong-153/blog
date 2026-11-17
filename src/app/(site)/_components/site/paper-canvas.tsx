'use client'

import { useEffect, useRef } from 'react'

export const SITE_FX_STORAGE_KEY = 'site-backdrop-fx'
export const SITE_FX_CHANGE_EVENT = 'site-fx-change'

const GRAIN_TILE_SIZE = 211

/**
 * 无 Canvas 环境下的高对比 SVG 微噪点兜底底纹。
 * 通过 feComponentTransfer 拉伸 feTurbulence 动态范围，并控制低透明度避免画面发灰。
 */
const FILM_GRAIN_FALLBACK_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180' viewBox='0 0 180 180'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3CfeComponentTransfer%3E%3CfeFuncR type='linear' slope='3.2' intercept='-1.1'/%3E%3CfeFuncG type='linear' slope='3.2' intercept='-1.1'/%3E%3CfeFuncB type='linear' slope='3.2' intercept='-1.1'/%3E%3CfeFuncA type='discrete' tableValues='0.045'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23g)'/%3E%3C/svg%3E\")"

interface FiberLayerSpec {
  isDark: boolean
  seed: number
}

function createMulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * 在全视口静态 Canvas 上一次性绘制无平铺接缝的和纸长纤维与微米纸屑，
 * 避免小尺寸平铺在宽屏上产生重复图案，并保持零 rAF 循环开销。
 */
function paintViewportWashiFibers(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  dpr: number,
  spec: FiberLayerSpec,
) {
  const ctx = canvas.getContext('2d')
  if (!ctx || width <= 0 || height <= 0) return

  const pixelWidth = Math.max(1, Math.round(width * dpr))
  const pixelHeight = Math.max(1, Math.round(height * dpr))
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth
    canvas.height = pixelHeight
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width, height)

  const rand = createMulberry32(spec.seed)
  const area = width * height

  // 1. 深色模式保留极淡冷青雾斑增加空间深度；浅色模式保持暖宣石底色洁净，不叠加圆形白斑
  if (spec.isDark) {
    const glowCount = Math.max(5, Math.round(area / 180000))
    for (let i = 0; i < glowCount; i++) {
      const cx = rand() * width
      const cy = rand() * height
      const radius = 140 + rand() * 200
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
      grad.addColorStop(0, `rgba(145, 195, 178, ${(0.01 + rand() * 0.01).toFixed(4)})`)
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // 2. 和纸长纤维弯曲丝线（按视口面积密度分布，完全不重复）
  ctx.lineCap = 'round'
  const fiberCount = Math.min(820, Math.max(110, Math.round(area / 4000)))
  for (let i = 0; i < fiberCount; i++) {
    const x1 = rand() * width
    const y1 = rand() * height
    const len = 22 + rand() ** 1.8 * 96
    const angle = rand() * Math.PI * 2
    const x2 = x1 + Math.cos(angle) * len
    const y2 = y1 + Math.sin(angle) * len
    const bend = (rand() - 0.5) * len * 0.44
    const cpx = (x1 + x2) * 0.5 - Math.sin(angle) * bend
    const cpy = (y1 + y2) * 0.5 + Math.cos(angle) * bend

    const isBrightFiber = rand() < (spec.isDark ? 0.46 : 0.6)
    ctx.strokeStyle = spec.isDark
      ? isBrightFiber
        ? `rgba(196, 224, 214, ${(0.032 + rand() * 0.036).toFixed(4)})`
        : `rgba(4, 7, 6, ${(0.12 + rand() * 0.14).toFixed(4)})`
      : isBrightFiber
        ? `rgba(255, 255, 255, ${(0.42 + rand() * 0.3).toFixed(4)})`
        : `rgba(88, 84, 72, ${(0.03 + rand() * 0.036).toFixed(4)})`
    ctx.lineWidth = 0.4 + rand() * 0.5

    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.quadraticCurveTo(cpx, cpy, x2, y2)
    ctx.stroke()
  }

  // 3. 微米级矿物纸屑微点
  const fleckCount = Math.min(220, Math.max(24, Math.round(area / 21000)))
  for (let i = 0; i < fleckCount; i++) {
    const fx = rand() * width
    const fy = rand() * height
    const rx = 0.45 + rand() * 0.8
    const ry = rx * (0.45 + rand() * 0.55)
    const rot = rand() * Math.PI

    ctx.fillStyle = spec.isDark
      ? `rgba(170, 198, 186, ${(0.035 + rand() * 0.045).toFixed(4)})`
      : `rgba(92, 86, 72, ${(0.042 + rand() * 0.045).toFixed(4)})`

    ctx.beginPath()
    ctx.ellipse(fx, fy, rx, ry, rot, 0, Math.PI * 2)
    ctx.fill()
  }
}

/**
 * 生成物理像素级双极性胶片微噪点纹理（对称三角分布，保持暖宣石明亮透润的同时呈现细腻颗粒）。
 */
function buildFilmGrainTileUri(isDark: boolean, dpr: number): string | null {
  const pxSize = Math.max(1, Math.round(GRAIN_TILE_SIZE * dpr))
  const canvas = document.createElement('canvas')
  canvas.width = pxSize
  canvas.height = pxSize
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const imageData = ctx.createImageData(pxSize, pxSize)
  const data = imageData.data
  const rand = createMulberry32(isDark ? 0x9e3779b1 : 0x6a09e667)

  const darkR = isDark ? 0 : 92
  const darkG = isDark ? 0 : 86
  const darkB = isDark ? 0 : 72
  const lightR = isDark ? 216 : 255
  const lightG = isDark ? 232 : 255
  const lightB = isDark ? 224 : 252

  // 浅色保留近四成纯净底色像素，用暖茶灰微粒保证颗粒清晰却不发灰；深色沿用松烟微粒
  const threshold = isDark ? 0.08 : 0.22
  const maxDarkAlpha = isDark ? 34 : 11
  const maxLightAlpha = isDark ? 14 : 30

  for (let i = 0; i < data.length; i += 4) {
    const v = rand() - rand()
    if (Math.abs(v) < threshold) {
      data[i + 3] = 0
      continue
    }

    if (v < 0) {
      data[i] = darkR
      data[i + 1] = darkG
      data[i + 2] = darkB
      data[i + 3] = Math.round(-v * maxDarkAlpha)
    } else {
      data[i] = lightR
      data[i + 1] = lightG
      data[i + 2] = lightB
      data[i + 3] = Math.round(v * maxLightAlpha)
    }
  }

  ctx.putImageData(imageData, 0, 0)
  return `url("${canvas.toDataURL('image/png')}")`
}

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

/**
 * 全局静态和纸纤维与胶片微噪点底纹组件。
 * - 纤维层采用明/暗双静态全视口 Canvas（仅挂载与窗口变化时绘制一次，无平铺接缝、无 rAF 循环）
 * - 噪点层采用 DPR 感知的物理像素双极性胶片颗粒，叠放于 AmbientBackdrop 之上
 * - 配合根布局防闪烁脚本与页脚开关即时联动显隐
 */
export function PaperCanvas() {
  const backdropRef = useRef<HTMLDivElement>(null)
  const lightFiberRef = useRef<HTMLCanvasElement>(null)
  const darkFiberRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    syncBackdropFxAttr()

    const node = backdropRef.current
    const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 1), 2)

    if (node) {
      const lightGrain = buildFilmGrainTileUri(false, dpr)
      const darkGrain = buildFilmGrainTileUri(true, dpr)
      if (lightGrain) node.style.setProperty('--paper-grain-light', lightGrain)
      if (darkGrain) node.style.setProperty('--paper-grain-dark', darkGrain)
    }

    let lastSizeKey = ''
    const renderFibers = () => {
      if (!node) return
      const width = node.clientWidth || window.innerWidth
      const height = node.clientHeight || window.innerHeight
      const currentDpr = Math.min(Math.max(window.devicePixelRatio || 1, 1), 2)
      const sizeKey = `${width}x${height}@${currentDpr}`
      if (sizeKey === lastSizeKey || width <= 0 || height <= 0) return
      lastSizeKey = sizeKey

      if (lightFiberRef.current) {
        paintViewportWashiFibers(lightFiberRef.current, width, height, currentDpr, { isDark: false, seed: 1031 })
      }
      if (darkFiberRef.current) {
        paintViewportWashiFibers(darkFiberRef.current, width, height, currentDpr, { isDark: true, seed: 2029 })
      }
    }

    renderFibers()

    let resizeTimer = 0
    const handleResize = () => {
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(renderFibers, 180)
    }

    const handleFxChange = (event: Event) => {
      const custom = event as CustomEvent<{ enabled?: boolean }>
      if (typeof custom.detail?.enabled === 'boolean') {
        document.documentElement.dataset.backdropFx = custom.detail.enabled ? 'on' : 'off'
      } else {
        syncBackdropFxAttr()
      }
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === SITE_FX_STORAGE_KEY) {
        syncBackdropFxAttr()
      }
    }

    window.addEventListener('resize', handleResize, { passive: true })
    window.addEventListener(SITE_FX_CHANGE_EVENT, handleFxChange)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.clearTimeout(resizeTimer)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener(SITE_FX_CHANGE_EVENT, handleFxChange)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  return (
    <div
      id="site-film-backdrop"
      ref={backdropRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 select-none transition-opacity duration-300 print:hidden"
    >
      {/* 全视口静态和纸纤维层（浅色 / 深色同步切换，零延迟适配 View Transitions） */}
      <canvas ref={lightFiberRef} className="pointer-events-none absolute inset-0 block size-full dark:hidden" />
      <canvas ref={darkFiberRef} className="pointer-events-none absolute inset-0 hidden size-full dark:block" />

      {/* 物理像素胶片微噪点层（互质尺寸平铺，SVG 高对比方案兜底） */}
      <span
        className="absolute inset-0 block dark:hidden"
        style={{
          backgroundImage: `var(--paper-grain-light, ${FILM_GRAIN_FALLBACK_URI})`,
          backgroundRepeat: 'repeat',
          backgroundSize: `${GRAIN_TILE_SIZE}px ${GRAIN_TILE_SIZE}px`,
        }}
      />
      <span
        className="absolute inset-0 hidden dark:block"
        style={{
          backgroundImage: `var(--paper-grain-dark, ${FILM_GRAIN_FALLBACK_URI})`,
          backgroundRepeat: 'repeat',
          backgroundSize: `${GRAIN_TILE_SIZE}px ${GRAIN_TILE_SIZE}px`,
        }}
      />
    </div>
  )
}
