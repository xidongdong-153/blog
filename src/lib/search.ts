import type { BlogPost } from './content'
import { BLOG_CATEGORY_LABELS } from './blog-meta'

/**
 * 站内搜索的索引构建与检索逻辑。
 *
 * 这个模块不依赖 `node:fs`，浏览器端可以直接调用；所有函数都是纯函数，便于单测。
 * 索引在浏览器内构建，文章数据由 RSC 通过 props 下发，全程没有网络请求。
 */

/** 文本上的一个区间，坐标是左闭右开的字符下标，用于渲染高亮 */
export interface TextRange {
  start: number
  end: number
}

/** 一篇参与搜索的文章：原文对象 + 剥离非文字内容后的正文 */
export interface SearchDocument {
  post: BlogPost
  /** 正文纯文字，代码块、公式、JSX 等已被剥离 */
  text: string
}

/** 一次检索的结果，命中信息供渲染层高亮 */
export interface SearchHit {
  post: BlogPost
  score: number
  /** 标题上的命中区间，坐标相对原始 title 字符串 */
  titleRanges: TextRange[]
  /** 正文命中片段，标题已命中或正文未命中时为 null */
  snippet: string | null
  /** 片段内的高亮区间 */
  snippetRanges: TextRange[]
}

/** 各字段命中时的加分权重，标题权重最高 */
const FIELD_WEIGHTS = {
  title: 5,
  tag: 3,
  category: 3,
  description: 3,
  text: 1,
} as const

/** 片段在首个命中位置前保留的字符数 */
const SNIPPET_LEAD = 24

/** 片段在首个命中位置后保留的字符数 */
const SNIPPET_TRAIL = 96

/** 中日韩文字判断，这类关键词按子串匹配，不走英文词首规则 */
const CJK_PATTERN = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u

/**
 * 小写化文本用于匹配。
 *
 * 少数特殊字符（如土耳其语 İ）小写后长度会变化，导致下标无法映射回原文、高亮错位；
 * 遇到这种情况退回原文，结果是失去大小写不敏感，但区间始终正确。
 */
function lowerAligned(text: string): string {
  const lower = text.toLowerCase()
  return lower.length === text.length ? lower : text
}

/** 判断字符是否属于英文单词内部（字母或数字），用于词首判定 */
function isWordChar(char: string | undefined): boolean {
  return char !== undefined && /[a-z0-9]/.test(char)
}

/**
 * 在已小写化的文本里找出关键词的全部出现位置。
 *
 * 英文关键词要求落在词首，让 `react` 命中 `react-hooks`，同时避免 `english` 命中 `henglish`。
 * 中文关键词不做这个限制，子串命中即可。
 */
function findRanges(haystack: string, keyword: string, requireWordStart: boolean): TextRange[] {
  const ranges: TextRange[] = []
  if (keyword.length === 0) return ranges

  let from = 0
  while (from <= haystack.length - keyword.length) {
    const index = haystack.indexOf(keyword, from)
    if (index === -1) break
    if (!requireWordStart || !isWordChar(haystack[index - 1])) {
      ranges.push({ start: index, end: index + keyword.length })
    }
    from = index + keyword.length
  }
  return ranges
}

/** 合并重叠或相邻的区间，避免渲染高亮时出现嵌套片段 */
function mergeRanges(ranges: TextRange[]): TextRange[] {
  if (ranges.length === 0) return []
  const sorted = [...ranges].sort((a, b) => a.start - b.start)
  const merged: TextRange[] = [{ ...sorted[0] }]

  for (let index = 1; index < sorted.length; index++) {
    const last = merged[merged.length - 1]
    const current = sorted[index]
    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end)
    } else {
      merged.push({ ...current })
    }
  }
  return merged
}

/**
 * 去掉 MDX 里的非散文内容，只留可搜索的文字。
 *
 * 丢弃：围栏代码块、KaTeX 公式、import / export 语句、HTML 注释、图片语法、JSX 标签、Markdown 标记符号。
 * 保留：行内代码里的文字（`useState` 这类技术名词常写在这里）、链接可见文字、正文散文。
 *
 * 围栏代码块整块丢弃，因为成块代码是搜索噪声的主要来源；
 * 行内代码只去掉反引号标记，内容参与检索。
 */
export function stripNonText(mdx: string): string {
  const kept: string[] = []
  let inFence = false

  for (const line of mdx.split('\n')) {
    if (line.trimStart().startsWith('```')) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    kept.push(line)
  }

  const text = kept
    .join('\n')
    // 块级与行内公式
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/\$[^$\n]+\$/g, ' ')
    // MDX 的 import / export 语句
    .replace(/^\s*(?:import|export)\s.+$/gm, ' ')
    // HTML 注释
    .replace(/<!--[\s\S]*?-->/g, ' ')
    // 图片语法整段丢弃
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    // 链接只保留可见文字
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // JSX 标签与自闭合标签
    .replace(/<\/?[a-z][^>]*>/gi, ' ')
    // 标题、引用、列表的 Markdown 前缀
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s{0,3}(?:[-*+]|\d+\.)\s+/gm, '')
    // 表格分隔行（|---|---| 这类）与单元格竖线
    .replace(/^[\s|:-]+$/gm, ' ')
    .replace(/\|/g, ' ')
    // 行内代码与强调符号
    .replace(/`([^`]*)`/g, '$1')
    .replace(/[*_~]/g, ' ')

  return text.replace(/\s+/g, ' ').trim()
}

/** 为每篇文章建立索引条目，纯函数，可在浏览器端调用 */
export function buildSearchIndex(posts: BlogPost[]): SearchDocument[] {
  return posts.map((post) => ({ post, text: stripNonText(post.content) }))
}

/**
 * 从正文命中位置截取一段带上下文的片段，并把关键词命中的区间换算到片段内坐标。
 * 结果首尾按需补省略号，供结果项替换描述展示。
 */
function buildSnippet(
  text: string,
  anchor: TextRange,
  normalizedText: string,
  keywords: string[],
): { snippet: string; ranges: TextRange[] } {
  const start = Math.max(0, anchor.start - SNIPPET_LEAD)
  const end = Math.min(text.length, anchor.start + SNIPPET_TRAIL)

  const leading = start > 0 ? '...' : ''
  const trailing = end < text.length ? '...' : ''
  const raw = text.slice(start, end)
  const trimmed = raw.trim()
  const offset = leading.length + (raw.length - raw.trimStart().length)

  const window = normalizedText.slice(start, start + raw.length)
  const ranges: TextRange[] = []
  for (const keyword of keywords) {
    const requireWordStart = !CJK_PATTERN.test(keyword)
    for (const range of findRanges(window, keyword, requireWordStart)) {
      ranges.push({ start: range.start + offset, end: range.end + offset })
    }
  }

  return { snippet: `${leading}${trimmed}${trailing}`, ranges: mergeRanges(ranges) }
}

/** 对单篇文章做匹配与打分，任一关键词完全没命中就返回 null */
function matchDocument(document: SearchDocument, keywords: string[]): SearchHit | null {
  const { post, text } = document
  const title = post.title
  const description = post.description
  const categoryLabel = BLOG_CATEGORY_LABELS[post.category] ?? ''
  const tags = post.tags.join(' ')

  const titleLower = lowerAligned(title)
  const descriptionLower = lowerAligned(description)
  const categoryLower = lowerAligned(categoryLabel)
  const tagsLower = lowerAligned(tags)
  const textLower = lowerAligned(text)

  let score = 0
  const titleRanges: TextRange[] = []
  let firstTextRange: TextRange | null = null

  for (const keyword of keywords) {
    const requireWordStart = !CJK_PATTERN.test(keyword)
    let matched = false

    const titleMatches = findRanges(titleLower, keyword, requireWordStart)
    if (titleMatches.length > 0) {
      score += FIELD_WEIGHTS.title
      titleRanges.push(...titleMatches)
      matched = true
    }

    if (findRanges(tagsLower, keyword, requireWordStart).length > 0) {
      score += FIELD_WEIGHTS.tag
      matched = true
    }

    if (findRanges(categoryLower, keyword, requireWordStart).length > 0) {
      score += FIELD_WEIGHTS.category
      matched = true
    }

    if (findRanges(descriptionLower, keyword, requireWordStart).length > 0) {
      score += FIELD_WEIGHTS.description
      matched = true
    }

    const textMatches = findRanges(textLower, keyword, requireWordStart)
    if (textMatches.length > 0) {
      score += FIELD_WEIGHTS.text
      firstTextRange ??= textMatches[0]
      matched = true
    }

    // 多词查询按 AND 处理：有一个词哪儿都没命中，这篇就淘汰
    if (!matched) return null
  }

  if (score === 0) return null

  // 标题没命中时补一段正文片段，解释这条为什么被搜出来
  const snippetSource = titleRanges.length === 0 ? firstTextRange : null
  const snippet = snippetSource ? buildSnippet(text, snippetSource, textLower, keywords) : null

  return {
    post,
    score,
    titleRanges: mergeRanges(titleRanges),
    snippet: snippet?.snippet ?? null,
    snippetRanges: snippet?.ranges ?? [],
  }
}

/**
 * 检索文章并按相关度排序。
 *
 * 查询按空白切成关键词，全部关键词都命中才计入结果（可分散在不同字段）。
 * 单字符查询直接返回空结果，避免中文虚词刷出一堆弱相关条目。
 * 结果按得分倒序，同分按发布日期倒序。
 */
export function searchPosts(query: string, documents: SearchDocument[]): SearchHit[] {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  const keywords = trimmed.toLowerCase().split(/\s+/).filter(Boolean)
  if (keywords.length === 0) return []

  const hits: SearchHit[] = []
  for (const document of documents) {
    const hit = matchDocument(document, keywords)
    if (hit) hits.push(hit)
  }

  return hits.sort((a, b) => b.score - a.score || b.post.date.localeCompare(a.post.date))
}

/**
 * 把文本按高亮区间切成有序片段，`hit` 标记该段是否需要渲染成高亮。
 * 区间重叠或越界时自动合并裁剪，渲染层直接遍历结果即可。
 */
export function splitByRanges(text: string, ranges: TextRange[]): Array<{ text: string; hit: boolean }> {
  if (ranges.length === 0) return [{ text, hit: false }]

  const merged = mergeRanges(ranges.filter((range) => range.end > range.start))
  if (merged.length === 0) return [{ text, hit: false }]

  const parts: Array<{ text: string; hit: boolean }> = []
  let cursor = 0

  for (const range of merged) {
    const start = Math.max(range.start, cursor)
    const end = Math.min(Math.max(range.end, start), text.length)
    if (start > cursor) {
      parts.push({ text: text.slice(cursor, start), hit: false })
    }
    if (end > start) {
      parts.push({ text: text.slice(start, end), hit: true })
    }
    cursor = end
  }

  if (cursor < text.length) {
    parts.push({ text: text.slice(cursor), hit: false })
  }
  return parts
}
