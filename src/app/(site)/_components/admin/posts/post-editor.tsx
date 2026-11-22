'use client'

import type { RefObject } from 'react'
import type { ManagedPost, PostDocument, PostInput } from '@/lib/posts'
import {
  ArrowLeft,
  ArrowUpDown,
  Columns2,
  ExternalLink,
  Eye,
  FilePenLine,
  Maximize2,
  Minimize2,
  Save,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { BLOG_CATEGORY_LABELS, calculateReadingTime, getArticleWordCounts } from '@/lib/blog-meta'
import { formatDate } from '@/lib/date'
import { generatedPostDraftSchema } from '@/lib/post-draft'
import { createEmptyPost } from '@/lib/posts'
import { lockOverlayScroll } from '../../site/overlay-scroll-lock'
import { PaperSurface } from '../../site/paper-surface'
import { useOverlayMotion } from '../../site/use-overlay-motion'
import { Button } from '../ui/button'
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs'
import { LiveMdxPreview } from './live-mdx-preview'
import { postRequest } from './post-api'
import { PostConfirmDialog } from './post-confirm-dialog'
import { PostGenerateDialog } from './post-generate-dialog'
import { PostPropertiesPanel } from './post-properties-panel'

const MarkdownEditor = dynamic(() => import('./markdown-editor').then((module) => module.MarkdownEditor), {
  ssr: false,
  loading: () => (
    <div
      className="h-[max(460px,calc(100dvh-23rem))] rounded-xl border border-hair bg-muted/25"
      aria-label="编辑器加载中"
    />
  ),
})

type EditorMode = 'edit' | 'split' | 'preview'
type SplitRatio = 'equal' | 'editor-wide'

function resolveInspectorErrorTarget(message: string): string | null {
  if (message.includes('文章地址')) return 'post-slug'
  if (message.includes('日期')) return 'post-date'
  if (message.includes('图片')) return 'post-cover'
  if (message.includes('主题色')) return 'post-color'
  return null
}

const XL_MEDIA_QUERY = '(min-width: 1280px)'

function subscribeXlMedia(onChange: () => void) {
  const media = window.matchMedia(XL_MEDIA_QUERY)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

function getXlSnapshot() {
  return window.matchMedia(XL_MEDIA_QUERY).matches
}

function getXlServerSnapshot() {
  return true
}

/** 纸面优先文章写作工作台：直写标题摘要、分栏文章级预览、专注写作模式与可收放侧边属性栏。 */
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
  const [operation, setOperation] = useState<'save' | 'preview' | 'publish' | 'generate' | null>(null)
  const [generateOpen, setGenerateOpen] = useState(false)
  const generateButtonRef = useRef<HTMLButtonElement>(null)
  const publishButtonRef = useRef<HTMLButtonElement>(null)
  const leaveTriggerRef = useRef<HTMLElement | null>(null)
  const busy = operation !== null
  const [error, setError] = useState('')
  const [mode, setMode] = useState<EditorMode>('split')
  const [splitRatio, setSplitRatio] = useState<SplitRatio>('equal')
  const [syncScroll, setSyncScroll] = useState(true)
  const [writerFocus, setWriterFocus] = useState(false)
  const [desktopInspectorOpen, setDesktopInspectorOpen] = useState(true)
  const [sheetInspectorOpen, setSheetInspectorOpen] = useState(false)
  const [confirmPublish, setConfirmPublish] = useState(false)

  const busyRef = useRef(false)
  const editorScrollRef = useRef<HTMLDivElement | null>(null)
  const previewScrollRef = useRef<HTMLDivElement | null>(null)
  const suppressEditorUntilRef = useRef(0)
  const suppressPreviewUntilRef = useRef(0)
  const needsInitialPreviewSyncRef = useRef(false)
  const syncScrollRef = useRef(syncScroll)
  syncScrollRef.current = syncScroll
  const modeRef = useRef(mode)
  modeRef.current = mode
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null)
  const inspectorButtonRef = useRef<HTMLButtonElement | null>(null)
  const inspectorTriggerRef = useRef<HTMLElement | null>(null)
  const sheetDialogRef = useRef<HTMLDivElement | null>(null)
  const pendingFocusTargetRef = useRef<string | null>(null)
  const isXl = useSyncExternalStore(subscribeXlMedia, getXlSnapshot, getXlServerSnapshot)
  const showSheet = !isXl && !writerFocus && sheetInspectorOpen
  const sheetMotion = useOverlayMotion({ open: showSheet, triggerRef: inspectorTriggerRef })
  const dirty = JSON.stringify(input) !== savedInput

  const setDocument = useCallback(<K extends keyof PostDocument>(field: K, value: PostDocument[K]) => {
    setInput((current) => ({ ...current, document: { ...current.document, [field]: value } }))
  }, [])

  const closeSheet = useCallback(() => {
    setSheetInspectorOpen(false)
    window.requestAnimationFrame(() => {
      inspectorButtonRef.current?.focus()
    })
  }, [])

  function openInspectorAndFocus(targetId: string, trigger?: HTMLElement) {
    inspectorTriggerRef.current = trigger ?? inspectorButtonRef.current
    if (writerFocus) setWriterFocus(false)
    pendingFocusTargetRef.current = targetId
    if (window.matchMedia(XL_MEDIA_QUERY).matches) {
      setDesktopInspectorOpen(true)
    } else {
      setSheetInspectorOpen(true)
    }
    window.requestAnimationFrame(() => {
      const target = document.getElementById(targetId)
      if (target) {
        pendingFocusTargetRef.current = null
        target.focus()
        target.scrollIntoView({ block: 'nearest' })
      }
    })
  }

  function toggleInspector() {
    if (window.matchMedia(XL_MEDIA_QUERY).matches) {
      setDesktopInspectorOpen((current) => !current)
    } else {
      inspectorTriggerRef.current = inspectorButtonRef.current
      setSheetInspectorOpen((current) => !current)
    }
  }

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

  async function generateDraft(overview: string, signal: AbortSignal) {
    if (busyRef.current) throw new Error('请等待当前操作完成')
    busyRef.current = true
    setOperation('generate')
    setError('')
    try {
      const result = await postRequest<unknown>('/generate-draft', 'POST', { overview }, signal)
      const parsed = generatedPostDraftSchema.safeParse(result)
      if (!parsed.success) throw new Error('生成的初稿格式无效，请重试')
      if (signal.aborted) return
      const { slug, heroColor, ...document } = parsed.data
      setInput((current) => ({
        slug: record?.slugLocked ? current.slug : slug,
        document: {
          ...current.document,
          ...document,
          heroColor: current.document.heroColor || heroColor,
          aiGenerated: true,
        },
      }))
      setTagsText(document.tags.join(', '))
      toast.success('初稿已填入，请检查后保存')
    } finally {
      busyRef.current = false
      setOperation(null)
    }
  }

  async function perform(action: 'save' | 'preview' | 'publish') {
    if (busyRef.current || generateOpen) return
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
      const message = cause instanceof Error ? cause.message : '操作失败，请稍后重试'
      setError(message)
      const fieldId = resolveInspectorErrorTarget(message)
      if (fieldId) openInspectorAndFocus(fieldId)
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

  useEffect(() => {
    const media = window.matchMedia(XL_MEDIA_QUERY)
    const onResize = (event: MediaQueryListEvent) => {
      if (event.matches) setSheetInspectorOpen(false)
    }
    media.addEventListener('change', onResize)
    return () => media.removeEventListener('change', onResize)
  }, [])

  useEffect(() => {
    if (!sheetMotion.present) return
    return lockOverlayScroll()
  }, [sheetMotion.present])

  // 窄屏属性抽屉焦点进入、Tab 焦点捕获
  useEffect(() => {
    if (!showSheet) return
    const focusTimer = window.requestAnimationFrame(() => {
      const pendingId = pendingFocusTargetRef.current
      if (pendingId) {
        const target = document.getElementById(pendingId)
        if (target) {
          pendingFocusTargetRef.current = null
          target.focus()
          target.scrollIntoView({ block: 'nearest' })
          return
        }
      }
      const container = sheetDialogRef.current
      if (!container) return
      const firstFocusable = container.querySelector<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      )
      firstFocusable?.focus()
    })

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !sheetDialogRef.current) return
      if (document.activeElement?.closest('[data-radix-popper-content-wrapper], [role="listbox"]')) return
      const focusables = Array.from(
        sheetDialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null)
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement
      if (!sheetDialogRef.current.contains(active)) {
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
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.cancelAnimationFrame(focusTimer)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [showSheet])

  const handlePreviewRendered = useCallback(() => {
    if (!needsInitialPreviewSyncRef.current || modeRef.current !== 'split' || !syncScrollRef.current) return
    const editorEl = editorScrollRef.current
    const previewEl = previewScrollRef.current
    if (!editorEl || !previewEl) return
    const maxFrom = editorEl.scrollHeight - editorEl.clientHeight
    const maxTo = previewEl.scrollHeight - previewEl.clientHeight
    if (maxFrom <= 0 || maxTo <= 0) return
    needsInitialPreviewSyncRef.current = false
    suppressPreviewUntilRef.current = performance.now() + 80
    previewEl.scrollTop = (editorEl.scrollTop / maxFrom) * maxTo
  }, [])

  // 分栏模式双向比例同步滚动
  useEffect(() => {
    if (mode !== 'split' || !syncScroll) return
    needsInitialPreviewSyncRef.current = true
    let attached = false
    let cleanupListeners: (() => void) | null = null

    function bind() {
      const editorEl = editorScrollRef.current
      const previewEl = previewScrollRef.current
      if (!editorEl || !previewEl || attached) return false
      attached = true

      const sync = (
        from: HTMLDivElement,
        to: HTMLDivElement,
        suppressSelfUntil: RefObject<number>,
        suppressOtherUntil: RefObject<number>,
      ) => {
        if (performance.now() < suppressSelfUntil.current) return
        const maxFrom = from.scrollHeight - from.clientHeight
        const maxTo = to.scrollHeight - to.clientHeight
        if (maxFrom <= 0 || maxTo <= 0) return
        const nextTop = (from.scrollTop / maxFrom) * maxTo
        if (Math.abs(to.scrollTop - nextTop) <= 1) return
        suppressOtherUntil.current = performance.now() + 80
        to.scrollTop = nextTop
      }

      const onEditorScroll = () => sync(editorEl, previewEl, suppressEditorUntilRef, suppressPreviewUntilRef)
      const onPreviewScroll = () => sync(previewEl, editorEl, suppressPreviewUntilRef, suppressEditorUntilRef)
      editorEl.addEventListener('scroll', onEditorScroll, { passive: true })
      previewEl.addEventListener('scroll', onPreviewScroll, { passive: true })

      // 刚切入分栏时若预览已有高度则同步一次当前阅读比例，否则交由 onRendered 接力对齐
      window.requestAnimationFrame(() => {
        if (previewEl.scrollHeight - previewEl.clientHeight > 0) {
          needsInitialPreviewSyncRef.current = false
          sync(editorEl, previewEl, suppressEditorUntilRef, suppressPreviewUntilRef)
        }
      })

      cleanupListeners = () => {
        editorEl.removeEventListener('scroll', onEditorScroll)
        previewEl.removeEventListener('scroll', onPreviewScroll)
      }
      return true
    }

    if (!bind()) {
      const timer = window.setInterval(() => {
        if (bind()) window.clearInterval(timer)
      }, 150)
      return () => {
        window.clearInterval(timer)
        cleanupListeners?.()
      }
    }

    return () => {
      cleanupListeners?.()
    }
  }, [mode, syncScroll])

  const saveRef = useRef(() => {
    void perform('save')
  })
  saveRef.current = () => {
    void perform('save')
  }

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.isComposing) return
      const key = event.key.toLowerCase()
      if ((event.ctrlKey || event.metaKey) && key === 's') {
        event.preventDefault()
        saveRef.current()
        return
      }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && key === 'f') {
        event.preventDefault()
        setWriterFocus((current) => !current)
        return
      }
      if (event.key === 'Escape') {
        if (event.defaultPrevented) return
        const hasOpenPopup = Boolean(
          document.querySelector('[role="menu"], [role="listbox"], [data-radix-popper-content-wrapper]'),
        )
        if (hasOpenPopup) return
        if (showSheet) {
          event.preventDefault()
          closeSheet()
          return
        }
        const hasOtherDialog = Boolean(document.querySelector('[role="dialog"], [role="alertdialog"]'))
        if (hasOtherDialog) return
        if (writerFocus && !generateOpen && !confirmPublish && !leaveOpen) {
          event.preventDefault()
          setWriterFocus(false)
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [writerFocus, showSheet, closeSheet, generateOpen, confirmPublish, leaveOpen])

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
      leaveTriggerRef.current = target
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
  const wordStats = useMemo(() => getArticleWordCounts(doc.content), [doc.content])
  const readingTime = useMemo(() => calculateReadingTime(doc.content), [doc.content])
  const slugMissing = !input.slug.trim()

  const propertiesPanel = (
    <PostPropertiesPanel
      slug={input.slug}
      slugLocked={Boolean(record?.slugLocked)}
      document={doc}
      tagsText={tagsText}
      busy={busy}
      onSlugChange={(value) => setInput((current) => ({ ...current, slug: value }))}
      onDocumentChange={setDocument}
      onTagsTextChange={setTagsText}
      onClose={() => {
        if (isXl) setDesktopInspectorOpen(false)
        else closeSheet()
      }}
    />
  )

  return (
    <div data-writer-focus={writerFocus ? 'true' : 'false'} className="group/writer flex flex-col gap-5 pb-10">
      {/* 吸顶写作动作栏 */}
      <header className="sticky top-[4.5rem] z-30 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hair bg-background/88 px-3.5 py-2.5 shadow-[var(--surface-shadow)] backdrop-blur-md transition-[top] duration-200 group-data-[writer-focus=true]/writer:top-2 sm:px-4">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          {writerFocus ? (
            <Button variant="outline" size="sm" className="min-h-11 sm:min-h-9" onClick={() => setWriterFocus(false)}>
              <Minimize2 aria-hidden="true" />
              退出专注
            </Button>
          ) : (
            <Button asChild variant="outline" size="icon-sm" className="size-11 sm:size-9">
              <Link href="/admin/posts" aria-label="返回文章列表">
                <ArrowLeft />
              </Link>
            </Button>
          )}

          <div className="flex min-w-0 flex-wrap items-center gap-2 font-mono text-xs tabular-nums" aria-live="polite">
            <span
              className={`rounded-md px-2 py-0.5 font-medium ${
                record?.published
                  ? 'bg-emerald-700/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {record?.published ? '已发布' : '草稿'}
            </span>
            {record && <span className="text-muted-foreground">r{record.revision}</span>}
            <span className="text-muted-foreground">{busy ? '处理中…' : dirty || !record ? '未保存' : '已保存'}</span>
            {record?.published && record.hasUnpublishedChanges && (
              <span className="rounded-md bg-amber-700/10 px-2 py-0.5 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400">
                有未发布修改
              </span>
            )}
            {writerFocus && (
              <span className="hidden text-muted-foreground sm:inline">
                · {wordStats.total} 字 · {readingTime}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!writerFocus && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setWriterFocus(true)}
                aria-label="专注写作"
                aria-pressed={writerFocus}
                className="min-h-11 sm:min-h-9"
              >
                <Maximize2 aria-hidden="true" />
                <span className="hidden sm:inline">专注写作</span>
              </Button>
              <Button
                ref={inspectorButtonRef}
                variant="outline"
                size="sm"
                onClick={toggleInspector}
                className="relative min-h-11 sm:min-h-9"
                aria-label="切换文章属性栏"
                aria-expanded={isXl ? desktopInspectorOpen : showSheet}
              >
                <SlidersHorizontal aria-hidden="true" />
                <span>属性</span>
                {slugMissing && (
                  <span aria-label="待填写文章地址" className="size-1.5 rounded-full bg-amber-600 dark:bg-amber-400" />
                )}
              </Button>
              <Button
                ref={generateButtonRef}
                variant="outline"
                size="sm"
                disabled={busy && operation !== 'generate'}
                onClick={() => setGenerateOpen(true)}
                className="min-h-11 sm:min-h-9"
              >
                <Sparkles aria-hidden="true" />
                <span className="hidden md:inline">AI 生成初稿</span>
                <span className="md:hidden">AI 初稿</span>
              </Button>
            </>
          )}

          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            pending={operation === 'save'}
            onClick={() => {
              void perform('save')
            }}
            className="min-h-11 sm:min-h-9"
          >
            <Save aria-hidden="true" />
            <span>保存</span>
            <kbd className="hidden font-mono text-xs text-muted-foreground xl:inline">⌘S</kbd>
          </Button>

          {!writerFocus && (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              pending={operation === 'preview'}
              aria-label="保存并外部预览"
              onClick={() => {
                void perform('preview')
              }}
              className="min-h-11 sm:min-h-9"
            >
              <ExternalLink aria-hidden="true" />
              <span className="hidden sm:inline">外部预览</span>
            </Button>
          )}

          <Button
            size="sm"
            disabled={busy}
            pending={operation === 'publish'}
            ref={publishButtonRef}
            onClick={() => setConfirmPublish(true)}
            className="min-h-11 sm:min-h-9"
          >
            {record?.published ? '发布更新' : '发布'}
          </Button>
        </div>
      </header>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/35 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {/* 主工作区：纸面正文（左/中）+ 可收放属性抽屉（右） */}
      <div className={`flex min-w-0 items-start gap-6 ${writerFocus ? 'mx-auto w-full max-w-6xl' : ''}`}>
        <div className="relative isolate min-w-0 flex-1 overflow-hidden rounded-xl p-5 sm:p-7">
          <PaperSurface />

          {/* 文章题头：分类 · 日期 · 可点击 slug · 实时阅读时长 */}
          <div className="mb-5 flex flex-col gap-3 border-b border-hair pb-5">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-xs text-muted-foreground">
              <span className="text-primary">{BLOG_CATEGORY_LABELS[doc.category]}</span>
              <span aria-hidden="true">·</span>
              <time dateTime={doc.date} className="tabular-nums">
                {formatDate(doc.date)}
              </time>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={(event) => openInspectorAndFocus('post-slug', event.currentTarget)}
                className={`cursor-pointer rounded-sm text-left underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring ${
                  slugMissing ? 'text-amber-700 dark:text-amber-400' : ''
                }`}
              >
                {input.slug ? `/blog/${input.slug}` : '设置文章地址…'}
              </button>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {wordStats.total} 字 · {readingTime}
              </span>
            </div>

            <label htmlFor="post-title" className="sr-only">
              标题
            </label>
            <textarea
              id="post-title"
              rows={1}
              maxLength={240}
              disabled={busy}
              value={doc.title}
              placeholder="输入文章标题"
              onChange={(event) => setDocument('title', event.target.value.replace(/[\r\n]+/g, ' '))}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                  event.preventDefault()
                  descriptionRef.current?.focus()
                }
              }}
              className="w-full resize-none [field-sizing:content] border-0 bg-transparent p-0 font-serif text-2xl leading-[1.28] font-medium tracking-tight text-foreground caret-primary selection:bg-primary/20 placeholder:text-muted-foreground focus:outline-none sm:text-3xl lg:text-4xl"
            />

            <label htmlFor="post-description" className="sr-only">
              描述
            </label>
            <textarea
              ref={descriptionRef}
              id="post-description"
              rows={1}
              maxLength={1000}
              disabled={busy}
              value={doc.description}
              placeholder="添加一句文章导语或摘要（可选）"
              onChange={(event) => setDocument('description', event.target.value)}
              className="w-full resize-none [field-sizing:content] border-0 bg-transparent p-0 text-sm leading-relaxed text-muted-foreground caret-primary selection:bg-primary/20 placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          {/* 视图模式与分栏控制 */}
          <Tabs value={mode} onValueChange={(value) => setMode(value as EditorMode)} className="min-w-0 gap-4">
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

              {mode === 'split' && (
                <div className="hidden items-center gap-2 font-mono text-xs lg:flex">
                  <div
                    className="inline-flex rounded-md border border-hair bg-muted/40 p-0.5"
                    role="group"
                    aria-label="分栏比例"
                  >
                    <button
                      type="button"
                      aria-pressed={splitRatio === 'equal'}
                      onClick={() => setSplitRatio('equal')}
                      className={`cursor-pointer rounded-sm px-2.5 py-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
                        splitRatio === 'equal'
                          ? 'bg-card text-foreground shadow-2xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      1:1
                    </button>
                    <button
                      type="button"
                      aria-pressed={splitRatio === 'editor-wide'}
                      onClick={() => setSplitRatio('editor-wide')}
                      className={`cursor-pointer rounded-sm px-2.5 py-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
                        splitRatio === 'editor-wide'
                          ? 'bg-card text-foreground shadow-2xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      3:2
                    </button>
                  </div>

                  <button
                    type="button"
                    aria-pressed={syncScroll}
                    onClick={() => setSyncScroll((current) => !current)}
                    className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
                      syncScroll
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : 'border-hair bg-background/60 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <ArrowUpDown className="size-3.5" aria-hidden="true" />
                    <span>同步滚动</span>
                  </button>
                </div>
              )}
            </div>

            <div
              id="post-editor-panel"
              role="tabpanel"
              aria-labelledby={`post-tab-${mode}`}
              className={`grid min-w-0 gap-4 ${
                mode === 'split' ? (splitRatio === 'editor-wide' ? 'lg:grid-cols-[3fr_2fr]' : 'lg:grid-cols-2') : ''
              }`}
            >
              <div className={mode === 'preview' ? 'hidden' : 'min-w-0'}>
                <MarkdownEditor
                  value={doc.content}
                  onChange={(value) => setDocument('content', value)}
                  disabled={busy}
                  scrollRef={editorScrollRef}
                  focusMode={writerFocus}
                />
              </div>
              {mode !== 'edit' && (
                <div className={mode === 'split' ? 'hidden min-w-0 lg:block' : 'min-w-0'}>
                  <LiveMdxPreview
                    source={doc.content}
                    title={doc.title}
                    description={doc.description}
                    category={doc.category}
                    date={doc.date}
                    updatedDate={doc.updatedDate}
                    tags={doc.tags}
                    heroImage={doc.heroImage}
                    heroColor={doc.heroColor}
                    aiGenerated={doc.aiGenerated}
                    scrollRef={previewScrollRef}
                    focusMode={writerFocus}
                    onRendered={handlePreviewRendered}
                  />
                </div>
              )}
            </div>
          </Tabs>
        </div>

        {/* 宽屏右侧内嵌属性栏 */}
        {isXl && !writerFocus && desktopInspectorOpen && (
          <aside
            aria-label="文章属性面板"
            className="hidden xl:sticky xl:top-[8.75rem] xl:block xl:max-h-[calc(100dvh-10rem)] xl:w-[340px] xl:shrink-0 xl:overflow-y-auto"
          >
            {propertiesPanel}
          </aside>
        )}
      </div>

      {/* 窄屏属性检查器抽屉（Portal 挂载于 body 顶层，z-75 高于页头 z-70 且低于弹层 z-80，带焦点捕获） */}
      {sheetMotion.present &&
        createPortal(
          <div className="xl:hidden" aria-hidden={!showSheet} inert={!showSheet}>
            <div
              ref={sheetMotion.backdropRef}
              aria-hidden="true"
              onClick={closeSheet}
              className="fixed inset-0 z-[74] bg-black/45 backdrop-blur-[1px]"
            />
            <div ref={sheetMotion.anchorRef} className="fixed inset-y-0 right-0 z-[75] w-[min(100vw,22rem)]">
              <div
                ref={(node) => {
                  sheetDialogRef.current = node
                  sheetMotion.surfaceRef.current = node
                }}
                role="dialog"
                aria-modal={showSheet ? true : undefined}
                aria-label="文章属性"
                className="absolute inset-0 origin-top-left overflow-y-auto border-l border-hair bg-background/96 p-4 shadow-xl backdrop-blur-md"
              >
                <div ref={sheetMotion.contentRef}>{propertiesPanel}</div>
              </div>
            </div>
          </div>,
          document.body,
        )}

      <PostGenerateDialog
        open={generateOpen}
        hasExistingContent={Boolean(record) || dirty}
        returnFocusRef={generateButtonRef}
        onGenerate={generateDraft}
        onClose={() => setGenerateOpen(false)}
      />
      {pendingNavigation && (
        <PostConfirmDialog
          open={leaveOpen}
          returnFocusRef={leaveTriggerRef}
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
        returnFocusRef={publishButtonRef}
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
