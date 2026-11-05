import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/**
 * React Bits 风格流光边框容器（StarBorder）。
 * 当 active 为 true 时在上下边缘呈现柔和的星轨流光，用于流式生成或运行中的 Tool 卡片。
 */
export function StarBorder({
  active = false,
  className,
  contentClassName,
  children,
  ...props
}: ComponentProps<'div'> & {
  active?: boolean
  contentClassName?: string
}) {
  return (
    <div
      data-slot="star-border"
      data-active={active ? 'true' : 'false'}
      className={cn(
        'relative overflow-hidden rounded-xl p-px transition-colors duration-(--ui-duration)',
        active ? 'bg-primary/25 shadow-[0_0_20px_-6px_hsl(var(--primary)/0.22)]' : 'bg-border',
        className,
      )}
      {...props}
    >
      {active && (
        <>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-[-220%] bottom-[-10px] z-0 h-[55%] w-[300%] animate-rb-star-movement-bottom rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.55),transparent_18%)] motion-reduce:hidden"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-[-10px] left-[-220%] z-0 h-[55%] w-[300%] animate-rb-star-movement-top rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.55),transparent_18%)] motion-reduce:hidden"
          />
        </>
      )}
      <div className={cn('relative z-1 min-w-0 rounded-[calc(var(--radius)+3px)] bg-background', contentClassName)}>
        {children}
      </div>
    </div>
  )
}
