'use client'

import type { SeriesSidebarPost } from './series-chapter-sidebar'
import type { Heading } from '@/lib/content'
import type { SeriesDefinition } from '@/lib/series'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { TableOfContents } from './toc'

interface FloatingActionGroupProps {
  headings: Heading[]
  series?: SeriesDefinition
  seriesPosts?: SeriesSidebarPost[]
  currentSlug?: string
}

/**
 * 页面右下角浮动操作组：
 * 1. 移动端/折叠态目录与专栏呼出按钮（点击滑出抽屉面板与遮罩）。
 * 2. 返回顶部按钮（实时计算全页阅读百分比）。
 */
export function FloatingActionGroup({ headings, series, seriesPosts, currentSlug }: FloatingActionGroupProps) {
  const [showButton, setShowButton] = useState(false)
  const [scrollPercent, setScrollPercent] = useState(0)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'series' | 'toc'>('series')

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
        {/* 目录/专栏抽屉呼出按钮（专栏文章在 xl 以下展示，常规文章在 lg 以下展示） */}
        {hasDrawerContent && (
          <button
            type="button"
            aria-label={hasSeries ? '打开专栏与目录' : '打开目录'}
            onClick={() => setIsDrawerOpen(true)}
            className={`flex size-10 items-center justify-center rounded-full border border-border bg-background/90 text-muted-foreground shadow-md backdrop-blur-md transition-colors hover:border-foreground/30 hover:text-foreground ${
              hasSeries ? 'xl:hidden' : 'lg:hidden'
            }`}
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

      {/* 移动端/小屏目录与专栏抽屉与遮罩 */}
      {isDrawerOpen && hasDrawerContent && (
        <div className={`fixed inset-0 z-50 ${hasSeries ? 'xl:hidden' : 'lg:hidden'}`}>
          {/* 背景遮罩 */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* 抽屉侧栏 */}
          <aside
            aria-label={hasSeries ? '专栏与目录大纲' : '移动端目录'}
            className="fixed bottom-0 end-0 top-0 flex w-[82vw] max-w-sm flex-col border-s border-border bg-background p-5 shadow-2xl transition-transform duration-300"
          >
            {/* 顶栏控制 */}
            <div className="mb-3 flex items-center justify-between border-b border-border/40 pb-3">
              {hasSeries && hasHeadings ? (
                /* 双 Tab 切换 */
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
                  {hasSeries ? '// 专栏大纲' : '// 目录导航'}
                </span>
              )}

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

            {/* 内容区 */}
            <div className="flex-1 overflow-y-auto pe-1">
              {hasSeries && (!hasHeadings || activeTab === 'series') ? (
                /* 专栏章节列表 */
                <div className="flex flex-col gap-3">
                  {series && (
                    <div className="flex flex-col gap-1 border-b border-border/40 pb-3">
                      <Link
                        href={`/blog/series/${series.id}`}
                        onClick={() => setIsDrawerOpen(false)}
                        className="line-clamp-1 font-serif text-sm font-medium text-foreground hover:text-primary"
                      >
                        {series.title}
                      </Link>
                      <div className="flex items-center justify-between font-mono text-[0.6875rem] text-muted-foreground">
                        <span>// 大纲 · 共 {seriesPosts?.length} 讲</span>
                        <Link
                          href={`/blog/series/${series.id}`}
                          onClick={() => setIsDrawerOpen(false)}
                          className="hover:text-primary"
                        >
                          专栏主页 →
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* 分组章节列表 */}
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
                              const formattedOrder = String(chapterOrder).padStart(2, '0')
                              const isActive = post.slug === currentSlug

                              if (isActive) {
                                return (
                                  <li key={post.slug}>
                                    <div
                                      aria-current="page"
                                      className="flex items-start gap-2.5 rounded-md border border-border/80 bg-card/80 p-2 text-foreground shadow-2xs"
                                    >
                                      <span className="font-mono text-xs font-semibold tabular-nums text-primary shrink-0 pt-0.5">
                                        {formattedOrder}
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
                                    onClick={() => setIsDrawerOpen(false)}
                                    className="group flex items-start gap-2.5 rounded-md border border-transparent p-2 text-muted-foreground transition-all hover:border-border/40 hover:bg-muted/30 hover:text-foreground"
                                  >
                                    <span className="font-mono text-xs tabular-nums text-muted-foreground/70 transition-colors group-hover:text-foreground shrink-0 pt-0.5">
                                      {formattedOrder}
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
                /* 本篇目录 TOC */
                <TableOfContents headings={headings} onItemClick={() => setIsDrawerOpen(false)} />
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
