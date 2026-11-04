'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Toaster } from 'sonner'
import { TooltipProvider } from './ui/tooltip'

export function AdminUiProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  useEffect(() => {
    const root = document.documentElement
    const sync = () => setTheme(root.classList.contains('dark') ? 'dark' : 'light')
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])
  return (
    <TooltipProvider delayDuration={350} skipDelayDuration={100}>
      {children}
      <Toaster
        theme={theme}
        containerAriaLabel="通知"
        position="bottom-right"
        closeButton
        duration={3500}
        visibleToasts={3}
        offset={24}
        mobileOffset={16}
        toastOptions={{
          closeButtonAriaLabel: '关闭通知',
          style: {
            background: 'hsl(var(--popover))',
            color: 'hsl(var(--popover-foreground))',
            borderColor: 'hsl(var(--border))',
            fontFamily: 'inherit',
          },
          classNames: {
            actionButton: '!bg-primary !text-primary-foreground',
            closeButton: '!border-border !bg-popover !text-popover-foreground',
          },
        }}
      />
    </TooltipProvider>
  )
}
