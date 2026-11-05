'use client'

import type { ComponentProps, PointerEvent } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { useRef } from 'react'
import { cn } from '@/lib/utils'

/**
 * React Bits 风格聚光灯卡片（SpotlightCard）。
 * 跟踪指针位置并通过 CSS 变量驱动柔和径向微光，不触发 React 重渲染。
 */
export function SpotlightCard({
  className,
  asChild = false,
  onPointerMove,
  ...props
}: ComponentProps<'div'> & {
  asChild?: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const Component = asChild ? Slot : 'div'

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const node = containerRef.current ?? event.currentTarget
    const rect = node.getBoundingClientRect()
    node.style.setProperty('--spotlight-x', `${event.clientX - rect.left}px`)
    node.style.setProperty('--spotlight-y', `${event.clientY - rect.top}px`)
    onPointerMove?.(event)
  }

  return (
    <Component
      ref={containerRef}
      data-slot="spotlight-card"
      onPointerMove={handlePointerMove}
      className={cn(
        'group/spotlight relative overflow-hidden rounded-xl border border-border bg-card transition-[border-color,box-shadow] duration-(--ui-duration) ease-(--ui-ease)',
        'before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-[radial-gradient(280px_circle_at_var(--spotlight-x,50%)_var(--spotlight-y,50%),hsl(var(--primary)/0.09),transparent_75%)] before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100 motion-reduce:before:hidden',
        className,
      )}
      {...props}
    />
  )
}
