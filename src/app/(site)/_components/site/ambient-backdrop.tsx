interface AmbientBackdropProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * 自定义主高光色，默认读取 CSS 变量 --page-highlight（松烟浅青），支持文章页 heroColor 覆写。
   */
  color?: string
}

/**
 * 页面首屏双椭圆氛围光底座。
 * 采用错落双椭圆径向渐变向底色平滑衰减，营造静谧温润的空气感层次。
 */
export function AmbientBackdrop({ color, className = '', ...props }: AmbientBackdropProps) {
  const primaryGlow = color || 'var(--page-highlight, #6fa996)'
  const secondaryGlow = 'var(--page-highlight-secondary, #b9ccc0)'

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 top-0 z-0 h-screen overflow-hidden opacity-24 transition-opacity duration-300 dark:opacity-22 ${className}`}
      style={{
        backgroundImage: [
          `radial-gradient(ellipse 68% 48% at 26% -12%, ${primaryGlow}, transparent 72%)`,
          `radial-gradient(ellipse 58% 42% at 78% 6%, ${secondaryGlow}, transparent 74%)`,
        ].join(', '),
      }}
      {...props}
    />
  )
}
