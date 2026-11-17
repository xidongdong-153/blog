/**
 * 清晰发丝线卡片背景层。
 * 使用微发丝线边框、柔和偏移投影与极轻顶部微光建立纸面质感，保持前景排版边缘锐利。
 */
export function PaperSurface({ className = '' }: { className?: string }) {
  const hasCustomBg = /\bbg-/.test(className)
  const isPopover = /\bbg-popover\b/.test(className)
  const defaultBg = hasCustomBg ? '' : 'bg-card/88'

  return (
    <span
      aria-hidden="true"
      style={
        isPopover
          ? undefined
          : {
              backgroundImage:
                'linear-gradient(180deg, color-mix(in oklch, hsl(var(--primary)) 3.2%, transparent) 0%, transparent 28%)',
            }
      }
      className={`pointer-events-none absolute inset-0 -z-10 rounded-[inherit] border border-hair shadow-[var(--surface-shadow)] ring-1 ring-inset ring-white/45 dark:ring-white/[0.03] ${defaultBg} ${className}`.trim()}
    />
  )
}
