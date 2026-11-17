'use client'

import { PenLine } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from './ui/button'

const ADMIN_NAV_ITEMS = [
  { href: '/admin', label: '总览' },
  { href: '/admin/posts', label: '文章' },
  { href: '/admin/ai', label: 'AI' },
]

/** 管理页面共用导航，预览页与专注写作态隐藏以保留纯净空间。 */
export function AdminNavigation() {
  const pathname = usePathname()
  if (pathname.endsWith('/preview')) return null

  const showQuickWrite = !pathname.startsWith('/admin/posts')

  return (
    <nav
      data-slot="admin-nav"
      aria-label="管理导航"
      className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-hair text-sm"
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
        {ADMIN_NAV_ITEMS.map(({ href, label }) => {
          const active = href === '/admin' ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`group/nav relative flex min-h-11 items-center px-1 font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>{label}</span>
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute inset-x-0 -bottom-px h-[2px] origin-left rounded-full bg-primary transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none ${
                  active
                    ? 'scale-x-100 opacity-100'
                    : 'scale-x-0 opacity-0 group-hover/nav:scale-x-100 group-hover/nav:opacity-40'
                }`}
              />
            </Link>
          )
        })}
      </div>

      {showQuickWrite && (
        <Button asChild size="sm" className="mb-1.5">
          <Link href="/admin/posts/new">
            <PenLine aria-hidden="true" />
            新建文章
          </Link>
        </Button>
      )}
    </nav>
  )
}
