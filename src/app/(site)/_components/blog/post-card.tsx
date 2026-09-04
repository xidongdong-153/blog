import type { BlogPost } from '@/lib/content'
import Link from 'next/link'
import { calculateReadingTime, formatDate } from '@/lib/content'

export interface PostCardProps {
  post: BlogPost
  detailed?: boolean
  className?: string
  as?: 'li' | 'article' | 'div'
}

/**
 * 博客文章卡片组件。
 * 采用出版物排版与技术等宽眉标（Mono Kicker）：
 * 包含类别/日期/阅读时间眉标、标题悬浮箭头动效与低饱和等宽标签。
 */
export function PostCard({ post, detailed = true, className = '', as: Component = 'li' }: PostCardProps) {
  const readingTime = calculateReadingTime(post.content)

  const cardClasses = [
    'post-preview group/card relative flex flex-col rounded-xl border border-border/70 bg-card/50 transition-all duration-200 hover:border-border hover:bg-card px-5 py-4 hover:shadow-xs',
    detailed ? 'sm:p-6' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Component className={cardClasses}>
      <Link href={`/blog/${post.slug}`} className="group/link flex w-full flex-col transition-all">
        {/* 顶部技术等宽眉标 (Mono Kicker) */}
        <div className="mb-2.5 flex flex-wrap items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
          <span className="font-semibold text-foreground/80">{post.draft ? '// DRAFT' : '// ARTICLE'}</span>
          <span className="text-border">/</span>
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          {detailed && (
            <>
              <span className="text-border">/</span>
              <span>{readingTime}</span>
            </>
          )}
        </div>

        {/* 标题与伸缩展开箭头 */}
        <div className="z-10 flex-grow">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-medium text-foreground transition-colors group-hover/link:text-primary sm:text-lg">
              {post.title}
            </h2>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4 shrink-0 stroke-muted-foreground transition-colors group-hover/link:stroke-primary"
            >
              <line
                x1="5"
                y1="12"
                x2="19"
                y2="12"
                className="translate-x-4 scale-x-0 transition-all duration-300 ease-in-out motion-reduce:transition-none group-hover/link:translate-x-1 group-hover/link:scale-x-100"
              />
              <polyline
                points="12 5 19 12 12 19"
                className="translate-x-0 transition-all duration-300 ease-in-out motion-reduce:transition-none group-hover/link:translate-x-1"
              />
            </svg>
          </div>

          {detailed && post.description && (
            <p className="line-clamp-2 pt-2 text-sm leading-relaxed text-muted-foreground sm:line-clamp-3">
              {post.description}
            </p>
          )}
        </div>
      </Link>

      {/* 底部技术等宽标签 (Mono Tags) */}
      {detailed && post.tags.length > 0 && (
        <ul className="tag-list mt-4 flex flex-wrap gap-1.5 border-t border-border/40 pt-2.5">
          {post.tags.map((tag) => (
            <li key={tag}>
              <Link
                href={`/blog/tags/${tag}`}
                className="inline-flex items-center rounded border border-border/60 bg-muted/30 px-2 py-0.5 font-mono text-[0.75rem] uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground/40 hover:bg-muted hover:text-foreground"
              >
                #{tag}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Component>
  )
}
