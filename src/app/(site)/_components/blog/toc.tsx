'use client'

import type { Heading } from '@/lib/content'
import { useEffect, useRef, useState } from 'react'

interface TableOfContentsProps {
  headings: Heading[]
  onItemClick?: () => void
}

/**
 * 文章目录组件。
 * 复刻 Joye 博客的目录交互与视觉设计：
 * 1. 左侧动态高度的阅读进度条（0% - 90%）。
 * 2. 基于 RAF 的滚动位置计算与当前章节高亮。
 * 3. 离开视口已读完章节标识。
 * 4. 点击平滑滚动与互斥锁（避免中间章节闪烁）。
 * 5. 用户手势（滚轮、触摸、按键）打断释放互斥。
 * 6. 侧边栏容器在超出上下边界 56px 时独立平滑滚动居中。
 * 7. 目录折叠展开支持。
 */
export function TableOfContents({ headings, onItemClick }: TableOfContentsProps) {
  const [isOpen, setIsOpen] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const suppressFollowRef = useRef(false)
  const pendingClickSlugRef = useRef<string>('')
  const activeSlugRef = useRef<string>('')
  const rafIdRef = useRef<number>(0)

  useEffect(() => {
    if (headings.length === 0) return

    const container = containerRef.current
    if (!container) return

    const articleHeadings = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null)

    if (articleHeadings.length === 0) return

    const links = Array.from(container.querySelectorAll<HTMLAnchorElement>('a[data-toc-link]'))
    const progressBars = links.map((link) => link.parentElement?.querySelector<HTMLElement>('[data-toc-progress]'))

    // 用户主动手势立即释放互斥锁
    const releaseFollow = () => {
      suppressFollowRef.current = false
    }

    const scrollContainer = container.closest<HTMLElement>('#sidebar') ?? container

    const ensureLinkVisible = (link: HTMLElement) => {
      const containerRect = scrollContainer.getBoundingClientRect()
      const linkRect = link.getBoundingClientRect()
      const edgePadding = 56
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
      const windowHeight = window.innerHeight
      const contentElement = document.querySelector('article') as HTMLElement | null
      const pageOffset = window.scrollY - (contentElement?.offsetTop || 0)
      const postOffset = (contentElement?.offsetHeight || 0) + 127

      let activeLink: HTMLAnchorElement | null = null

      articleHeadings.forEach((el, index) => {
        const nextHeadingTop = articleHeadings[index + 1]?.offsetTop || postOffset
        const rangeTop = el.offsetTop - pageOffset
        const rangeBottom = nextHeadingTop - pageOffset - el.offsetHeight
        const rangeHeight = rangeBottom - rangeTop
        const progress = rangeHeight > 0 ? (windowHeight - rangeTop) / rangeHeight : 1

        const inView = rangeTop < windowHeight && rangeBottom > 0
        const clampedProgress = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 1))

        const link = links[index]
        const progressBar = progressBars[index]

        if (!link) return

        if (inView) {
          link.classList.add('text-primary', 'font-medium', 'bg-primary/5')
          link.classList.remove('text-muted-foreground')
        } else {
          link.classList.remove('text-primary', 'font-medium', 'bg-primary/5')
          link.classList.add('text-muted-foreground')
        }

        if (progressBar) {
          progressBar.style.height = `${clampedProgress * 90}%`
          if (inView) {
            progressBar.classList.add('bg-primary')
            progressBar.classList.remove('bg-border', 'opacity-40')
          } else if (clampedProgress === 1) {
            progressBar.classList.remove('bg-primary')
            progressBar.classList.add('bg-border', 'opacity-40')
          } else {
            progressBar.classList.remove('bg-primary')
            progressBar.classList.add('bg-border')
          }
        }

        if (inView && !activeLink) {
          activeLink = link
        }
      })

      // 到达判定与互斥锁释放
      if (suppressFollowRef.current) {
        const targetHeading = articleHeadings.find((h) => h.id === pendingClickSlugRef.current)
        const arrived = !targetHeading || Math.abs(targetHeading.getBoundingClientRect().top) <= 150
        if (arrived) {
          suppressFollowRef.current = false
        }
        return
      }

      // 如果未锁定且有激活项，则保证侧边栏可见
      if (activeLink) {
        const link = activeLink as HTMLAnchorElement
        const slug = link.getAttribute('data-toc-link') || ''
        if (slug !== activeSlugRef.current) {
          activeSlugRef.current = slug
          ensureLinkVisible(link)
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

    // 初始执行一次
    updatePositionAndStyle()

    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)
    window.addEventListener('wheel', releaseFollow, { passive: true })
    window.addEventListener('touchstart', releaseFollow, { passive: true })
    window.addEventListener('keydown', releaseFollow)

    return () => {
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
      window.removeEventListener('wheel', releaseFollow)
      window.removeEventListener('touchstart', releaseFollow)
      window.removeEventListener('keydown', releaseFollow)
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
    activeSlugRef.current = id

    target.scrollIntoView({ behavior: 'smooth', block: 'start' })

    if (onItemClick) {
      onItemClick()
    }
  }

  return (
    <nav ref={containerRef} aria-label="目录" className="text-[0.8125rem] leading-7">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-foreground transition-colors hover:text-primary"
          aria-expanded={isOpen}
        >
          <span>目录</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`size-3.5 transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <ul className="flex flex-col gap-1">
          {headings.map((heading) => (
            <li key={heading.id} className="relative flex items-center">
              {/* 左侧 2px 阅读指示条 */}
              <div className="absolute start-0 top-[10%] h-[80%] w-[2px] rounded-full bg-border/40">
                <span
                  data-toc-progress
                  className="block w-full rounded-full bg-border transition-[height] duration-150 ease-out"
                  style={{ height: '0%' }}
                />
              </div>

              {/* 链接节点 */}
              <a
                href={`#${heading.id}`}
                data-toc-link={heading.id}
                onClick={(e) => handleLinkClick(e, heading.id)}
                className={`line-clamp-2 block w-full rounded py-1 pe-2 ps-3 text-muted-foreground transition-all duration-150 hover:text-foreground ${
                  heading.depth === 3 ? 'ms-3 text-xs' : 'ms-1'
                }`}
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      )}
    </nav>
  )
}
