import type { BlogSourceFilter } from '@/lib/blog-meta'
import type { BlogPost } from '@/lib/content'
import type { TextRange } from '@/lib/search'
import Link from 'next/link'
import { BLOG_CATEGORY_LABELS, buildBlogListUrl, calculateReadingTime } from '@/lib/blog-meta'
import { formatDate } from '@/lib/date'
import { splitByRanges } from '@/lib/search'
import { ArticleViewerCount } from '../visitor/article-viewer-count'
import { AiGeneratedLabel } from './ai-generated-label'

/** 搜索命中信息：标题按区间高亮，snippet 替换摘要位 */
export interface PostCardHit {
  titleRanges: TextRange[]
  snippet: string | null
  snippetRanges: TextRange[]
}

export interface PostCardProps {
  post: BlogPost
  detailed?: boolean
  className?: string
  entranceIndex?: number
  as?: 'li' | 'article' | 'div'
  showUpdatedDate?: boolean
  currentSource?: BlogSourceFilter
  hit?: PostCardHit
}

function HighlightedText({ text, ranges }: { text: string; ranges?: TextRange[] }) {
  if (!ranges || ranges.length === 0) return <>{text}</>

  return (
    <>
      {splitByRanges(text, ranges).map((part, index) =>
        part.hit ? (
          <mark key={index} className="rounded-xs bg-primary/18 px-0.5 text-foreground">
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  )
}

/**
 * 博客文章列表项组件（无框发丝线排版）。
 * 以纤细发丝线分隔，紧凑单行元信息沉淀于摘要之下，标题悬停呈现主题茶金过渡与微位移箭标。
 */
export function PostCard({
  post,
  detailed = true,
  className = '',
  entranceIndex,
  as: Component = 'li',
  showUpdatedDate = false,
  currentSource = 'all',
  hit,
}: PostCardProps) {
  const readingTime = calculateReadingTime(post.content)
  const categoryLabel = BLOG_CATEGORY_LABELS[post.category] ?? '文章'
  const summaryText = hit?.snippet ?? post.description

  const containerClasses = [
    'post-item group/item relative flex flex-col border-b border-hair py-5 transition-colors',
    entranceIndex !== undefined && 'entrance',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Component
      className={containerClasses}
      style={
        entranceIndex === undefined
          ? undefined
          : { animationDelay: `${120 + Math.min(Math.max(entranceIndex, 0), 4) * 50}ms` }
      }
    >
      <Link
        href={`/blog/${post.slug}`}
        className="group/link flex w-full flex-col rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-serif text-[1.15rem] font-medium leading-snug tracking-tight text-foreground transition-colors group-hover/link:text-primary sm:text-[1.25rem]">
            <HighlightedText text={post.title} ranges={hit?.titleRanges} />
          </h2>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mt-1 size-4 shrink-0 -translate-x-1 stroke-primary/80 opacity-0 transition-all duration-300 ease-[var(--ease-spring)] group-hover/link:translate-x-0 group-hover/link:opacity-100 motion-reduce:transition-none"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>

        {detailed && summaryText && (
          <p className="mt-1.5 line-clamp-2 text-[13.5px] leading-relaxed text-muted-foreground">
            {hit?.snippet ? <HighlightedText text={hit.snippet} ranges={hit.snippetRanges} /> : post.description}
          </p>
        )}
      </Link>

      {/* 底部元信息与标签独立链接 */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 font-mono text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <time dateTime={post.date} className="tabular-nums">
            {formatDate(post.date)}
          </time>
          {showUpdatedDate && post.updatedDate && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-primary/90">更新于 {formatDate(post.updatedDate)}</span>
            </>
          )}
          <span aria-hidden="true">·</span>
          {post.draft ? (
            <span className="text-foreground/75">草稿</span>
          ) : (
            <Link
              href={buildBlogListUrl({ source: currentSource, category: post.category })}
              className="rounded-sm transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {categoryLabel}
            </Link>
          )}

          {detailed && post.tags.length > 0 && (
            <>
              <span aria-hidden="true">/</span>
              <ul className="inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                {post.tags.slice(0, 4).map((tag) => (
                  <li key={tag} className="min-w-0 max-w-full [overflow-wrap:anywhere]">
                    <Link
                      href={`/blog/tags/${encodeURIComponent(tag)}`}
                      className="rounded-sm underline decoration-border/70 underline-offset-4 transition-colors hover:text-primary hover:decoration-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      {tag}
                    </Link>
                  </li>
                ))}
                {post.tags.length > 4 && <li className="text-muted-foreground/60">+{post.tags.length - 4}</li>}
              </ul>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          {post.aiGenerated && <AiGeneratedLabel aiGenerated={post.aiGenerated} />}
          {detailed && <span>{readingTime}</span>}
          <ArticleViewerCount slug={post.slug} mode="compact" />
        </div>
      </div>
    </Component>
  )
}
