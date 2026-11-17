import * as React from 'react'
import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-11 w-full min-w-0 rounded-md border border-hair bg-muted/45 px-3 py-1 text-base shadow-none transition-[background-color,border-color,color] duration-(--ui-duration) motion-reduce:transition-none outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground hover:bg-muted/65 focus:border-primary/45 focus:bg-card/90 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'aria-invalid:border-destructive/60 aria-invalid:text-destructive dark:aria-invalid:text-destructive',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
