'use client'

import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { signIn } from '@/lib/auth-client'
import { GithubIcon, GoogleIcon } from '../comment/comment-icons'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

interface AuthProvidersState {
  github: boolean
  google: boolean
}

/**
 * 快捷登录弹窗。
 * 动态拉取已配置的 OAuth 提供商并触发社交登录。
 */
export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [mounted, setMounted] = useState(false)
  const [providers, setProviders] = useState<AuthProvidersState>({
    github: false,
    google: false,
  })
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [signingIn, setSigningIn] = useState<'github' | 'google' | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // 弹窗打开时拉取最新提供商状态
  useEffect(() => {
    if (!isOpen) {
      setErrorMsg(null)
      setSigningIn(null)
      return
    }

    let active = true
    setLoadingConfig(true)
    fetch('/api/config/auth')
      .then((res) => res.json())
      .then((json) => {
        if (!active) return
        if (json?.success && json?.data?.providers) {
          setProviders(json.data.providers)
        }
      })
      .catch(() => {
        // 静默降级
      })
      .finally(() => {
        if (active) setLoadingConfig(false)
      })

    return () => {
      active = false
    }
  }, [isOpen])

  // 监听 ESC 键关闭
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!mounted || !isOpen) return null

  const handleSignIn = async (provider: 'github' | 'google') => {
    try {
      setSigningIn(provider)
      setErrorMsg(null)
      await signIn.social({
        provider,
        callbackURL: typeof window !== 'undefined' ? window.location.href : '/',
      })
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '跳转登录失败，请稍后重试')
      setSigningIn(null)
    }
  }

  const hasAnyProvider = providers.github || providers.google

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4"
    >
      {/* 遮罩背景 */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm animate-[modal-fade-in_180ms_cubic-bezier(0.16,1,0.3,1)_both] motion-reduce:animate-none"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 弹窗主体 */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 flex w-full max-w-[280px] flex-col overflow-hidden rounded-xl border border-border/80 bg-card p-4 shadow-2xl animate-[modal-scale-in_200ms_cubic-bezier(0.16,1,0.3,1)_both] motion-reduce:animate-none sm:p-5"
      >
        {/* 头部标题与关闭按钮 */}
        <div className="flex items-center justify-between gap-3">
          <h2 id="auth-modal-title" className="truncate text-sm font-medium text-foreground">
            登录到喜东东的小站
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* 错误提示 */}
        {errorMsg && (
          <div className="mt-3 rounded-md bg-red-500/10 p-2 text-xs text-red-600 dark:text-red-400">{errorMsg}</div>
        )}

        {/* 纯图标登录按钮列表，单行水平排列 */}
        <div className="mt-4 flex items-center justify-center gap-3">
          {loadingConfig ? (
            <div className="flex h-10 items-center justify-center">
              <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : hasAnyProvider ? (
            <>
              {providers.github && (
                <button
                  type="button"
                  onClick={() => handleSignIn('github')}
                  disabled={Boolean(signingIn)}
                  aria-label="GitHub 登录"
                  title="GitHub 登录"
                  className="flex size-10 items-center justify-center rounded-lg border border-border bg-background shadow-xs transition-colors hover:border-foreground/40 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                >
                  {signingIn === 'github' ? (
                    <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  ) : (
                    <GithubIcon className="size-5" />
                  )}
                </button>
              )}

              {providers.google && (
                <button
                  type="button"
                  onClick={() => handleSignIn('google')}
                  disabled={Boolean(signingIn)}
                  aria-label="Google 登录"
                  title="Google 登录"
                  className="flex size-10 items-center justify-center rounded-lg border border-border bg-background shadow-xs transition-colors hover:border-foreground/40 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                >
                  {signingIn === 'google' ? (
                    <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  ) : (
                    <GoogleIcon className="size-5" />
                  )}
                </button>
              )}
            </>
          ) : (
            <div className="py-2 text-center text-xs text-muted-foreground">未配置登录提供商</div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
