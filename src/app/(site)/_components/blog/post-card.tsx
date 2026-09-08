import type { BlogPost } from '@/lib/content'
import Link from 'next/link'
import { BLOG_CATEGORY_LABELS, calculateReadingTime, formatDate } from '@/lib/content'

export interface PostCardProps {
  post: BlogPost
  detailed?: boolean
  className?: string
  as?: 'li' | 'article' | 'div'
  /** 是否突出显示更新时间（如按最近更新排序时） */
  showUpdatedDate?: boolean
}

/**
 * 博客文章列表项组件（无卡片极简排版）。
 * 采用底部分割线、开阔留白与技术等宽眉标：
 * 展示分类/日期/阅读时间、大字号标题悬浮动效与精简摘要。
 */
export function PostCard({
  post,
  detailed = true,
  className = '',
  as: Component = 'li',
  showUpdatedDate = false,
}: PostCardProps) {
  const readingTime = calculateReadingTime(post.content)
  const categoryLabel = BLOG_CATEGORY_LABELS[post.category] ?? '文章'

  const containerClasses = [
    'post-item group/item relative flex flex-col border-b border-border/40 pb-7 pt-4 transition-colors',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Component className={containerClasses}>
      <Link href={`/blog/${post.slug}`} className="group/link flex w-full flex-col">
        {/* 顶部技术等宽眉标 (Mono Kicker) */}
        <div className="mb-2 flex flex-wrap items-center gap-2 font-mono text-xs tracking-wider text-muted-foreground">
          <span className="font-semibold text-foreground/80">{post.draft ? '// 草稿' : `// ${categoryLabel}`}</span>
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
        </div>

        {/* 标题与平滑展开箭头 */}
        <div className="z-10 flex-grow">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-lg font-medium tracking-tight text-foreground transition-colors group-hover/link:text-primary sm:text-xl">
              {post.title}
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

          {detailed && post.description && (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground sm:line-clamp-3">
              {post.description}
            </p>
          )}
        </div>
      </Link>

      {/* 底部元数据：分类与标签 */}
      {detailed && (
        <div className="mt-3.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-muted-foreground">
          <Link href={`/blog?category=${post.category}`} className="text-primary hover:underline">
            {categoryLabel}
          </Link>
          {post.tags.length > 0 && (
            <>
              <span className="text-border/80">/</span>
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
            </>
          )}
        </div>
      )}
    </Component>
  )
}
