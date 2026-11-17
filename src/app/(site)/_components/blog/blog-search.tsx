'use client'

import type { ReactNode } from 'react'
import type { BlogSourceFilter } from '@/lib/blog-meta'
import type { BlogPost } from '@/lib/content'
import { Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { buildSearchIndex, searchPosts } from '@/lib/search'
import { PostCard } from './post-card'

/**
 * 文章列表页内嵌的站内搜索。
 * 索引构建与检索全部在浏览器内完成；切换来源时保持组件位置和输入词不变。
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
      <div className="entrance flex flex-col gap-3 [--entrance-delay:80ms] sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex min-w-0 flex-1 items-center sm:max-w-md">
          <label htmlFor="site-search" className="sr-only">
            搜索文章
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 size-3.5 text-muted-foreground/70"
          />
          <input
            id="site-search"
            type="search"
            value={query}
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索文章标题、标签或正文..."
            style={{ backgroundImage: 'var(--field-gradient)' }}
            className="min-h-10 w-full min-w-0 rounded-lg border border-hair bg-card/85 py-2 pl-9 pr-9 text-sm text-foreground transition-[border-color,box-shadow] placeholder:text-muted-foreground/70 focus-visible:border-primary/45 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/12 [&::-webkit-search-cancel-button]:appearance-none"
          />
          {isSearching && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="清除"
              className="absolute right-2.5 flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        {sourceSwitch}
      </div>

      {!isSearching && <div className="entrance [--entrance-delay:120ms]">{toolbar}</div>}

      <div className={`grid gap-y-10 ${sidebar ? 'lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)] lg:gap-x-10' : ''}`}>
        {isSearching ? (
          <section aria-label="搜索结果" className="flex min-w-0 flex-col">
            {hits.length > 0 ? (
              <>
                <p aria-live="polite" className="mb-1 font-mono text-xs tracking-wider text-muted-foreground">
                  找到 {hits.length} 篇
                </p>
                <ul className="flex flex-col text-start">
                  {hits.map((hit, index) => (
                    <PostCard
                      key={hit.post.slug}
                      post={hit.post}
                      hit={hit}
                      currentSource={currentSource}
                      entranceIndex={index}
                    />
                  ))}
                </ul>
              </>
            ) : (
              <p aria-live="polite" className="py-10 font-serif text-sm text-muted-foreground">
                没有匹配的文章。
              </p>
            )}
          </section>
        ) : (
          children
        )}
        {sidebar && <div className="entrance min-w-0 [--entrance-delay:140ms]">{sidebar}</div>}
      </div>
    </div>
  )
}
