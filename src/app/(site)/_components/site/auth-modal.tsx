'use client'

import type { RefObject } from 'react'
import { X } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { signIn } from '@/lib/auth-client'
import { profileConfig } from '@/profile.config'
import { siteConfig } from '@/site.config'
import { GithubIcon, GoogleIcon } from '../comment/comment-icons'
import { lockOverlayScroll } from './overlay-scroll-lock'
import { useOverlayMotion } from './use-overlay-motion'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  triggerRef?: RefObject<HTMLElement | null>
}

interface AuthProvidersState {
  github: boolean
  google: boolean
}

/**
 * 快捷登录弹窗组件。
 * 顶部叠放站点圆形/方圆头像，单排圆形社交登录按钮。
 */
export function AuthModal({ isOpen, onClose, triggerRef }: AuthModalProps) {
  const [mounted, setMounted] = useState(false)
  const [providers, setProviders] = useState<AuthProvidersState>({
    github: false,
    google: false,
  })
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [signingIn, setSigningIn] = useState<'github' | 'google' | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const openRef = useRef(isOpen)
  openRef.current = isOpen
  const { present, anchorRef, surfaceRef, contentRef, backdropRef } = useOverlayMotion({
    open: isOpen,
    ready: mounted,
    triggerRef,
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isOpen) return

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

  useEffect(() => {
    if (!present) {
      setErrorMsg(null)
      setSigningIn(null)
      return
    }
    return lockOverlayScroll()
  }, [present])

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      closeRef.current?.focus({ preventScroll: true })
    } else if (previousFocusRef.current) {
      const previous = previousFocusRef.current
      if (previous.isConnected) previous.focus({ preventScroll: true })
      previousFocusRef.current = null
    }
  }, [isOpen, mounted])

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

  if (!mounted || !present) return null

  const handleSignIn = async (provider: 'github' | 'google') => {
    try {
      setSigningIn(provider)
      setErrorMsg(null)
      await signIn.social({
        provider,
        callbackURL: typeof window !== 'undefined' ? window.location.href : '/',
      })
    } catch (err) {
      if (openRef.current) {
        setErrorMsg(err instanceof Error ? err.message : '跳转登录失败，请稍后重试')
        setSigningIn(null)
      }
    }
  }

  const hasAnyProvider = providers.github || providers.google

  return createPortal(
    <div
      role="dialog"
      aria-modal={isOpen ? true : undefined}
      aria-hidden={!isOpen}
      inert={!isOpen}
      aria-labelledby="auth-modal-title"
      className={`fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4 ${!isOpen ? 'pointer-events-none' : ''}`}
    >
      <div
        ref={backdropRef}
        className="fixed inset-0 bg-background/75 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div ref={anchorRef} className="relative z-10 mt-6 w-full max-w-[300px]">
        <div
          ref={surfaceRef}
          onClick={(e) => e.stopPropagation()}
          className="relative origin-top-left rounded-xl border border-hair bg-card px-6 pb-6 pt-10 text-center shadow-[0_18px_48px_-12px_rgba(20,23,22,0.16)]"
        >
          <div ref={contentRef} className="flex flex-col items-center">
            {/* 压线叠放的站点头像 */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 overflow-hidden rounded-[14px] border-2 border-card bg-card shadow-sm ring-1 ring-border/60">
              {profileConfig.avatar ? (
                <Image
                  src={profileConfig.avatar}
                  alt={siteConfig.author}
                  width={48}
                  height={48}
                  className="size-12 object-cover"
                />
              ) : (
                <div className="flex size-12 items-center justify-center bg-muted font-serif text-lg font-medium text-foreground">
                  {siteConfig.author.slice(0, 1)}
                </div>
              )}
            </div>

            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="关闭"
              className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <X className="size-3.5" />
            </button>

            <h2 id="auth-modal-title" className="font-serif text-base font-medium text-foreground">
              登录到 {siteConfig.author}
            </h2>

            {errorMsg && (
              <div className="mt-3 w-full rounded-md bg-destructive/10 p-2 text-xs text-destructive">{errorMsg}</div>
            )}

            <div className="mt-5 flex items-center justify-center gap-3.5">
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
                      className="flex size-10 items-center justify-center rounded-full border border-border/70 bg-background/80 text-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                    >
                      {signingIn === 'github' ? (
                        <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      ) : (
                        <GithubIcon className="size-4.5" />
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
                      className="flex size-10 items-center justify-center rounded-full border border-border/70 bg-background/80 text-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                    >
                      {signingIn === 'google' ? (
                        <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      ) : (
                        <GoogleIcon className="size-4.5" />
                      )}
                    </button>
                  )}
                </>
              ) : (
                <div className="py-1 text-xs text-muted-foreground">未配置登录提供商</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
