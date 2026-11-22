'use client'

/* eslint-disable next/no-img-element */
import type { PostDocument } from '@/lib/posts'
import { PanelRightClose, X } from 'lucide-react'
import { useState } from 'react'
import { BLOG_CATEGORY_LABELS } from '@/lib/blog-meta'
import { isMediaUrl } from '@/lib/posts'
import { sanitizeCssColor } from '@/lib/utils'
import { PaperSurface } from '../../site/paper-surface'
import { Button } from '../ui/button'
import { DatePicker } from '../ui/date-picker'
import { Input } from '../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Switch } from '../ui/switch'

const HERO_COLOR_PRESETS = [
  { label: '默认松烟', value: '' },
  { label: '松烟墨青', value: '#2d6a5c' },
  { label: '远山青', value: '#659eb9' },
  { label: '暖赭石', value: '#b8764b' },
  { label: '秋香茶', value: '#8b7d4b' },
  { label: '暮云紫', value: '#7b6d8d' },
]

function expandHexColor(value: string | null): string {
  if (!value) return '#2d6a5c'
  if (/^#[0-9a-f]{6}$/i.test(value)) return value
  if (/^#[0-9a-f]{3}$/i.test(value)) {
    const [, r, g, b] = value
    return `#${r}${r}${g}${g}${b}${b}`
  }
  return '#2d6a5c'
}

/** 文章属性侧边检查器，分四组收纳地址、归类、日期、视觉与 AI 选项。 */
export function PostPropertiesPanel({
  slug,
  slugLocked,
  document: doc,
  tagsText,
  busy,
  onSlugChange,
  onDocumentChange,
  onTagsTextChange,
  onClose,
}: {
  slug: string
  slugLocked: boolean
  document: PostDocument
  tagsText: string
  busy: boolean
  onSlugChange: (value: string) => void
  onDocumentChange: <K extends keyof PostDocument>(field: K, value: PostDocument[K]) => void
  onTagsTextChange: (value: string) => void
  onClose: () => void
}) {
  const [failedThumb, setFailedThumb] = useState('')
  const trimmedCover = doc.heroImage.trim()
  const canShowCover = Boolean(trimmedCover && isMediaUrl(trimmedCover) && failedThumb !== trimmedCover)
  const safeHex = sanitizeCssColor(doc.heroColor)
  const pickerHex = expandHexColor(safeHex)

  return (
    <div className="relative isolate flex flex-col overflow-hidden rounded-xl p-5">
      <PaperSurface />
      <div className="mb-4 flex items-center justify-between gap-2 border-b border-hair pb-3">
        <span className="font-mono text-xs font-medium tracking-wider text-foreground">文章属性</span>
        <Button variant="ghost" size="icon" aria-label="收起文章属性" onClick={onClose} className="sm:size-9">
          <PanelRightClose className="hidden xl:block" aria-hidden="true" />
          <X className="xl:hidden" aria-hidden="true" />
        </Button>
      </div>

      <fieldset disabled={busy} className="flex min-w-0 flex-col gap-5">
        {/* 1. 标识与归类 */}
        <div className="flex flex-col gap-3.5">
          <label htmlFor="post-slug" className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-foreground">
            文章地址
            <Input
              id="post-slug"
              value={slug}
              maxLength={128}
              required
              disabled={slugLocked || busy}
              onChange={(event) => onSlugChange(event.target.value)}
              placeholder="my-first-post"
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              aria-describedby="post-slug-hint"
              className="font-mono text-xs"
            />
            <span id="post-slug-hint" className="font-mono text-xs font-normal break-all text-muted-foreground">
              /blog/{slug || '…'} · {slugLocked ? '发布后地址固定' : '小写字母、数字和连字符'}
            </span>
          </label>

          <div className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-foreground">
            <label htmlFor="post-category">分类</label>
            <Select
              value={doc.category}
              disabled={busy}
              onValueChange={(value) => onDocumentChange('category', value as PostDocument['category'])}
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

          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor="post-tags" className="text-xs font-medium text-foreground">
              标签
            </label>
            <Input
              id="post-tags"
              value={tagsText}
              maxLength={1800}
              onChange={(event) => {
                onTagsTextChange(event.target.value)
                onDocumentChange(
                  'tags',
                  event.target.value
                    .split(/[,，]/)
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                )
              }}
              placeholder="TypeScript, Next.js"
            />
            {doc.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {doc.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md border border-hair bg-background/70 px-1.5 py-0.5 font-mono text-xs text-muted-foreground"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 2. 发布时间 */}
        <div className="flex flex-col gap-3.5 border-t border-hair pt-4">
          <div className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-foreground">
            <label htmlFor="post-date">文章日期</label>
            <DatePicker
              id="post-date"
              value={doc.date}
              required
              disabled={busy}
              onValueChange={(value) => onDocumentChange('date', value)}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-foreground">
            <label htmlFor="post-updated-date">内容更新日期</label>
            <DatePicker
              id="post-updated-date"
              value={doc.updatedDate}
              disabled={busy}
              onValueChange={(value) => onDocumentChange('updatedDate', value)}
            />
          </div>
        </div>

        {/* 3. 视觉与封面 */}
        <div className="flex flex-col gap-3.5 border-t border-hair pt-4">
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor="post-cover" className="text-xs font-medium text-foreground">
              封面 URL
            </label>
            <Input
              id="post-cover"
              value={doc.heroImage}
              maxLength={2048}
              onChange={(event) => onDocumentChange('heroImage', event.target.value)}
              placeholder="https:// 或 /images/…"
              className="font-mono text-xs"
            />
            {trimmedCover && (
              <div className="mt-1 overflow-hidden rounded-lg border border-hair bg-muted/30">
                {canShowCover ? (
                  <img
                    src={trimmedCover}
                    alt="封面预览"
                    className="aspect-video w-full object-cover"
                    onError={() => setFailedThumb(trimmedCover)}
                  />
                ) : (
                  <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-muted-foreground">
                    <span>封面图片暂不可加载，请检查路径</span>
                    {isMediaUrl(trimmedCover) && (
                      <button
                        type="button"
                        onClick={() => setFailedThumb('')}
                        className="cursor-pointer font-mono text-primary underline-offset-4 hover:underline"
                      >
                        重试
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor="post-color" className="text-xs font-medium text-foreground">
              主题色
            </label>
            <div className="flex items-center gap-2">
              <label className="relative flex size-11 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-hair bg-muted/45">
                <span className="sr-only">拾取主题色</span>
                <input
                  type="color"
                  value={pickerHex}
                  disabled={busy}
                  onChange={(event) => onDocumentChange('heroColor', event.target.value)}
                  className="absolute inset-0 size-full cursor-pointer opacity-0"
                />
                <span className="size-5 rounded-sm border border-hair" style={{ backgroundColor: pickerHex }} />
              </label>
              <Input
                id="post-color"
                value={doc.heroColor}
                maxLength={7}
                onChange={(event) => onDocumentChange('heroColor', event.target.value)}
                placeholder="#6fa996"
                className="font-mono text-xs"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="预设主题色">
              {HERO_COLOR_PRESETS.map((preset) => {
                const selected = doc.heroColor.toLowerCase() === preset.value.toLowerCase()
                return (
                  <button
                    key={preset.label}
                    type="button"
                    disabled={busy}
                    title={preset.label}
                    aria-label={preset.label}
                    aria-pressed={selected}
                    onClick={() => onDocumentChange('heroColor', preset.value)}
                    className={`inline-flex h-7 cursor-pointer items-center gap-1 rounded-md border px-2 font-mono text-xs transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
                      selected
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-hair bg-background/60 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {preset.value && (
                      <span
                        aria-hidden="true"
                        className="size-2.5 rounded-full border border-hair"
                        style={{ backgroundColor: preset.value }}
                      />
                    )}
                    <span>{preset.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* 4. AI 选项 */}
        <div className="flex flex-col gap-3 border-t border-hair pt-4">
          <div className="flex flex-col divide-y divide-hair pt-1">
            <label
              htmlFor="post-ai-generated"
              className="flex min-h-11 cursor-pointer items-center justify-between gap-4 text-xs text-foreground"
            >
              <span>AI 生成</span>
              <Switch
                id="post-ai-generated"
                disabled={busy}
                checked={doc.aiGenerated}
                onCheckedChange={(checked) => onDocumentChange('aiGenerated', checked)}
              />
            </label>
            <label
              htmlFor="post-disable-summary"
              className="flex min-h-11 cursor-pointer items-center justify-between gap-4 text-xs text-foreground"
            >
              <span>关闭 AI 摘要</span>
              <Switch
                id="post-disable-summary"
                disabled={busy}
                checked={doc.disableAiSummary}
                onCheckedChange={(checked) => onDocumentChange('disableAiSummary', checked)}
              />
            </label>
          </div>
        </div>
      </fieldset>
    </div>
  )
}
