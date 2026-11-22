'use client'

import type { Heading } from '@/lib/content'
import { BookOpen } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { lockOverlayScroll } from '../site/overlay-scroll-lock'
import { useOverlayMotion } from '../site/use-overlay-motion'
import { useReaderFocus } from './article-reader-shell'
import { TableOfContents } from './toc'

interface FloatingActionGroupProps {
  headings: Heading[]
}

/**
 * 移动端 / 小屏右下角浮动目录与返回顶部操作组。
 * 桌面端由文章右侧导轨承接进度与快速操作。
 */
export function FloatingActionGroup({ headings }: FloatingActionGroupProps) {
  const [mounted, setMounted] = useState(false)
  const [showButton, setShowButton] = useState(false)
  const [scrollPercent, setScrollPercent] = useState(0)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const { focusMode, toggleFocusMode } = useReaderFocus()
  const drawerRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const tocButtonRef = useRef<HTMLButtonElement>(null)
  const restoreFocusOnCloseRef = useRef(false)
  const wasDrawerOpenRef = useRef(false)
  const { present, anchorRef, surfaceRef, contentRef, backdropRef } = useOverlayMotion({
    open: isDrawerOpen,
    ready: mounted,
    triggerRef: tocButtonRef,
    hideTrigger: true,
  })

  const closeDrawer = useCallback((restoreFocus: boolean) => {
    restoreFocusOnCloseRef.current = restoreFocus
    setIsDrawerOpen(false)
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  const hasHeadings = headings.length > 0

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

  useEffect(() => {
    if (!present) return
    return lockOverlayScroll()
  }, [present])

  useEffect(() => {
    if (!isDrawerOpen) {
      if (wasDrawerOpenRef.current && restoreFocusOnCloseRef.current) {
        tocButtonRef.current?.focus()
      }
      wasDrawerOpenRef.current = false
      restoreFocusOnCloseRef.current = false
      return
    }

    wasDrawerOpenRef.current = true
    const frameId = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus()
    })

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeDrawer(true)
        return
      }
      if (e.key === 'Tab' && drawerRef.current) {
        const focusables = Array.from(
          drawerRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => el.offsetParent !== null)
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        const active = document.activeElement
        if (!drawerRef.current.contains(active)) {
          e.preventDefault()
          first.focus()
          return
        }
        if (e.shiftKey && active === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && active === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isDrawerOpen, closeDrawer])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!mounted) return null

  return createPortal(
    <>
      <div
        inert={isDrawerOpen}
        className={`fixed bottom-6 end-4 z-40 flex flex-col items-center gap-2.5 transition-all duration-300 sm:bottom-8 sm:end-8 lg:hidden ${
          showButton || present ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
        }`}
      >
        <button
          type="button"
          aria-label={focusMode ? '关闭专注阅读模式' : '开启专注阅读模式'}
          aria-pressed={focusMode}
          onClick={toggleFocusMode}
          className={`flex size-10 items-center justify-center rounded-xl border border-hair bg-card/95 shadow-md backdrop-blur-md transition-colors hover:border-primary/45 hover:text-primary ${
            focusMode ? 'border-primary/45 text-primary' : 'text-muted-foreground'
          }`}
        >
          <BookOpen className="size-4" />
        </button>

        {hasHeadings && (
          <button
            ref={tocButtonRef}
            type="button"
            aria-label="打开目录"
            aria-expanded={isDrawerOpen}
            onClick={() => setIsDrawerOpen(true)}
            className="flex size-10 items-center justify-center rounded-xl border border-hair bg-card/95 text-muted-foreground shadow-md backdrop-blur-md transition-colors hover:border-primary/45 hover:text-primary"
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

        <button
          type="button"
          aria-label="返回顶部"
          onClick={scrollToTop}
          className="group relative flex size-10 items-center justify-center rounded-xl border border-hair bg-card/95 text-muted-foreground shadow-md backdrop-blur-md transition-all hover:border-primary/45 hover:text-primary"
        >
          <span className="text-[0.6875rem] font-medium tabular-nums transition-opacity duration-150 group-hover:opacity-0">
            {scrollPercent}%
          </span>
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

      {present && hasHeadings && (
        <div
          aria-hidden={!isDrawerOpen}
          inert={!isDrawerOpen}
          className={`fixed inset-0 z-[80] lg:hidden ${!isDrawerOpen ? 'pointer-events-none' : ''}`}
        >
          <div
            ref={backdropRef}
            className="fixed inset-0 bg-background/60 backdrop-blur-xs"
            onClick={() => closeDrawer(true)}
            aria-hidden="true"
          />

          <div ref={anchorRef} className="fixed bottom-0 end-0 top-0 w-[82vw] max-w-sm">
            <div ref={surfaceRef} className="h-full origin-top-left">
              <aside
                ref={drawerRef}
                role="dialog"
                aria-modal={isDrawerOpen ? true : undefined}
                aria-label="移动端目录"
                className="flex h-full flex-col border-s border-hair bg-card p-5 shadow-2xl"
              >
                <div ref={contentRef} className="flex min-h-0 flex-1 flex-col">
                  <div className="mb-3 flex items-center justify-between border-b border-hair pb-3">
                    <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">目录导航</span>

                    <button
                      ref={closeButtonRef}
                      type="button"
                      aria-label="关闭目录"
                      onClick={() => closeDrawer(true)}
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
                    <TableOfContents headings={headings} inDrawer onItemClick={() => closeDrawer(false)} />
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body,
  )
}
