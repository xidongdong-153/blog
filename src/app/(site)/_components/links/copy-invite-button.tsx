'use client'

import { useState } from 'react'
import { siteConfig } from '@/site.config'

interface CopyInviteButtonProps {
  className?: string
}

/**
 * 复制友链邀请链接的无框文本触发器。
 * 点击后将 /links/apply 绝对链接写入剪贴板。
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
        'group/ink inline-flex w-fit cursor-pointer items-center gap-1.5 py-1 font-mono text-xs text-foreground/85 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
      }
    >
      <span className="ink-line">{copied ? '已复制邀请链接' : '复制邀请链接'}</span>
      <span aria-hidden="true" className="font-mono text-[11px] opacity-70">
        {copied ? '✓' : '⎘'}
      </span>
    </button>
  )
}
