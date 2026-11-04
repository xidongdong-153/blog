import { z } from 'zod'
import { REGISTERED_SERIES } from './series'

export const MAX_POST_BYTES = 1024 * 1024
export const MAX_IMPORT_POSTS = 100
export const MAX_IMPORT_BYTES = 20 * 1024 * 1024

export function isContentUrl(value: string): boolean {
  if (!value) return true
  if ([...value].some((char) => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127 || char === '\\')) return false
  if (value.startsWith('/') && !value.startsWith('//')) return true
  if (value.startsWith('#')) return true
  try {
    const url = new URL(value)
    return ['https:', 'http:', 'mailto:'].includes(url.protocol) && !url.username && !url.password
  } catch {
    return false
  }
}

export function isMediaUrl(value: string): boolean {
  return isContentUrl(value) && (!value || value.startsWith('/') || /^https?:/.test(value))
}

const dateSchema = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}, '请输入有效日期')

export const postSlugSchema = z
  .string()
  .min(1, '请输入文章地址')
  .max(128)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, '文章地址仅支持小写字母、数字和连字符')

export const postDocumentSchema = z
  .object({
    title: z.string().max(240).default(''),
    description: z.string().max(1000).default(''),
    content: z
      .string()
      .refine((value) => new TextEncoder().encode(value).length <= MAX_POST_BYTES, '正文不能超过 1 MiB')
      .default(''),
    category: z.enum(['tech', 'tinkering', 'thoughts']).default('tech'),
    date: dateSchema,
    updatedDate: z.union([dateSchema, z.literal('')]).default(''),
    heroImage: z.string().max(2048).refine(isMediaUrl, '请输入有效的图片 URL 或公共资源路径').default(''),
    heroColor: z
      .string()
      .regex(/^(?:#[0-9a-f]{3}|#[0-9a-f]{6})?$/i, '主题色使用十六进制颜色')
      .default(''),
    tags: z
      .array(z.string().trim().min(1).max(60))
      .max(30)
      .transform((tags) => [...new Set(tags)])
      .default([]),
    aiGenerated: z.boolean().default(false),
    disableAiSummary: z.boolean().default(false),
    series: z
      .object({
        id: z.string().refine((id) => Boolean(REGISTERED_SERIES[id]), '请选择已注册专栏'),
        order: z.number().int().positive().max(100000),
        group: z.string().max(120).optional(),
      })
      .optional(),
  })
  .strict()

export const postInputSchema = z
  .object({
    slug: postSlugSchema,
    document: postDocumentSchema,
  })
  .strict()

export type PostDocument = z.infer<typeof postDocumentSchema>
export type PostInput = z.infer<typeof postInputSchema>
export type PostExportVersion = 'draft' | 'published'

export interface ManagedPost extends PostInput {
  id: string
  revision: number
  publishedRevision: number | null
  published: PostDocument | null
  slugLocked: boolean
  hasUnpublishedChanges: boolean
  createdAt: string
  updatedAt: string
}

export interface ManagedPostList {
  posts: ManagedPost[]
  total: number
  page: number
  totalPages: number
}

export function createEmptyPost(): PostInput {
  return {
    slug: '',
    document: postDocumentSchema.parse({ date: new Date().toISOString().slice(0, 10) }),
  }
}
