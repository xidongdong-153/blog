/* eslint-disable next/no-img-element */
'use client'

import type { FriendLinkItem } from '@/server/modules/links/links.types'
import { Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatDate } from '@/lib/date'

export function formatDisplayUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/+$/, '')
}

/**
 * 友链站点头像（支持静默降饱和与加载失败首字印章兜底）。
 */
export function FriendAvatar({
  name,
  avatarUrl,
  size = 'sm',
  quiet = true,
}: {
  name: string
  avatarUrl?: string
  size?: 'sm' | 'md'
  quiet?: boolean
}) {
  const [failed, setFailed] = useState(false)
  const initial = name.trim().slice(0, 1).toUpperCase() || '?'
  const sizeClass = size === 'md' ? 'size-9 rounded-lg text-sm' : 'size-6 rounded-md text-xs'

  if (!avatarUrl || failed) {
    return (
      <span
        aria-hidden="true"
        className={`inline-flex shrink-0 items-center justify-center border border-hair bg-muted font-serif font-medium text-foreground/80 transition-colors group-hover/item:border-primary/35 group-hover/item:text-primary ${sizeClass}`}
      >
        {initial}
      </span>
    )
  }

  return (
    <img
      src={avatarUrl}
      alt=""
      aria-hidden="true"
      loading="lazy"
      onError={() => setFailed(true)}
      className={`shrink-0 border border-hair object-cover ${sizeClass} ${
        quiet
          ? 'opacity-80 saturate-[0.3] transition-[filter,opacity] duration-200 group-hover/item:opacity-100 group-hover/item:saturate-100 group-focus-visible/item:opacity-100 group-focus-visible/item:saturate-100'
          : ''
      }`}
    />
  )
}

function FriendLinkRow({ link, index }: { link: FriendLinkItem; index: number }) {
  const owner = link.ownerName?.trim()
  const showOwner = Boolean(owner && owner !== link.name.trim())

  return (
    <li>
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="ink-row group/item block border-b border-hair py-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      >
        <div className="ink-glide flex flex-col gap-2 group-hover/item:translate-x-2 group-focus-visible/item:translate-x-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
          <div className="flex min-w-0 items-start gap-3">
            <span
              aria-hidden="true"
              className="w-5 shrink-0 pt-1 font-mono text-xs tabular-nums text-muted-foreground/65"
            >
              {String(index + 1).padStart(2, '0')}
            </span>

            <div className="pt-0.5">
              <FriendAvatar name={link.name} avatarUrl={link.avatarUrl} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <h3 className="font-serif text-lg font-medium text-foreground transition-colors [overflow-wrap:anywhere] group-hover/item:text-primary group-focus-visible/item:text-primary">
                  {link.name}
                </h3>
                {showOwner && <span className="text-xs text-muted-foreground">· {owner}</span>}
              </div>

              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{link.description}</p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 pl-8 font-mono text-xs text-muted-foreground/80 sm:flex-nowrap sm:pl-0">
            {link.createdAt && (
              <time dateTime={link.createdAt} className="tabular-nums text-muted-foreground/65">
                {formatDate(link.createdAt)}
              </time>
            )}
            <span className="inline-flex items-center gap-1.5">
              <span className="break-all sm:max-w-[14rem] sm:truncate">{formatDisplayUrl(link.url)}</span>
              <span
                aria-hidden="true"
                className="ink-glide shrink-0 text-muted-foreground/70 group-hover/item:translate-x-0.5 group-hover/item:-translate-y-0.5 group-hover/item:text-primary group-focus-visible/item:text-primary"
              >
                ↗
              </span>
            </span>
          </div>
        </div>
      </a>
    </li>
  )
}

/**
 * 友链单列无框列表组件。
 * 保持与服务端一致的加入时间顺序，支持站内实时筛选；外部头像默认轻微降噪并在悬停时回彩。
 */
export function FriendLinksDirectory({ links }: { links: FriendLinkItem[] }) {
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()
  const isSearching = normalizedQuery.length > 0

  const filteredLinks = useMemo(() => {
    if (!isSearching) return links
    return links.filter((link) => {
      return (
        link.name.toLowerCase().includes(normalizedQuery) ||
        (link.ownerName?.toLowerCase().includes(normalizedQuery) ?? false) ||
        link.description.toLowerCase().includes(normalizedQuery) ||
        link.url.toLowerCase().includes(normalizedQuery)
      )
    })
  }, [isSearching, links, normalizedQuery])

  if (links.length === 0) {
    return <p className="py-8 text-sm leading-relaxed text-muted-foreground">暂无友链。</p>
  }

  return (
    <section aria-label="友链列表" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex min-w-0 flex-1 items-center sm:max-w-sm">
          <label htmlFor="friend-links-search" className="sr-only">
            搜索友链
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-0.5 size-3.5 text-muted-foreground/70"
          />
          <input
            id="friend-links-search"
            type="search"
            value={query}
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索站点、作者或简介"
            className="min-h-10 w-full min-w-0 border-0 border-b border-hair bg-transparent py-2 pl-6 pr-8 text-sm text-foreground transition-colors placeholder:text-muted-foreground/65 focus-visible:border-primary focus-visible:outline-none [&::-webkit-search-cancel-button]:appearance-none"
          />
          {isSearching && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="清除"
              className="absolute right-1 flex size-6 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {isSearching && (
          <p aria-live="polite" className="font-mono text-xs tabular-nums text-muted-foreground">
            匹配 {filteredLinks.length} / {links.length}
          </p>
        )}
      </div>

      {filteredLinks.length === 0 ? (
        <div className="flex flex-col items-start gap-3 py-8">
          <p aria-live="polite" className="text-sm leading-relaxed text-muted-foreground">
            没有找到匹配的友链。
          </p>
          <button
            type="button"
            onClick={() => setQuery('')}
            className="ink-link hit-expand cursor-pointer font-mono text-xs text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            清除搜索
          </button>
        </div>
      ) : (
        <ul className="border-t border-hair">
          {filteredLinks.map((link, idx) => (
            <FriendLinkRow key={link.id ?? link.url} link={link} index={idx} />
          ))}
        </ul>
      )}
    </section>
  )
}
