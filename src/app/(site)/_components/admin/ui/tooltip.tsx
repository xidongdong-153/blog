'use client'

import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import * as React from 'react'
import { cn } from '@/lib/utils'
import { OverlayMotionRoot, useOverlayContent, useOverlayTrigger } from './overlay-motion'

function TooltipProvider({ delayDuration = 0, ...props }: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return <TooltipPrimitive.Provider data-slot="tooltip-provider" delayDuration={delayDuration} {...props} />
}

function Tooltip({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <OverlayMotionRoot>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </OverlayMotionRoot>
  )
}

function TooltipTrigger({ ref, ...props }: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  const motionRef = useOverlayTrigger(ref)
  return <TooltipPrimitive.Trigger ref={motionRef} data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ref,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  const motionRef = useOverlayContent(ref)
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        ref={motionRef}
        sideOffset={sideOffset}
        className={cn(
          'admin-overlay-motion z-[80] w-fit rounded-md bg-foreground px-3 py-1.5 text-xs text-balance text-background',
          className,
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="z-[80] size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px] bg-foreground fill-foreground" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
