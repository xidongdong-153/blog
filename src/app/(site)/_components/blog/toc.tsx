'use client'

import type { CSSProperties } from 'react'
import type { Heading } from '@/lib/content'
import { ArrowUp, BookOpen, Check, Link2, MessageSquare } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useReaderFocus } from './article-reader-shell'

interface TableOfContentsProps {
  headings: Heading[]
  onItemClick?: () => void
  /** 是否在桌面侧栏底部附带环形阅读进度与悬浮快捷操作 */
  showRailTools?: boolean
  /** 是否置于移动端抽屉等外层自滚动容器中 */
  inDrawer?: boolean
}

function getScrollMaskImage(edges: { top: boolean; bottom: boolean }): string | undefined {
  if (edges.top && edges.bottom) {
    return 'linear-gradient(to bottom, transparent 0%, black 18px, black calc(100% - 18px), transparent 100%)'
  }
  if (edges.top) {
    return 'linear-gradient(to bottom, transparent 0%, black 18px, black 100%)'
  }
  if (edges.bottom) {
    return 'linear-gradient(to bottom, black 0%, black calc(100% - 18px), transparent 100%)'
  }
  return undefined
}

/**
 * 文章目录与右侧阅读进度组件。
 * 1. 采用贯穿式 1px 垂直导轨与主次章节刻度锚点，隐藏原生滚动条并在超长目录溢出端提供渐隐提示。
 * 2. 开启专注阅读时平滑折叠目录使进度与快捷栏过渡到顶部，关闭后随目录展开回归底部。
 */
export function TableOfContents({
  headings,
  onItemClick,
  showRailTools = false,
  inDrawer = false,
}: TableOfContentsProps) {
  const [activeIds, setActiveIds] = useState<string[]>([])
  const [scrollPercent, setScrollPercent] = useState(0)
  const [copiedLink, setCopiedLink] = useState(false)
  const [scrollEdges, setScrollEdges] = useState({ top: false, bottom: false })
  const { focusMode, toggleFocusMode } = useReaderFocus()

  const containerRef = useRef<HTMLElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const suppressFollowRef = useRef(false)
  const pendingClickSlugRef = useRef<string>('')
  const activeIdsRef = useRef<string[]>([])
  const rafIdRef = useRef<number>(0)
  const copyTimerRef = useRef<number>(0)
  const focusModeRef = useRef(focusMode)
  const prevFocusModeRef = useRef(focusMode)

  const isCollapsed = showRailTools && focusMode

  useEffect(() => {
    focusModeRef.current = focusMode
  }, [focusMode])

  const updateScrollEdges = useCallback(() => {
    const listEl = listRef.current
    if (!listEl || inDrawer) {
      setScrollEdges((prev) => (prev.top || prev.bottom ? { top: false, bottom: false } : prev))
      return
    }
    const hasOverflow = listEl.scrollHeight > listEl.clientHeight + 2
    const nextTop = hasOverflow && listEl.scrollTop > 4
    const nextBottom = hasOverflow && listEl.scrollTop + listEl.clientHeight < listEl.scrollHeight - 4
    setScrollEdges((prev) =>
      prev.top === nextTop && prev.bottom === nextBottom ? prev : { top: nextTop, bottom: nextBottom },
    )
  }, [inDrawer])

  const ensureLinkVisible = useCallback(
    (id: string) => {
      if (inDrawer || focusModeRef.current) return
      const scrollContainer = listRef.current
      if (!scrollContainer || scrollContainer.clientHeight === 0) return
      if (scrollContainer.scrollHeight <= scrollContainer.clientHeight + 1) return

      const links = scrollContainer.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')
      const targetHref = `#${id}`
      const link = Array.from(links).find((item) => item.getAttribute('href') === targetHref)
      if (!link) return

      const containerRect = scrollContainer.getBoundingClientRect()
      const linkRect = link.getBoundingClientRect()
      const edgePadding = 40
      const isAbove = linkRect.top < containerRect.top + edgePadding
      const isBelow = linkRect.bottom > containerRect.bottom - edgePadding
      if (!isAbove && !isBelow) return

      const centerOffset = (containerRect.height - linkRect.height) / 2
      const targetScrollTop = scrollContainer.scrollTop + (linkRect.top - containerRect.top) - centerOffset
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      scrollContainer.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: reducedMotion ? 'auto' : 'smooth',
      })
    },
    [inDrawer],
  )

  useEffect(() => {
    const listEl = listRef.current

    const releaseFollow = () => {
      suppressFollowRef.current = false
    }

    const updatePositionAndStyle = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const nextPercent = docHeight > 0 ? Math.min(100, Math.max(0, Math.round((window.scrollY / docHeight) * 100))) : 0
      setScrollPercent(nextPercent)

      if (headings.length === 0) return

      const headingElements = headings
        .map((h) => ({ id: h.id, el: document.getElementById(h.id) }))
        .filter((item): item is { id: string; el: HTMLElement } => item.el !== null)

      if (headingElements.length === 0) return

      if (suppressFollowRef.current) {
        const targetHeading = headingElements.find((h) => h.id === pendingClickSlugRef.current)
        const arrived = !targetHeading || Math.abs(targetHeading.el.getBoundingClientRect().top - 100) <= 80
        if (arrived) {
          suppressFollowRef.current = false
        }
      }

      let currentActiveIds: string[] = []

      if (suppressFollowRef.current && pendingClickSlugRef.current) {
        currentActiveIds = [pendingClickSlugRef.current]
      } else {
        const TOP_OFFSET = 100
        const windowHeight = window.innerHeight
        const article = document.querySelector('article')
        const articleBottom = article ? article.getBoundingClientRect().bottom : windowHeight

        currentActiveIds = headingElements
          .filter((item, index) => {
            const rangeTop = item.el.getBoundingClientRect().top
            const nextEl = headingElements[index + 1]?.el
            const rangeBottom = nextEl ? nextEl.getBoundingClientRect().top : articleBottom
            return rangeTop < windowHeight && rangeBottom > TOP_OFFSET
          })
          .map((item) => item.id)

        if (currentActiveIds.length === 0 && headingElements.length > 0) {
          const firstTop = headingElements[0].el.getBoundingClientRect().top
          if (firstTop < windowHeight * 0.7 && firstTop > 0) {
            currentActiveIds = [headingElements[0].id]
          }
        }
      }

      const isDifferent =
        currentActiveIds.length !== activeIdsRef.current.length ||
        currentActiveIds.some((id, i) => id !== activeIdsRef.current[i])

      if (isDifferent) {
        activeIdsRef.current = currentActiveIds
        setActiveIds(currentActiveIds)

        if (currentActiveIds.length > 0 && !suppressFollowRef.current) {
          ensureLinkVisible(currentActiveIds[0])
        }
      }
    }

    const scheduleUpdate = () => {
      if (rafIdRef.current) return
      rafIdRef.current = window.requestAnimationFrame(() => {
        rafIdRef.current = 0
        updatePositionAndStyle()
      })
    }

    updatePositionAndStyle()
    updateScrollEdges()
    const timer1 = window.setTimeout(updatePositionAndStyle, 100)
    const timer2 = window.setTimeout(updatePositionAndStyle, 300)
    const timer3 = window.setTimeout(updatePositionAndStyle, 600)

    const contentElement = document.querySelector('article')
    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        scheduleUpdate()
        updateScrollEdges()
      })
      if (contentElement) resizeObserver.observe(contentElement)
      if (listEl) resizeObserver.observe(listEl)
    }

    listEl?.addEventListener('scroll', updateScrollEdges, { passive: true })
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)
    window.addEventListener('resize', updateScrollEdges)
    window.addEventListener('wheel', releaseFollow, { passive: true })
    window.addEventListener('touchstart', releaseFollow, { passive: true })
    window.addEventListener('keydown', releaseFollow)

    return () => {
      window.clearTimeout(timer1)
      window.clearTimeout(timer2)
      window.clearTimeout(timer3)
      listEl?.removeEventListener('scroll', updateScrollEdges)
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
      window.removeEventListener('resize', updateScrollEdges)
      window.removeEventListener('wheel', releaseFollow)
      window.removeEventListener('touchstart', releaseFollow)
      window.removeEventListener('keydown', releaseFollow)
      resizeObserver?.disconnect()
      if (rafIdRef.current) {
        window.cancelAnimationFrame(rafIdRef.current)
      }
    }
  }, [headings, ensureLinkVisible, updateScrollEdges])

  useEffect(() => {
    const wasFocused = prevFocusModeRef.current
    prevFocusModeRef.current = focusMode
    if (!wasFocused || focusMode) return

    const frameId = window.requestAnimationFrame(() => {
      updateScrollEdges()
      if (activeIdsRef.current[0]) {
        ensureLinkVisible(activeIdsRef.current[0])
      }
    })
    const settleTimer = window.setTimeout(updateScrollEdges, 430)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.clearTimeout(settleTimer)
    }
  }, [focusMode, ensureLinkVisible, updateScrollEdges])

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current)
      }
    }
  }, [])

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault()
    const target = document.getElementById(id)
    if (!target) return

    suppressFollowRef.current = true
    pendingClickSlugRef.current = id
    activeIdsRef.current = [id]
    setActiveIds([id])

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' })

    if (onItemClick) {
      onItemClick()
    }
  }

  const handleCopyPermalink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopiedLink(true)
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current)
      }
      copyTimerRef.current = window.setTimeout(setCopiedLink, 1800, false)
    } catch {
      // 忽略剪贴板权限错误
    }
  }

  const scrollToComments = () => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById('comments')?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' })
  }

  const scrollToTop = () => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' })
  }

  const ringRadius = 6.5
  const ringCircumference = 2 * Math.PI * ringRadius
  const strokeDashoffset = ringCircumference - (scrollPercent / 100) * ringCircumference
  const maskImage = !inDrawer ? getScrollMaskImage(scrollEdges) : undefined
  const primaryActiveId = activeIds[0]

  return (
    <nav ref={containerRef} aria-label="文章目录" className="select-none text-xs leading-relaxed">
      {headings.length > 0 && (
        <div
          inert={isCollapsed ? true : undefined}
          aria-hidden={isCollapsed ? true : undefined}
          className={`grid transition-[grid-template-rows,opacity] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-opacity motion-reduce:duration-150 ${
            isCollapsed
              ? 'pointer-events-none grid-rows-[0fr] opacity-0 [transition-duration:380ms,220ms]'
              : 'grid-rows-[1fr] opacity-100 [transition-duration:440ms,320ms]'
          }`}
        >
          <div className={inDrawer ? 'min-h-0' : 'min-h-0 -mx-1.5 overflow-hidden px-1.5'}>
            <ul
              ref={listRef}
              style={maskImage ? { maskImage, WebkitMaskImage: maskImage } : undefined}
              className={
                inDrawer
                  ? 'flex flex-col py-0.5'
                  : showRailTools
                    ? 'no-scrollbar -mx-1 flex max-h-[min(54vh,calc(100vh-16rem))] flex-col overflow-y-auto px-1 py-1.5'
                    : 'no-scrollbar -mx-1 flex max-h-[calc(100vh-8rem)] flex-col overflow-y-auto px-1 py-1.5'
              }
            >
              {headings.map((heading, index) => {
                const isPrimaryActive = heading.id === primaryActiveId
                const isSecondaryActive = !isPrimaryActive && activeIds.includes(heading.id)
                const enterDelay = `${60 + Math.min(index, 8) * 16}ms`
                const exitDelay = `${Math.min(index, 6) * 14}ms`

                return (
                  <li
                    key={heading.id}
                    style={{ '--toc-ripple-delay': isCollapsed ? exitDelay : enterDelay } as CSSProperties}
                    className={`relative transition-[opacity,translate] ease-[cubic-bezier(0.22,1,0.36,1)] before:pointer-events-none before:absolute before:inset-y-0 before:left-[1px] before:w-px before:bg-hair first:before:top-2 last:before:bottom-2 motion-reduce:transition-opacity ${
                      isCollapsed
                        ? 'pointer-events-none -translate-x-2 opacity-0 duration-150 [transition-delay:var(--toc-ripple-delay)]'
                        : 'translate-x-0 opacity-100 duration-[260ms] [transition-delay:var(--toc-ripple-delay)]'
                    }`}
                  >
                    {/* 导轨激活刻度条（主锚点实亮，同屏次级章节柔亮） */}
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute top-1.5 bottom-1.5 left-[0.5px] w-[2px] origin-center rounded-full bg-primary transition-[opacity,transform] duration-200 motion-reduce:transition-opacity ${
                        isPrimaryActive
                          ? 'scale-y-100 opacity-100'
                          : isSecondaryActive
                            ? 'scale-y-75 opacity-35'
                            : 'scale-y-0 opacity-0'
                      }`}
                    />
                    <a
                      href={`#${heading.id}`}
                      onClick={(e) => handleLinkClick(e, heading.id)}
                      title={heading.text}
                      aria-current={isPrimaryActive ? 'location' : undefined}
                      className={`block rounded-sm py-1 text-left leading-[1.45] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                        heading.depth === 3 ? 'pl-6 text-xs' : 'pl-3.5 text-[12.5px]'
                      } ${
                        isPrimaryActive
                          ? 'font-medium text-primary'
                          : isSecondaryActive
                            ? 'text-foreground/85 hover:text-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span className="line-clamp-2 [overflow-wrap:anywhere]">{heading.text}</span>
                    </a>
                  </li>
                )
              })}
            </ul>

            {showRailTools && (
              <div className="py-3.5">
                <div
                  aria-hidden="true"
                  className="h-px w-full max-w-[10.5rem] bg-gradient-to-r from-border via-border/45 to-transparent"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {showRailTools && (
        <div className="flex flex-col gap-2.5 transition-opacity duration-300 group-data-[reader-focus=true]/reader:opacity-75 group-data-[reader-focus=true]/reader:hover:opacity-100 group-data-[reader-focus=true]/reader:focus-within:opacity-100">
          {/* 环形阅读进度 + 同行回到顶部（无纵向跳变） */}
          <div className="flex items-center justify-between gap-2 pr-1">
            <div className="flex items-center gap-2 font-mono text-xs tabular-nums text-foreground/85">
              <svg aria-hidden="true" viewBox="0 0 18 18" className="size-4 shrink-0 -rotate-90">
                <circle
                  cx="9"
                  cy="9"
                  r={ringRadius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-border/75"
                />
                <circle
                  cx="9"
                  cy="9"
                  r={ringRadius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={strokeDashoffset}
                  className="text-primary transition-[stroke-dashoffset] duration-150 ease-out"
                />
              </svg>
              <span>{scrollPercent}%</span>
            </div>

            <button
              type="button"
              onClick={scrollToTop}
              tabIndex={scrollPercent > 4 ? 0 : -1}
              aria-hidden={scrollPercent <= 4 ? true : undefined}
              className={`group/ink hit-expand inline-flex cursor-pointer items-center gap-1 text-xs text-muted-foreground transition-[opacity,color] duration-200 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                scrollPercent > 4 ? 'opacity-100' : 'pointer-events-none opacity-0'
              }`}
            >
              <ArrowUp className="ink-glide size-3 group-hover/ink:-translate-y-0.5" />
              <span className="ink-line">回到顶部</span>
            </button>
          </div>

          {/* 紧凑无框快捷工具栏（左缘与进度环对齐） */}
          <div className="-ml-1.5 flex items-center gap-3 text-muted-foreground">
            <button
              type="button"
              onClick={toggleFocusMode}
              title={focusMode ? '退出专注阅读' : '开启专注阅读'}
              aria-label={focusMode ? '退出专注阅读' : '开启专注阅读'}
              aria-pressed={focusMode}
              data-active={focusMode ? 'true' : undefined}
              className={`group/ink ink-glide hit-expand relative inline-flex size-7 cursor-pointer items-center justify-center rounded-sm hover:-translate-y-0.5 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                focusMode ? 'text-primary' : ''
              }`}
            >
              <BookOpen className="size-3.5" strokeWidth={1.7} />
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute right-1.5 bottom-0.5 left-1.5 h-[1.5px] origin-center rounded-full bg-primary transition-[transform,opacity] duration-200 ${
                  focusMode ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'
                }`}
              />
            </button>

            <button
              type="button"
              onClick={handleCopyPermalink}
              title={copiedLink ? '链接已复制' : '复制文章链接'}
              aria-label={copiedLink ? '链接已复制' : '复制文章链接'}
              className="ink-glide hit-expand inline-flex size-7 cursor-pointer items-center justify-center rounded-sm hover:-translate-y-0.5 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {copiedLink ? (
                <Check className="size-3.5 text-primary" strokeWidth={1.8} />
              ) : (
                <Link2 className="size-3.5" strokeWidth={1.7} />
              )}
            </button>

            <button
              type="button"
              onClick={scrollToComments}
              title="前往评论区"
              aria-label="前往评论区"
              className="ink-glide hit-expand inline-flex size-7 cursor-pointer items-center justify-center rounded-sm hover:-translate-y-0.5 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <MessageSquare className="size-3.5" strokeWidth={1.7} />
            </button>

            <span className="sr-only" aria-live="polite">
              {copiedLink ? '链接已复制' : ''}
            </span>
            <span
              aria-hidden="true"
              className={`font-mono text-xs text-primary transition-opacity duration-200 ${
                copiedLink ? 'opacity-100' : 'pointer-events-none opacity-0'
              }`}
            >
              已复制
            </span>
          </div>
        </div>
      )}
    </nav>
  )
}
