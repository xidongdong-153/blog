'use client'

import type { ImportCandidate } from '@/server/modules/posts/posts-transfer'
import { ArrowLeft, FileCheck2, Upload } from 'lucide-react'
import Link from 'next/link'
import { useRef, useState } from 'react'
import { MAX_IMPORT_BYTES } from '@/lib/posts'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { postRequest } from './post-api'

/** 导入前显示逐篇校验结果，确认后仅创建草稿。 */
export function PostImport() {
  const [file, setFile] = useState<File | null>(null)
  const [candidates, setCandidates] = useState<ImportCandidate[]>([])
  const [operation, setOperation] = useState<'preflight' | 'import' | null>(null)
  const busy = operation !== null
  const fileInput = useRef<HTMLInputElement>(null)
  const busyRef = useRef(false)
  const [error, setError] = useState('')
  const [imported, setImported] = useState<number | null>(null)
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
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/admin/posts" aria-label="返回文章列表">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="text-2xl font-medium">导入文章</h1>
      </header>
      <div className="flex flex-col gap-4 border-y border-border py-6">
        <div className="flex flex-col gap-3 text-sm">
          <label htmlFor="post-import-file">文章文件</label>
          <Input
            ref={fileInput}
            id="post-import-file"
            type="file"
            accept=".md,.mdx,.zip"
            disabled={busy}
            className="hidden"
            aria-describedby="post-import-hint"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null)
              setCandidates([])
              setError('')
              setImported(null)
            }}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              disabled={busy}
              aria-controls="post-import-file"
              onClick={() => fileInput.current?.click()}
            >
              <Upload />
              选择文件
            </Button>
            {file && <span className="min-w-0 break-all text-muted-foreground">{file.name}</span>}
          </div>
        </div>
        <p id="post-import-hint" className="text-sm text-muted-foreground">
          支持带 YAML frontmatter 的 Markdown、MDX，或最多 100 篇的 ZIP。文件不超过 20
          MiB，不包含图片附件；导入后为草稿。
        </p>
        <Button
          variant="outline"
          className="w-fit"
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
      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
      {imported !== null && (
        <p role="status" className="text-sm">
          已导入 {imported} 篇草稿。
          <Link href="/admin/posts?status=draft" className="ml-3 text-primary underline underline-offset-4">
            查看草稿
          </Link>
        </p>
      )}
      {candidates.length > 0 && (
        <>
          <h2 className="text-base font-medium">校验结果 · {candidates.length} 篇</h2>
          <ul className="divide-y divide-border">
            {candidates.map((candidate, index) => (
              <li key={candidate.filename} className="flex flex-col gap-3 py-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="break-words font-medium">
                    {candidate.input?.document.title || candidate.filename}
                  </span>
                  <span className="break-all text-xs text-muted-foreground">{candidate.filename}</span>
                </div>
                {candidate.input && (
                  <label htmlFor={`import-slug-${index}`} className="flex max-w-md flex-col gap-2 text-sm">
                    文章地址
                    <Input
                      id={`import-slug-${index}`}
                      value={candidate.input.slug}
                      maxLength={128}
                      disabled={busy}
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
                  <p key={message} className="text-sm text-red-700 dark:text-red-400">
                    {message}
                  </p>
                ))}
                {candidate.input && duplicates.has(candidate.input.slug) && (
                  <p className="text-sm text-red-700 dark:text-red-400">导入包中有重复文章地址</p>
                )}
                {candidate.warnings.map((message) => (
                  <p key={message} className="text-sm text-amber-800 dark:text-amber-400">
                    {message}
                  </p>
                ))}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-4">
            <Button
              disabled={busy || blocked}
              pending={operation === 'import'}
              onClick={() => {
                void confirmImport()
              }}
            >
              导入为草稿
            </Button>
            {blocked && <p className="text-sm text-muted-foreground">修正错误后再导入。</p>}
          </div>
        </>
      )}
    </div>
  )
}
