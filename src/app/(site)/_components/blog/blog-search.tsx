'use client'

import type { ReactNode } from 'react'
import type { BlogPost } from '@/lib/content'
import { useMemo, useState } from 'react'
import { buildSearchIndex, searchPosts } from '@/lib/search'
import { PostCard } from './post-card'

/**
 * 文章列表页内嵌的站内搜索。
 *
 * 索引构建与检索全部在浏览器内完成：文章数据由 Server Component 通过 props 下发，
 * 输入时只在内存里过滤，不产生网络请求。
 * 未输入关键词时渲染 `children`（服务端渲染的原列表），输入后整块替换为结果列表，
 * 分类工具栏与分页器随之隐藏；清空输入即恢复原列表。
 */
export function BlogSearch({ posts, children }: { posts: BlogPost[]; children: ReactNode }) {
  const [query, setQuery] = useState('')
  const documents = useMemo(() => buildSearchIndex(posts), [posts])
  const hits = useMemo(() => searchPosts(query, documents), [query, documents])
  const isSearching = query.trim().length > 0

  return (
    <>
      <div className="flex flex-col gap-2 border-b border-border/40 pb-5">
        <label htmlFor="site-search" className="font-mono text-xs tracking-wider text-muted-foreground">
          <span aria-hidden="true">// </span>搜索
        </label>
        <div className="flex items-center gap-2">
          <input
            id="site-search"
            type="search"
            value={query}
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="输入关键词过滤文章"
            className="w-full rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm text-foreground transition-colors placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none"
          />
          {isSearching && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="shrink-0 rounded-md border border-border/60 px-2.5 py-2 font-mono text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
            >
              清除
            </button>
          )}
        </div>
      </div>

      {isSearching ? (
        <section aria-label="搜索结果" className="flex flex-col">
          {hits.length > 0 ? (
            <>
              <p aria-live="polite" className="mb-2 font-mono text-xs tracking-wider text-muted-foreground">
                找到 {hits.length} 篇
              </p>
              <ul className="flex flex-col text-start">
                {hits.map((hit) => (
                  <PostCard key={hit.post.slug} post={hit.post} hit={hit} />
                ))}
              </ul>
            </>
          ) : (
            <p aria-live="polite" className="py-12 text-sm text-muted-foreground">
              没有匹配的文章。
            </p>
          )}
        </section>
      ) : (
        children
      )}
    </>
  )
}
