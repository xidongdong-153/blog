'use client'

import type { RefObject } from 'react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { siteConfig } from '@/site.config'
import { lockOverlayScroll } from '../site/overlay-scroll-lock'
import { useOverlayMotion } from '../site/use-overlay-motion'

interface FriendApplyModalProps {
  isOpen: boolean
  onClose: () => void
  triggerRef: RefObject<HTMLElement | null>
}

/**
 * 友链申请弹窗组件
 * 紧凑出版物卡片、暗色定制细滚动条、支持手机响应式与 ESC 键关闭
 */
export function FriendApplyModal({ isOpen, onClose, triggerRef }: FriendApplyModalProps) {
  const [mounted, setMounted] = useState(false)
  const [nickname, setNickname] = useState('')
  const [siteName, setSiteName] = useState('')
  const [siteUrl, setSiteUrl] = useState('')
  const [email, setEmail] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [description, setDescription] = useState('')
  const [hasAddedUs, setHasAddedUs] = useState(false)

  const [copied, setCopied] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  const firstInputRef = useRef<HTMLInputElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const requestRef = useRef(0)
  const openRef = useRef(isOpen)
  openRef.current = isOpen
  const { present, anchorRef, surfaceRef, contentRef, backdropRef } = useOverlayMotion({
    open: isOpen,
    ready: mounted,
    triggerRef,
  })

  // 确保在客户端挂载后再渲染 Portal
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!present) {
      setIsSubmitting(false)
      if (isSuccess) {
        setIsSuccess(false)
        setNickname('')
        setSiteName('')
        setSiteUrl('')
        setEmail('')
        setAvatarUrl('')
        setDescription('')
        setHasAddedUs(false)
      }
      return
    }
    return lockOverlayScroll()
  }, [present, isSuccess])

  useEffect(() => {
    requestRef.current++
    if (isOpen) {
      setIsSubmitting(false)
      previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    } else if (previousFocusRef.current) {
      const previous = previousFocusRef.current
      if (previous.isConnected) previous.focus({ preventScroll: true })
      previousFocusRef.current = null
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !isSuccess) return
    const timer = window.setTimeout(onClose, 2000)
    return () => window.clearTimeout(timer)
  }, [isOpen, isSuccess, onClose])

  // 监听 ESC 键关闭并聚焦首项
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    const timer = setTimeout(() => {
      firstInputRef.current?.focus()
    }, 50)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearTimeout(timer)
    }
  }, [isOpen, onClose])

  if (!present || !mounted) return null

  // 复制本站信息到剪贴板
  const handleCopySiteInfo = async () => {
    const infoText = `名称：${siteConfig.title}\n网址：${siteConfig.url}\n简介：${siteConfig.description}\n作者：${siteConfig.author}`
    try {
      await navigator.clipboard.writeText(infoText)
      setCopied(true)
      setTimeout(setCopied, 2000, false)
    } catch {
      setCopied(false)
    }
  }

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')

    if (!nickname.trim()) {
      setErrorMessage('请填写你的称呼')
      return
    }
    if (!siteName.trim()) {
      setErrorMessage('请填写站点名称')
      return
    }
    if (!siteUrl.trim()) {
      setErrorMessage('请填写博客网址')
      return
    }
    if (!/^https?:\/\//i.test(siteUrl.trim())) {
      setErrorMessage('博客网址需以 http:// 或 https:// 开头')
      return
    }
    if (!email.trim() || !/^[\w.+-]+@[a-z0-9-]+\.[a-z0-9-.]+$/i.test(email.trim())) {
      setErrorMessage('请填写有效的联系邮箱')
      return
    }
    if (avatarUrl.trim() && !/^https?:\/\//i.test(avatarUrl.trim())) {
      setErrorMessage('头像链接需以 http:// 或 https:// 开头')
      return
    }
    if (!description.trim()) {
      setErrorMessage('请填写一两句站点介绍')
      return
    }

    setIsSubmitting(true)
    const request = requestRef.current

    try {
      const response = await fetch('/api/links/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: nickname.trim(),
          siteName: siteName.trim(),
          siteUrl: siteUrl.trim(),
          email: email.trim(),
          avatarUrl: avatarUrl.trim() || undefined,
          description: description.trim(),
          hasAddedUs,
        }),
      })

      const data = await response.json()
      if (!openRef.current || request !== requestRef.current) return

      if (!response.ok || !data.success) {
        setErrorMessage(data.error || '发送失败，请稍后再试')
        setIsSubmitting(false)
        return
      }

      setIsSuccess(true)
      setIsSubmitting(false)
    } catch {
      if (openRef.current && request === requestRef.current) {
        setErrorMessage('网络请求异常，请检查网络后重试')
        setIsSubmitting(false)
      }
    }
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal={isOpen ? true : undefined}
      aria-hidden={!isOpen}
      inert={!isOpen}
      aria-labelledby="friend-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className={`fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-3 sm:p-4 ${!isOpen ? 'pointer-events-none' : ''}`}
    >
      {/* 遮罩背景：高层级、半透漫射、淡入动效 */}
      <div
        ref={backdropRef}
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 弹窗主体：紧凑出版物卡片，微缩放入场 */}
      <div ref={anchorRef} className="relative z-10 w-full max-w-[480px]">
        <div
          ref={surfaceRef}
          onClick={(e) => e.stopPropagation()}
          className="origin-top-left overflow-hidden rounded-lg border border-border/60 bg-card shadow-2xl"
        >
          <div ref={contentRef} className="flex max-h-[92vh] flex-col">
            {/* 顶部标题栏：高度紧凑 */}
            <div className="flex items-center justify-between border-b border-hair px-4 py-3 sm:px-5 sm:py-3.5">
              <h2
                id="friend-modal-title"
                className="font-serif text-lg font-medium tracking-tight text-foreground sm:text-xl"
              >
                来交换友链吧
              </h2>

              <button
                type="button"
                onClick={onClose}
                aria-label="关闭弹窗"
                className="ink-glide hit-expand flex size-8 cursor-pointer items-center justify-center text-muted-foreground hover:text-primary active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span className="font-mono text-xs leading-none" aria-hidden="true">
                  ✕
                </span>
              </button>
            </div>

            {/* 成功界面 */}
            {isSuccess ? (
              <div className="flex flex-col items-center justify-center gap-2.5 p-8 text-center sm:p-10">
                <div className="font-mono text-xs text-primary">投递成功</div>
                <h3 className="font-serif text-xl font-medium tracking-tight text-foreground">信息已发送</h3>
                <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
                  你的申请已送达喜东东的邮箱，收到后我会尽快回信。
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="custom-scrollbar flex flex-col overflow-y-auto px-4 py-3.5 sm:px-5 sm:py-4"
              >
                <div className="flex flex-col gap-3">
                  {/* 本站信息极简单行条带 */}
                  <div className="flex items-center justify-between border-b border-hair pb-2 font-mono text-[11px] text-muted-foreground">
                    <div className="truncate pr-2">
                      <span className="font-medium text-foreground/90">本站：</span>
                      {siteConfig.title}
                      <span className="ml-1 text-[10px] opacity-60">
                        ({siteConfig.url.replace(/^https?:\/\//, '')})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopySiteInfo}
                      className="ink-link shrink-0 cursor-pointer text-[11px] text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      {copied ? '已复制' : '复制配置'}
                    </button>
                  </div>

                  {/* 错误提示条 */}
                  {errorMessage && (
                    <div className="rounded border border-destructive/40 bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
                      {errorMessage}
                    </div>
                  )}

                  {/* 表单字段栅格 */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {/* 你的称呼 */}
                    <div className="flex flex-col gap-1">
                      <label htmlFor="friend-nickname" className="font-mono text-[11px] text-muted-foreground">
                        你的称呼 <span className="text-foreground">*</span>
                      </label>
                      <input
                        id="friend-nickname"
                        ref={firstInputRef}
                        type="text"
                        required
                        maxLength={32}
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="怎么称呼你"
                        className="border-0 border-b border-hair bg-transparent px-0 py-1.5 text-base text-foreground placeholder:text-muted-foreground/50 transition-colors focus-visible:border-primary focus-visible:outline-none sm:text-xs"
                      />
                    </div>

                    {/* 邮箱 */}
                    <div className="flex flex-col gap-1">
                      <label htmlFor="friend-email" className="font-mono text-[11px] text-muted-foreground">
                        你的邮箱 <span className="text-foreground">*</span>
                      </label>
                      <input
                        id="friend-email"
                        type="email"
                        required
                        maxLength={100}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="用于接收回信"
                        className="border-0 border-b border-hair bg-transparent px-0 py-1.5 text-base text-foreground placeholder:text-muted-foreground/50 transition-colors focus-visible:border-primary focus-visible:outline-none sm:text-xs"
                      />
                    </div>

                    {/* 站点名称 */}
                    <div className="flex flex-col gap-1">
                      <label htmlFor="friend-sitename" className="font-mono text-[11px] text-muted-foreground">
                        站点名称 <span className="text-foreground">*</span>
                      </label>
                      <input
                        id="friend-sitename"
                        type="text"
                        required
                        maxLength={50}
                        value={siteName}
                        onChange={(e) => setSiteName(e.target.value)}
                        placeholder="给小站起的名字"
                        className="border-0 border-b border-hair bg-transparent px-0 py-1.5 text-base text-foreground placeholder:text-muted-foreground/50 transition-colors focus-visible:border-primary focus-visible:outline-none sm:text-xs"
                      />
                    </div>

                    {/* 博客网址 */}
                    <div className="flex flex-col gap-1">
                      <label htmlFor="friend-siteurl" className="font-mono text-[11px] text-muted-foreground">
                        博客网址 <span className="text-foreground">*</span>
                      </label>
                      <input
                        id="friend-siteurl"
                        type="url"
                        required
                        maxLength={200}
                        value={siteUrl}
                        onChange={(e) => setSiteUrl(e.target.value)}
                        placeholder="https://"
                        className="border-0 border-b border-hair bg-transparent px-0 py-1.5 text-base text-foreground placeholder:text-muted-foreground/50 transition-colors focus-visible:border-primary focus-visible:outline-none sm:text-xs"
                      />
                    </div>

                    {/* 头像链接（选填） */}
                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label htmlFor="friend-avatar" className="font-mono text-[11px] text-muted-foreground">
                        头像或 Logo <span className="text-muted-foreground/60">(选填)</span>
                      </label>
                      <input
                        id="friend-avatar"
                        type="url"
                        maxLength={300}
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        placeholder="https://...（图片直链）"
                        className="border-0 border-b border-hair bg-transparent px-0 py-1.5 text-base text-foreground placeholder:text-muted-foreground/50 transition-colors focus-visible:border-primary focus-visible:outline-none sm:text-xs"
                      />
                    </div>

                    {/* 一两句介绍 */}
                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <label htmlFor="friend-desc" className="font-mono text-[11px] text-muted-foreground">
                          一两句介绍 <span className="text-foreground">*</span>
                        </label>
                        <span className="font-mono text-[10px] text-muted-foreground/60">{description.length}/150</span>
                      </div>
                      <textarea
                        id="friend-desc"
                        required
                        rows={2}
                        maxLength={150}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="聊聊你的小站、平常写点什么..."
                        className="resize-none border-0 border-b border-hair bg-transparent px-0 py-1.5 text-base text-foreground placeholder:text-muted-foreground/50 transition-colors focus-visible:border-primary focus-visible:outline-none sm:text-xs"
                      />
                    </div>

                    {/* 互换确认 */}
                    <div className="sm:col-span-2 pt-0.5">
                      <label className="flex cursor-pointer select-none items-center gap-2">
                        <input
                          type="checkbox"
                          checked={hasAddedUs}
                          onChange={(e) => setHasAddedUs(e.target.checked)}
                          className="h-3.5 w-3.5 rounded border-border/60 text-primary accent-primary"
                        />
                        <span className="font-mono text-[11px] leading-none text-muted-foreground">
                          我已在自己站点加上了「{siteConfig.title}」
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* 底部操作栏：紧凑无框 */}
                <div className="mt-4 flex items-center justify-end gap-5 border-t border-hair pt-3">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="ink-link cursor-pointer py-1 font-mono text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                  >
                    取消
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="group/ink inline-flex cursor-pointer items-center gap-1.5 py-1 font-mono text-xs font-medium text-primary transition-opacity disabled:pointer-events-none disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <svg
                          className="size-3.5 animate-spin"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                        <span>发送中...</span>
                      </>
                    ) : (
                      <>
                        <span className="ink-line">发送</span>
                        <span
                          aria-hidden="true"
                          className="ink-glide group-hover/ink:translate-x-0.5 group-hover/ink:-translate-y-0.5"
                        >
                          ↗
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
