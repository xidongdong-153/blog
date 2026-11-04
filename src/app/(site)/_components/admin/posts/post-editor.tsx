'use client'

import type { ManagedPost, PostDocument, PostInput } from '@/lib/posts'
import { ArrowLeft, ChevronDown, Columns2, ExternalLink, Eye, FilePenLine, Save } from 'lucide-react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { BLOG_CATEGORY_LABELS } from '@/lib/blog-meta'
import { createEmptyPost } from '@/lib/posts'
import { REGISTERED_SERIES } from '@/lib/series'
import { Button } from '../ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible'
import { DatePicker } from '../ui/date-picker'
import { Input } from '../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Switch } from '../ui/switch'
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs'
import { Textarea } from '../ui/textarea'
import { LiveMdxPreview } from './live-mdx-preview'
import { postRequest } from './post-api'
import { PostConfirmDialog } from './post-confirm-dialog'

const MarkdownEditor = dynamic(() => import('./markdown-editor').then((module) => module.MarkdownEditor), {
  ssr: false,
  loading: () => (
    <div
      className="min-h-[610px] animate-pulse rounded-lg border border-border bg-muted/30 motion-reduce:animate-none"
      aria-label="编辑器加载中"
    />
  ),
})

type EditorMode = 'edit' | 'split' | 'preview'

export function PostEditor({ initial }: { initial?: ManagedPost }) {
  const router = useRouter()
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const navigationApproved = useRef(false)
  const [record, setRecord] = useState(initial)
  const [input, setInput] = useState<PostInput>(() =>
    initial ? { slug: initial.slug, document: initial.document } : createEmptyPost(),
  )
  const [savedInput, setSavedInput] = useState(() =>
    JSON.stringify(initial ? { slug: initial.slug, document: initial.document } : createEmptyPost()),
  )
  const [tagsText, setTagsText] = useState(initial?.document.tags.join(', ') ?? '')
  const [operation, setOperation] = useState<'save' | 'preview' | 'publish' | null>(null)
  const busy = operation !== null
  const [error, setError] = useState('')
  const [mode, setMode] = useState<EditorMode>('split')
  const [confirmPublish, setConfirmPublish] = useState(false)
  const busyRef = useRef(false)
  const dirty = JSON.stringify(input) !== savedInput

  const setDocument = useCallback(<K extends keyof PostDocument>(field: K, value: PostDocument[K]) => {
    setInput((current) => ({ ...current, document: { ...current.document, [field]: value } }))
  }, [])

  async function persist(): Promise<ManagedPost> {
    const body = { ...input }
    const result = record
      ? await postRequest<ManagedPost>(`/${record.id}`, 'PUT', { ...body, revision: record.revision })
      : await postRequest<ManagedPost>('', 'POST', body)
    setRecord(result)
    setInput({ slug: result.slug, document: result.document })
    setTagsText(result.document.tags.join(', '))
    setSavedInput(JSON.stringify({ slug: result.slug, document: result.document }))
    if (!record) {
      window.history.replaceState(null, '', `/admin/posts/${result.id}/edit`)
      document.title = document.title.replace('新建文章', '编辑文章')
    }
    return result
  }

  async function perform(action: 'save' | 'preview' | 'publish') {
    if (busyRef.current) return
    busyRef.current = true
    setOperation(action)
    setError('')
    const previewWindow = action === 'preview' ? window.open('about:blank', '_blank') : null
    if (previewWindow) previewWindow.opener = null
    try {
      if (action === 'preview' && !previewWindow) throw new Error('预览窗口被拦截，请允许弹出窗口后重试')
      const current = dirty || !record ? await persist() : record
      if (action === 'publish') {
        const published = await postRequest<ManagedPost>(`/${current.id}/publish`, 'POST', {
          revision: current.revision,
        })
        setRecord(published)
        setConfirmPublish(false)
        toast.success('文章已发布', {
          action: {
            label: '查看文章',
            onClick: () => window.open(`/blog/${published.slug}`, '_blank', 'noopener,noreferrer'),
          },
        })
      } else if (action === 'preview') {
        if (previewWindow)
          previewWindow.location.replace(`/admin/posts/${current.id}/preview?revision=${current.revision}`)
      } else {
        toast.success('草稿已保存')
      }
    } catch (cause) {
      previewWindow?.close()
      setConfirmPublish(false)
      setError(cause instanceof Error ? cause.message : '操作失败，请稍后重试')
    } finally {
      busyRef.current = false
      setOperation(null)
    }
  }

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)')
    const adapt = () => {
      if (!media.matches) setMode((current) => (current === 'split' ? 'edit' : current))
    }
    adapt()
    media.addEventListener('change', adapt)
    return () => media.removeEventListener('change', adapt)
  }, [])

  const saveRef = useRef(() => {
    void perform('save')
  })
  saveRef.current = () => {
    void perform('save')
  }
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's' && !event.isComposing) {
        event.preventDefault()
        saveRef.current()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])
  useEffect(() => {
    if (!dirty) return
    function beforeUnload(event: BeforeUnloadEvent) {
      if (!navigationApproved.current) event.preventDefault()
    }
    function handleNavigation(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target.closest('a') : null
      if (!target || target.target === '_blank' || target.hasAttribute('download') || event.ctrlKey || event.metaKey)
        return
      const url = new URL(target.href, location.href)
      if (url.pathname === location.pathname && url.search === location.search) return
      if (navigationApproved.current) return
      event.preventDefault()
      event.stopPropagation()
      setPendingNavigation(url.href)
      setLeaveOpen(true)
    }
    window.addEventListener('beforeunload', beforeUnload)
    document.addEventListener('click', handleNavigation, true)
    return () => {
      window.removeEventListener('beforeunload', beforeUnload)
      document.removeEventListener('click', handleNavigation, true)
    }
  }, [dirty])

  const doc = input.document
  return (
    <div className="flex flex-col gap-6 pb-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex min-w-0 items-center gap-4">
          <Button asChild variant="outline" size="icon">
            <Link href="/admin/posts" aria-label="返回文章列表">
              <ArrowLeft />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-medium">{record ? '编辑文章' : '新建文章'}</h1>
            <p className="mt-1 text-xs text-muted-foreground" aria-live="polite">
              {record?.published ? '已发布' : '草稿'} · {busy ? '处理中…' : dirty || !record ? '未保存' : '已保存'}
              {record?.published && record.hasUnpublishedChanges ? ' · 有未发布修改' : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            disabled={busy}
            pending={operation === 'save'}
            onClick={() => {
              void perform('save')
            }}
          >
            <Save />
            保存草稿
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            pending={operation === 'preview'}
            onClick={() => {
              void perform('preview')
            }}
          >
            <ExternalLink />
            保存并外部预览
          </Button>
          <Button disabled={busy} pending={operation === 'publish'} onClick={() => setConfirmPublish(true)}>
            {record?.published ? '发布更新' : '发布'}
          </Button>
        </div>
      </header>
      {error && (
        <p
          role="alert"
          className="rounded-md border border-red-600/40 bg-red-600/5 p-3 text-sm text-red-700 dark:text-red-400"
        >
          {error}
        </p>
      )}
      <section aria-label="文章属性" className="min-w-0">
        <Collapsible defaultOpen className="overflow-hidden rounded-lg border border-border">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="group w-full justify-between rounded-none px-4">
              文章属性
              <ChevronDown className="transition-transform duration-(--ui-duration) group-data-[state=open]:rotate-180 motion-reduce:transition-none" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <fieldset
              disabled={busy}
              className="grid min-w-0 grid-cols-1 items-start gap-4 p-4 pt-2 sm:grid-cols-2 lg:grid-cols-12"
            >
              <label className="flex min-w-0 flex-col gap-2 text-sm font-medium lg:col-span-3" htmlFor="post-title">
                标题
                <Input
                  id="post-title"
                  maxLength={240}
                  value={doc.title}
                  disabled={busy}
                  onChange={(event) => setDocument('title', event.target.value)}
                  placeholder="文章标题"
                  className="text-lg md:text-lg"
                />
              </label>
              <label htmlFor="post-description" className="lg:col-span-3 flex flex-col gap-2 text-sm">
                描述
                <Textarea
                  id="post-description"
                  value={doc.description}
                  maxLength={1000}
                  rows={1}
                  className="h-11 min-h-11 resize-y"
                  onChange={(event) => setDocument('description', event.target.value)}
                />
              </label>
              <label htmlFor="post-slug" className="lg:col-span-2 flex flex-col gap-2 text-sm">
                文章地址
                <Input
                  id="post-slug"
                  value={input.slug}
                  maxLength={128}
                  required
                  disabled={record?.slugLocked || busy}
                  onChange={(event) => setInput((current) => ({ ...current, slug: event.target.value }))}
                  placeholder="my-first-post"
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                />
                <span className="text-xs text-muted-foreground">
                  {record?.slugLocked ? '发布后地址固定' : '小写字母、数字和连字符'}
                </span>
              </label>
              <div className="lg:col-span-1 flex flex-col gap-2 text-sm">
                <label htmlFor="post-category">分类</label>
                <Select
                  value={doc.category}
                  disabled={busy}
                  onValueChange={(value) => setDocument('category', value as PostDocument['category'])}
                >
                  <SelectTrigger id="post-category" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(BLOG_CATEGORY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <label htmlFor="post-tags" className="lg:col-span-3 flex flex-col gap-2 text-sm">
                标签
                <Input
                  id="post-tags"
                  value={tagsText}
                  maxLength={1800}
                  onChange={(event) => {
                    setTagsText(event.target.value)
                    setDocument(
                      'tags',
                      event.target.value
                        .split(/[,，]/)
                        .map((tag) => tag.trim())
                        .filter(Boolean),
                    )
                  }}
                  placeholder="用逗号分隔"
                />
              </label>
              <div className="lg:col-span-2 flex flex-col gap-2 text-sm">
                <label htmlFor="post-date">文章日期</label>
                <DatePicker
                  id="post-date"
                  value={doc.date}
                  required
                  disabled={busy}
                  onValueChange={(value) => setDocument('date', value)}
                />
              </div>
              <div className="lg:col-span-2 flex flex-col gap-2 text-sm">
                <label htmlFor="post-updated-date">内容更新日期</label>
                <DatePicker
                  id="post-updated-date"
                  value={doc.updatedDate}
                  disabled={busy}
                  onValueChange={(value) => setDocument('updatedDate', value)}
                />
              </div>
              <label htmlFor="post-cover" className="lg:col-span-2 flex flex-col gap-2 text-sm">
                封面 URL
                <Input
                  id="post-cover"
                  value={doc.heroImage}
                  maxLength={2048}
                  onChange={(event) => setDocument('heroImage', event.target.value)}
                  placeholder="https:// 或 /images/…"
                />
              </label>
              <label htmlFor="post-color" className="lg:col-span-1 flex flex-col gap-2 text-sm">
                主题色
                <Input
                  id="post-color"
                  value={doc.heroColor}
                  maxLength={7}
                  onChange={(event) => setDocument('heroColor', event.target.value)}
                  placeholder="#659eb9"
                />
              </label>
              <div className="lg:col-span-2 flex flex-col gap-2 text-sm">
                <label htmlFor="post-series">专栏</label>
                <Select
                  value={doc.series?.id ?? 'none'}
                  disabled={busy}
                  onValueChange={(value) =>
                    setDocument('series', value === 'none' ? undefined : { id: value, order: doc.series?.order ?? 1 })
                  }
                >
                  <SelectTrigger id="post-series" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">无</SelectItem>
                    {Object.values(REGISTERED_SERIES).map((series) => (
                      <SelectItem key={series.id} value={series.id}>
                        {series.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {doc.series && (
                  <>
                    <label htmlFor="post-order" className="flex flex-col gap-2 text-sm">
                      专栏排序
                      <Input
                        id="post-order"
                        type="number"
                        min={1}
                        max={100000}
                        value={doc.series.order}
                        onChange={(event) => {
                          if (doc.series) setDocument('series', { ...doc.series, order: Number(event.target.value) })
                        }}
                      />
                    </label>
                    <label htmlFor="post-group" className="flex flex-col gap-2 text-sm">
                      章节分组
                      <Input
                        id="post-group"
                        value={doc.series.group ?? ''}
                        maxLength={120}
                        onChange={(event) => {
                          if (doc.series) setDocument('series', { ...doc.series, group: event.target.value })
                        }}
                      />
                    </label>
                  </>
                )}
              </div>
              <div className="lg:col-span-3 flex flex-col gap-1 pt-5">
                <label
                  htmlFor="post-ai-generated"
                  className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm"
                >
                  AI 生成
                  <Switch
                    id="post-ai-generated"
                    disabled={busy}
                    checked={doc.aiGenerated}
                    onCheckedChange={(checked) => setDocument('aiGenerated', checked)}
                  />
                </label>
                <label
                  htmlFor="post-disable-summary"
                  className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm"
                >
                  关闭 AI 摘要
                  <Switch
                    id="post-disable-summary"
                    disabled={busy}
                    checked={doc.disableAiSummary}
                    onCheckedChange={(checked) => setDocument('disableAiSummary', checked)}
                  />
                </label>
              </div>
            </fieldset>
          </CollapsibleContent>
        </Collapsible>
      </section>
      <Tabs value={mode} onValueChange={(value) => setMode(value as EditorMode)} className="min-w-0 gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList aria-label="编辑器视图">
            <TabsTrigger id="post-tab-edit" value="edit" aria-controls="post-editor-panel">
              <FilePenLine className="size-4" />
              编辑
            </TabsTrigger>
            <TabsTrigger
              id="post-tab-split"
              value="split"
              aria-controls="post-editor-panel"
              className="hidden lg:inline-flex"
            >
              <Columns2 className="size-4" />
              分栏
            </TabsTrigger>
            <TabsTrigger id="post-tab-preview" value="preview" aria-controls="post-editor-panel">
              <Eye className="size-4" />
              预览
            </TabsTrigger>
          </TabsList>
        </div>
        <div
          id="post-editor-panel"
          role="tabpanel"
          aria-labelledby={`post-tab-${mode}`}
          className={`grid min-w-0 gap-5 ${mode === 'split' ? 'lg:grid-cols-2' : ''}`}
        >
          <div className={mode === 'preview' ? 'hidden' : 'min-w-0'}>
            <MarkdownEditor value={doc.content} onChange={(value) => setDocument('content', value)} disabled={busy} />
          </div>
          {mode !== 'edit' && <LiveMdxPreview source={doc.content} />}
        </div>
      </Tabs>
      {pendingNavigation && (
        <PostConfirmDialog
          open={leaveOpen}
          variant="destructive"
          title="离开编辑器"
          message="有未保存的修改，离开后这些修改将丢失。"
          confirmLabel="放弃修改并离开"
          busy={false}
          onConfirm={() => {
            navigationApproved.current = true
            router.push(pendingNavigation)
            setLeaveOpen(false)
          }}
          onClose={() => setLeaveOpen(false)}
        />
      )}
      <PostConfirmDialog
        open={confirmPublish}
        title={record?.published ? '发布文章更新' : '发布文章'}
        message={`“${doc.title || '未命名文章'}”将保存并公开，访客可以立即访问。`}
        confirmLabel={record?.published ? '发布更新' : '发布'}
        busy={busy}
        onConfirm={() => {
          void perform('publish')
        }}
        onClose={() => setConfirmPublish(false)}
      />
    </div>
  )
}
