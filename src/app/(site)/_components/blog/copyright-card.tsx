'use client'

import type { BlogPost } from '@/lib/content'
import { Check, Copy } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { BLOG_CATEGORY_LABELS, buildBlogListUrl } from '@/lib/blog-meta'
import { formatDate } from '@/lib/date'
import { siteConfig } from '@/site.config'

/**
 * 文章结尾版权与分类导览落款（无卡片外壳，纯发丝线排版）。
 */
export function CopyrightCard({ post }: { post: BlogPost }) {
  const [copied, setCopied] = useState(false)
  const permalink = `${siteConfig.url}/blog/${post.slug}`
  const categoryLabel = BLOG_CATEGORY_LABELS[post.category]

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
    <div className="flex flex-col gap-6 border-t border-hair pt-6">
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

        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
          <a href={permalink} className="ink-link break-all">
            {permalink}
          </a>
          <button
            type="button"
            onClick={copyLink}
            aria-label="复制永久链接"
            title={copied ? '已复制' : '复制永久链接'}
            className="ink-glide hit-expand inline-flex size-8 cursor-pointer items-center justify-center text-muted-foreground hover:scale-110 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
          </button>
        </div>

        <p>
          本文采用{' '}
          <a
            href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans"
            className="ink-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            CC BY-NC-SA 4.0
          </a>{' '}
          协议许可。
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-hair pt-4 font-mono text-xs text-muted-foreground">
        <Link
          href={buildBlogListUrl({ category: post.category })}
          className="group/ink inline-flex items-center gap-1.5 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span aria-hidden="true" className="ink-glide group-hover/ink:-translate-x-1">
            ←
          </span>
          <span className="ink-line">回到{categoryLabel}</span>
        </Link>
        <Link
          href="/blog"
          className="group/ink inline-flex items-center gap-1.5 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span className="ink-line">全部文章</span>
          <span aria-hidden="true" className="ink-glide group-hover/ink:translate-x-1">
            →
          </span>
        </Link>
      </div>
    </div>
  )
}
