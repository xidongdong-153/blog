'use client'

import type { CSSProperties, HTMLAttributes } from 'react'
import type { MistMaskLayer, MistStratumKey } from './mist-texture'
import { useEffect, useRef, useState } from 'react'
import { sanitizeCssColor } from '@/lib/utils'
import { createBackdropSeed } from './backdrop-noise'
import { generateMistMaskLayers } from './mist-texture'
import { readBackdropFxEnabled, SITE_FX_CHANGE_EVENT, SITE_FX_STORAGE_KEY } from './paper-canvas'

interface AmbientBackdropProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * 自定义主高光色，默认读取 CSS 变量 --page-highlight（松烟浅青），支持文章页 heroColor 覆写。
   */
  color?: string
}

type AmbientBackdropStyle = CSSProperties & {
  '--ambient-primary': string
  '--ambient-secondary': string
  '--ambient-tertiary': string
  '--ambient-secondary-blend': string
}

const TOP_WASH_BACKGROUND =
  'linear-gradient(180deg, color-mix(in oklch, var(--ambient-primary) 12%, transparent) 0%, color-mix(in oklch, var(--ambient-primary) 4%, transparent) 16%, transparent 34%)'

const STRATUM_STYLE_MAP: Record<MistStratumKey, { animClass: string; colorVar: string }> = {
  'plume-a': {
    animClass: 'ambient-mist-plume-a',
    colorVar: 'var(--ambient-primary)',
  },
  'plume-b': {
    animClass: 'ambient-mist-plume-b',
    colorVar: 'var(--ambient-secondary-blend)',
  },
  ribbon: {
    animClass: 'ambient-mist-ribbon',
    colorVar: 'var(--ambient-tertiary)',
  },
  drift: {
    animClass: 'ambient-mist-drift',
    colorVar: 'var(--ambient-secondary)',
  },
}

/**
 * 页面首屏 Bokashi 顶光晕染与随机不规则呼吸雾岚氛围层。
 * 位于透明岩石细纹层之下（-z-20），首次挂载按随机种子生成四层域扭曲 fBm 不规则雾岚遮罩，
 * 结合极轻顶檐洗墨底光与互质长周期合成层呼吸漂移，避免任何椭圆或规则几何边界；
 * 默认取 --page-highlight（松烟浅青），支持单篇文章 heroColor 实时染色，并在专注阅读态定格降淡。
 */
export function AmbientBackdrop({ color, className = '', style, ...props }: AmbientBackdropProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const seedRef = useRef<number | null>(null)
  const ratioRef = useRef<number | null>(null)
  const [masks, setMasks] = useState<MistMaskLayer[] | null>(null)

  useEffect(() => {
    const node = rootRef.current
    if (!node) return

    seedRef.current ??= createBackdropSeed()
    const seed = seedRef.current
    let disposed = false
    let rafId = 0
    let resizeTimer = 0
    let isFxOn = readBackdropFxEnabled()

    const cancelPending = () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId)
        rafId = 0
      }
      window.clearTimeout(resizeTimer)
      resizeTimer = 0
    }

    const scheduleGenerate = (force = false) => {
      if (disposed || !isFxOn) return
      const width = node.clientWidth
      const height = node.clientHeight
      if (width <= 0 || height <= 0) return

      const ratio = width / height
      if (!force && ratioRef.current !== null) {
        const relDiff = Math.abs(ratio - ratioRef.current) / ratioRef.current
        if (relDiff < 0.2) return
      }

      if (rafId) window.cancelAnimationFrame(rafId)
      rafId = window.requestAnimationFrame(() => {
        rafId = 0
        if (disposed || !isFxOn) return
        try {
          const generated = generateMistMaskLayers(seed, width, height)
          if (generated && !disposed && isFxOn) {
            ratioRef.current = ratio
            setMasks(generated)
          }
        } catch {
          // 画布不可用时保留柔和顶檐底洗兜底
        }
      })
    }

    const applyFxState = (next: boolean) => {
      isFxOn = next
      if (isFxOn) {
        scheduleGenerate(false)
      } else {
        cancelPending()
      }
    }

    const handleFxChange = (event: Event) => {
      const custom = event as CustomEvent<{ enabled?: boolean }>
      applyFxState(typeof custom.detail?.enabled === 'boolean' ? custom.detail.enabled : readBackdropFxEnabled())
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === SITE_FX_STORAGE_KEY) {
        applyFxState(readBackdropFxEnabled())
      }
    }

    const handleResize = () => {
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => {
        if (!disposed && isFxOn) {
          scheduleGenerate(false)
        }
      }, 220)
    }

    const observer = new ResizeObserver(handleResize)
    observer.observe(node)
    if (isFxOn) scheduleGenerate(true)

    window.addEventListener(SITE_FX_CHANGE_EVENT, handleFxChange)
    window.addEventListener('storage', handleStorage)

    return () => {
      disposed = true
      observer.disconnect()
      cancelPending()
      window.removeEventListener(SITE_FX_CHANGE_EVENT, handleFxChange)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  const safeColor = sanitizeCssColor(color)
  const primaryGlow = safeColor ?? 'var(--page-highlight, #6fa996)'
  const secondaryGlow = `color-mix(in oklch, ${primaryGlow} 50%, var(--page-highlight-secondary, #b9ccc0))`
  const tertiaryGlow = `color-mix(in oklch, ${primaryGlow} 76%, var(--page-highlight-secondary, #b9ccc0))`
  const secondaryBlendGlow = `color-mix(in oklch, ${primaryGlow} 68%, var(--page-highlight-secondary, #b9ccc0))`

  const backdropStyle: AmbientBackdropStyle = {
    '--ambient-primary': primaryGlow,
    '--ambient-secondary': secondaryGlow,
    '--ambient-tertiary': tertiaryGlow,
    '--ambient-secondary-blend': secondaryBlendGlow,
    ...style,
  }

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 top-0 -z-20 isolate h-[min(62vh,552px)] overflow-hidden opacity-[0.3] transition-opacity duration-500 dark:opacity-[0.39] print:hidden ${className}`}
      style={backdropStyle}
      {...props}
    >
      <div
        className="ambient-mist-layer ambient-mist-wash pointer-events-none absolute inset-0"
        style={{ backgroundImage: TOP_WASH_BACKGROUND }}
      />
      <div
        className={`pointer-events-none absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none ${
          masks ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {masks?.map((layer) => {
          const meta = STRATUM_STYLE_MAP[layer.key]
          return (
            <div
              key={layer.key}
              className={`ambient-mist-layer pointer-events-none absolute -inset-x-[12%] -top-[10%] -bottom-[8%] ${meta.animClass}`}
              style={{
                backgroundColor: meta.colorVar,
                maskImage: `url(${layer.maskUrl})`,
                WebkitMaskImage: `url(${layer.maskUrl})`,
                maskSize: '100% 100%',
                WebkitMaskSize: '100% 100%',
                maskRepeat: 'no-repeat',
                WebkitMaskRepeat: 'no-repeat',
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
