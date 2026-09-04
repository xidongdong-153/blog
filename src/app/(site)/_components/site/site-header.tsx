'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { siteConfig } from '@/site.config'
import { ThemeToggle } from './theme-toggle'

/**
 * 液体融合胶囊页头。
 * 顶部静止时完全融入页面背景（无边框、无底色、无阴影）；
 * 页面向下滚动 0~80px 期间，通过连续无级插值如液体交融般凝聚出半透明水膜胶囊；
 * 向下快速滚动超过 350px 自动收起，向上滚动立刻平滑滑回；
 * 移动端支持折叠与展开导航。
 */
export function SiteHeader() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(true)
  const [expanded, setExpanded] = useState(false)

  const headerRef = useRef<HTMLElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const capsuleRef = useRef<HTMLDivElement>(null)

  const lastScrollY = useRef(0)
  const lastVisibleRef = useRef(true)
  const rafIdRef = useRef<number | null>(null)

  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  useEffect(() => {
    const updateHeader = () => {
      const currentScrollY = window.scrollY

      // 1. 计算 0px ~ 80px 范围内的连续融合进度 (0.0 ~ 1.0)
      const rawProgress = Math.min(Math.max(currentScrollY / 80, 0), 1)
      // 使用 smoothstep (平滑 S 型缓动)，增强流体表面张力感
      const progress = rawProgress * rawProgress * (3 - 2 * rawProgress)

      if (backdropRef.current) {
        backdropRef.current.style.opacity = progress.toFixed(3)
      }

      // 宽屏下随进度产生微弱的水滴收敛微动 (最大微缩 2%)
      if (capsuleRef.current && window.innerWidth >= 800) {
        const scale = (1 - progress * 0.02).toFixed(4)
        capsuleRef.current.style.transform = `scale(${scale})`
      } else if (capsuleRef.current) {
        capsuleRef.current.style.transform = ''
      }

      // 2. 判定显示/隐藏状态：350px 以内或向上滚动时可见
      const isVisible = currentScrollY < 350 || currentScrollY < lastScrollY.current
      if (isVisible !== lastVisibleRef.current) {
        lastVisibleRef.current = isVisible
        setVisible(isVisible)
      }

      lastScrollY.current = currentScrollY
      rafIdRef.current = null
    }

    const handleScroll = () => {
      if (rafIdRef.current === null) {
        rafIdRef.current = window.requestAnimationFrame(updateHeader)
      }
    }

    // 初始化一次当前滚动状态（防止页面刷新在非顶部位置时样式不同步）
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
      data-visible={visible}
      className="sticky top-4 z-[70] w-full px-4 transition-transform duration-300 motion-reduce:transition-none sm:px-6 data-[visible=false]:-translate-y-24"
    >
      <div
        ref={capsuleRef}
        className="relative mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:rounded-2xl will-change-transform motion-reduce:transform-none"
      >
        {/* 液体融合水膜背景层 */}
        <div
          ref={backdropRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 rounded-xl border border-border bg-background/80 shadow-[0_0_0_1px_hsl(var(--foreground)/0.06),0_10px_15px_-3px_hsl(var(--foreground)/0.06),0_4px_6px_-4px_hsl(var(--foreground)/0.06)] backdrop-blur-md will-change-[opacity] sm:rounded-2xl dark:bg-muted/80"
          style={{
            opacity: 0,
            WebkitMaskImage: 'linear-gradient(to bottom, black calc(100% - 6px), transparent 100%)',
            maskImage: 'linear-gradient(to bottom, black calc(100% - 6px), transparent 100%)',
          }}
        />

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
