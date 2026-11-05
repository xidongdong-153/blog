import type { ComponentProps } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/lib/utils'

/**
 * React Bits 风格流光文字组件（ShinyText）。
 * 用于 AI 思考中、Tool 流式执行或生成等待态，支持 prefers-reduced-motion 自动降级为静态文字。
 */
export function ShinyText({
  className,
  disabled = false,
  asChild = false,
  ...props
}: ComponentProps<'span'> & {
  disabled?: boolean
  asChild?: boolean
}) {
  const Component = asChild ? Slot : 'span'
  return (
    <Component
      data-slot="shiny-text"
      className={cn(
        'inline-block',
        !disabled &&
          'animate-rb-shiny bg-[linear-gradient(110deg,hsl(var(--muted-foreground))_35%,hsl(var(--foreground))_50%,hsl(var(--muted-foreground))_65%)] bg-[length:200%_100%] bg-clip-text text-transparent motion-reduce:animate-none motion-reduce:bg-none motion-reduce:text-muted-foreground',
        disabled && 'text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}
