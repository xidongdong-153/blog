'use client'

import { useCallback, useRef } from 'react'

/**
 * 随机打开一个已收录友链的无框文字按钮。
 * 连续点击时在候选数大于 1 的情况下尽量避开上一次打开的站点。
 */
export function RandomFriendButton({ urls }: { urls: string[] }) {
  const lastIndexRef = useRef(-1)

  const handleOpenRandom = useCallback(() => {
    if (urls.length === 0) return

    let nextIndex = Math.floor(Math.random() * urls.length)
    if (urls.length > 1 && nextIndex === lastIndexRef.current) {
      nextIndex = (nextIndex + 1) % urls.length
    }

    lastIndexRef.current = nextIndex
    const targetUrl = urls[nextIndex]
    if (targetUrl) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer')
    }
  }, [urls])

  if (urls.length === 0) return null

  return (
    <button
      type="button"
      onClick={handleOpenRandom}
      className="group/ink hit-expand inline-flex min-h-9 w-fit cursor-pointer items-center gap-1.5 font-mono text-xs text-foreground/85 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span className="ink-line">随机访问</span>
      <span aria-hidden="true" className="ink-glide group-hover/ink:translate-x-0.5 group-hover/ink:-translate-y-0.5">
        ↗
      </span>
    </button>
  )
}
