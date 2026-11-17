'use client'

import type { SeriesDefinition } from '@/lib/series'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'

export interface SeriesSidebarPost {
  slug: string
  title: string
  series?: {
    id: string
    order: number
    group?: string
  }
}

export interface SeriesChapterSidebarProps {
  series: SeriesDefinition
  posts: SeriesSidebarPost[]
  currentSlug: string
}

interface ChapterGroup {
  name: string
  posts: SeriesSidebarPost[]
}

const STORAGE_KEY = 'blog_series_sidebar_collapsed'

/**
 * 专栏文章左侧章节目录侧栏（SeriesChapterSidebar）。
 *
 * 核心特性：
 * 1. 结构化大章节手风琴分类（Chapter Groups）：支持按模块展开/收起，当前阅读章节所在大章节默认展开。
 * 2. 状态激活：当前阅读讲次采用柔和微边框卡片高亮，并自动平滑居中滚入。
 * 3. 聚焦大纲：仅保留搜索与章节列表，不含专栏标题、统计与返回入口。
 * 4. 稳健折叠态：折叠后收起为纯图标按钮，点击即可重新展开。
 * 5. 即时过滤：支持专栏内章节标题实时搜索，过滤时自动展开包含命中章节的大类。
 */
export function SeriesChapterSidebar({ series, posts, currentSlug }: SeriesChapterSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [filterQuery, setFilterQuery] = useState('')
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const activeItemRef = useRef<HTMLLIElement>(null)

  // 1. 将章节按大章节分类分组
  const groups: ChapterGroup[] = useMemo(() => {
    const groupMap = new Map<string, SeriesSidebarPost[]>()

    // 预设大章节顺序
    if (series.groups && series.groups.length > 0) {
      for (const g of series.groups) {
        groupMap.set(g, [])
      }
    }

    const defaultGroup = '正文章节'
    for (const post of posts) {
      const gName = post.series?.group?.trim() || defaultGroup
      const list = groupMap.get(gName) ?? []
      list.push(post)
      groupMap.set(gName, list)
    }

    const result: ChapterGroup[] = []
    for (const [name, list] of groupMap.entries()) {
      if (list.length > 0) {
        result.push({ name, posts: list })
      }
    }
    return result
  }, [series.groups, posts])

  // 当前文章所在大章节名称
  const activeGroupName = useMemo(() => {
    const currentPost = posts.find((p) => p.slug === currentSlug)
    return currentPost?.series?.group?.trim() || '正文章节'
  }, [posts, currentSlug])

  // 挂载后从 localStorage 读取折叠偏好
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === 'true') {
        setIsCollapsed(true)
      }
    } catch {
      // 忽略隐私模式或本地存储受限
    }
  }, [])

  // 路由切换时，确保当前章节可见
  useEffect(() => {
    if (!isCollapsed && activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [currentSlug, isCollapsed])

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY, String(next))
      } catch {
        // 忽略存储异常
      }
      return next
    })
  }

  const toggleGroup = (groupName: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }))
  }

  // 搜索过滤后的分组
  const filteredGroups = useMemo(() => {
    const q = filterQuery.trim().toLowerCase()
    if (!q) return groups

    return groups
      .map((g) => ({
        name: g.name,
        posts: g.posts.filter((p) => p.title.toLowerCase().includes(q)),
      }))
      .filter((g) => g.posts.length > 0)
  }, [groups, filterQuery])

  // ----------------------------------------------------
  // 1. 折叠状态：呈现纯图标按钮，点击即可展开
  // ----------------------------------------------------
  if (isCollapsed) {
    return (
      <aside aria-label="专栏大纲（已折叠）" className="sticky top-20 hidden shrink-0 select-none lg:block">
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label="展开专栏大纲"
          title={`展开专栏目录（${series.title}）`}
          className="hit-expand group flex size-8 cursor-pointer items-center justify-center text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="ink-glide size-4 text-primary group-hover:scale-110"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M9 3v18" />
            <path d="m14 9 3 3-3 3" />
          </svg>
        </button>
      </aside>
    )
  }

  // ----------------------------------------------------
  // 2. 展开状态：无框发丝线侧栏
  // ----------------------------------------------------
  return (
    <aside
      aria-label="专栏章节目录"
      className="sticky top-20 hidden max-h-[calc(100vh-6rem)] w-60 xl:w-68 shrink-0 flex-col border-r border-hair pl-1.5 pr-4 pt-2 lg:flex select-none"
    >
      {/* 头部：下划线搜索框与无框折叠开关 */}
      <div className="flex items-center gap-3.5 border-b border-hair pb-2.5">
        {posts.length > 2 && (
          <div className="relative min-w-0 flex-1">
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="搜索专栏章节..."
              aria-label="搜索专栏章节"
              className="w-full border-0 border-b border-transparent bg-transparent py-1.5 ps-5 pe-8 font-sans text-xs text-foreground placeholder:text-muted-foreground/60 transition-colors focus-visible:border-primary focus-visible:outline-none"
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pointer-events-none absolute start-0 top-1/2 size-3 -translate-y-1/2 text-muted-foreground/60"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            {filterQuery && (
              <button
                type="button"
                onClick={() => setFilterQuery('')}
                aria-label="清空搜索"
                className="hit-expand absolute end-0 top-1/2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center text-muted-foreground hover:text-foreground focus-visible:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                ×
              </button>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label="收起专栏目录"
          title="收起专栏目录"
          className="hit-expand ms-auto flex size-8 shrink-0 cursor-pointer items-center justify-center text-muted-foreground transition-colors hover:text-primary focus-visible:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-3.5"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M9 3v18" />
            <path d="m15 9-3 3 3 3" />
          </svg>
        </button>
      </div>

      {/* 章节手风琴列表区 */}
      <div className="flex-1 overflow-y-auto px-1.5 pt-3">
        {filteredGroups.length === 0 ? (
          <p className="py-6 text-center font-mono text-xs text-muted-foreground">未找到匹配章节</p>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredGroups.map((group) => {
              const isSearching = Boolean(filterQuery.trim())
              // 搜索时不折叠，或者若未手动折叠且为当前章节所属大章则默认展开
              const isGroupCollapsed = !isSearching && (collapsedGroups[group.name] ?? group.name !== activeGroupName)

              return (
                <div key={group.name} className="flex flex-col">
                  {/* 大章节分类标头 */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.name)}
                    className="flex cursor-pointer items-center justify-between py-1 text-start transition-colors hover:text-primary focus-visible:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    aria-expanded={!isGroupCollapsed}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`size-3 text-muted-foreground/70 transition-[rotate] duration-150 motion-reduce:transition-none ${
                          isGroupCollapsed ? '-rotate-90' : 'rotate-0'
                        }`}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                      <span className="truncate font-sans text-xs font-semibold text-foreground/90">{group.name}</span>
                    </div>

                    <span className="font-mono text-[0.65rem] text-muted-foreground/70 tabular-nums">
                      {group.posts.length}
                    </span>
                  </button>

                  {/* 属于该大章节的小章节列表 */}
                  {!isGroupCollapsed && (
                    <ol className="mt-1 flex flex-col gap-0.5 ps-3">
                      {group.posts.map((post, index) => {
                        const chapterOrder = post.series?.order ?? index + 1
                        const isActive = post.slug === currentSlug

                        if (isActive) {
                          return (
                            <li ref={activeItemRef} key={post.slug}>
                              <div
                                aria-current="page"
                                className="relative flex items-start gap-2 py-1.5 pl-2.5 text-primary"
                              >
                                <span
                                  aria-hidden="true"
                                  className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-primary"
                                />
                                <span className="shrink-0 pt-0.5 font-mono text-xs font-semibold tabular-nums">
                                  {chapterOrder}
                                </span>
                                <span className="line-clamp-2 font-sans text-xs font-medium leading-snug">
                                  {post.title}
                                </span>
                              </div>
                            </li>
                          )
                        }

                        return (
                          <li key={post.slug}>
                            <Link
                              href={`/blog/${post.slug}`}
                              className="ink-glide group flex items-start gap-2 py-1.5 pl-2.5 text-muted-foreground hover:translate-x-1 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                            >
                              <span className="font-mono text-xs tabular-nums text-muted-foreground/70 transition-colors group-hover:text-primary shrink-0 pt-0.5">
                                {chapterOrder}
                              </span>
                              <span className="line-clamp-2 font-sans text-xs leading-snug transition-colors group-hover:text-foreground">
                                {post.title}
                              </span>
                            </Link>
                          </li>
                        )
                      })}
                    </ol>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </aside>
  )
}
