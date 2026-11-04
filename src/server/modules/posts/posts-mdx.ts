import type { Root } from 'mdast'
import type { Plugin } from 'unified'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkMdx from 'remark-mdx'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'
import { isContentUrl, isMediaUrl } from '@/lib/posts'

const allowedElements = new Set([
  'Callout',
  'Collapse',
  'Video',
  'video',
  'source',
  'img',
  'a',
  'div',
  'span',
  'p',
  'br',
  'hr',
  'strong',
  'em',
  'b',
  'i',
  'del',
  's',
  'kbd',
  'mark',
  'sup',
  'sub',
  'details',
  'summary',
  'blockquote',
  'ul',
  'ol',
  'li',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
])
const allowedAttributes = new Set([
  'type',
  'title',
  'defaultOpen',
  'src',
  'href',
  'alt',
  'width',
  'height',
  'poster',
  'controls',
  'autoPlay',
  'loop',
  'muted',
  'playsInline',
  'preload',
  'className',
  'id',
  'colSpan',
  'rowSpan',
  'open',
  'target',
  'rel',
  'aria-label',
  'caption',
])

interface MdxElement {
  name?: string | null
  attributes?: Array<{ type: string; name?: string; value?: unknown }>
}

export const remarkSafeMdx: Plugin<[], Root> = () => (tree, file) => {
  visit(tree, (node) => {
    const type: string = node.type
    if (['mdxjsEsm', 'mdxFlowExpression', 'mdxTextExpression'].includes(type)) {
      file.fail('正文不支持 JavaScript 表达式或 import/export', node)
    }
    if ('url' in node && typeof node.url === 'string' && !isContentUrl(node.url)) {
      file.fail('链接或图片地址不受支持，请使用 HTTP(S) URL 或公共资源路径', node)
    }
    if (type !== 'mdxJsxFlowElement' && type !== 'mdxJsxTextElement') return
    const element = node as unknown as MdxElement
    if (!element.name || !allowedElements.has(element.name)) {
      file.fail('正文包含不支持的组件', node)
    }
    if (element.name === 'Callout') {
      const type = element.attributes?.find((attr) => attr.name === 'type')?.value
      if (type !== undefined && !['note', 'tip', 'warning', 'important'].includes(String(type)))
        file.fail('Callout 类型必须为 note、tip、warning 或 important', node)
    }
    for (const attr of element.attributes ?? []) {
      if (attr.type !== 'mdxJsxAttribute' || !attr.name || !allowedAttributes.has(attr.name)) {
        file.fail('组件包含不支持的属性', node)
      }
      if (attr.value !== null && attr.value !== undefined && typeof attr.value !== 'string') {
        file.fail('组件属性只支持字符串或布尔简写，不支持 JavaScript 表达式', node)
      }
      if (
        ['href', 'src', 'poster'].includes(attr.name ?? '') &&
        typeof attr.value === 'string' &&
        !isContentUrl(attr.value)
      ) {
        file.fail('组件包含无效的链接地址', node)
      }
      if (['src', 'poster'].includes(attr.name ?? '') && typeof attr.value === 'string' && !isMediaUrl(attr.value))
        file.fail('图片和视频只支持 HTTP(S) URL 或公共资源路径', node)
      if (attr.name === 'target' && attr.value !== '_blank' && attr.value !== '_self') {
        file.fail('链接 target 只支持 _blank 或 _self', node)
      }
    }
  })
}

export async function validatePostMdx(source: string): Promise<void> {
  const processor = unified().use(remarkParse).use(remarkMdx).use(remarkGfm).use(remarkMath).use(remarkSafeMdx)
  await processor.run(processor.parse(source))
}
