import type { BlockContent, Blockquote, DefinitionContent, Root as MdastRoot, Paragraph, PhrasingContent } from 'mdast'
import type { Plugin } from 'unified'
import { visit } from 'unist-util-visit'

interface UnistNode {
  type: string
}

interface UnistParent extends UnistNode {
  children: UnistNode[]
}

type HastProperties = Record<string, unknown>

interface HastTextNode extends UnistNode {
  type: 'text'
  value: string
}

interface HastElementNode extends UnistParent {
  type: 'element'
  tagName: string
  properties?: HastProperties
  children: HastChildNode[]
}

interface HastRootNode extends UnistParent {
  type: 'root'
  children: HastChildNode[]
}

type HastChildNode = HastElementNode | HastTextNode | MdxJsxElementNode | UnistNode

interface MdxJsxAttribute {
  type: 'mdxJsxAttribute'
  name: string
  value: string | null
}

interface MdxJsxElementNode {
  type: 'mdxJsxFlowElement' | 'mdxJsxTextElement'
  name: string | null
  attributes: Array<{ type: string; name?: string; value?: unknown }>
  children: unknown[]
}

const ALERT_TYPE_MAP: Record<string, 'note' | 'tip' | 'warning' | 'important'> = {
  note: 'note',
  tip: 'tip',
  warning: 'warning',
  important: 'important',
  caution: 'important',
}

const ALERT_HEADING_RE = /^\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\](?:[ \t]+(\S[^\n]*))?(?:\n|$)/i
const ATTRIBUTION_PREFIX_RE = /^(?:—|--)[ \t]+/

/**
 * 将 GitHub 风格引用提示（`> [!NOTE]` / `> [!TIP]` / `> [!WARNING]` / `> [!IMPORTANT]` / `> [!CAUTION]`）
 * 自动转换为站内 `<Callout>` 组件，支持首行自定义标题（如 `> [!TIP] 最佳实践`）。
 */
export const remarkGfmAlerts: Plugin<[], MdastRoot> = () => (tree) => {
  visit(tree, 'blockquote', (node: Blockquote, index, parent) => {
    if (!parent || index === undefined) return
    const firstChild = node.children[0]
    if (!firstChild || firstChild.type !== 'paragraph') return
    const firstInline = firstChild.children[0]
    if (!firstInline || firstInline.type !== 'text') return

    const match = ALERT_HEADING_RE.exec(firstInline.value)
    if (!match) return

    const rawType = match[1].toLowerCase()
    const mappedType = ALERT_TYPE_MAP[rawType]
    if (!mappedType) return

    const customTitle = match[2]?.trim()
    const restText = firstInline.value.slice(match[0].length)

    const nextFirstChildren: PhrasingContent[] = [...firstChild.children]
    if (restText.length > 0) {
      nextFirstChildren[0] = { ...firstInline, value: restText }
    } else {
      nextFirstChildren.shift()
      if (nextFirstChildren[0]?.type === 'break') {
        nextFirstChildren.shift()
      }
    }

    const nextBlockChildren: Array<BlockContent | DefinitionContent> =
      nextFirstChildren.length > 0
        ? [{ ...firstChild, children: nextFirstChildren }, ...node.children.slice(1)]
        : node.children.slice(1)

    const attributes: MdxJsxAttribute[] = [{ type: 'mdxJsxAttribute', name: 'type', value: mappedType }]
    if (customTitle) {
      attributes.push({ type: 'mdxJsxAttribute', name: 'title', value: customTitle })
    }

    const calloutNode: MdxJsxElementNode = {
      type: 'mdxJsxFlowElement',
      name: 'Callout',
      attributes,
      children: nextBlockChildren,
    }

    parent.children.splice(index, 1, calloutNode as unknown as BlockContent)
  })
}

function createAttributionFooter(children: PhrasingContent[]): Paragraph {
  return {
    type: 'paragraph',
    data: {
      hName: 'footer',
      hProperties: { 'data-blockquote-attribution': '' },
    },
    children,
  }
}

function normalizeAttributionPrefix(children: PhrasingContent[]): PhrasingContent[] {
  const first = children[0]
  if (!first || first.type !== 'text') return children
  return [{ ...first, value: first.value.replace(ATTRIBUTION_PREFIX_RE, '— ') }, ...children.slice(1)]
}

/**
 * 识别引用块末尾的出处署名行（以 `— ` 或 `-- ` 开头），转换为语义化 `<footer data-blockquote-attribution>`。
 * 同时支持独立末段（空行分隔）与同段落换行（`>` 连续两行）两种常见 Markdown 写法。
 */
export const remarkBlockquoteAttribution: Plugin<[], MdastRoot> = () => (tree) => {
  visit(tree, 'blockquote', (node: Blockquote) => {
    if (node.children.length === 0) return
    const lastIndex = node.children.length - 1
    const lastChild = node.children[lastIndex]
    if (!lastChild || lastChild.type !== 'paragraph' || lastChild.children.length === 0) return

    // 情况 1：独立末段（且前面已有引用正文）
    const firstInline = lastChild.children[0]
    if (
      node.children.length >= 2 &&
      firstInline?.type === 'text' &&
      ATTRIBUTION_PREFIX_RE.test(firstInline.value) &&
      !firstInline.value.includes('\n')
    ) {
      node.children[lastIndex] = createAttributionFooter(normalizeAttributionPrefix(lastChild.children))
      return
    }

    // 情况 2：同一段落末尾通过换行分隔的出处行（如 `> 正文\n> — 作者` 或软换行 `<br>`）
    const inlines = lastChild.children
    for (let i = inlines.length - 1; i >= 0; i -= 1) {
      const item = inlines[i]

      if (item.type === 'break') {
        const afterBreak = inlines.slice(i + 1)
        const nextFirst = afterBreak[0]
        if (nextFirst?.type === 'text' && ATTRIBUTION_PREFIX_RE.test(nextFirst.value)) {
          const beforeBreak = inlines.slice(0, i)
          if (beforeBreak.length === 0 && node.children.length === 1) return
          if (beforeBreak.length > 0) {
            lastChild.children = beforeBreak
            node.children.push(createAttributionFooter(normalizeAttributionPrefix(afterBreak)))
          } else {
            node.children[lastIndex] = createAttributionFooter(normalizeAttributionPrefix(afterBreak))
          }
          return
        }
        break
      }

      if (item.type === 'text') {
        const newlineIdx = item.value.lastIndexOf('\n')
        if (newlineIdx === -1) continue

        const afterNewline = item.value.slice(newlineIdx + 1)
        if (!ATTRIBUTION_PREFIX_RE.test(afterNewline)) return

        const beforeNewline = item.value.slice(0, newlineIdx)
        const beforeInlines: PhrasingContent[] = [...inlines.slice(0, i)]
        if (beforeNewline.length > 0) {
          beforeInlines.push({ ...item, value: beforeNewline })
        }

        const attributionInlines: PhrasingContent[] = [
          { ...item, value: afterNewline.replace(ATTRIBUTION_PREFIX_RE, '— ') },
          ...inlines.slice(i + 1),
        ]

        if (beforeInlines.length === 0 && node.children.length === 1) return

        if (beforeInlines.length > 0) {
          lastChild.children = beforeInlines
          node.children.push(createAttributionFooter(attributionInlines))
        } else {
          node.children[lastIndex] = createAttributionFooter(attributionInlines)
        }
        return
      }
    }
  })
}

function isWhitespaceText(node: HastChildNode): boolean {
  return node.type === 'text' && 'value' in node && typeof node.value === 'string' && node.value.trim() === ''
}

function isHastElement(node: unknown, tagName?: string): node is HastElementNode {
  if (!node || typeof node !== 'object') return false
  const candidate = node as { type?: unknown; tagName?: unknown }
  if (candidate.type !== 'element') return false
  return tagName ? candidate.tagName === tagName : true
}

function isMdxImgNode(node: unknown): node is MdxJsxElementNode {
  if (!node || typeof node !== 'object') return false
  const candidate = node as { type?: unknown; name?: unknown }
  return (candidate.type === 'mdxJsxFlowElement' || candidate.type === 'mdxJsxTextElement') && candidate.name === 'img'
}

function extractHastImgCaption(img: HastElementNode): string | null {
  const props: HastProperties = img.properties ?? {}
  const raw = typeof props.caption === 'string' ? props.caption : typeof props.title === 'string' ? props.title : ''
  const trimmed = raw.trim()
  if ('caption' in props) delete props.caption
  if (trimmed) {
    delete props.title
    props['data-caption'] = trimmed
  }
  img.properties = props
  return trimmed || null
}

function extractMdxImgCaption(img: MdxJsxElementNode): string | null {
  let caption = ''
  const nextAttributes: Array<{ type: string; name?: string; value?: unknown }> = []

  for (const attr of img.attributes ?? []) {
    if (attr.type === 'mdxJsxAttribute' && attr.name === 'caption' && typeof attr.value === 'string') {
      caption = attr.value.trim()
      continue
    }
    if (attr.type === 'mdxJsxAttribute' && attr.name === 'title' && typeof attr.value === 'string') {
      if (!caption) caption = attr.value.trim()
      continue
    }
    nextAttributes.push(attr)
  }

  if (caption) {
    nextAttributes.push({ type: 'mdxJsxAttribute', name: 'data-caption', value: caption })
  }
  img.attributes = nextAttributes
  return caption || null
}

function buildImageFigure(mediaNode: HastChildNode, caption: string | null): HastElementNode {
  const children: HastChildNode[] = [mediaNode]
  if (caption) {
    children.push({
      type: 'element',
      tagName: 'figcaption',
      properties: { 'data-image-caption': '' },
      children: [{ type: 'text', value: caption }],
    })
  }
  return {
    type: 'element',
    tagName: 'figure',
    properties: { 'data-image-figure': '' },
    children,
  }
}

/**
 * 将独占一行的图片（Markdown `![alt](url "图注")`、带链接包裹的图片，或块级 JSX `<img caption="..." />`）
 * 提升为语义化 `<figure data-image-figure>`，在存在注释时生成 `<figcaption data-image-caption>`，
 * 同时写入 `data-caption` 供灯箱预览同步展示；段落内的行内图片保持原样。
 */
export const rehypeImageFigure: Plugin<[], HastRootNode> = () => (tree) => {
  visit(tree, (node, index, parent) => {
    if (!parent || index === undefined || !('children' in parent)) return

    // 情况 1：块级 JSX `<img src="..." caption="..." />`
    if (isMdxImgNode(node) && node.type === 'mdxJsxFlowElement') {
      if (isHastElement(parent, 'figure') && 'data-image-figure' in (parent.properties ?? {})) return
      const caption = extractMdxImgCaption(node)
      ;(parent as UnistParent).children.splice(index, 1, buildImageFigure(node, caption))
      return
    }

    // 情况 2：独占一行的 `<p>` 中仅包含单个图片（或 `<a><img></a>`）
    if (!isHastElement(node, 'p')) return
    const meaningful = node.children.filter((child) => !isWhitespaceText(child))
    if (meaningful.length !== 1) return

    const onlyChild = meaningful[0]

    if (isHastElement(onlyChild, 'img')) {
      const caption = extractHastImgCaption(onlyChild)
      ;(parent as UnistParent).children.splice(index, 1, buildImageFigure(onlyChild, caption))
      return
    }

    if (isMdxImgNode(onlyChild)) {
      const caption = extractMdxImgCaption(onlyChild)
      ;(parent as UnistParent).children.splice(index, 1, buildImageFigure(onlyChild, caption))
      return
    }

    if (isHastElement(onlyChild, 'a')) {
      const linkChildren = onlyChild.children.filter((child) => !isWhitespaceText(child))
      if (linkChildren.length === 1 && isHastElement(linkChildren[0], 'img')) {
        const caption = extractHastImgCaption(linkChildren[0])
        ;(parent as UnistParent).children.splice(index, 1, buildImageFigure(onlyChild, caption))
      }
    }
  })
}
