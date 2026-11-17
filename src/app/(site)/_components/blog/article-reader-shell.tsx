'use client'

import type { ReactNode } from 'react'
import { BookOpen } from 'lucide-react'
import { createContext, useContext, useState } from 'react'

interface ReaderFocusContextValue {
  focusMode: boolean
  toggleFocusMode: () => void
}

const ReaderFocusContext = createContext<ReaderFocusContextValue>({
  focusMode: false,
  toggleFocusMode: () => {},
})

export function useReaderFocus() {
  return useContext(ReaderFocusContext)
}

/**
 * 文章阅读容器（客户端轻量状态壳）。
 * 维护「专注阅读模式」切换，通过 group/reader + data-reader-focus 属性驱动目录与侧栏的级联隐退。
 */
export function ArticleReaderShell({ className, children }: { className: string; children: ReactNode }) {
  const [focusMode, setFocusMode] = useState(false)

  return (
    <ReaderFocusContext.Provider
      value={{
        focusMode,
        toggleFocusMode: () => setFocusMode((prev) => !prev),
      }}
    >
      <div data-reader-focus={focusMode ? 'true' : 'false'} className={`group/reader relative ${className}`}>
        {children}
      </div>
    </ReaderFocusContext.Provider>
  )
}

/**
 * 切换「专注阅读」模式的无框文字触发器（悬停展开墨线，开启时常驻底线）。
 */
export function ReaderFocusButton() {
  const { focusMode, toggleFocusMode } = useReaderFocus()

  return (
    <button
      type="button"
      onClick={toggleFocusMode}
      aria-pressed={focusMode}
      data-active={focusMode ? 'true' : undefined}
      className={`group/ink inline-flex shrink-0 cursor-pointer items-center gap-1.5 py-1 font-mono text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
        focusMode ? 'font-medium text-primary' : 'text-muted-foreground hover:text-primary'
      }`}
    >
      <BookOpen className="size-3.5" aria-hidden="true" />
      <span className="ink-line">{focusMode ? '退出专注' : '专注阅读'}</span>
    </button>
  )
}
