interface AmbientBackdropProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * 自定义高光色，默认为空时自动读取 CSS 变量 --page-highlight，或回退到 primary 主色。
   * 支持 hex / rgb / hsl / 命名颜色。
   */
  color?: string
}

/**
 * 页面首屏顶光氛围渐变底座。
 * 贴合页面顶部（100vh），自上而下向底层背景淡出，提供环境光氛围。
 * 设为 pointer-events-none 保证所有鼠标交互完全穿透。
 */
export function AmbientBackdrop({ color, className = '', ...props }: AmbientBackdropProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 top-0 z-0 h-screen overflow-hidden opacity-20 dark:opacity-25 ${className}`}
      style={{
        backgroundImage: `linear-gradient(${color || 'var(--page-highlight, hsl(var(--primary)))'}, transparent)`,
      }}
      {...props}
    />
  )
}
