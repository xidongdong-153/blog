'use client'

import Link from 'next/link'
import { useState } from 'react'
import { siteConfig } from '@/site.config'

interface FriendApplyFormProps {
  /** 表单提交成功后的回调，可选 */
  onSuccess?: () => void
}

/**
 * 友链申请表单组件
 * 用于 /links/apply 独立页面及独立申请流程
 */
export function FriendApplyForm({ onSuccess }: FriendApplyFormProps) {
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

  // 重置表单状态
  const handleReset = () => {
    setIsSuccess(false)
    setErrorMessage('')
    setNickname('')
    setSiteName('')
    setSiteUrl('')
    setEmail('')
    setAvatarUrl('')
    setDescription('')
    setHasAddedUs(false)
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

      if (!response.ok || !data.success) {
        setErrorMessage(data.error || '发送失败，请稍后再试')
        setIsSubmitting(false)
        return
      }

      setIsSuccess(true)
      setIsSubmitting(false)
      onSuccess?.()
    } catch {
      setErrorMessage('网络请求异常，请检查网络后重试')
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col gap-6 rounded-lg border border-border/60 bg-card/40 p-6 sm:p-8">
        <div className="flex flex-col gap-2">
          <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            // 投递成功 / DELIVERED
          </div>
          <h2 className="font-serif text-2xl font-medium tracking-tight text-foreground">申请信息已送达</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            你的友链申请已发送至喜东东的邮箱。收到后我会核对并尽快添加，回复邮件会发送到你的邮箱：
            <span className="font-mono text-foreground"> {email}</span>。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-border/40 pt-4">
          <Link
            href="/links"
            className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-foreground px-4 py-2 font-mono text-xs font-medium text-background transition-opacity hover:opacity-90"
          >
            ← 返回友链列表
          </Link>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-md border border-border/40 px-4 py-2 font-mono text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
          >
            重新填写
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 本站信息参考与复制卡片 */}
      <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/40 p-4 sm:p-5 font-mono text-xs text-muted-foreground">
        <div className="flex items-center justify-between border-b border-border/30 pb-2.5">
          <span className="font-semibold text-foreground">// 本站信息参考</span>
          <button
            type="button"
            onClick={handleCopySiteInfo}
            className="shrink-0 rounded border border-border/60 bg-muted/40 px-2.5 py-1 text-xs text-foreground transition-all hover:bg-muted active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {copied ? '已复制本站信息' : '复制本站配置'}
          </button>
        </div>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          <div>
            <span className="text-foreground/80">名称：</span>
            {siteConfig.title}
          </div>
          <div>
            <span className="text-foreground/80">网址：</span>
            {siteConfig.url}
          </div>
          <div>
            <span className="text-foreground/80">作者：</span>
            {siteConfig.author}
          </div>
          <div className="sm:col-span-2">
            <span className="text-foreground/80">简介：</span>
            {siteConfig.description}
          </div>
        </div>
      </div>

      {/* 填写表单主体 */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-lg border border-border/60 bg-card/30 p-5 sm:p-6"
      >
        <div className="border-b border-border/40 pb-3">
          <div className="font-mono text-xs tracking-wider text-muted-foreground">// 填写站点信息</div>
          <h2 className="mt-1 font-serif text-xl font-medium tracking-tight text-foreground">你的小站信息</h2>
        </div>

        {/* 错误提示条 */}
        {errorMessage && (
          <div className="rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* 你的称呼 */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="form-nickname" className="font-mono text-xs text-muted-foreground">
              你的称呼 <span className="text-foreground">*</span>
            </label>
            <input
              id="form-nickname"
              type="text"
              required
              maxLength={32}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="例如：东东 / 昵称"
              className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 transition-colors focus-visible:border-foreground/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* 联系邮箱 */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="form-email" className="font-mono text-xs text-muted-foreground">
              联系邮箱 <span className="text-foreground">*</span>
            </label>
            <input
              id="form-email"
              type="email"
              required
              maxLength={100}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="用于接收审核回信"
              className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 transition-colors focus-visible:border-foreground/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* 站点名称 */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="form-sitename" className="font-mono text-xs text-muted-foreground">
              站点名称 <span className="text-foreground">*</span>
            </label>
            <input
              id="form-sitename"
              type="text"
              required
              maxLength={50}
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="例如：喜东东小站"
              className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 transition-colors focus-visible:border-foreground/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* 博客网址 */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="form-siteurl" className="font-mono text-xs text-muted-foreground">
              博客网址 <span className="text-foreground">*</span>
            </label>
            <input
              id="form-siteurl"
              type="url"
              required
              maxLength={200}
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              placeholder="https://example.com"
              className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 transition-colors focus-visible:border-foreground/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* 头像链接（选填） */}
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label htmlFor="form-avatar" className="font-mono text-xs text-muted-foreground">
              头像或 Logo 直链 <span className="text-muted-foreground/60">(选填)</span>
            </label>
            <input
              id="form-avatar"
              type="url"
              maxLength={300}
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.png"
              className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 transition-colors focus-visible:border-foreground/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* 一两句介绍 */}
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <div className="flex items-center justify-between">
              <label htmlFor="form-desc" className="font-mono text-xs text-muted-foreground">
                一两句介绍 <span className="text-foreground">*</span>
              </label>
              <span className="font-mono text-[11px] text-muted-foreground/60">{description.length}/150</span>
            </div>
            <textarea
              id="form-desc"
              required
              rows={3}
              maxLength={150}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="聊聊你的小站、平常写点什么内容..."
              className="resize-none rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 transition-colors focus-visible:border-foreground/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* 互换确认 */}
          <div className="pt-1 sm:col-span-2">
            <label className="flex cursor-pointer select-none items-center gap-2">
              <input
                type="checkbox"
                checked={hasAddedUs}
                onChange={(e) => setHasAddedUs(e.target.checked)}
                className="h-4 w-4 rounded border-border/60 text-primary accent-foreground"
              />
              <span className="font-mono text-xs text-muted-foreground">
                我已在自己站点加上了「{siteConfig.title}」
              </span>
            </label>
          </div>
        </div>

        {/* 提交按钮与说明 */}
        <div className="mt-2 flex flex-col gap-3 border-t border-border/40 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-mono text-xs text-muted-foreground">提交后会自动发送通知邮件到博主信箱</span>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border/60 bg-foreground px-5 py-2 font-mono text-xs font-medium text-background transition-all hover:opacity-90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
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
                <span>正在发送...</span>
              </>
            ) : (
              <span>提交申请 ↗</span>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
