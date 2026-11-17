'use client'

import type { ImportCandidate } from '@/server/modules/posts/posts-transfer'
import { ArrowLeft, FileCheck2, FileUp, Upload } from 'lucide-react'
import Link from 'next/link'
import { useRef, useState } from 'react'
import { MAX_IMPORT_BYTES } from '@/lib/posts'
import { PaperSurface } from '../../site/paper-surface'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { postRequest } from './post-api'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

/** 导入前显示逐篇校验结果，支持拖拽选文件，确认后仅创建草稿。 */
export function PostImport() {
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [candidates, setCandidates] = useState<ImportCandidate[]>([])
  const [operation, setOperation] = useState<'preflight' | 'import' | null>(null)
  const busy = operation !== null
  const fileInput = useRef<HTMLInputElement>(null)
  const busyRef = useRef(false)
  const [error, setError] = useState('')
  const [imported, setImported] = useState<number | null>(null)

  function pickFile(next: File | null) {
    setFile(next)
    setCandidates([])
    setError('')
    setImported(null)
  }

  async function preflight() {
    if (!file || busyRef.current) return
    busyRef.current = true
    setError('')
    setOperation('preflight')
    setCandidates([])
    setImported(null)
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new Error('文件不能超过 20 MiB')
      const form = new FormData()
      form.set('file', file)
      const response = await fetch('/api/admin/posts/import/preview', { method: 'POST', body: form, cache: 'no-store' })
      const result = (await response.json()) as { success: boolean; data?: ImportCandidate[]; error?: string }
      if (!response.ok || !result.success || !result.data) throw new Error(result.error || '校验失败')
      setCandidates(result.data)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '文件校验失败')
    } finally {
      busyRef.current = false
      setOperation(null)
    }
  }

  async function confirmImport() {
    if (busyRef.current) return
    busyRef.current = true
    setError('')
    setOperation('import')
    try {
      const result = await postRequest<{ imported: number }>('/import', 'POST', {
        posts: candidates.map((candidate) => candidate.input),
      })
      setImported(result.imported)
      setCandidates([])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '导入失败')
    } finally {
      busyRef.current = false
      setOperation(null)
    }
  }

  const slugs = candidates.flatMap((candidate) => (candidate.input ? [candidate.input.slug] : []))
  const duplicates = new Set(slugs.filter((slug, index) => slugs.indexOf(slug) !== index))
  const blocked = candidates.some(
    (candidate) =>
      candidate.errors.length || !candidate.input || !candidate.input.slug || duplicates.has(candidate.input.slug),
  )

  return (
    <div className="flex w-full max-w-4xl flex-col gap-6 pb-8">
      <header className="flex items-start gap-4 border-b border-hair pb-6">
        <Button asChild variant="outline" size="icon" className="mt-1 shrink-0">
          <Link href="/admin/posts" aria-label="返回文章列表">
            <ArrowLeft />
          </Link>
        </Button>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 font-mono text-xs tracking-[0.22em] text-muted-foreground uppercase">
            <span>// ADMIN</span>
            <span aria-hidden="true">·</span>
            <span className="font-medium text-primary">导入</span>
          </div>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground">导入文章</h1>
        </div>
      </header>

      <div
        onDragOver={(event) => {
          event.preventDefault()
          if (!busy) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          if (busy) return
          const dropped = event.dataTransfer.files?.[0]
          if (dropped) pickFile(dropped)
        }}
        className="relative isolate flex flex-col gap-4 overflow-hidden rounded-xl p-6 transition-colors"
      >
        <PaperSurface className={dragging ? 'border-primary/60 bg-primary/5' : ''} />
        <Input
          ref={fileInput}
          id="post-import-file"
          type="file"
          accept=".md,.mdx,.zip"
          disabled={busy}
          className="hidden"
          aria-describedby="post-import-hint"
          onChange={(event) => pickFile(event.target.files?.[0] ?? null)}
        />

        <div className="flex flex-col items-start gap-4 rounded-lg border border-dashed border-hair bg-background/50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-hair bg-card text-primary">
              <FileUp className="size-4.5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <label htmlFor="post-import-file" className="block text-sm font-medium text-foreground">
                {file ? file.name : '拖拽或选择 Markdown / MDX / ZIP 文件'}
              </label>
              <p id="post-import-hint" className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {file
                  ? `文件大小 ${formatFileSize(file.size)} · 导入后仅生成草稿`
                  : '支持带 YAML frontmatter 的 .md / .mdx，或最多 100 篇的 .zip（不超过 20 MiB）。'}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              variant="outline"
              disabled={busy}
              aria-controls="post-import-file"
              onClick={() => fileInput.current?.click()}
            >
              <Upload />
              选择文件
            </Button>
            <Button
              disabled={!file || busy}
              pending={operation === 'preflight'}
              onClick={() => {
                void preflight()
              }}
            >
              <FileCheck2 />
              校验文件
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/35 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {imported !== null && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-700/30 bg-emerald-700/5 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-400/30 dark:text-emerald-400"
        >
          <span>已成功导入 {imported} 篇草稿。</span>
          <Link href="/admin/posts?status=draft" className="font-mono text-xs underline underline-offset-4">
            查看草稿 →
          </Link>
        </div>
      )}

      {candidates.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-serif text-xl font-medium">校验结果 · {candidates.length} 篇</h2>
            <div className="flex items-center gap-3">
              {blocked && <span className="text-xs text-muted-foreground">请修正错误后导入</span>}
              <Button
                disabled={busy || blocked}
                pending={operation === 'import'}
                onClick={() => {
                  void confirmImport()
                }}
              >
                导入为草稿
              </Button>
            </div>
          </div>

          <div className="relative isolate overflow-hidden rounded-xl px-5">
            <PaperSurface />
            <ul className="divide-y divide-hair">
              {candidates.map((candidate, index) => (
                <li key={candidate.filename} className="flex flex-col gap-3 py-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-serif text-base font-medium break-words">
                      {candidate.input?.document.title || candidate.filename}
                    </span>
                    <span className="font-mono text-xs break-all text-muted-foreground">{candidate.filename}</span>
                  </div>
                  {candidate.input && (
                    <label
                      htmlFor={`import-slug-${index}`}
                      className="flex max-w-md flex-col gap-1.5 text-xs font-medium"
                    >
                      文章地址
                      <Input
                        id={`import-slug-${index}`}
                        value={candidate.input.slug}
                        maxLength={128}
                        disabled={busy}
                        className="font-mono text-xs"
                        onChange={(event) =>
                          setCandidates((current) =>
                            current.map((item, at) =>
                              at === index && item.input
                                ? {
                                    ...item,
                                    input: { ...item.input, slug: event.target.value },
                                    errors: item.errors.filter((message) => !message.startsWith('文章地址重复')),
                                  }
                                : item,
                            ),
                          )
                        }
                      />
                    </label>
                  )}
                  {candidate.errors.map((message) => (
                    <p key={message} className="text-sm text-destructive">
                      {message}
                    </p>
                  ))}
                  {candidate.input && duplicates.has(candidate.input.slug) && (
                    <p className="text-sm text-destructive">导入包中有重复文章地址</p>
                  )}
                  {candidate.warnings.map((message) => (
                    <p key={message} className="text-sm text-amber-700 dark:text-amber-400">
                      {message}
                    </p>
                  ))}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  )
}
