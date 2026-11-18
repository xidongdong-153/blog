'use client'

import type { SeriesSidebarPost } from './series-chapter-sidebar'
import type { Heading } from '@/lib/content'
import type { SeriesDefinition } from '@/lib/series'
import { BookOpen } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { lockOverlayScroll } from '../site/overlay-scroll-lock'
import { useOverlayMotion } from '../site/use-overlay-motion'
import { useReaderFocus } from './article-reader-shell'
import { TableOfContents } from './toc'

interface FloatingActionGroupProps {
  headings: Heading[]
  series?: SeriesDefinition
  seriesPosts?: SeriesSidebarPost[]
  currentSlug?: string
}

/**
 * 移动端 / 小屏右下角浮动目录与返回顶部操作组。
 * 桌面端由文章右侧导轨承接进度与快速操作。
 */
export function FloatingActionGroup({ headings, series, seriesPosts, currentSlug }: FloatingActionGroupProps) {
  const [mounted, setMounted] = useState(false)
  const [showButton, setShowButton] = useState(false)
  const [scrollPercent, setScrollPercent] = useState(0)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'series' | 'toc'>('series')
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

  const hasSeries = Boolean(series && seriesPosts && seriesPosts.length > 0)
  const hasHeadings = headings.length > 0
  const hasDrawerContent = hasHeadings || hasSeries

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
        className={`fixed bottom-6 end-4 z-40 flex flex-col items-center gap-2.5 transition-all duration-300 sm:bottom-8 sm:end-8 ${
          hasSeries ? 'xl:hidden' : 'lg:hidden'
        } ${showButton || present ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'}`}
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

        {hasDrawerContent && (
          <button
            ref={tocButtonRef}
            type="button"
            aria-label={hasSeries ? '打开专栏与目录' : '打开目录'}
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

      {present && hasDrawerContent && (
        <div
          aria-hidden={!isDrawerOpen}
          inert={!isDrawerOpen}
          className={`fixed inset-0 z-50 ${hasSeries ? 'xl:hidden' : 'lg:hidden'} ${!isDrawerOpen ? 'pointer-events-none' : ''}`}
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
                aria-label={hasSeries ? '专栏与目录大纲' : '移动端目录'}
                className="flex h-full flex-col border-s border-hair bg-card p-5 shadow-2xl"
              >
                <div ref={contentRef} className="flex min-h-0 flex-1 flex-col">
                  <div className="mb-3 flex items-center justify-between border-b border-hair pb-3">
                    {hasSeries && hasHeadings ? (
                      <div className="flex items-center gap-1 rounded-md bg-muted/40 p-0.5">
                        <button
                          type="button"
                          onClick={() => setActiveTab('series')}
                          className={`rounded px-2.5 py-1 font-mono text-xs transition-colors ${
                            activeTab === 'series'
                              ? 'bg-background font-medium text-foreground shadow-xs'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          专栏大纲 ({seriesPosts?.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('toc')}
                          className={`rounded px-2.5 py-1 font-mono text-xs transition-colors ${
                            activeTab === 'toc'
                              ? 'bg-background font-medium text-foreground shadow-xs'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          本篇目录
                        </button>
                      </div>
                    ) : (
                      <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                        {hasSeries ? '专栏大纲' : '目录导航'}
                      </span>
                    )}

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
                    {hasSeries && (!hasHeadings || activeTab === 'series') ? (
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-4">
                          {(() => {
                            const groupMap = new Map<string, SeriesSidebarPost[]>()
                            if (series?.groups) {
                              for (const g of series.groups) {
                                groupMap.set(g, [])
                              }
                            }
                            const defaultGroup = '正文章节'
                            for (const p of seriesPosts ?? []) {
                              const gName = p.series?.group?.trim() || defaultGroup
                              const list = groupMap.get(gName) ?? []
                              list.push(p)
                              groupMap.set(gName, list)
                            }
                            const groups: Array<{ name: string; posts: SeriesSidebarPost[] }> = []
                            for (const [name, list] of groupMap.entries()) {
                              if (list.length > 0) groups.push({ name, posts: list })
                            }

                            return groups.map((group) => (
                              <div key={group.name} className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between px-1 text-xs font-semibold text-foreground/90">
                                  <span>{group.name}</span>
                                  <span className="font-mono text-[0.65rem] text-muted-foreground/70">
                                    {group.posts.length}
                                  </span>
                                </div>

                                <ol className="flex flex-col gap-1">
                                  {group.posts.map((post, index) => {
                                    const chapterOrder = post.series?.order ?? index + 1
                                    const isActive = post.slug === currentSlug

                                    if (isActive) {
                                      return (
                                        <li key={post.slug}>
                                          <div
                                            aria-current="page"
                                            className="flex items-start gap-2.5 rounded-md border border-primary/35 bg-primary/8 p-2 text-foreground"
                                          >
                                            <span className="shrink-0 pt-0.5 font-mono text-xs font-semibold tabular-nums text-primary">
                                              {chapterOrder}
                                            </span>
                                            <span className="line-clamp-2 font-sans text-xs font-medium leading-snug">
                                              {post.title}
                                            </span>
                                          </div>
                                        </li>
                                      )
                                    }

                                    return (
                                      <li key={post.slug}>
                                        <Link
                                          href={`/blog/${post.slug}`}
                                          onClick={() => closeDrawer(false)}
                                          className="group flex items-start gap-2.5 rounded-md border border-transparent p-2 text-muted-foreground transition-all hover:border-hair hover:bg-muted/30 hover:text-foreground"
                                        >
                                          <span className="shrink-0 pt-0.5 font-mono text-xs tabular-nums text-muted-foreground/70 transition-colors group-hover:text-foreground">
                                            {chapterOrder}
                                          </span>
                                          <span className="line-clamp-2 font-sans text-xs leading-snug transition-colors group-hover:text-foreground">
                                            {post.title}
                                          </span>
                                        </Link>
                                      </li>
                                    )
                                  })}
                                </ol>
                              </div>
                            ))
                          })()}
                        </div>
                      </div>
                    ) : (
                      <TableOfContents headings={headings} onItemClick={() => closeDrawer(false)} />
                    )}
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
