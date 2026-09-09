'use client'

import { useState } from 'react'
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
 * 评论登录卡片：根据服务端 provider 配置展示登录按钮，并处理当前 session。
 */
export function CommentAuthCard({ providers, isOwner }: CommentAuthCardProps) {
  const { data: session, isPending: sessionPending } = useSession()
  const [signingIn, setSigningIn] = useState<'github' | 'google' | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

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

  if (sessionPending) {
    return (
      <div className="flex h-16 items-center justify-between rounded-lg border border-border/40 bg-card/20 px-4">
        <div className="flex items-center gap-3">
          <div className="size-8 animate-pulse rounded-full bg-muted/60" />
          <div className="h-4 w-24 animate-pulse rounded bg-muted/60" />
        </div>
      </div>
    )
  }

  // 已登录状态
  if (session?.user) {
    const user = session.user
    const fallbackLetter = (user.name || user.email || 'U').charAt(0).toUpperCase()

    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-medium text-foreground">
            {user.image ? (
              // eslint-disable-next-line next/no-img-element
              <img src={user.image} alt={user.name} className="size-full object-cover" />
            ) : (
              <span>{fallbackLetter}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{user.name}</span>
            {isOwner && (
              <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-primary">
                作者
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:opacity-50"
        >
          {signingOut ? '退出中...' : '退出登录'}
        </button>
      </div>
    )
  }

  // 未登录状态
  const hasAnyProvider = providers.github || providers.google

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/20 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">// 参与讨论</span>
          <span className="text-xs text-muted-foreground">免密码登录发表评论</span>
        </div>
      </div>

      {errorMsg && <div className="rounded bg-red-500/10 p-2 text-xs text-red-600 dark:text-red-400">{errorMsg}</div>}

      {hasAnyProvider ? (
        <div className="flex flex-wrap gap-2.5 pt-1">
          {providers.github && (
            <button
              type="button"
              onClick={() => handleSignIn('github')}
              disabled={Boolean(signingIn)}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background/80 px-3.5 text-xs font-medium text-foreground shadow-xs transition-all hover:border-foreground/30 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:opacity-50"
            >
              <GithubIcon className="size-4" />
              <span>{signingIn === 'github' ? '正在连接 GitHub...' : 'GitHub 登录'}</span>
            </button>
          )}

          {providers.google && (
            <button
              type="button"
              onClick={() => handleSignIn('google')}
              disabled={Boolean(signingIn)}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background/80 px-3.5 text-xs font-medium text-foreground shadow-xs transition-all hover:border-foreground/30 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:opacity-50"
            >
              <GoogleIcon className="size-4" />
              <span>{signingIn === 'google' ? '正在连接 Google...' : 'Google 登录'}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">暂未配置第三方登录提供商（GitHub / Google）。</div>
      )}
    </div>
  )
}
