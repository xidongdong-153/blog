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
      <div className="flex flex-col gap-6 border-y border-hair py-8">
        <div className="flex flex-col gap-2">
          <div className="font-mono text-xs text-primary">投递成功</div>
          <h2 className="font-serif text-2xl font-medium tracking-tight text-foreground">申请信息已送达</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            你的友链申请已发送至喜东东的邮箱。收到后我会核对并尽快添加，回复邮件会发送到你的邮箱：
            <span className="font-mono text-foreground"> {email}</span>。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 border-t border-hair pt-4">
          <Link
            href="/links"
            className="group/ink inline-flex items-center gap-1.5 font-mono text-xs font-medium text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <span aria-hidden="true" className="ink-glide group-hover/ink:-translate-x-1">
              ←
            </span>
            <span className="ink-line">返回友链列表</span>
          </Link>
          <button
            type="button"
            onClick={handleReset}
            className="ink-link cursor-pointer font-mono text-xs text-muted-foreground hover:text-foreground"
          >
            重新填写
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {/* 本站信息参考（无卡片外壳） */}
      <div className="flex flex-col gap-3 border-y border-hair py-5 font-mono text-xs text-muted-foreground">
        <div className="flex items-center justify-between pb-1">
          <span className="font-semibold text-foreground">本站信息参考</span>
          <button
            type="button"
            onClick={handleCopySiteInfo}
            className="ink-link shrink-0 cursor-pointer py-0.5 text-xs text-foreground/85 hover:text-primary"
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
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="border-b border-hair pb-3">
          <h2 className="font-serif text-xl font-medium tracking-tight text-foreground">你的小站信息</h2>
        </div>

        {/* 错误提示条 */}
        {errorMessage && (
          <div className="border-l border-destructive bg-destructive/8 px-3 py-2 text-xs text-destructive">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
              className="border-0 border-b border-hair bg-transparent px-0 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 transition-colors focus-visible:border-primary focus-visible:outline-none"
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
              className="border-0 border-b border-hair bg-transparent px-0 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 transition-colors focus-visible:border-primary focus-visible:outline-none"
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
              className="border-0 border-b border-hair bg-transparent px-0 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 transition-colors focus-visible:border-primary focus-visible:outline-none"
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
              className="border-0 border-b border-hair bg-transparent px-0 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 transition-colors focus-visible:border-primary focus-visible:outline-none"
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
              className="border-0 border-b border-hair bg-transparent px-0 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 transition-colors focus-visible:border-primary focus-visible:outline-none"
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
              className="resize-none border-0 border-b border-hair bg-transparent px-0 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 transition-colors focus-visible:border-primary focus-visible:outline-none"
            />
          </div>

          {/* 互换确认 */}
          <div className="pt-1 sm:col-span-2">
            <label className="flex cursor-pointer select-none items-center gap-2">
              <input
                type="checkbox"
                checked={hasAddedUs}
                onChange={(e) => setHasAddedUs(e.target.checked)}
                className="h-4 w-4 rounded border-border/60 text-primary accent-primary"
              />
              <span className="font-mono text-xs text-muted-foreground">
                我已在自己站点加上了「{siteConfig.title}」
              </span>
            </label>
          </div>
        </div>

        {/* 提交触发器与说明 */}
        <div className="mt-2 flex flex-col gap-3 border-t border-hair pt-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-mono text-xs text-muted-foreground">提交后会自动发送通知邮件到博主信箱</span>

          <button
            type="submit"
            disabled={isSubmitting}
            className="group/ink inline-flex cursor-pointer items-center gap-1.5 self-start py-1 font-mono text-xs font-medium text-primary transition-opacity disabled:pointer-events-none disabled:opacity-50 sm:self-auto"
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
              <>
                <span className="ink-line">提交申请</span>
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
    </div>
  )
}
