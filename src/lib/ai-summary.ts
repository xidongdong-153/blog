import { createHash } from 'node:crypto'

/**
 * 对文章正文（MDX 原文，不含 frontmatter）计算稳定 SHA-256 十六进制哈希。
 * 任何正文字符变更均产生不同哈希；frontmatter 字段不参与计算。
 */
export function computeArticleContentHash(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex')
}
