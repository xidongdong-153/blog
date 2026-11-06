import * as React from 'react'
import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex field-sizing-content min-h-16 w-full rounded-md border-0 bg-muted/40 px-3 py-2 text-base shadow-none transition-colors duration-(--ui-duration) motion-reduce:transition-none outline-none placeholder:text-muted-foreground hover:bg-muted/60 focus:bg-muted/50 focus:outline-none focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'aria-invalid:text-destructive dark:aria-invalid:text-destructive',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
