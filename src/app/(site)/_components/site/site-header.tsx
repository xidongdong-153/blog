'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { siteConfig } from '@/site.config'
import { ThemeToggle } from './theme-toggle'

/**
 * 页头。当前路由高亮用 usePathname，所以是 client 组件。
 * '/' 需要精确匹配，其他路由按前缀匹配。
 */
export function SiteHeader() {
  const pathname = usePathname()

  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <header className="border-b border-stone-200 dark:border-stone-800">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          {siteConfig.title}
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {siteConfig.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                isActive(item.href)
                  ? 'font-medium text-foreground'
                  : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
              }
            >
              {item.name}
            </Link>
          ))}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
