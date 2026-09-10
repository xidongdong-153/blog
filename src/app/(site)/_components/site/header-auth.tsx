'use client'

import { LogOut, Settings, User } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { signOut, useSession } from '@/lib/auth-client'
import { AuthModal } from './auth-modal'

/**
 * 顶栏固定认证入口与操作菜单。
 * 独立固定于顶栏右侧并垂直居中，不随页头胶囊隐藏。
 */
export function HeaderAuth() {
  const pathname = usePathname()
  const { data: session, isPending: sessionPending } = useSession()
  const [modalOpen, setModalOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // 路由跳转时关闭浮层与弹窗
  useEffect(() => {
    setMenuOpen(false)
    setModalOpen(false)
  }, [pathname])

  // 检测所有者状态
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

  // 点击外部或按 ESC 收起浮层
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

  // 会话加载中的极小占位
  if (sessionPending) {
    return (
      <div className="fixed top-4 right-3.5 z-[75] flex h-14 items-center sm:right-6">
        <div className="size-7 animate-pulse rounded-full bg-muted/40" />
      </div>
    )
  }

  // 未登录状态
  if (!session?.user) {
    return (
      <div className="fixed top-4 right-3.5 z-[75] flex h-14 items-center sm:right-6">
        <div ref={containerRef} className="relative">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            aria-label="登录"
            title="登录"
            className="flex size-7 items-center justify-center rounded-full border border-border/60 bg-background/80 text-muted-foreground/80 shadow-xs backdrop-blur-md transition-all hover:border-foreground/40 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <User className="size-3.5" />
          </button>

          <AuthModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
        </div>
      </div>
    )
  }

  // 已登录状态
  const user = session.user
  const fallbackLetter = (user.name || user.email || 'U').charAt(0).toUpperCase()

  return (
    <div className="fixed top-4 right-3.5 z-[75] flex h-14 items-center sm:right-6">
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="账号"
          aria-expanded={menuOpen}
          title={user.name || '账号'}
          className="relative flex size-7 items-center justify-center overflow-hidden rounded-full border border-border/80 bg-muted text-[11px] font-medium text-foreground shadow-xs backdrop-blur-md transition-all hover:border-foreground/40 hover:opacity-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {user.image ? (
            // eslint-disable-next-line next/no-img-element
            <img src={user.image} alt={user.name || '头像'} className="size-full object-cover" />
          ) : (
            <span>{fallbackLetter}</span>
          )}
          {isOwner && (
            <span className="absolute bottom-0 right-0 size-1.5 rounded-full bg-primary ring-1 ring-background" />
          )}
        </button>

        {/* 浮层菜单 */}
        {menuOpen && (
          <div className="absolute right-0 top-[calc(100%+0.5rem)] z-[80] w-52 rounded-xl border border-border/80 bg-background/95 p-2.5 shadow-xl backdrop-blur-md animate-[modal-scale-in_160ms_cubic-bezier(0.16,1,0.3,1)_both] motion-reduce:animate-none dark:bg-muted/95">
            {/* 账号信息 */}
            <div className="flex items-center gap-2 border-b border-border/50 pb-2">
              <div className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-medium text-foreground">
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
                    <span className="rounded bg-primary/10 px-1 py-0.5 font-mono text-[9px] font-medium text-primary">
                      作者
                    </span>
                  )}
                </div>
                {user.email && <p className="truncate font-mono text-[10px] text-muted-foreground">{user.email}</p>}
              </div>
            </div>

            {/* 菜单项 */}
            <div className="flex flex-col gap-0.5 pt-1.5">
              {isOwner && (
                <Link
                  href="/settings/ai"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-foreground transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <Settings className="size-3.5 text-muted-foreground" />
                  <span>AI 摘要配置</span>
                </Link>
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
    </div>
  )
}
