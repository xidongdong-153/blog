'use client'

import type { BlogPost } from '@/lib/content'
import { Check, Copy } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { BLOG_CATEGORY_LABELS, buildBlogListUrl } from '@/lib/blog-meta'
import { formatDate } from '@/lib/date'
import { siteConfig } from '@/site.config'
import { PaperSurface } from '../site/paper-surface'

/**
 * 文章结尾版权与分类导览块。
 * 采用轻量纸卡索引样式与作者印鉴徽标，支持一键复制永久链接与返回分类。
 */
export function CopyrightCard({ post }: { post: BlogPost }) {
  const [copied, setCopied] = useState(false)
  const permalink = `${siteConfig.url}/blog/${post.slug}`
  const categoryLabel = BLOG_CATEGORY_LABELS[post.category]
  const authorInitial = siteConfig.author.trim().slice(0, 1)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(permalink)
      setCopied(true)
      window.setTimeout(setCopied, 1800, false)
    } catch {
      // 忽略剪贴板异常
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="relative isolate flex flex-col justify-between gap-5 rounded-xl p-5 sm:flex-row sm:items-center sm:px-6">
        <PaperSurface className="bg-card/85" />

        <div className="flex min-w-0 flex-col gap-1.5 text-xs leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">
            <span>{post.title}</span>
            <span className="mx-1.5 text-muted-foreground">·</span>
            <span>{siteConfig.author}</span>
            <span className="mx-1.5 text-muted-foreground">·</span>
            <time dateTime={post.date} className="font-mono font-normal text-muted-foreground">
              {formatDate(post.date)}
            </time>
            {post.updatedDate && (
              <span className="font-mono font-normal text-muted-foreground">
                （更新于 {formatDate(post.updatedDate)}）
              </span>
            )}
          </p>

          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
            <a href={permalink} className="break-all transition-colors hover:text-primary hover:underline">
              {permalink}
            </a>
            <button
              type="button"
              onClick={copyLink}
              aria-label="复制永久链接"
              title={copied ? '已复制' : '复制永久链接'}
              className="inline-flex size-5 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:text-primary"
            >
              {copied ? <Check className="size-3 text-primary" /> : <Copy className="size-3" />}
            </button>
          </div>

          <p>
            本文采用{' '}
            <a
              href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans"
              className="underline decoration-border underline-offset-4 transition-colors hover:text-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              CC BY-NC-SA 4.0
            </a>{' '}
            协议许可。
          </p>
        </div>

        {/* 右侧极简方形印鉴徽标 */}
        <div
          aria-hidden="true"
          className="hidden shrink-0 select-none flex-col items-center justify-center rounded-lg border border-primary/35 bg-primary/8 px-3 py-2 font-mono text-primary sm:flex"
        >
          <span className="font-serif text-base font-medium leading-none">{authorInitial}</span>
          <span className="mt-1 text-[9px] tracking-[0.18em] uppercase">XDD.INK</span>
        </div>
      </div>

      {/* 底部平直发丝线与文章导航 */}
      <div className="flex items-center justify-between border-t border-hair pt-4 font-mono text-xs text-muted-foreground">
        <Link
          href={buildBlogListUrl({ category: post.category })}
          className="inline-flex items-center gap-1 transition-colors hover:text-primary"
        >
          <span>←</span>
          <span>回到{categoryLabel}</span>
        </Link>
        <Link href="/blog" className="inline-flex items-center gap-1 transition-colors hover:text-primary">
          <span>全部文章</span>
          <span>→</span>
        </Link>
      </div>
    </div>
  )
}
