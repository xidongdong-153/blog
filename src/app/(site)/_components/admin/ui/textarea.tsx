import * as React from 'react'
import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex field-sizing-content min-h-16 w-full rounded-md border border-hair bg-muted/45 px-3 py-2 text-base shadow-none transition-[background-color,border-color,color] duration-(--ui-duration) motion-reduce:transition-none outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground hover:bg-muted/65 focus:border-primary/45 focus:bg-card/90 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'aria-invalid:border-destructive/60 aria-invalid:text-destructive dark:aria-invalid:text-destructive',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
