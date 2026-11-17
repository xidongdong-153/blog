/**
 * 清晰发丝线卡片背景层。
 * 使用微发丝线边框、柔和偏移投影与极轻内高光建立纸面质感，保持前景排版边缘锐利。
 */
export function PaperSurface({ className = '' }: { className?: string }) {
  const defaultBg = /\bbg-/.test(className) ? '' : 'bg-card/95'
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 -z-10 rounded-[inherit] border border-hair shadow-[var(--surface-shadow)] ring-1 ring-inset ring-white/45 dark:ring-white/[0.03] ${defaultBg} ${className}`.trim()}
    />
  )
}
