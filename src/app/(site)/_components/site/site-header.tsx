'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { siteConfig } from '@/site.config'
import { ThemeToggle } from './theme-toggle'

/**
 * sticky 胶囊页头。
 * 滚动过 20px 变成带边框和阴影的半透明胶囊；
 * 向下滚动超过 350px 隐藏，向上滚动立刻出现；
 * 移动端折叠成下拉展开菜单。
 */
export function SiteHeader() {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [visible, setVisible] = useState(true)
  const [expanded, setExpanded] = useState(false)

  const headerRef = useRef<HTMLElement>(null)
  const lastScrollY = useRef(0)
  const lastScrolledRef = useRef(false)
  const lastVisibleRef = useRef(true)

  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const isScrolled = currentScrollY > 20
      const isVisible = currentScrollY < 350 || currentScrollY < lastScrollY.current

      if (isScrolled !== lastScrolledRef.current) {
        lastScrolledRef.current = isScrolled
        setScrolled(isScrolled)
      }

      if (isVisible !== lastVisibleRef.current) {
        lastVisibleRef.current = isVisible
        setVisible(isVisible)
      }

      lastScrollY.current = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (!expanded) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!headerRef.current) return
      const target = event.target
      if (target instanceof Node && !headerRef.current.contains(target)) {
        setExpanded(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [expanded])

  useEffect(() => {
    setExpanded(false)
  }, [pathname])

  return (
    <header
      ref={headerRef}
      data-scrolled={scrolled}
      data-visible={visible}
      className="sticky top-4 z-[70] w-full px-4 transition-transform duration-300 motion-reduce:transition-none sm:px-6 data-[visible=false]:-translate-y-24"
    >
      <div
        data-scrolled={scrolled}
        className="relative mx-auto flex h-14 max-w-5xl items-center justify-between rounded-xl border border-transparent px-4 transition-all duration-300 motion-reduce:transition-none sm:rounded-2xl data-[scrolled=true]:border-border data-[scrolled=true]:bg-background/80 data-[scrolled=true]:backdrop-blur-md dark:data-[scrolled=true]:bg-muted/80 data-[scrolled=true]:shadow-[0_0_0_1px_hsl(var(--foreground)/0.08),0_10px_15px_-3px_hsl(var(--foreground)/0.08),0_4px_6px_-4px_hsl(var(--foreground)/0.08)] data-[scrolled=true]:min-[800px]:mx-[8%]"
      >
        <Link href="/" className="text-sm font-semibold tracking-tight">
          {siteConfig.title}
        </Link>

        <div className="flex items-center gap-2">
          <nav className="hidden items-center gap-4 text-sm sm:flex">
            {siteConfig.nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isActive(item.href) ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-primary'
                }
              >
                {item.name}
              </Link>
            ))}
          </nav>
          <ThemeToggle />
          <button
            type="button"
            aria-label="切换菜单"
            aria-expanded={expanded}
            aria-controls="mobile-nav"
            onClick={() => setExpanded((prev) => !prev)}
            className="rounded-md border border-border p-1.5 transition-colors hover:bg-muted sm:hidden"
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
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* 移动端展开菜单 */}
        <div
          id="mobile-nav"
          data-expanded={expanded}
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] grid rounded-xl border border-border bg-background/95 shadow-lg backdrop-blur-md transition-[grid-template-rows,opacity] duration-300 dark:bg-muted/95 data-[expanded=false]:pointer-events-none data-[expanded=false]:grid-rows-[0fr] data-[expanded=false]:opacity-0 data-[expanded=true]:pointer-events-auto data-[expanded=true]:grid-rows-[1fr] data-[expanded=true]:opacity-100 sm:hidden"
        >
          <div className="overflow-hidden p-2">
            <nav className="flex flex-col gap-1 text-sm">
              {siteConfig.nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-3 py-2 font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-primary'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </header>
  )
}
