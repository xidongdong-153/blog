'use client'

import { useState } from 'react'

interface CopyButtonProps {
  /** 可选：直接传入的代码文本。若未传，则自动向上查找最近的代码块获取文本 */
  code?: string
  className?: string
}

/**
 * 代码块一键复制按钮（客户端叶子组件）。
 * 点击后将代码写入系统剪贴板，并切换为成功打勾图标，2 秒后自动复原。
 */
export function CopyButton({ code, className = '' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy(e: React.MouseEvent<HTMLButtonElement>) {
    let textToCopy = code
    if (!textToCopy) {
      const container = e.currentTarget.closest('[data-rehype-pretty-code-figure], pre, .code-block')
      const codeElement = container?.querySelector('code')
      textToCopy = codeElement?.textContent || ''
    }

    if (!textToCopy) return

    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      setTimeout(setCopied, 2000, false)
    } catch {
      // 剪贴板权限或环境受限时静默处理
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? '已复制' : '复制代码'}
      title={copied ? '已复制' : '复制代码'}
      className={`inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-transparent bg-transparent text-muted-foreground/70 transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-code-bg ${className}`}
    >
      {copied ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-3.5 text-primary"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-3.5"
        >
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </svg>
      )}
    </button>
  )
}
