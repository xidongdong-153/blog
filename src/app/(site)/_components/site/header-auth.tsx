'use client'

import { LayoutDashboard, LogOut, UserRound } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { signOut, useSession } from '@/lib/auth-client'
import { AuthModal } from './auth-modal'
import { PaperSurface } from './paper-surface'

/**
 * 顶栏右侧轻量认证入口与用户菜单。
 * 融入页头右侧操作区，支持已登录用户快速跳转后台或退出。
 */
export function HeaderAuth() {
  const pathname = usePathname()
  const { data: session, isPending: sessionPending } = useSession()
  const [modalOpen, setModalOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMenuOpen(false)
    setModalOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!session?.user) {
      setIsOwner(false)
      return
    }

    let active = true
    fetch('/api/config/auth')
      .then((res) => res.json())
      .then((json) => {
        if (!active) return
        if (json?.success && typeof json?.data?.isOwner === 'boolean') {
          setIsOwner(json.data.isOwner)
        }
      })
      .catch(() => {
        // 静默降级
      })

    return () => {
      active = false
    }
  }, [session?.user])

  useEffect(() => {
    if (!menuOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current) return
      const target = event.target
      if (target instanceof Node && !containerRef.current.contains(target)) {
        setMenuOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  const handleSignOut = async () => {
    try {
      setSigningOut(true)
      await signOut()
      setMenuOpen(false)
    } catch (err) {
      console.error('退出登录失败:', err)
    } finally {
      setSigningOut(false)
    }
  }

  if (sessionPending) {
    return <div className="size-7 animate-pulse rounded-md bg-muted/60" />
  }

  if (!session?.user) {
    return (
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          aria-label="登录"
          title="登录"
          className="flex size-8 items-center justify-center rounded-md border border-hair bg-card/80 text-muted-foreground transition-colors duration-200 hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:size-7"
        >
          <UserRound className="size-3.5" />
        </button>

        <AuthModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      </div>
    )
  }

  const user = session.user
  const fallbackLetter = (user.name || user.email || 'U').charAt(0).toUpperCase()

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((prev) => !prev)}
        aria-label="账号"
        aria-expanded={menuOpen}
        title={user.name || '账号'}
        className={`relative flex size-8 items-center justify-center overflow-hidden rounded-[8px] border bg-muted text-[11px] font-medium text-foreground transition-all hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:size-7 ${
          isOwner ? 'border-primary/55' : 'border-border/70'
        }`}
      >
        {user.image ? (
          // eslint-disable-next-line next/no-img-element
          <img src={user.image} alt={user.name || '头像'} className="size-full object-cover" />
        ) : (
          <span>{fallbackLetter}</span>
        )}
      </button>

      {menuOpen && (
        <div className="isolate absolute right-0 top-[calc(100%+0.6rem)] z-[80] w-52 rounded-lg p-2.5 animate-[modal-scale-in_180ms_var(--ease-spring)_both] motion-reduce:animate-none">
          <PaperSurface className="bg-popover" />
          <div className="flex items-center gap-2 border-b border-hair pb-2">
            <div className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-[7px] bg-muted text-xs font-medium text-foreground">
              {user.image ? (
                // eslint-disable-next-line next/no-img-element
                <img src={user.image} alt={user.name || '头像'} className="size-full object-cover" />
              ) : (
                <span>{fallbackLetter}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-xs font-medium text-foreground">{user.name || '未命名'}</span>
                {isOwner && (
                  <span className="rounded bg-primary/12 px-1 py-0.5 font-mono text-[9px] font-medium text-primary">
                    作者
                  </span>
                )}
              </div>
              {user.email && <p className="truncate font-mono text-[10px] text-muted-foreground">{user.email}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-0.5 pt-1.5">
            {isOwner && (
              <>
                <Link
                  href="/admin"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-foreground transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <LayoutDashboard className="size-3.5 text-muted-foreground" />
                  <span>控制台</span>
                </Link>
                <div className="my-1 border-t border-hair" />
              </>
            )}

            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
            >
              <LogOut className="size-3.5 text-muted-foreground" />
              <span>{signingOut ? '正在退出...' : '退出登录'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
