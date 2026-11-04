'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/** 管理页面共用导航，预览页隐藏以保留阅读空间。 */
export function AdminNavigation() {
  const pathname = usePathname()
  if (pathname.endsWith('/preview')) return null
  return (
    <nav aria-label="管理导航" className="mb-8 flex flex-wrap gap-x-6 gap-y-2 border-b border-border text-sm">
      {[
        { href: '/admin', label: '总览' },
        { href: '/admin/posts', label: '文章' },
        { href: '/settings/ai', label: 'AI 设置' },
      ].map(({ href, label }) => {
        const active = href === '/admin' ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-11 items-center border-b-2 px-1 focus-visible:outline-2 focus-visible:outline-ring ${active ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
