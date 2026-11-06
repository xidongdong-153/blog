import * as React from 'react'
import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-11 w-full min-w-0 rounded-md border-0 bg-muted/40 px-3 py-1 text-base shadow-none transition-colors duration-(--ui-duration) motion-reduce:transition-none outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground hover:bg-muted/60 focus:bg-muted/50 focus:outline-none focus-visible:outline-none focus-visible:ring-0 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'aria-invalid:text-destructive dark:aria-invalid:text-destructive',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
