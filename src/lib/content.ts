import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

/**
 * 博客文章。对应 content/blog/<文件夹>/post.mdx，slug 取文件夹名。
 * date 存 ISO 字符串而不是 Date，避免跨 server/client 边界序列化问题。
 */
export interface BlogPost {
  slug: string
  title: string
  description: string
  /** ISO 日期字符串，如 2026-06-15 */
  date: string
  /** 更新日期，ISO 字符串。有值时详情页会显示"更新于 ..." */
  updatedDate: string
  /** Hero 图路径，相对于 public/。如 /images/blog/hero.jpg */
  heroImage: string
  tags: string[]
  /** true 时列表页不显示 */
  draft: boolean
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
      title: requireString(data, 'title', filePath),
      description: typeof data.description === 'string' ? data.description : '',
      date: readDate(data, filePath),
      updatedDate: readOptionalDate(data, 'updatedDate'),
      heroImage: typeof data.heroImage === 'string' ? data.heroImage : '',
      tags: readTags(data),
      draft: data.draft === true,
      content,
    })
  }

  return posts.sort((a, b) => b.date.localeCompare(a.date))
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

export interface Heading {
  depth: 2 | 3
  text: string
  /** 锚点 id，生成规则和 rehype-slug（github-slugger）保持一致 */
  id: string
}

/**
 * 从 MDX 原文提取 h2/h3 生成目录数据。
 * 只认行首的 ## 和 ###，代码块里的井号不会误判（代码块里的标题本来也不该进目录）。
 */
export function extractHeadings(content: string): Heading[] {
  const headings: Heading[] = []
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
      id: slugifyHeading(text),
    })
  }

  return headings
}

/**
 * 和 github-slugger 一致的标题转 id：小写、空白折叠成连字符、
 * 去掉标点。中文字符保留。
 */
function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[\p{P}\p{S}]+/gu, '')
}

/** 日期显示，全站统一格式。 */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(iso))
}
