'use client'

import type { CommentItemView, CommentSortOrder } from '@/server/modules/comments/comments.types'
import { useCallback, useEffect, useState } from 'react'
import { useSession } from '@/lib/auth-client'
import { CommentAuthCard } from './comment-auth-card'
import { CommentComposer } from './comment-composer'
import { CommentItem } from './comment-item'

interface CommentSectionProps {
  slug: string
}

interface AuthConfigData {
  providers: {
    github: boolean
    google: boolean
  }
  isOwner?: boolean
}

const SORT_OPTIONS: { key: CommentSortOrder; label: string }[] = [
  { key: 'default', label: '默认' },
  { key: 'newest', label: '最新' },
  { key: 'oldest', label: '最早' },
]

/**
 * 评论区客户端组件：读取文章评论，展示登录、排序、发布、回复和站长操作状态。
 */
export function CommentSection({ slug }: CommentSectionProps) {
  const { data: session } = useSession()
  const [authConfig, setAuthConfig] = useState<AuthConfigData>({
    providers: { github: false, google: false },
    isOwner: false,
  })

  const [sort, setSort] = useState<CommentSortOrder>('default')
  const [comments, setComments] = useState<CommentItemView[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isOwner, setIsOwner] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 读取认证配置（Provider 可用性）
  useEffect(() => {
    fetch('/api/config/auth')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setAuthConfig(json.data)
        }
      })
      .catch(() => {
        // 静默降级
      })
  }, [])

  // 加载评论数据
  const fetchComments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/comments?slug=${encodeURIComponent(slug)}&sort=${sort}`)
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || '获取评论失败')
      }
      setComments(json.data.comments || [])
      setTotalCount(json.data.totalCount || 0)
      setIsOwner(Boolean(json.data.isOwner))
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载评论列表异常')
    } finally {
      setLoading(false)
    }
  }, [slug, sort])

  useEffect(() => {
    void fetchComments()
  }, [fetchComments])

  const isLoggedIn = Boolean(session?.user)
  const currentUserIsOwner = isOwner || Boolean(authConfig.isOwner)

  return (
    <section aria-label="评论区" className="border-t border-border/60 pt-10">
      {/* 标题栏与排序控件 */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="font-serif text-2xl font-medium tracking-tight text-foreground sm:text-3xl">评论</h2>
          <span className="font-mono text-xs text-muted-foreground">({totalCount})</span>
        </div>

        {/* 排序切换 */}
        <div className="flex items-center rounded-md border border-border/60 bg-muted/20 p-0.5">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setSort(opt.key)}
              className={`rounded px-2.5 py-1 font-mono text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background ${
                sort === opt.key
                  ? 'bg-background font-medium text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* 认证状态卡片 */}
        <CommentAuthCard providers={authConfig.providers} isOwner={currentUserIsOwner} />

        {/* 已登录时展示评论发布输入框 */}
        {isLoggedIn && (
          <div className="rounded-lg border border-border/60 bg-card/20 p-4">
            <CommentComposer slug={slug} onSuccess={fetchComments} />
          </div>
        )}

        {/* 评论列表状态 */}
        {loading ? (
          <div
            role="status"
            aria-live="polite"
            className="flex flex-col gap-3 rounded-lg border border-border/40 bg-card/20 p-6"
          >
            <div className="flex items-center gap-3">
              <div className="size-8 animate-pulse rounded-full bg-muted/60" />
              <div className="h-4 w-32 animate-pulse rounded bg-muted/60" />
            </div>
            <div className="h-12 w-full animate-pulse rounded bg-muted/40" />
          </div>
        ) : error ? (
          <div
            role="alert"
            className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border/60 bg-card/30 p-8 text-center"
          >
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button
              type="button"
              onClick={() => void fetchComments()}
              className="inline-flex items-center rounded-md border border-border bg-background px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
            >
              重新加载 ↻
            </button>
          </div>
        ) : comments.length === 0 ? (
          <div className="rounded-lg border border-border/40 bg-card/10 p-8 text-center">
            <p className="text-sm text-muted-foreground">暂无评论，来发表第一条见解吧。</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                slug={slug}
                currentUserIsOwner={currentUserIsOwner}
                isLoggedIn={isLoggedIn}
                onRefresh={fetchComments}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
