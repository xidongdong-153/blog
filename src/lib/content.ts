import type { BlogCategory } from './blog-meta'
import type { SeriesDefinition, SeriesStatus } from './series'
import fs from 'node:fs'
import path from 'node:path'
import GithubSlugger from 'github-slugger'
import matter from 'gray-matter'
import { BLOG_CATEGORIES, BLOG_CATEGORY_LABELS } from './blog-meta'
import { REGISTERED_SERIES, SERIES_STATUS_LABELS } from './series'

export type BlogSortOrder = 'newest' | 'oldest' | 'updated'

export const BLOG_SORT_LABELS: Record<BlogSortOrder, string> = {
  newest: '最新',
  oldest: '最早',
  updated: '最近更新',
}

/**
 * 专栏归属声明，将文章与特定系列和排序绑定。
 */
export interface BlogPostSeriesRef {
  /** 所属专栏唯一标识（对应 REGISTERED_SERIES 中的 key） */
  id: string
  /** 在专栏中的排序编号（从 1 开始升序） */
  order: number
  /** 所属大章节分类（如 '核心架构'、'桌面端开发'） */
  group?: string
}

/**
 * 博客文章。对应 content/blog/<文件夹>/post.mdx，slug 取文件夹名。
 * date 存 ISO 字符串而不是 Date，避免跨 server/client 边界序列化问题。
 */
export interface BlogPost {
  slug: string
  /** 评论关联键，未配置时默认使用 slug；文章改名时保留旧 commentKey 可承接历史评论 */
  commentKey?: string
  title: string
  description: string
  category: BlogCategory
  /** ISO 日期字符串，如 2026-06-15 */
  date: string
  /** 更新日期，ISO 字符串。有值时详情页会显示"更新于 ..." */
  updatedDate: string
  /** Hero 图路径，相对于 public/。如 /images/blog/hero.jpg */
  heroImage: string
  /** 文章专属氛围高光色，如 "#659EB9" 或 "hsl(195 85% 65%)" */
  heroColor?: string
  tags: string[]
  /** 专栏归属信息，未配置时为 undefined */
  series?: BlogPostSeriesRef
  /** true 时列表页不显示 */
  draft: boolean
  /** 严格为 true 时不生成也不展示 AI 摘要 */
  disableAiSummary: boolean
  /** MDX 原文，不含 frontmatter */
  content: string
}

export type NoteStatus = 'in-progress' | 'incomplete' | 'ready' | 'archived'

/** 短笔记。对应 content/notes/<文件>.md，slug 取文件名。 */
export interface Note {
  slug: string
  title: string
  description: string
  date: string
  status: NoteStatus
  tags: string[]
  draft: boolean
  content: string
}

export const NOTE_STATUS_LABELS: Record<NoteStatus, string> = {
  'in-progress': '进行中',
  incomplete: '待补充',
  ready: '已整理',
  archived: '已归档',
}

const CONTENT_DIR = path.join(process.cwd(), 'content')

function readMdxFile(filePath: string): matter.GrayMatterFile<string> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`内容文件不存在: ${filePath}`)
  }
  return matter.read(filePath)
}

function requireString(data: Record<string, unknown>, field: string, filePath: string): string {
  const value = data[field]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${filePath} 的 frontmatter 缺少必填字段 ${field}`)
  }
  return value
}

function requireCategory(data: Record<string, unknown>, filePath: string): BlogCategory {
  const value = data.category
  if (value === 'tech' || value === 'tinkering' || value === 'thoughts') {
    return value
  }
  throw new Error(
    `${filePath} 的 frontmatter 缺少必填字段 category 或值非法，必须是 tech / tinkering / thoughts 之一，当前值为: ${String(value)}`,
  )
}

/**
 * YAML 里裸写的日期（如 date: 2026-06-15）会被 gray-matter 解析成 Date 对象，
 * 加引号时是字符串。两种写法都接受，统一转成 ISO 日期字符串。
 */
function readDate(data: Record<string, unknown>, filePath: string): string {
  const value = data.date
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return value.trim()
  }
  throw new Error(`${filePath} 的 frontmatter 缺少必填字段 date`)
}

function readTags(data: Record<string, unknown>): string[] {
  if (Array.isArray(data.tags)) {
    return data.tags.filter((tag): tag is string => typeof tag === 'string')
  }
  return []
}

/** 读取可选的日期字段，没写或格式不对就返回空字符串。 */
function readOptionalDate(data: Record<string, unknown>, field: string): string {
  const value = data[field]
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return value.trim()
  }
  return ''
}

/** 读取可选的专栏关联信息。 */
function readSeries(data: Record<string, unknown>, filePath: string): BlogPostSeriesRef | undefined {
  const seriesData = data.series
  if (!seriesData || typeof seriesData !== 'object') {
    return undefined
  }
  const rawId = (seriesData as Record<string, unknown>).id
  const rawOrder = (seriesData as Record<string, unknown>).order
  const rawGroup = (seriesData as Record<string, unknown>).group

  if (typeof rawId !== 'string' || !rawId.trim()) {
    return undefined
  }
  const orderNum = typeof rawOrder === 'number' ? rawOrder : parseInt(String(rawOrder), 10)
  if (Number.isNaN(orderNum)) {
    return undefined
  }

  const seriesId = rawId.trim()
  if (!REGISTERED_SERIES[seriesId]) {
    console.warn(`[content] ${filePath} 引用的专栏 id "${seriesId}" 未在 REGISTERED_SERIES 中注册`)
  }

  const group = typeof rawGroup === 'string' && rawGroup.trim() ? rawGroup.trim() : undefined

  return {
    id: seriesId,
    order: orderNum,
    group,
  }
}

/** 读取全部博客文章，按日期倒序；draft 的文章不出现在列表，但仍可直接访问。 */
export function getAllBlogPosts(): BlogPost[] {
  const blogDir = path.join(CONTENT_DIR, 'blog')
  if (!fs.existsSync(blogDir)) {
    return []
  }

  const posts: BlogPost[] = []
  for (const entry of fs.readdirSync(blogDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const filePath = path.join(blogDir, entry.name, 'post.mdx')
    if (!fs.existsSync(filePath)) continue

    const { data, content } = readMdxFile(filePath)
    posts.push({
      slug: entry.name,
      commentKey:
        typeof data.commentKey === 'string' && data.commentKey.trim() !== '' ? data.commentKey.trim() : undefined,
      title: requireString(data, 'title', filePath),
      description: typeof data.description === 'string' ? data.description : '',
      category: requireCategory(data, filePath),
      date: readDate(data, filePath),
      updatedDate: readOptionalDate(data, 'updatedDate'),
      heroImage: typeof data.heroImage === 'string' ? data.heroImage : '',
      heroColor: typeof data.heroColor === 'string' && data.heroColor.trim() !== '' ? data.heroColor.trim() : undefined,
      tags: readTags(data),
      series: readSeries(data, filePath),
      draft: data.draft === true,
      disableAiSummary: data.disableAiSummary === true,
      content,
    })
  }

  return posts.sort((a, b) => b.date.localeCompare(a.date))
}

/** 获取文章实际的评论关联标识（有 commentKey 则取 commentKey，否则取 slug）。 */
export function resolvePostCommentKey(post: BlogPost): string {
  return post.commentKey || post.slug
}

/** 读取全部笔记，按日期倒序。 */
export function getAllNotes(): Note[] {
  const notesDir = path.join(CONTENT_DIR, 'notes')
  if (!fs.existsSync(notesDir)) {
    return []
  }

  const notes: Note[] = []
  for (const entry of fs.readdirSync(notesDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue

    const filePath = path.join(notesDir, entry.name)
    const { data, content } = readMdxFile(filePath)
    const status = data.status
    if (status !== 'in-progress' && status !== 'incomplete' && status !== 'ready' && status !== 'archived') {
      throw new Error(`${filePath} 的 status 必须是 in-progress / incomplete / ready / archived 之一`)
    }

    notes.push({
      slug: entry.name.replace(/\.md$/, ''),
      title: requireString(data, 'title', filePath),
      description: typeof data.description === 'string' ? data.description : '',
      date: readDate(data, filePath),
      status,
      tags: readTags(data),
      draft: data.draft === true,
      content,
    })
  }

  return notes.sort((a, b) => b.date.localeCompare(a.date))
}

export function getBlogPost(slug: string): BlogPost | undefined {
  return getAllBlogPosts().find((post) => post.slug === slug)
}

export function getNote(slug: string): Note | undefined {
  return getAllNotes().find((note) => note.slug === slug)
}

/** 全部标签和出现次数，按数量倒序。 */
export function getAllBlogTags(): Array<{ tag: string; count: number }> {
  const counter = new Map<string, number>()
  for (const post of getAllBlogPosts()) {
    if (post.draft) continue
    for (const tag of post.tags) {
      counter.set(tag, (counter.get(tag) ?? 0) + 1)
    }
  }
  return [...counter.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}

/** 各分类已发布文章数量统计，按固定预设顺序返回。 */
export function getBlogCategoriesWithCount(): Array<{ category: BlogCategory; label: string; count: number }> {
  const counter = new Map<BlogCategory, number>()
  for (const post of getAllBlogPosts()) {
    if (post.draft) continue
    counter.set(post.category, (counter.get(post.category) ?? 0) + 1)
  }
  return BLOG_CATEGORIES.map((category) => ({
    category,
    label: BLOG_CATEGORY_LABELS[category],
    count: counter.get(category) ?? 0,
  }))
}

/** 按指定模式对文章排序。支持最新（发布倒序）、最早（发布正序）、最近更新（更新时间倒序）。 */
export function sortBlogPosts(posts: BlogPost[], sort: BlogSortOrder = 'newest'): BlogPost[] {
  const cloned = [...posts]
  if (sort === 'oldest') {
    return cloned.sort((a, b) => a.date.localeCompare(b.date))
  }
  if (sort === 'updated') {
    return cloned.sort((a, b) => {
      const dateA = a.updatedDate || a.date
      const dateB = b.updatedDate || b.date
      return dateB.localeCompare(dateA) || b.date.localeCompare(a.date)
    })
  }
  return cloned.sort((a, b) => b.date.localeCompare(a.date))
}

export interface Heading {
  depth: 2 | 3
  text: string
  /** 锚点 id，使用 github-slugger 生成，与 rehype-slug 保持严格一致 */
  id: string
}

/**
 * 从 MDX 原文提取 h2/h3 生成目录数据。
 * 只认行首的 ## 和 ###，代码块里的井号不会误判（代码块里的标题本来也不该进目录）。
 */
export function extractHeadings(content: string): Heading[] {
  const headings: Heading[] = []
  const slugger = new GithubSlugger()
  let inCodeBlock = false

  for (const line of content.split('\n')) {
    if (line.trimStart().startsWith('```')) {
      inCodeBlock = !inCodeBlock
      continue
    }
    if (inCodeBlock) continue

    const match = /^(##|###)\s+(\S.*)$/.exec(line)
    if (!match) continue

    const text = match[2].trim()
    headings.push({
      depth: match[1].length as 2 | 3,
      text,
      id: slugger.slug(text),
    })
  }

  return headings
}

/**
 * 获取所有已注册专栏的概要信息，包含各专栏已发布文章数与最近更新时间。
 */
export function getAllSeries(): Array<SeriesDefinition & { postsCount: number; lastUpdated: string }> {
  const posts = getAllBlogPosts().filter((post) => !post.draft && post.series)

  return Object.values(REGISTERED_SERIES).map((series) => {
    const seriesPosts = posts.filter((p) => p.series?.id === series.id)
    let lastUpdated = ''
    for (const post of seriesPosts) {
      const date = post.updatedDate || post.date
      if (!lastUpdated || date.localeCompare(lastUpdated) > 0) {
        lastUpdated = date
      }
    }

    return {
      ...series,
      postsCount: seriesPosts.length,
      lastUpdated,
    }
  })
}

/**
 * 获取指定专栏的元数据及所有收录文章（按 order 升序排列）。
 */
export function getSeriesDetail(id: string): { series: SeriesDefinition; posts: BlogPost[] } | null {
  const series = REGISTERED_SERIES[id]
  if (!series) {
    return null
  }

  const posts = getAllBlogPosts()
    .filter((post) => !post.draft && post.series?.id === id)
    .sort((a, b) => {
      const orderA = a.series?.order ?? 0
      const orderB = b.series?.order ?? 0
      return orderA - orderB || a.date.localeCompare(b.date)
    })

  return {
    series,
    posts,
  }
}

/**
 * 为当前文章计算其所属专栏的上下文导轨信息（上一篇、下一篇、总讲数等）。
 */
export function getSeriesNav(currentPost: BlogPost): {
  series: SeriesDefinition
  prev?: BlogPost
  next?: BlogPost
  currentIndex: number
  totalCount: number
} | null {
  if (!currentPost.series) {
    return null
  }

  const detail = getSeriesDetail(currentPost.series.id)
  if (!detail) {
    return null
  }

  const postIndex = detail.posts.findIndex((p) => p.slug === currentPost.slug)
  if (postIndex >= 0) {
    return {
      series: detail.series,
      prev: detail.posts[postIndex - 1],
      next: detail.posts[postIndex + 1],
      currentIndex: postIndex + 1,
      totalCount: detail.posts.length,
    }
  }

  return {
    series: detail.series,
    prev: undefined,
    next: undefined,
    currentIndex: currentPost.series.order,
    totalCount: detail.posts.length,
  }
}

/**
 * 专栏大章节分类分组数据结构。
 */
export interface SeriesChapterGroup<T = BlogPost> {
  name: string
  posts: T[]
}

/**
 * 将专栏文章按大章节分类分组。
 * 若专栏注册了 groups，优先遵循 groups 顺序；未指定分类的文章归入“正文章节”。
 */
export function groupSeriesPosts<T extends { series?: { group?: string; order: number } }>(
  posts: T[],
  definedGroups?: string[],
): Array<SeriesChapterGroup<T>> {
  const groupMap = new Map<string, T[]>()

  // 初始化预设大章节保证展示顺序
  if (definedGroups) {
    for (const g of definedGroups) {
      groupMap.set(g, [])
    }
  }

  const defaultGroupName = '正文章节'
  for (const post of posts) {
    const groupName = post.series?.group?.trim() || defaultGroupName
    const list = groupMap.get(groupName) ?? []
    list.push(post)
    groupMap.set(groupName, list)
  }

  const result: Array<SeriesChapterGroup<T>> = []
  for (const [name, list] of groupMap.entries()) {
    if (list.length > 0) {
      result.push({ name, posts: list })
    }
  }

  return result
}

export { REGISTERED_SERIES, SERIES_STATUS_LABELS }
export type { SeriesDefinition, SeriesStatus }
export { BLOG_CATEGORIES, BLOG_CATEGORY_LABELS, calculateReadingTime } from './blog-meta'
export type { BlogCategory } from './blog-meta'
export { formatDate, formatRelativeTime } from './date'

/** 首页最近写作时间线日期格式，输出 MM / DD（如 07 / 25）。 */
export function formatTimelineDate(iso: string): string {
  const date = new Date(iso)
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${month} / ${day}`
}
