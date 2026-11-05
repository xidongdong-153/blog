import { z } from 'zod'
import { MAX_POST_BYTES, postDocumentSchema, postSlugSchema } from './posts'

export const MAX_DRAFT_OVERVIEW_LENGTH = 4000

export const postDraftRequestSchema = z
  .object({
    overview: z.string().trim().min(1, '请输入内容概述').max(MAX_DRAFT_OVERVIEW_LENGTH, '内容概述不能超过 4000 字'),
  })
  .strict()

export const generatedPostDraftSchema = z
  .object({
    slug: postSlugSchema.describe('英文小写字母、数字和单连字符组成的文章地址'),
    title: postDocumentSchema.shape.title.removeDefault().trim().min(1, '生成的标题不能为空').describe('文章标题'),
    description: postDocumentSchema.shape.description
      .removeDefault()
      .trim()
      .min(1, '生成的简介不能为空')
      .describe('概括文章核心内容的简短介绍'),
    category: postDocumentSchema.shape.category.removeDefault().describe('tech 技术 / tinkering 折腾 / thoughts 随想'),
    tags: postDocumentSchema.shape.tags.removeDefault().describe('与正文相关的标签，建议 2 至 5 个'),
    content: postDocumentSchema.shape.content
      .removeDefault()
      .innerType()
      .min(1, '生成的正文不能为空')
      .max(MAX_POST_BYTES)
      .refine((value) => value.trim().length > 0, '生成的正文不能为空')
      .refine((value) => new TextEncoder().encode(value).length <= MAX_POST_BYTES, '正文不能超过 1 MiB')
      .describe('完整的 Markdown 正文，无 frontmatter 或顶层标题；代码使用标注语言的代码围栏'),
    heroColor: postDocumentSchema.shape.heroColor.removeDefault().describe('文章主题色，空字符串或十六进制颜色'),
  })
  .strict()

export type GeneratedPostDraft = z.infer<typeof generatedPostDraftSchema>
