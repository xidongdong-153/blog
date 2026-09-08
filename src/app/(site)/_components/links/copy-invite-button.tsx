'use client'

import { useState } from 'react'
import { siteConfig } from '@/site.config'

interface CopyInviteButtonProps {
  className?: string
}

/**
 * 复制友链邀请链接按钮
 * 点击后将 /links/apply 绝对链接写入剪贴板
 */
export function CopyInviteButton({ className }: CopyInviteButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : siteConfig.url
    const inviteUrl = `${origin}/links/apply`

    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(setCopied, 2000, false)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={
        className ||
        'inline-flex w-fit items-center gap-1.5 rounded-md border border-border/60 bg-muted/30 px-3 py-2 font-mono text-xs text-foreground motion-safe:transition-colors hover:border-foreground/30 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
      }
    >
      <span>{copied ? '已复制邀请链接' : '复制邀请链接'}</span>
      <span aria-hidden="true" className="font-mono text-[11px] opacity-70">
        {copied ? '✓' : '⎘'}
      </span>
    </button>
  )
}
