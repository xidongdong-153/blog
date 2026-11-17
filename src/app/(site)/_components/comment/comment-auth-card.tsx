'use client'

import { Settings } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { signIn, signOut, useSession } from '@/lib/auth-client'
import { GithubIcon, GoogleIcon } from './comment-icons'

interface CommentAuthCardProps {
  providers: {
    github: boolean
    google: boolean
  }
  isOwner?: boolean
}

/**
 * 评论登录栏（无卡片外壳，发丝线分隔，无边框排版式登录入口）。
 * 通过 mounted 状态隔离 SSR 与客户端首帧，消除 sessionPending 水合差异。
 */
export function CommentAuthCard({ providers, isOwner }: CommentAuthCardProps) {
  const { data: session, isPending: sessionPending } = useSession()
  const [mounted, setMounted] = useState(false)
  const [signingIn, setSigningIn] = useState<'github' | 'google' | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSignIn = async (provider: 'github' | 'google') => {
    try {
      setSigningIn(provider)
      setErrorMsg(null)
      await signIn.social({
        provider,
        callbackURL: typeof window !== 'undefined' ? window.location.href : '/',
      })
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '跳转登录失败，请重试')
      setSigningIn(null)
    }
  }

  const handleSignOut = async () => {
    try {
      setSigningOut(true)
      await signOut()
    } catch (err) {
      console.error('退出登录失败:', err)
    } finally {
      setSigningOut(false)
    }
  }

  if (!mounted || sessionPending) {
    return (
      <div className="flex h-12 items-center gap-3 border-y border-hair py-3">
        <div className="size-7 animate-pulse rounded-full bg-muted/60" />
        <div className="h-3.5 w-24 animate-pulse rounded bg-muted/60" />
      </div>
    )
  }

  // 已登录状态
  if (session?.user) {
    const user = session.user
    const fallbackLetter = (user.name || user.email || 'U').charAt(0).toUpperCase()

    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-hair py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-medium text-foreground">
            {user.image ? (
              // eslint-disable-next-line next/no-img-element
              <img src={user.image} alt={user.name} className="size-full object-cover" />
            ) : (
              <span>{fallbackLetter}</span>
            )}
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">{user.name}</span>
            {isOwner && (
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="font-mono text-[11px] font-medium text-primary">· 作者</span>
                <Link
                  href="/admin/ai"
                  title="AI"
                  aria-label="打开 AI 管理台"
                  className="p-1 text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <Settings className="size-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="ink-link shrink-0 cursor-pointer font-mono text-xs text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
        >
          {signingOut ? '退出中...' : '退出登录'}
        </button>
      </div>
    )
  }

  // 未登录状态
  const hasAnyProvider = providers.github || providers.google

  return (
    <div className="flex flex-col gap-3 border-y border-hair py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs text-muted-foreground">使用社交账号登录参与讨论</span>

        {hasAnyProvider ? (
          <div className="flex flex-wrap items-center gap-5 font-mono text-xs">
            {providers.github && (
              <button
                type="button"
                onClick={() => handleSignIn('github')}
                disabled={Boolean(signingIn)}
                aria-label="GitHub 登录"
                className="group/ink inline-flex cursor-pointer items-center gap-2 py-1 text-foreground/85 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
              >
                <GithubIcon className="ink-glide size-4 group-hover/ink:-translate-y-0.5" />
                <span className="ink-line">GitHub 登录</span>
              </button>
            )}

            {providers.google && (
              <button
                type="button"
                onClick={() => handleSignIn('google')}
                disabled={Boolean(signingIn)}
                aria-label="Google 登录"
                className="group/ink inline-flex cursor-pointer items-center gap-2 py-1 text-foreground/85 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
              >
                <GoogleIcon className="ink-glide size-4 group-hover/ink:-translate-y-0.5" />
                <span className="ink-line">Google 登录</span>
              </button>
            )}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">暂未配置第三方登录提供商（GitHub / Google）。</div>
        )}
      </div>

      {errorMsg && <div className="text-xs text-destructive">{errorMsg}</div>}
    </div>
  )
}
