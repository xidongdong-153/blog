'use client'

import type { Heading } from '@/lib/content'
import { useEffect, useState } from 'react'
import { TableOfContents } from './toc'

interface FloatingActionGroupProps {
  headings: Heading[]
}

/**
 * 页面右下角浮动操作组：
 * 1. 移动端目录呼出按钮（点击滑出抽屉面板与遮罩）。
 * 2. 返回顶部按钮（实时计算全页阅读百分比）。
 */
export function FloatingActionGroup({ headings }: FloatingActionGroupProps) {
  const [showButton, setShowButton] = useState(false)
  const [scrollPercent, setScrollPercent] = useState(0)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const percent = docHeight > 0 ? Math.min(100, Math.max(0, Math.round((scrollY / docHeight) * 100))) : 0

      setScrollPercent(percent)
      setShowButton(scrollY > 250)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // 抽屉开启时锁定背景滚动，支持 ESC 键关闭
  useEffect(() => {
    if (!isDrawerOpen) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDrawerOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isDrawerOpen])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      {/* 右下角浮动操作按钮组 */}
      <div
        className={`fixed bottom-6 end-4 z-40 flex flex-col items-center gap-2.5 transition-all duration-300 sm:bottom-8 sm:end-8 ${
          showButton ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
        }`}
      >
        {/* 移动端专属：目录按钮（在 lg 断点以上隐藏） */}
        {headings.length > 0 && (
          <button
            type="button"
            aria-label="打开目录"
            onClick={() => setIsDrawerOpen(true)}
            className="flex size-10 items-center justify-center rounded-full border border-border bg-background/90 text-muted-foreground shadow-md backdrop-blur-md transition-colors hover:border-foreground/30 hover:text-foreground lg:hidden"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4.5"
            >
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="14" y1="12" y2="12" />
              <line x1="4" x2="18" y1="18" y2="18" />
            </svg>
          </button>
        )}

        {/* 返回顶部按钮：带阅读百分比 */}
        <button
          type="button"
          aria-label="返回顶部"
          onClick={scrollToTop}
          className="group relative flex size-10 items-center justify-center rounded-full border border-border bg-background/90 text-muted-foreground shadow-md backdrop-blur-md transition-all hover:border-foreground/30 hover:text-foreground"
        >
          {/* 百分比数字 */}
          <span className="text-[0.6875rem] font-medium tabular-nums transition-opacity duration-150 group-hover:opacity-0">
            {scrollPercent}%
          </span>
          {/* 悬停展示箭头 */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute size-4 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
          >
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
      </div>

      {/* 移动端目录抽屉与遮罩 */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* 背景遮罩 */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* 抽屉侧栏 */}
          <aside
            aria-label="移动端目录"
            className="fixed bottom-0 end-0 top-0 flex w-[78vw] max-w-sm flex-col border-s border-border bg-background p-5 shadow-2xl transition-transform duration-300"
          >
            <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
              <span className="text-sm font-semibold tracking-tight">目录导航</span>
              <button
                type="button"
                aria-label="关闭目录"
                onClick={() => setIsDrawerOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pe-1">
              <TableOfContents headings={headings} onItemClick={() => setIsDrawerOpen(false)} />
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
