import { sanitizeCssColor } from '@/lib/utils'

interface AmbientBackdropProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * 自定义主高光色，默认读取 CSS 变量 --page-highlight（松烟浅青），支持文章页 heroColor 覆写。
   */
  color?: string
}

/**
 * 页面首屏 Bokashi 顶光晕染与错落氛围光底座。
 * 位于透明岩石细纹层之下（-z-20），通过顶部洗墨渐变、双侧错落椭圆与底部柔和遮罩消隐，
 * 使氛围光自然透出岩石细纹并支持单篇文章 heroColor 动态染色（含非法色值容错回退）。
 */
export function AmbientBackdrop({ color, className = '', ...props }: AmbientBackdropProps) {
  const safeColor = sanitizeCssColor(color)
  const primaryGlow = safeColor ?? 'var(--page-highlight, #6fa996)'
  const secondaryGlow = `color-mix(in oklch, ${primaryGlow} 38%, var(--page-highlight-secondary, #b9ccc0))`
  const bottomFadeMask = 'linear-gradient(to bottom, #000 0%, #000 48%, transparent 100%)'

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 top-0 -z-20 h-[min(104vh,920px)] overflow-hidden opacity-[0.24] transition-opacity duration-300 dark:opacity-[0.34] print:hidden ${className}`}
      style={{
        maskImage: bottomFadeMask,
        WebkitMaskImage: bottomFadeMask,
        backgroundImage: [
          `linear-gradient(180deg, color-mix(in oklch, ${primaryGlow} 26%, transparent) 0%, color-mix(in oklch, ${primaryGlow} 9%, transparent) 20%, transparent 46%)`,
          `radial-gradient(ellipse 68% 50% at 16% -12%, color-mix(in oklch, ${primaryGlow} 76%, transparent), color-mix(in oklch, ${primaryGlow} 20%, transparent) 44%, transparent 72%)`,
          `radial-gradient(ellipse 56% 42% at 84% 6%, color-mix(in oklch, ${secondaryGlow} 68%, transparent), color-mix(in oklch, ${secondaryGlow} 16%, transparent) 46%, transparent 74%)`,
        ].join(', '),
      }}
      {...props}
    />
  )
}
