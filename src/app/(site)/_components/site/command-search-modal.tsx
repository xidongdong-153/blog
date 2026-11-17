'use client'

import type { BlogCategory } from '@/lib/blog-meta'
import { ArrowRight, FileText, Search, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BLOG_CATEGORY_LABELS } from '@/lib/blog-meta'
import { formatDate } from '@/lib/date'

export interface HeaderPostItem {
  slug: string
  title: string
  description: string
  category: BlogCategory
  date: string
  tags: string[]
  aiGenerated: boolean
}

const QUICK_ROUTES = [
  { name: '首页', href: '/', hint: 'Home' },
  { name: '全部文章', href: '/blog', hint: 'Blog' },
  { name: '写作归档', href: '/blog/archives', hint: 'Archives' },
  { name: '随记笔记', href: '/notes', hint: 'Notes' },
  { name: '开源项目', href: '/projects', hint: 'Projects' },
  { name: '友邻链接', href: '/links', hint: 'Friends' },
  { name: '关于我', href: '/about', hint: 'About' },
] as const

interface CommandSearchModalProps {
  isOpen: boolean
  onClose: () => void
  posts: HeaderPostItem[]
}

/**
 * 全站命令搜索面板 (⌘K / Ctrl+K)。
 * 纯客户端内存检索传入的已发布文章元数据，支持 Tab 焦点捕获、方向键导航与 Escape 焦点归还。
 */
export function CommandSearchModal({ isOpen, onClose, posts }: CommandSearchModalProps) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const dialogRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const navigatedRef = useRef(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setActiveIndex(0)
      if (!navigatedRef.current) {
        previousFocusRef.current?.focus()
      }
      previousFocusRef.current = null
      navigatedRef.current = false
      return
    }

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    navigatedRef.current = false

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timer = window.setTimeout(() => {
      inputRef.current?.focus()
    }, 30)

    return () => {
      document.body.style.overflow = prevOverflow
      window.clearTimeout(timer)
    }
  }, [isOpen])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) {
      return posts.slice(0, 6)
    }

    const tokens = q.split(/\s+/).filter(Boolean)
    return posts
      .filter((post) => {
        const haystack = [post.title, post.description, BLOG_CATEGORY_LABELS[post.category], ...post.tags]
          .join(' ')
          .toLowerCase()
        return tokens.every((token) => haystack.includes(token))
      })
      .slice(0, 10)
  }, [posts, query])

  const filteredRoutes = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return QUICK_ROUTES
    return QUICK_ROUTES.filter((r) => r.name.toLowerCase().includes(q) || r.hint.toLowerCase().includes(q))
  }, [query])

  const totalItems = results.length + (query.trim() ? 0 : filteredRoutes.length)
  const safeActiveIndex = totalItems > 0 ? Math.min(activeIndex, totalItems - 1) : 0

  const navigateTo = useCallback(
    (href: string) => {
      navigatedRef.current = true
      onClose()
      router.push(href)
    },
    [onClose, router],
  )

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  // 预取首条与当前高亮条目，消除首次键盘 Enter 跳转冷启动延迟
  useEffect(() => {
    if (!isOpen) return
    const firstPost = results[0]
    if (firstPost) {
      router.prefetch(`/blog/${firstPost.slug}`)
    }
    const activePost = safeActiveIndex < results.length ? results[safeActiveIndex] : undefined
    const targetHref = activePost
      ? `/blog/${activePost.slug}`
      : !query.trim()
        ? filteredRoutes[safeActiveIndex - results.length]?.href
        : undefined
    if (targetHref) {
      router.prefetch(targetHref)
    }
  }, [isOpen, safeActiveIndex, results, filteredRoutes, query, router])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key === 'Tab' && dialogRef.current) {
        const focusables = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'input:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => el.offsetParent !== null)
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        const active = document.activeElement
        if (!dialogRef.current.contains(active)) {
          event.preventDefault()
          first.focus()
          return
        }
        if (event.shiftKey && active === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && active === last) {
          event.preventDefault()
          first.focus()
        }
        return
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActiveIndex((prev) => (totalItems > 0 ? (Math.min(prev, totalItems - 1) + 1) % totalItems : 0))
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActiveIndex((prev) => (totalItems > 0 ? (Math.min(prev, totalItems - 1) - 1 + totalItems) % totalItems : 0))
        return
      }
      if (event.key === 'Enter' && totalItems > 0) {
        event.preventDefault()
        if (safeActiveIndex < results.length) {
          const post = results[safeActiveIndex]
          if (post) {
            navigateTo(`/blog/${post.slug}`)
          }
        } else {
          const route = filteredRoutes[safeActiveIndex - results.length]
          if (route) {
            navigateTo(route.href)
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, totalItems, safeActiveIndex, results, filteredRoutes, onClose, navigateTo])

  if (!mounted || !isOpen) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="全站搜索"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-start justify-center bg-background/65 px-4 pt-[12vh] backdrop-blur-sm animate-[modal-fade-in_160ms_ease_both] motion-reduce:animate-none"
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl overflow-hidden rounded-xl border border-hair bg-card shadow-[0_24px_60px_-16px_rgba(20,23,22,0.18)] animate-[modal-scale-in_240ms_var(--ease-spring)_both] motion-reduce:animate-none dark:shadow-[0_24px_60px_-16px_rgba(0,0,0,0.55)]"
      >
        {/* 顶部输入框 */}
        <div
          className="flex items-center gap-3 border-b border-hair px-4 py-3.5"
          style={{ backgroundImage: 'var(--field-gradient)' }}
        >
          <Search className="size-4 shrink-0 text-muted-foreground/75" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索文章、标签或页面..."
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:font-serif placeholder:text-muted-foreground/65"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="清空搜索"
              className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
          <kbd className="hidden shrink-0 rounded border border-border/70 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-block">
            ESC
          </kbd>
        </div>

        {/* 搜索结果列表 */}
        <div className="max-h-[58vh] overflow-y-auto p-2.5">
          {results.length > 0 ? (
            <div className="flex flex-col gap-0.5">
              <div className="px-2.5 py-1.5 font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                {query.trim() ? `匹配文章 (${results.length})` : '近期文章'}
              </div>
              {results.map((post, idx) => {
                const selected = idx === safeActiveIndex
                return (
                  <button
                    key={post.slug}
                    type="button"
                    data-selected={selected ? 'true' : undefined}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => navigateTo(`/blog/${post.slug}`)}
                    className={`group flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                      selected ? 'bg-primary/8 text-foreground' : 'text-foreground/85 hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <FileText
                        className={`size-3.5 shrink-0 ${selected ? 'text-primary' : 'text-muted-foreground/60'}`}
                      />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{post.title}</div>
                        <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                          <span>{BLOG_CATEGORY_LABELS[post.category]}</span>
                          <span>·</span>
                          <span>{formatDate(post.date)}</span>
                        </div>
                      </div>
                    </div>
                    <ArrowRight
                      className={`size-3.5 shrink-0 transition-all ${
                        selected ? 'translate-x-0 text-primary opacity-100' : '-translate-x-1 opacity-0'
                      }`}
                    />
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="py-12 text-center font-serif text-sm text-muted-foreground">
              未找到与「{query.trim()}」相关的文章
            </div>
          )}

          {!query.trim() && (
            <div className="mt-2 border-t border-hair pt-2">
              <div className="px-2.5 py-1.5 font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                快速直达
              </div>
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                {filteredRoutes.map((route, idx) => {
                  const overallIndex = results.length + idx
                  const selected = overallIndex === safeActiveIndex
                  return (
                    <button
                      key={route.href}
                      type="button"
                      data-selected={selected ? 'true' : undefined}
                      onMouseEnter={() => setActiveIndex(overallIndex)}
                      onClick={() => navigateTo(route.href)}
                      className={`flex items-center justify-between rounded-md px-2.5 py-2 text-xs transition-colors ${
                        selected
                          ? 'bg-primary/8 text-primary'
                          : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                      }`}
                    >
                      <span>{route.name}</span>
                      <span className="font-mono text-[10px] opacity-60">{route.hint}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
