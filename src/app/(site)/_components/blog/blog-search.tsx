'use client'

import type { ReactNode } from 'react'
import type { BlogSourceFilter } from '@/lib/blog-meta'
import type { BlogPost } from '@/lib/content'
import { useMemo, useState } from 'react'
import { buildSearchIndex, searchPosts } from '@/lib/search'
import { PostCard } from './post-card'

/**
 * 文章列表页内嵌的站内搜索。
 *
 * 索引构建与检索全部在浏览器内完成：文章数据由 Server Component 通过 props 下发，
 * 输入时只在内存里过滤，不产生网络请求。
 * posts 已按来源筛选，搜索不受分类和列表排序影响；来源切换保留现有输入。
 * 未输入关键词时渲染 `children`（服务端渲染的原列表），输入后只替换网格主列，
 * 来源和标签侧栏常驻，分类工具栏与分页器隐藏；清空输入恢复原列表。
 */
export function BlogSearch({
  posts,
  currentSource,
  children,
  sourceSwitch,
  toolbar,
  sidebar,
}: {
  posts: BlogPost[]
  currentSource: BlogSourceFilter
  children: ReactNode
  sourceSwitch: ReactNode
  toolbar: ReactNode
  sidebar: ReactNode
}) {
  const [query, setQuery] = useState('')
  const documents = useMemo(() => buildSearchIndex(posts), [posts])
  const hits = useMemo(() => searchPosts(query, documents), [query, documents])
  const isSearching = query.trim().length > 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-md">
          <label htmlFor="site-search" className="sr-only">
            搜索文章
          </label>
          <input
            id="site-search"
            type="search"
            value={query}
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="输入关键词过滤文章"
            className="min-h-11 w-full min-w-0 rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
          {isSearching && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="min-h-11 shrink-0 rounded-md border border-border/60 px-2.5 py-2 font-mono text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              清除
            </button>
          )}
        </div>
        {sourceSwitch}
      </div>
      {!isSearching && toolbar}
      <div className="grid gap-y-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)] lg:gap-x-8">
        {isSearching ? (
          <section aria-label="搜索结果" className="flex min-w-0 flex-col">
            {hits.length > 0 ? (
              <>
                <p aria-live="polite" className="mb-2 font-mono text-xs tracking-wider text-muted-foreground">
                  找到 {hits.length} 篇
                </p>
                <ul className="flex flex-col text-start">
                  {hits.map((hit) => (
                    <PostCard key={hit.post.slug} post={hit.post} hit={hit} currentSource={currentSource} />
                  ))}
                </ul>
              </>
            ) : (
              <p aria-live="polite" className="py-8 text-sm text-muted-foreground">
                没有匹配的文章。
              </p>
            )}
          </section>
        ) : (
          children
        )}
        {sidebar}
      </div>
    </div>
  )
}
