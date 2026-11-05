'use client'

import type { CSSProperties, ReactNode } from 'react'
import { Theme } from '@radix-ui/themes'
import { useEffect, useState } from 'react'
import '@radix-ui/themes/styles.css'

const themeTokens = {
  '--default-font-family': 'var(--font-satoshi), sans-serif',
  '--heading-font-family': 'var(--font-serif), serif',
  '--color-background': 'hsl(var(--background))',
  '--color-panel-solid': 'hsl(var(--card))',
  '--color-panel-translucent': 'hsl(var(--card))',
  '--color-surface': 'hsl(var(--background))',
  '--gray-12': 'hsl(var(--foreground))',
  '--gray-11': 'hsl(var(--muted-foreground))',
  '--gray-6': 'hsl(var(--border))',
  '--accent-9': 'hsl(var(--primary))',
  '--accent-contrast': 'hsl(var(--primary-foreground))',
  minHeight: 0,
} as CSSProperties

/** 将组件库主题限制在 AI 界面内，并跟随站点明暗主题。 */
export function AiThemeProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearance] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const root = document.documentElement
    const sync = () => setAppearance(root.classList.contains('dark') ? 'dark' : 'light')
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return (
    <Theme
      appearance={appearance}
      accentColor="blue"
      grayColor="sand"
      radius="medium"
      panelBackground="solid"
      hasBackground={false}
      className="!min-h-0 min-w-0 text-foreground"
      style={themeTokens}
    >
      {children}
    </Theme>
  )
}
