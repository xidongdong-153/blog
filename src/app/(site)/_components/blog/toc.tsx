'use client'

import type { CSSProperties } from 'react'
import type { Heading } from '@/lib/content'
import { ArrowUp, BookOpen, Check, Link2, MessageSquare } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useReaderFocus } from './article-reader-shell'

interface TableOfContentsProps {
  headings: Heading[]
  onItemClick?: () => void
  /** 是否在桌面侧栏底部附带环形阅读进度与悬浮快捷操作 */
  showRailTools?: boolean
}

/**
 * 文章目录与右侧阅读进度组件。
 * 1. 支持多章节视口感知与专注模式级联淡隐 (--toc-ripple-delay)。
 * 2. 桌面侧栏底部附带渐隐分隔线、SVG 环形阅读进度与轻量快捷操作栏。
 */
export function TableOfContents({ headings, onItemClick, showRailTools = false }: TableOfContentsProps) {
  const [activeIds, setActiveIds] = useState<string[]>([])
  const [scrollPercent, setScrollPercent] = useState(0)
  const [copiedLink, setCopiedLink] = useState(false)
  const { focusMode, toggleFocusMode } = useReaderFocus()

  const containerRef = useRef<HTMLDivElement>(null)
  const suppressFollowRef = useRef(false)
  const pendingClickSlugRef = useRef<string>('')
  const activeIdsRef = useRef<string[]>([])
  const rafIdRef = useRef<number>(0)

  useEffect(() => {
    const container = containerRef.current
    const scrollContainer = container?.closest<HTMLElement>('#sidebar') ?? container

    const releaseFollow = () => {
      suppressFollowRef.current = false
    }

    const ensureLinkVisible = (link: HTMLElement) => {
      if (!scrollContainer) return
      const containerRect = scrollContainer.getBoundingClientRect()
      const linkRect = link.getBoundingClientRect()
      const edgePadding = 48
      const isAbove = linkRect.top < containerRect.top + edgePadding
      const isBelow = linkRect.bottom > containerRect.bottom - edgePadding

      if (!isAbove && !isBelow) return

      const centerOffset = (containerRect.height - linkRect.height) / 2
      const targetScrollTop = scrollContainer.scrollTop + (linkRect.top - containerRect.top) - centerOffset

      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      scrollContainer.scrollTo({
        top: targetScrollTop,
        behavior: reducedMotion ? 'auto' : 'smooth',
      })
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

        if (currentActiveIds.length > 0 && !suppressFollowRef.current && container) {
          const firstActiveLink = container.querySelector<HTMLAnchorElement>(`a[href="#${currentActiveIds[0]}"]`)
          if (firstActiveLink) {
            ensureLinkVisible(firstActiveLink)
          }
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
    const timer1 = window.setTimeout(updatePositionAndStyle, 100)
    const timer2 = window.setTimeout(updatePositionAndStyle, 300)
    const timer3 = window.setTimeout(updatePositionAndStyle, 600)

    const contentElement = document.querySelector('article')
    let resizeObserver: ResizeObserver | null = null
    if (contentElement && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        scheduleUpdate()
      })
      resizeObserver.observe(contentElement)
    }

    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)
    window.addEventListener('wheel', releaseFollow, { passive: true })
    window.addEventListener('touchstart', releaseFollow, { passive: true })
    window.addEventListener('keydown', releaseFollow)

    return () => {
      window.clearTimeout(timer1)
      window.clearTimeout(timer2)
      window.clearTimeout(timer3)
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
      window.removeEventListener('wheel', releaseFollow)
      window.removeEventListener('touchstart', releaseFollow)
      window.removeEventListener('keydown', releaseFollow)
      resizeObserver?.disconnect()
      if (rafIdRef.current) {
        window.cancelAnimationFrame(rafIdRef.current)
      }
    }
  }, [headings])

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault()
    const target = document.getElementById(id)
    if (!target) return

    suppressFollowRef.current = true
    pendingClickSlugRef.current = id
    activeIdsRef.current = [id]
    setActiveIds([id])

    target.scrollIntoView({ behavior: 'smooth', block: 'start' })

    if (onItemClick) {
      onItemClick()
    }
  }

  const handleCopyPermalink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopiedLink(true)
      window.setTimeout(setCopiedLink, 1800, false)
    } catch {
      // 忽略剪贴板权限错误
    }
  }

  const scrollToComments = () => {
    document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const ringRadius = 6.5
  const ringCircumference = 2 * Math.PI * ringRadius
  const strokeDashoffset = ringCircumference - (scrollPercent / 100) * ringCircumference

  return (
    <nav ref={containerRef} aria-label="文章目录" className="select-none text-xs leading-relaxed">
      {headings.length > 0 && (
        <ul
          inert={showRailTools && focusMode ? true : undefined}
          aria-hidden={showRailTools && focusMode ? true : undefined}
          className="flex max-h-[54vh] flex-col gap-1 overflow-y-auto pr-1"
        >
          {headings.map((heading, index) => {
            const isActive = activeIds.includes(heading.id)
            return (
              <li
                key={heading.id}
                style={{ '--toc-ripple-delay': `${Math.min(index, 14) * 40}ms` } as CSSProperties}
                className="relative leading-none transition-[opacity,translate] duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-opacity group-data-[reader-focus=true]/reader:pointer-events-none group-data-[reader-focus=true]/reader:-translate-x-2.5 group-data-[reader-focus=true]/reader:opacity-0 group-data-[reader-focus=true]/reader:[transition-delay:var(--toc-ripple-delay)]"
              >
                {/* 激活态垂直标尺线 */}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-1.5 h-3.5 w-[2px] rounded-full bg-primary transition-all duration-200"
                  />
                )}
                <a
                  href={`#${heading.id}`}
                  onClick={(e) => handleLinkClick(e, heading.id)}
                  title={heading.text}
                  className={`block truncate py-1 text-left transition-colors duration-200 ${
                    heading.depth === 3 ? 'pl-5 text-[11.5px]' : 'pl-3 text-[12.5px]'
                  } ${isActive ? 'font-medium text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {heading.text}
                </a>
              </li>
            )
          })}
        </ul>
      )}

      {showRailTools && (
        <div className="mt-4 flex flex-col gap-4 pl-2 transition-opacity duration-300 group-data-[reader-focus=true]/reader:opacity-45">
          <div aria-hidden="true" className="h-px w-36 bg-gradient-to-r from-border via-border/45 to-transparent" />

          {/* 环形阅读进度 + 回到顶部 */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 font-mono text-xs tabular-nums text-foreground/80">
              <svg aria-hidden="true" viewBox="0 0 18 18" className="size-4 -rotate-90">
                <circle
                  cx="9"
                  cy="9"
                  r={ringRadius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-border/70"
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

            {scrollPercent > 4 && (
              <button
                type="button"
                onClick={scrollToTop}
                className="group/ink inline-flex w-fit cursor-pointer items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
              >
                <ArrowUp className="ink-glide size-3.5 group-hover/ink:-translate-y-0.5" />
                <span className="ink-line">回到顶部</span>
              </button>
            )}
          </div>

          {/* 紧凑无框快捷工具栏 */}
          <div className="flex items-center gap-3 pt-1 text-muted-foreground">
            <button
              type="button"
              onClick={toggleFocusMode}
              title={focusMode ? '退出专注阅读' : '开启专注阅读'}
              aria-label={focusMode ? '退出专注阅读' : '开启专注阅读'}
              aria-pressed={focusMode}
              className={`ink-glide hit-expand inline-flex size-8 cursor-pointer items-center justify-center hover:-translate-y-0.5 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                focusMode ? 'text-primary' : ''
              }`}
            >
              <BookOpen className="size-3.5" strokeWidth={1.7} />
            </button>

            <button
              type="button"
              onClick={handleCopyPermalink}
              title={copiedLink ? '链接已复制' : '复制文章链接'}
              aria-label={copiedLink ? '链接已复制' : '复制文章链接'}
              className="ink-glide hit-expand inline-flex size-8 cursor-pointer items-center justify-center hover:-translate-y-0.5 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
              className="ink-glide hit-expand inline-flex size-8 cursor-pointer items-center justify-center hover:-translate-y-0.5 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <MessageSquare className="size-3.5" strokeWidth={1.7} />
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
