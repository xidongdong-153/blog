'use client'

import type { HeaderPostItem } from './command-search-modal'
import type { BlogCategory } from '@/lib/blog-meta'
import { Search } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { BLOG_CATEGORIES, BLOG_CATEGORY_LABELS, buildBlogListUrl } from '@/lib/blog-meta'
import { siteConfig } from '@/site.config'
import { PresenceStatus } from '../home/presence'
import { CommandSearchModal } from './command-search-modal'
import { HeaderAuth } from './header-auth'
import { PaperSurface } from './paper-surface'

export interface HeaderCategoryStat {
  category: BlogCategory
  label: string
  count: number
}

interface SiteHeaderProps {
  posts?: HeaderPostItem[]
  categories?: HeaderCategoryStat[]
}

function formatShortDate(iso: string): string {
  const parts = iso.slice(0, 10).split('-')
  if (parts.length === 3) {
    return `${parts[1]}·${parts[2]}`
  }
  return iso
}

/**
 * 全站自适应页头。
 * 1. 滚动交互：顶部通透融入；向下滚动退隐让出阅读视口，向上滚动柔和浮现。
 * 2. 导航指示：底部精密游标细线随当前路由弹性滑动。
 * 3. 文章预览：悬停「文章」弹出双栏分类浮层，支持快速按分类浏览与检索跳转。
 * 4. 集成全站 ⌘K 命令搜索面板与账号入口。
 */
export function SiteHeader({ posts = [], categories = [] }: SiteHeaderProps) {
  const pathname = usePathname()
  const isAdminRoute = pathname.startsWith('/admin')

  const [visible, setVisible] = useState(true)
  const [scrolled, setScrolled] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [blogMenuOpen, setBlogMenuOpen] = useState(false)
  const [hoveredCategory, setHoveredCategory] = useState<BlogCategory>('tech')

  const [underline, setUnderline] = useState<{ left: number; width: number; ready: boolean }>({
    left: 0,
    width: 0,
    ready: false,
  })

  const headerRef = useRef<HTMLElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const labelRefs = useRef<Record<string, HTMLSpanElement | null>>({})
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const blogMenuItemRef = useRef<HTMLLIElement>(null)
  const blogLinkRef = useRef<HTMLAnchorElement>(null)
  const skipFocusOpenRef = useRef(false)
  const closeMenuTimerRef = useRef<number | null>(null)
  const handleCloseSearch = useCallback(() => setSearchOpen(false), [])
  const lastScrollY = useRef(0)
  const lastVisibleRef = useRef(true)
  const scrollDeltaRef = useRef(0)
  const rafIdRef = useRef<number | null>(null)

  const isActive = useCallback(
    (href: string): boolean => {
      if (href === '/') return pathname === '/'
      return pathname === href || pathname.startsWith(`${href}/`)
    },
    [pathname],
  )

  const activeHref = useMemo(() => {
    const matched = siteConfig.nav.find((item) => isActive(item.href))
    return matched?.href ?? null
  }, [isActive])

  const measureUnderline = useCallback(() => {
    if (!activeHref || !navRef.current) {
      setUnderline((prev) => (prev.ready ? { ...prev, ready: false } : prev))
      return
    }
    const labelEl = labelRefs.current[activeHref]
    if (!labelEl) {
      setUnderline((prev) => (prev.ready ? { ...prev, ready: false } : prev))
      return
    }

    const navRect = navRef.current.getBoundingClientRect()
    const labelRect = labelEl.getBoundingClientRect()
    const left = labelRect.left - navRect.left
    const width = labelRect.width

    setUnderline({ left, width, ready: width > 0 })
  }, [activeHref])

  useLayoutEffect(() => {
    measureUnderline()
  }, [measureUnderline, pathname])

  useEffect(() => {
    const handleResize = () => measureUnderline()
    window.addEventListener('resize', handleResize, { passive: true })
    if (document.fonts?.ready) {
      void document.fonts.ready.then(measureUnderline)
    }
    return () => window.removeEventListener('resize', handleResize)
  }, [measureUnderline])

  // 滚动显隐与顶部模糊背板判定
  useEffect(() => {
    const updateHeader = () => {
      const currentScrollY = window.scrollY
      setScrolled(currentScrollY > (isAdminRoute ? 12 : 40))

      if (isAdminRoute) {
        if (!lastVisibleRef.current) {
          lastVisibleRef.current = true
          setVisible(true)
        }
        lastScrollY.current = currentScrollY
        rafIdRef.current = null
        return
      }

      const delta = currentScrollY - lastScrollY.current
      if (currentScrollY <= 140) {
        if (!lastVisibleRef.current) {
          lastVisibleRef.current = true
          setVisible(true)
        }
        scrollDeltaRef.current = 0
      } else if (delta > 0) {
        if (scrollDeltaRef.current < 0) scrollDeltaRef.current = 0
        scrollDeltaRef.current += delta
        if (scrollDeltaRef.current > 14 && currentScrollY > 240 && lastVisibleRef.current) {
          lastVisibleRef.current = false
          setVisible(false)
          setBlogMenuOpen(false)
        }
      } else if (delta < 0) {
        if (scrollDeltaRef.current > 0) scrollDeltaRef.current = 0
        scrollDeltaRef.current += delta
        if (scrollDeltaRef.current < -10 && !lastVisibleRef.current) {
          lastVisibleRef.current = true
          setVisible(true)
        }
      }

      lastScrollY.current = currentScrollY
      rafIdRef.current = null
    }

    const handleScroll = () => {
      if (rafIdRef.current === null) {
        rafIdRef.current = window.requestAnimationFrame(updateHeader)
      }
    }

    updateHeader()
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current)
      }
    }
  }, [isAdminRoute])

  // 全局 ⌘K / Ctrl+K 搜索快捷键 & 自定义打开事件
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      if (event.target instanceof Element && event.target.closest('[data-mdx-editor="true"]')) return
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen((prev) => !prev)
      }
    }
    const onCustomOpen = () => setSearchOpen(true)

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('open-command-search', onCustomOpen)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('open-command-search', onCustomOpen)
    }
  }, [])

  // 移动菜单外部点击与 ESC 关闭
  useEffect(() => {
    if (!expanded) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!headerRef.current) return
      const target = event.target
      if (target instanceof Node && !headerRef.current.contains(target)) {
        setExpanded(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setExpanded(false)
      menuButtonRef.current?.focus()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [expanded])

  useEffect(() => {
    setExpanded(false)
    setBlogMenuOpen(false)
  }, [pathname])

  // 桌面端「文章」悬停/聚焦浮层按 Escape 关闭并回焦点到触发链
  useEffect(() => {
    if (!blogMenuOpen) return
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      const focusInsidePopover =
        document.activeElement instanceof Node &&
        document.activeElement !== blogLinkRef.current &&
        Boolean(blogMenuItemRef.current?.contains(document.activeElement))
      setBlogMenuOpen(false)
      if (focusInsidePopover) {
        skipFocusOpenRef.current = true
        blogLinkRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [blogMenuOpen])

  const openBlogMenu = () => {
    if (closeMenuTimerRef.current !== null) {
      window.clearTimeout(closeMenuTimerRef.current)
      closeMenuTimerRef.current = null
    }
    if (posts.length > 0) {
      setBlogMenuOpen(true)
    }
  }

  const scheduleCloseBlogMenu = () => {
    if (closeMenuTimerRef.current !== null) {
      window.clearTimeout(closeMenuTimerRef.current)
    }
    closeMenuTimerRef.current = window.setTimeout(() => {
      setBlogMenuOpen(false)
      closeMenuTimerRef.current = null
    }, 150)
  }

  const resolvedCategories = useMemo<HeaderCategoryStat[]>(() => {
    if (categories.length > 0) return categories
    return BLOG_CATEGORIES.map((category) => ({
      category,
      label: BLOG_CATEGORY_LABELS[category],
      count: posts.filter((p) => p.category === category).length,
    }))
  }, [categories, posts])

  const categoryPosts = useMemo(
    () => posts.filter((post) => post.category === hoveredCategory).slice(0, 5),
    [posts, hoveredCategory],
  )

  return (
    <>
      <header
        id="site-header"
        ref={headerRef}
        data-visible={visible || expanded}
        data-scrolled={scrolled}
        className="sticky top-0 z-[70] h-[4.5rem] w-full transition-[transform,translate,opacity,background-color,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-opacity data-[scrolled=false]:border-b data-[scrolled=false]:border-transparent data-[scrolled=true]:border-b data-[scrolled=true]:border-hair data-[scrolled=true]:bg-background/85 data-[scrolled=true]:backdrop-blur-md data-[visible=false]:pointer-events-none data-[visible=false]:motion-safe:-translate-y-1.5 data-[visible=false]:opacity-0 data-[visible=true]:pointer-events-auto data-[visible=true]:translate-y-0 data-[visible=true]:opacity-100"
      >
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-3 px-6 sm:gap-6 lg:px-8">
          <PresenceStatus />

          <div className="flex shrink-0 items-center gap-4">
            {/* 桌面端主导航 + 滑动手绘书法曲线 */}
            <nav ref={navRef} aria-label="主导航" className="relative hidden text-[15px] sm:block">
              <ul className="flex list-none items-center font-medium">
                {siteConfig.nav.map((item) => {
                  const active = isActive(item.href)
                  const isBlogLink = item.href === '/blog'

                  if (isBlogLink) {
                    return (
                      <li
                        key={item.href}
                        ref={blogMenuItemRef}
                        className="relative"
                        onMouseEnter={openBlogMenu}
                        onMouseLeave={scheduleCloseBlogMenu}
                        onBlur={(event) => {
                          const relatedTarget = event.relatedTarget
                          if (!(relatedTarget instanceof Node) || !event.currentTarget.contains(relatedTarget)) {
                            setBlogMenuOpen(false)
                          }
                        }}
                      >
                        <Link
                          ref={blogLinkRef}
                          href={item.href}
                          aria-current={active ? 'page' : undefined}
                          aria-expanded={blogMenuOpen}
                          onFocus={() => {
                            if (skipFocusOpenRef.current) {
                              skipFocusOpenRef.current = false
                              return
                            }
                            openBlogMenu()
                          }}
                          className={`relative z-[1] inline-flex min-h-10 items-center whitespace-nowrap px-3.5 py-1.5 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring ${
                            active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <span
                            ref={(el) => {
                              labelRefs.current[item.href] = el
                            }}
                            className="relative inline-block"
                          >
                            {item.name}
                          </span>
                        </Link>

                        {/* 悬停文章分类预览纸卡 */}
                        {blogMenuOpen && posts.length > 0 && (
                          <div
                            onMouseEnter={openBlogMenu}
                            onMouseLeave={scheduleCloseBlogMenu}
                            className="isolate absolute left-1/2 top-[calc(100%+0.45rem)] z-[80] w-[490px] -translate-x-1/2 rounded-xl border border-hair bg-popover px-[18px] pb-3.5 pt-[18px] text-left shadow-xl"
                          >
                            <div className="grid grid-cols-[140px_minmax(0,1fr)]">
                              {/* 左侧分类列 */}
                              <div className="min-w-0 border-r border-hair pr-3.5">
                                <div className="mb-2 px-3 font-mono text-[10px] tracking-[0.28em] text-muted-foreground uppercase">
                                  分类
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  {resolvedCategories.map((cat) => {
                                    const selected = hoveredCategory === cat.category
                                    return (
                                      <Link
                                        key={cat.category}
                                        href={buildBlogListUrl({ category: cat.category })}
                                        onMouseEnter={() => setHoveredCategory(cat.category)}
                                        onFocus={() => setHoveredCategory(cat.category)}
                                        onClick={() => setBlogMenuOpen(false)}
                                        className={`group/row relative flex h-8 items-center justify-between px-3 text-[13px] transition-colors ${
                                          selected
                                            ? 'text-foreground font-medium'
                                            : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                      >
                                        {selected && (
                                          <span
                                            aria-hidden="true"
                                            className="pointer-events-none absolute left-0.5 top-1/2 h-3.5 w-[2px] -translate-y-1/2 rounded-xs bg-primary"
                                          />
                                        )}
                                        <span className="truncate">{cat.label}</span>
                                        <span
                                          className={`font-mono text-xs tabular-nums transition-colors ${
                                            selected ? 'text-primary' : 'text-muted-foreground'
                                          }`}
                                        >
                                          {cat.count}
                                        </span>
                                      </Link>
                                    )
                                  })}
                                </div>
                              </div>

                              {/* 右侧当前分类近期文章 */}
                              <div className="min-w-0 pl-4">
                                <div className="mb-2 px-2 font-mono text-[10px] tracking-[0.16em] text-muted-foreground">
                                  {BLOG_CATEGORY_LABELS[hoveredCategory]} · 最新
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  {categoryPosts.length > 0 ? (
                                    categoryPosts.map((post) => (
                                      <Link
                                        key={post.slug}
                                        href={`/blog/${post.slug}`}
                                        onClick={() => setBlogMenuOpen(false)}
                                        className="ink-glide flex h-8 items-center gap-2.5 px-2 text-[13px] text-foreground/85 hover:translate-x-1 hover:text-primary"
                                      >
                                        <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                                          {formatShortDate(post.date)}
                                        </span>
                                        <span className="truncate">{post.title}</span>
                                      </Link>
                                    ))
                                  ) : (
                                    <div className="px-2 py-4 text-xs text-muted-foreground">暂无该分类文章</div>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between border-t border-hair pt-2.5 px-1 text-xs text-muted-foreground">
                              <Link
                                href="/blog"
                                onClick={() => setBlogMenuOpen(false)}
                                className="group/ink inline-flex items-center gap-1 transition-colors hover:text-primary"
                              >
                                <span className="ink-line">查看全部文章</span>
                                <span aria-hidden="true" className="ink-glide group-hover/ink:translate-x-1">
                                  →
                                </span>
                              </Link>
                              <span className="font-mono text-[11px] tabular-nums">{posts.length} 篇文章</span>
                            </div>
                          </div>
                        )}
                      </li>
                    )
                  }

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        className={`relative z-[1] inline-flex min-h-10 items-center whitespace-nowrap px-3.5 py-1.5 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring ${
                          active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <span
                          ref={(el) => {
                            labelRefs.current[item.href] = el
                          }}
                          className="relative inline-block"
                        >
                          {item.name}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>

              {/* 随路由滑动的精密游标细线 */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute bottom-0.5 left-0 flex h-[2px] items-center transition-[transform,width,opacity] duration-[420ms] ease-[var(--ease-spring)] motion-reduce:transition-none"
                style={{
                  transform: `translateX(${underline.left}px)`,
                  width: `${Math.max(underline.width, 12)}px`,
                  opacity: underline.ready ? 1 : 0,
                }}
              >
                <span className="h-[2px] w-full rounded-xs bg-primary" />
              </div>
            </nav>

            {/* 右侧分隔线与工具操作区（无框搜索 + 账号 + 移动菜单） */}
            <div className="flex items-center gap-3 border-l border-hair pl-2.5 sm:gap-3.5 sm:pl-4">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="全站搜索 (⌘K)"
                title="搜索 (⌘K)"
                className="group/ink hit-expand relative flex size-8 cursor-pointer items-center justify-center gap-1.5 text-muted-foreground transition-colors duration-200 hover:text-primary focus-visible:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:h-9 md:w-auto md:px-1.5"
              >
                <span className="ink-line inline-flex items-center gap-1.5">
                  <Search className="ink-glide size-3.5 shrink-0 group-hover/ink:scale-110" aria-hidden="true" />
                  <span className="hidden font-mono text-[11px] leading-none text-muted-foreground/80 transition-colors group-hover/ink:text-primary md:inline-block">
                    ⌘K
                  </span>
                </span>
              </button>

              <HeaderAuth />

              <button
                ref={menuButtonRef}
                type="button"
                aria-label="切换菜单"
                aria-expanded={expanded}
                aria-controls="mobile-nav"
                onClick={() => setExpanded((prev) => !prev)}
                className="ink-glide hit-expand flex size-8 cursor-pointer items-center justify-center text-muted-foreground hover:text-primary active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:hidden"
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
                  <line x1="4" x2="20" y1="12" y2="12" />
                  <line x1="4" x2="20" y1="6" y2="6" />
                  <line x1="4" x2="20" y1="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* 移动端折叠菜单（完全不透明背景，避免底层文字穿透重影） */}
        <div
          id="mobile-nav"
          data-expanded={expanded}
          inert={!expanded}
          className="isolate absolute left-4 right-4 top-[calc(100%+0.35rem)] grid rounded-xl bg-popover transition-[grid-template-rows,opacity] duration-300 ease-[var(--ease-spring)] data-[expanded=false]:pointer-events-none data-[expanded=false]:grid-rows-[0fr] data-[expanded=false]:opacity-0 data-[expanded=true]:pointer-events-auto data-[expanded=true]:grid-rows-[1fr] data-[expanded=true]:opacity-100 sm:hidden"
        >
          <PaperSurface className="bg-popover" />
          <div className="overflow-hidden p-2">
            <nav aria-label="移动端主导航" className="flex flex-col gap-0.5 text-sm">
              {siteConfig.nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                  className={`flex min-h-11 items-center justify-between px-3 py-2 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                    isActive(item.href) ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span>{item.name}</span>
                  {isActive(item.href) && <span aria-hidden="true" className="h-3.5 w-[2px] rounded-xs bg-primary" />}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <CommandSearchModal isOpen={searchOpen} onClose={handleCloseSearch} posts={posts} />
    </>
  )
}
