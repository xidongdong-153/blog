'use client'

import type { ManagedPost, ManagedPostList } from '@/lib/posts'
import { Download, Eye, FileText, MoreHorizontal, Plus, Search, Sparkles, Trash2, Undo2, Upload, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { BLOG_CATEGORY_LABELS, calculateReadingTime } from '@/lib/blog-meta'
import { formatDate } from '@/lib/date'
import { FilterLabel } from '../../blog/filter-label'
import { PaperSurface } from '../../site/paper-surface'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { Input } from '../ui/input'
import { postRequest } from './post-api'
import { PostConfirmDialog } from './post-confirm-dialog'

type PostAction = 'withdraw' | 'delete' | 'summary'
type PostStatusFilter = 'all' | 'draft' | 'published'

const STATUS_TABS: { value: PostStatusFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'published', label: '已发布' },
  { value: 'draft', label: '草稿' },
]

function buildPostsUrl({ status, query, page }: { status: string; query: string; page?: number }) {
  const params = new URLSearchParams()
  if (page && page > 1) params.set('page', String(page))
  if (query.trim()) params.set('q', query.trim())
  if (status !== 'all') params.set('status', status)
  const search = params.toString()
  return search ? `/admin/posts?${search}` : '/admin/posts'
}

function PostActions({
  post,
  busy,
  onAction,
}: {
  post: ManagedPost
  busy: boolean
  onAction: (post: ManagedPost, action: PostAction, trigger: HTMLButtonElement | null, origin?: DOMRect) => void
}) {
  const trigger = useRef<HTMLButtonElement>(null)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          ref={trigger}
          variant="ghost"
          size="icon"
          disabled={busy}
          aria-label={`管理“${post.document.title || post.slug}”`}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {post.published && (
          <DropdownMenuItem asChild>
            <Link href={`/blog/${post.slug}`} target="_blank">
              <Eye />
              查看公开文章
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link href={`/admin/posts/${post.id}/preview`} target="_blank">
            <FileText />
            预览工作稿
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a download href={`/api/admin/posts/${post.id}/export?version=draft`}>
            <Download />
            导出工作稿
          </a>
        </DropdownMenuItem>
        {post.published && (
          <DropdownMenuItem asChild>
            <a download href={`/api/admin/posts/${post.id}/export?version=published`}>
              <Download />
              导出公开版本
            </a>
          </DropdownMenuItem>
        )}
        {post.published && !post.published.disableAiSummary && (
          <DropdownMenuItem disabled={busy} onSelect={() => onAction(post, 'summary', trigger.current)}>
            <Sparkles />
            生成 AI 摘要
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {post.published && (
          <DropdownMenuItem
            disabled={busy}
            onSelect={(event) => {
              const origin =
                event.currentTarget instanceof HTMLElement ? event.currentTarget.getBoundingClientRect() : undefined
              onAction(post, 'withdraw', trigger.current, origin)
            }}
          >
            <Undo2 />
            撤回
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          variant="destructive"
          disabled={busy}
          onSelect={(event) => {
            const origin =
              event.currentTarget instanceof HTMLElement ? event.currentTarget.getBoundingClientRect() : undefined
            onAction(post, 'delete', trigger.current, origin)
          }}
        >
          <Trash2 />
          删除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** 文章管理台账列表，支持按状态快捷切换、关键词搜索与工作稿操作。 */
export function PostList({ data, query, status }: { data: ManagedPostList; query: string; status: string }) {
  const router = useRouter()
  const [pending, setPending] = useState<{ post: ManagedPost; action: 'withdraw' | 'delete' } | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [filtering, startFilter] = useTransition()
  const [error, setError] = useState('')
  const actionTrigger = useRef<HTMLButtonElement | null>(null)
  const originRectRef = useRef<DOMRect | null>(null)
  const busyRef = useRef(false)

  async function run(post: ManagedPost, action: PostAction) {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setError('')
    const notification = action === 'summary' ? toast.loading('正在生成 AI 摘要…') : undefined
    try {
      await postRequest(
        `/${post.id}${action === 'delete' ? '' : `/${action}`}`,
        action === 'delete' ? 'DELETE' : 'POST',
        action === 'summary' ? {} : { revision: post.revision },
      )
      setConfirmOpen(false)
      toast.success(action === 'delete' ? '文章已删除' : action === 'withdraw' ? '文章已撤回' : 'AI 摘要已生成', {
        id: notification,
      })
      router.refresh()
    } catch (cause) {
      if (notification !== undefined) toast.dismiss(notification)
      setError(cause instanceof Error ? cause.message : '操作失败，请稍后重试')
      setConfirmOpen(false)
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-8">
      <header className="flex flex-col gap-4 border-b border-hair pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 font-mono text-xs tracking-[0.22em] text-muted-foreground uppercase">
            <span>// ADMIN</span>
            <span aria-hidden="true">·</span>
            <span className="font-medium text-primary">文章</span>
          </div>
          <div className="flex items-baseline gap-3">
            <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">文章</h1>
            <span className="font-mono text-sm tabular-nums text-muted-foreground">{data.total} 篇</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download />
                导出
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem asChild>
                <a download href="/api/admin/posts/export?version=draft">
                  导出全部工作稿
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a download href="/api/admin/posts/export?version=published">
                  导出已发布版本
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button asChild variant="outline">
            <Link href="/admin/posts/import">
              <Upload />
              导入
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/posts/new">
              <Plus />
              新建文章
            </Link>
          </Button>
        </div>
      </header>

      {/* 状态切换与关键词检索 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="文章状态筛选" className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          {STATUS_TABS.map((item) => {
            const active = status === item.value
            return (
              <Link
                key={item.value}
                href={buildPostsUrl({ status: item.value, query })}
                aria-current={active ? 'page' : undefined}
                className={`group/filter inline-flex min-h-10 items-center px-0.5 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring ${
                  active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <FilterLabel active={active}>{item.label}</FilterLabel>
              </Link>
            )
          })}
        </nav>

        <form
          action="/admin/posts"
          method="get"
          className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:min-w-80"
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            const search = String(form.get('q') ?? '').trim()
            startFilter(() => router.push(buildPostsUrl({ status, query: search })))
          }}
        >
          {status !== 'all' && <input type="hidden" name="status" value={status} />}
          <label htmlFor="posts-search" className="sr-only">
            搜索文章标题或地址
          </label>
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground"
            />
            <Input
              key={query}
              id="posts-search"
              name="q"
              type="search"
              defaultValue={query}
              maxLength={240}
              placeholder="搜索标题或文章地址"
              className="pl-9 pr-9"
            />
            {query && (
              <Link
                href={buildPostsUrl({ status, query: '' })}
                aria-label="清空搜索"
                className="absolute top-1.5 right-1.5 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                <X className="size-3.5" aria-hidden="true" />
              </Link>
            )}
          </div>
          <Button type="submit" variant="outline" pending={filtering}>
            筛选
          </Button>
        </form>
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-2 rounded-lg border border-destructive/35 bg-destructive/5 px-4 py-2.5 text-sm text-destructive"
        >
          <span className="flex-1">{error}</span>
          <Button variant="ghost" size="sm" onClick={() => router.refresh()}>
            刷新列表
          </Button>
        </div>
      )}

      {/* 文章台账 */}
      <div aria-busy={busy || filtering} className="relative isolate overflow-hidden rounded-xl px-5 py-1">
        <PaperSurface />
        <div className="hidden grid-cols-[minmax(0,1fr)_8.5rem_6rem_7.5rem_6.5rem] gap-4 border-b border-hair py-3 font-mono text-xs text-muted-foreground md:grid">
          <span>文章</span>
          <span>状态</span>
          <span>分类</span>
          <span>更新时间</span>
          <span className="text-right">操作</span>
        </div>

        {data.posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-14 text-center text-sm text-muted-foreground">
            <p>{query || status !== 'all' ? '没有匹配筛选条件的文章。' : '还没有文章，开始写第一篇吧。'}</p>
            <div className="flex flex-wrap items-center gap-2">
              {(query || status !== 'all') && (
                <Button asChild variant="outline" size="sm">
                  <Link href="/admin/posts">查看全部</Link>
                </Button>
              )}
              <Button asChild size="sm">
                <Link href="/admin/posts/new">新建文章</Link>
              </Button>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-hair">
            {data.posts.map((post) => {
              const readingTime = calculateReadingTime(post.document.content)
              return (
                <li
                  key={post.id}
                  className="grid min-w-0 gap-x-4 gap-y-3 py-5 md:grid-cols-[minmax(0,1fr)_8.5rem_6rem_7.5rem_6.5rem] md:items-center"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/admin/posts/${post.id}/edit`}
                      className="inline-block max-w-full rounded-sm font-serif text-lg font-medium leading-snug text-foreground break-words transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      {post.document.title || '未命名文章'}
                    </Link>
                    {post.document.description && (
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{post.document.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-muted-foreground">
                      <span className="break-all">/blog/{post.slug}</span>
                      <span aria-hidden="true">·</span>
                      <span>{readingTime}</span>
                      {post.document.aiGenerated && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>AI 生成</span>
                        </>
                      )}
                      {post.document.tags.length > 0 && (
                        <>
                          <span aria-hidden="true">/</span>
                          <span className="truncate">
                            {post.document.tags
                              .slice(0, 3)
                              .map((tag) => `#${tag}`)
                              .join(' ')}
                            {post.document.tags.length > 3 ? ` +${post.document.tags.length - 3}` : ''}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs tabular-nums">
                    <span
                      className={`rounded-md px-2 py-0.5 font-medium ${
                        post.published
                          ? 'bg-emerald-700/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {post.published ? '已发布' : '草稿'}
                    </span>
                    <span className="text-xs text-muted-foreground">r{post.revision}</span>
                    {post.published && post.hasUnpublishedChanges && (
                      <span className="rounded-md bg-amber-700/10 px-1.5 py-0.5 text-xs text-amber-700 dark:bg-amber-400/10 dark:text-amber-400">
                        待发布更新
                      </span>
                    )}
                  </div>

                  <span className="font-mono text-xs text-muted-foreground">
                    {BLOG_CATEGORY_LABELS[post.document.category]}
                  </span>

                  <time dateTime={post.updatedAt} className="font-mono text-xs tabular-nums text-muted-foreground">
                    {formatDate(post.updatedAt)}
                  </time>

                  <div className="flex items-center gap-1 md:justify-end">
                    <Button asChild variant="link" className="min-h-11 px-2">
                      <Link href={`/admin/posts/${post.id}/edit`}>编辑</Link>
                    </Button>
                    <PostActions
                      post={post}
                      busy={busy || filtering}
                      onAction={(selected, action, trigger, origin) => {
                        if (action === 'summary') {
                          void run(selected, action)
                          return
                        }
                        actionTrigger.current = trigger
                        originRectRef.current = origin ?? null
                        setPending({ post: selected, action })
                        setConfirmOpen(true)
                      }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <nav aria-label="文章列表分页" className="flex items-center justify-between border-t border-hair pt-4 text-sm">
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          第 {data.page} / {data.totalPages} 页
        </span>
        <div className="flex gap-2">
          {data.page > 1 && (
            <Button asChild variant="outline" size="sm">
              <Link href={buildPostsUrl({ status, query, page: data.page - 1 })}>上一页</Link>
            </Button>
          )}
          {data.page < data.totalPages && (
            <Button asChild variant="outline" size="sm">
              <Link href={buildPostsUrl({ status, query, page: data.page + 1 })}>下一页</Link>
            </Button>
          )}
        </div>
      </nav>

      {pending && (
        <PostConfirmDialog
          open={confirmOpen}
          returnFocusRef={actionTrigger}
          originRectRef={originRectRef}
          variant={pending.action === 'delete' ? 'destructive' : 'default'}
          title={pending.action === 'delete' ? '删除文章' : '撤回文章'}
          message={
            pending.action === 'delete'
              ? `永久删除“${pending.post.document.title || pending.post.slug}”及其评论和 AI 摘要，无法恢复。`
              : `撤回“${pending.post.document.title || pending.post.slug}”后访客将无法访问，工作稿和评论会保留。`
          }
          confirmLabel={pending.action === 'delete' ? '永久删除' : '撤回'}
          busy={busy}
          onConfirm={() => {
            void run(pending.post, pending.action)
          }}
          onClose={() => setConfirmOpen(false)}
        />
      )}
    </div>
  )
}
