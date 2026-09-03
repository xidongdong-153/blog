import type { Heading } from '@/lib/content'

/**
 * 文章目录。骨架阶段是静态锚点列表，不做滚动跟随高亮。
 */
export function TableOfContents({ headings }: { headings: Heading[] }) {
  if (headings.length === 0) {
    return null
  }

  return (
    <nav aria-label="目录" className="border border-border p-4">
      <p className="mb-2 text-sm font-semibold">目录</p>
      <ul className="flex flex-col gap-1 text-sm">
        {headings.map((heading) => (
          <li key={heading.id} className={heading.depth === 3 ? 'pl-4' : ''}>
            <a href={`#${heading.id}`} className="text-muted-foreground hover:underline">
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
