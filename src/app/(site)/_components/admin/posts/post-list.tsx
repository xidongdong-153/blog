'use client'

import type { ManagedPost, ManagedPostList } from '@/lib/posts'
import { Download, Eye, FileText, MoreHorizontal, Plus, Search, Sparkles, Trash2, Undo2, Upload } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { BLOG_CATEGORY_LABELS } from '@/lib/blog-meta'
import { formatDate } from '@/lib/date'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { Input } from '../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { postRequest } from './post-api'
import { PostConfirmDialog } from './post-confirm-dialog'

type PostAction = 'withdraw' | 'delete' | 'summary'

function PostActions({
  post,
  busy,
  onAction,
}: {
  post: ManagedPost
  busy: boolean
  onAction: (post: ManagedPost, action: PostAction, trigger: HTMLButtonElement | null) => void
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
          <DropdownMenuItem disabled={busy} onSelect={() => onAction(post, 'withdraw', trigger.current)}>
            <Undo2 />
            撤回
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          variant="destructive"
          disabled={busy}
          onSelect={() => onAction(post, 'delete', trigger.current)}
        >
          <Trash2 />
          删除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function PostList({ data, query, status }: { data: ManagedPostList; query: string; status: string }) {
  const router = useRouter()
  const [pending, setPending] = useState<{ post: ManagedPost; action: 'withdraw' | 'delete' } | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [filtering, startFilter] = useTransition()
  const [error, setError] = useState('')
  const actionTrigger = useRef<HTMLButtonElement | null>(null)
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

  function pageUrl(page: number) {
    const params = new URLSearchParams({ page: String(page) })
    if (query) params.set('q', query)
    if (status !== 'all') params.set('status', status)
    return `/admin/posts?${params.toString()}`
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-medium">文章</h1>
          <span className="text-sm tabular-nums text-muted-foreground">{data.total} 篇</span>
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
      <form
        action="/admin/posts"
        method="get"
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          const form = new FormData(event.currentTarget)
          const params = new URLSearchParams()
          const search = String(form.get('q') ?? '').trim()
          const filter = String(form.get('status') ?? 'all')
          if (search) params.set('q', search)
          if (filter !== 'all') params.set('status', filter)
          startFilter(() => router.push(`/admin/posts${params.size ? `?${params}` : ''}`))
        }}
      >
        <label
          htmlFor="posts-search"
          className="flex w-full min-w-0 flex-col gap-2 text-sm sm:w-auto sm:max-w-sm sm:flex-1"
        >
          搜索
          <span className="relative">
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
              placeholder="标题或文章地址"
              className="pl-9"
            />
          </span>
        </label>
        <div className="flex flex-col gap-2 text-sm">
          <label htmlFor="posts-status">状态</label>
          <Select key={status} name="status" defaultValue={status} disabled={filtering}>
            <SelectTrigger id="posts-status" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="draft">草稿</SelectItem>
              <SelectItem value="published">已发布</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" variant="outline" pending={filtering}>
          筛选
        </Button>
        {(query || status !== 'all') && (
          <Button asChild variant="ghost">
            <Link href="/admin/posts">清除</Link>
          </Button>
        )}
      </form>
      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-2 rounded-md border border-red-600/40 bg-red-600/5 px-4 py-2 text-sm text-red-700 dark:text-red-400"
        >
          <span className="flex-1">{error}</span>
          <Button variant="ghost" onClick={() => router.refresh()}>
            刷新列表
          </Button>
        </div>
      )}
      <div aria-busy={busy || filtering}>
        <div className="hidden grid-cols-[minmax(0,1fr)_7rem_7rem_8rem_7rem] gap-4 border-b border-border py-3 text-xs text-muted-foreground md:grid">
          <span>标题</span>
          <span>状态</span>
          <span>分类</span>
          <span>更新时间</span>
          <span className="text-right">操作</span>
        </div>
        {data.posts.length === 0 ? (
          <div className="border-b border-border py-12 text-sm text-muted-foreground">
            {query || status !== 'all' ? '没有匹配的文章。' : '还没有文章。'}
            <Button asChild variant="link">
              <Link href="/admin/posts/new">新建文章</Link>
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {data.posts.map((post) => (
              <li
                key={post.id}
                className="grid min-w-0 gap-x-4 gap-y-3 py-5 md:grid-cols-[minmax(0,1fr)_7rem_7rem_8rem_7rem] md:items-center"
              >
                <div className="min-w-0">
                  <Link
                    href={`/admin/posts/${post.id}/edit`}
                    className="break-words text-base font-medium transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    {post.document.title || '未命名文章'}
                  </Link>
                  <p className="mt-1 break-all text-xs text-muted-foreground">/blog/{post.slug}</p>
                  {post.published && post.hasUnpublishedChanges && (
                    <p className="mt-2 text-xs text-amber-800 dark:text-amber-400">有未发布修改</p>
                  )}
                </div>
                <span
                  className={`text-sm ${post.published ? 'text-emerald-800 dark:text-emerald-400' : 'text-muted-foreground'}`}
                >
                  {post.published ? '已发布' : '草稿'}
                </span>
                <span className="text-sm text-muted-foreground">{BLOG_CATEGORY_LABELS[post.document.category]}</span>
                <time dateTime={post.updatedAt} className="text-sm text-muted-foreground">
                  {formatDate(post.updatedAt)}
                </time>
                <div className="flex items-center gap-1 md:justify-end">
                  <Button asChild variant="link" className="px-2">
                    <Link href={`/admin/posts/${post.id}/edit`}>编辑</Link>
                  </Button>
                  <PostActions
                    post={post}
                    busy={busy || filtering}
                    onAction={(selected, action, trigger) => {
                      if (action === 'summary') {
                        void run(selected, action)
                        return
                      }
                      actionTrigger.current = trigger
                      setPending({ post: selected, action })
                      setConfirmOpen(true)
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <nav aria-label="文章列表分页" className="flex items-center justify-between text-sm">
        <span className="tabular-nums text-muted-foreground">
          {data.page} / {data.totalPages}
        </span>
        <div className="flex gap-2">
          {data.page > 1 && (
            <Button asChild variant="outline">
              <Link href={pageUrl(data.page - 1)}>上一页</Link>
            </Button>
          )}
          {data.page < data.totalPages && (
            <Button asChild variant="outline">
              <Link href={pageUrl(data.page + 1)}>下一页</Link>
            </Button>
          )}
        </div>
      </nav>
      {pending && (
        <PostConfirmDialog
          open={confirmOpen}
          returnFocusRef={actionTrigger}
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
