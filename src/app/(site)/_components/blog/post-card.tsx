import type { BlogPost } from '@/lib/content'
import type { TextRange } from '@/lib/search'
import Link from 'next/link'
import { BLOG_CATEGORY_LABELS, calculateReadingTime } from '@/lib/blog-meta'
import { formatDate } from '@/lib/date'
import { splitByRanges } from '@/lib/search'
import { ArticleViewerCount } from '../visitor/article-viewer-count'

/** 搜索命中信息：标题按区间高亮，snippet 替换摘要位 */
export interface PostCardHit {
  /** 标题命中区间，坐标相对 post.title */
  titleRanges: TextRange[]
  /** 正文命中片段，标题已命中时为 null */
  snippet: string | null
  /** 片段内的高亮区间 */
  snippetRanges: TextRange[]
}

export interface PostCardProps {
  post: BlogPost
  detailed?: boolean
  className?: string
  as?: 'li' | 'article' | 'div'
  /** 是否突出显示更新时间（如按最近更新排序时） */
  showUpdatedDate?: boolean
  /** 站内搜索传入的命中信息；不传时渲染行为与列表完全一致 */
  hit?: PostCardHit
}

/** 按命中区间渲染文本，命中部分包一层 mark；没有区间时原样输出 */
function HighlightedText({ text, ranges }: { text: string; ranges?: TextRange[] }) {
  if (!ranges || ranges.length === 0) return <>{text}</>

  return (
    <>
      {splitByRanges(text, ranges).map((part, index) =>
        part.hit ? (
          <mark key={index} className="bg-primary/15 text-foreground">
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
 * 博客文章列表项组件（无卡片极简排版）。
 * 采用底部分割线、开阔留白与技术等宽眉标：
 * 展示分类/日期/阅读时间、大字号标题悬浮动效与精简摘要。
 * 站内搜索命中时传入 hit，标题关键词高亮，正文命中片段替换摘要位。
 */
export function PostCard({
  post,
  detailed = true,
  className = '',
  as: Component = 'li',
  showUpdatedDate = false,
  hit,
}: PostCardProps) {
  const readingTime = calculateReadingTime(post.content)
  const categoryLabel = BLOG_CATEGORY_LABELS[post.category] ?? '文章'
  // 正文命中时用片段替换摘要，标题命中或未搜索时仍显示原描述
  const summaryText = hit?.snippet ?? post.description

  const containerClasses = [
    'post-item group/item relative flex flex-col border-b border-border/40 pb-7 pt-4 transition-colors',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Component className={containerClasses}>
      {/* 顶部技术等宽眉标 (Mono Kicker) */}
      <div className="mb-2 flex flex-wrap items-center gap-2 font-mono text-xs tracking-wider text-muted-foreground">
        {post.draft ? (
          <span className="font-semibold text-foreground/80">// 草稿</span>
        ) : (
          <Link
            href={`/blog?category=${post.category}`}
            className="font-semibold text-foreground/80 transition-colors hover:text-primary hover:underline"
          >
            // {categoryLabel}
          </Link>
        )}
        <span className="text-border">/</span>
        <time dateTime={post.date}>{formatDate(post.date)}</time>
        {showUpdatedDate && post.updatedDate && (
          <>
            <span className="text-border">/</span>
            <span className="text-primary/90">更新于 {formatDate(post.updatedDate)}</span>
          </>
        )}
        {detailed && (
          <>
            <span className="text-border">/</span>
            <span>{readingTime}</span>
          </>
        )}
        <ArticleViewerCount slug={post.slug} mode="compact" />
      </div>

      <Link href={`/blog/${post.slug}`} className="group/link flex w-full flex-col">
        {/* 标题与平滑展开箭头 */}
        <div className="z-10 flex-grow">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-lg font-medium tracking-tight text-foreground transition-colors group-hover/link:text-primary sm:text-xl">
              <HighlightedText text={post.title} ranges={hit?.titleRanges} />
            </h2>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4 shrink-0 -translate-x-1 stroke-muted-foreground opacity-0 transition-all duration-200 group-hover/link:translate-x-0 group-hover/link:opacity-100 motion-reduce:transition-none"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>

          {detailed && summaryText && (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground sm:line-clamp-3">
              {hit?.snippet ? <HighlightedText text={hit.snippet} ranges={hit.snippetRanges} /> : post.description}
            </p>
          )}
        </div>
      </Link>

      {/* 底部元数据：标签 */}
      {detailed && post.tags.length > 0 && (
        <div className="mt-3.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-muted-foreground">
          <ul className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {post.tags.map((tag) => (
              <li key={tag}>
                <Link
                  href={`/blog/tags/${tag}`}
                  className="text-muted-foreground/85 transition-colors hover:text-foreground hover:underline"
                >
                  #{tag}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Component>
  )
}
