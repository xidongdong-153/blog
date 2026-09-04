'use client'

import type { Heading } from '@/lib/content'
import { useEffect, useRef, useState } from 'react'

interface TableOfContentsProps {
  headings: Heading[]
  onItemClick?: () => void
}

/**
 * 文章目录组件（轨道式参考导轨 Rail Wayfinding）。
 *
 * 核心特性与边界防护：
 * 1. 视口多章节同时感知高亮：视口内出现的所有章节对应目录项与刻度节点同时高亮，保留原有的全景感知逻辑。
 * 2. 采用 getBoundingClientRect 计算章节在视口内的实时投影，彻底解决 offsetTop/offsetParent 与图片延迟加载导致的失敏与时序竞态。
 * 3. 导轨内缩安全边距（ps-3 复合内边距），彻底杜绝侧边栏 overflow-y: auto 截断左侧刻度圆圈的问题。
 * 4. 保持点击平滑跳转互斥锁与用户手势主动打断。
 */
export function TableOfContents({ headings, onItemClick }: TableOfContentsProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [activeIds, setActiveIds] = useState<string[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const suppressFollowRef = useRef(false)
  const pendingClickSlugRef = useRef<string>('')
  const activeIdsRef = useRef<string[]>([])
  const rafIdRef = useRef<number>(0)

  useEffect(() => {
    if (headings.length === 0) return

    const container = containerRef.current
    if (!container) return

    const scrollContainer = container.closest<HTMLElement>('#sidebar') ?? container

    const releaseFollow = () => {
      suppressFollowRef.current = false
    }

    const ensureLinkVisible = (link: HTMLElement) => {
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
      // 动态查询所有真实有效标题元素
      const headingElements = headings
        .map((h) => ({ id: h.id, el: document.getElementById(h.id) }))
        .filter((item): item is { id: string; el: HTMLElement } => item.el !== null)

      if (headingElements.length === 0) return

      // 到达判定与点击互斥锁释放
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

        // 视口内多标题高亮判定：章节从当前标题顶部至下一标题顶部（或文章底部）在视口内有投影
        currentActiveIds = headingElements
          .filter((item, index) => {
            const rangeTop = item.el.getBoundingClientRect().top
            const nextEl = headingElements[index + 1]?.el
            const rangeBottom = nextEl ? nextEl.getBoundingClientRect().top : articleBottom
            return rangeTop < windowHeight && rangeBottom > TOP_OFFSET
          })
          .map((item) => item.id)

        // 边界防护：刚进文章还未滑入第一个标题，且第一个标题已在视口下半部分
        if (currentActiveIds.length === 0 && headingElements.length > 0) {
          const firstTop = headingElements[0].el.getBoundingClientRect().top
          if (firstTop < windowHeight * 0.7 && firstTop > 0) {
            currentActiveIds = [headingElements[0].id]
          }
        }
      }

      // 仅在激活项列表发生改变时才触发 React state 更新，滚动中无多余 re-render
      const isDifferent =
        currentActiveIds.length !== activeIdsRef.current.length ||
        currentActiveIds.some((id, i) => id !== activeIdsRef.current[i])

      if (isDifferent) {
        activeIdsRef.current = currentActiveIds
        setActiveIds(currentActiveIds)

        // 将首个激活章节对齐在侧边栏可见区域
        if (currentActiveIds.length > 0 && !suppressFollowRef.current) {
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

    // 初始执行，并在 100ms / 300ms / 600ms 补发探测，防止动态 MDX 渲染导致初次查找落空
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

  if (headings.length === 0) {
    return null
  }

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

  return (
    <nav ref={containerRef} aria-label="文章导轨目录" className="select-none ps-3 pe-2 text-xs leading-6">
      <div className="mb-3 flex items-center justify-between border-b border-border/40 pb-2">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-2 font-mono text-[0.7rem] tracking-wider text-muted-foreground transition-colors hover:text-foreground"
          aria-expanded={isOpen}
        >
          <span className="font-semibold">// 目录</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`size-3 transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="relative ps-3">
          {/* 贯穿式垂直参考导轨线：距当前相对容器左侧 3.5px */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-2 start-[3.5px] top-2 w-px bg-border/60"
          />

          <ul className="flex flex-col gap-1 ps-4">
            {headings.map((heading) => {
              const isActive = activeIds.includes(heading.id)
              return (
                <li key={heading.id} className="relative flex items-center">
                  {/* 导轨刻度锚点：居中对齐导轨线，四周留有充裕安全内边距，永不被侧边栏 overflow 裁切 */}
                  <span
                    aria-hidden="true"
                    className={`absolute -start-[16px] size-2 rounded-full border transition-all duration-150 ${
                      isActive ? 'scale-125 border-primary bg-primary' : 'border-border bg-background'
                    }`}
                  />

                  {/* 章节链接 */}
                  <a
                    href={`#${heading.id}`}
                    onClick={(e) => handleLinkClick(e, heading.id)}
                    className={`line-clamp-2 block w-full py-1 pe-2 ps-1.5 transition-colors duration-150 ${
                      isActive ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'
                    } ${heading.depth === 3 ? 'ms-2 text-[0.75rem]' : 'font-normal'}`}
                  >
                    {heading.text}
                  </a>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </nav>
  )
}
