import type { BlogPost } from '@/lib/content'
import Link from 'next/link'
import { calculateReadingTime, formatDate } from '@/lib/content'
import { Button } from './button'

export interface PostCardProps {
  post: BlogPost
  detailed?: boolean
  className?: string
  as?: 'li' | 'article' | 'div'
}

/**
 * 博客文章卡片组件，复刻 Joye PostPreview 样式与交互细节。
 * 包含圆角边框、悬浮背景高亮、标题右侧伸缩展开的 SVG 箭头、阅读时间估算与独立标签组。
 */
export function PostCard({ post, detailed = true, className = '', as: Component = 'li' }: PostCardProps) {
  const readingTime = calculateReadingTime(post.content)

  const cardClasses = [
    'post-preview group/card relative flex flex-col rounded-2xl border border-border bg-background transition-colors ease-in-out px-5 py-2.5 hover:bg-muted',
    detailed ? 'max-sm:px-4 sm:py-5' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Component className={cardClasses}>
      <Link href={`/blog/${post.slug}`} className="group/link flex w-full flex-col transition-all hover:text-primary">
        <span className="min-w-[95px] py-1 font-mono text-xs text-muted-foreground">
          <time dateTime={post.date}>{formatDate(post.date)}</time>
        </span>

        <div className="z-10 flex-grow">
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium text-foreground transition-colors group-hover/link:text-primary">
              {post.draft && <span className="text-destructive">(草稿) </span>}
              {post.title}
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="preview-redirect my-1 shrink-0 stroke-muted-foreground transition-colors group-hover/link:stroke-primary"
            >
              <line
                x1="5"
                y1="12"
                x2="19"
                y2="12"
                className="translate-x-4 scale-x-0 transition-all duration-300 ease-in-out group-hover/link:translate-x-1 group-hover/link:scale-x-100"
              />
              <polyline
                points="12 5 19 12 12 19"
                className="translate-x-0 transition-all duration-300 ease-in-out group-hover/link:translate-x-1"
              />
            </svg>
          </div>

          {detailed && (
            <>
              {post.description && (
                <p className="line-clamp-2 pt-1 text-sm text-muted-foreground sm:line-clamp-3">{post.description}</p>
              )}
              <div className="flex items-center gap-2 py-1.5 text-sm italic leading-4 text-muted-foreground sm:py-3">
                <span className="flex items-center gap-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-4 shrink-0"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {readingTime}
                </span>
              </div>
            </>
          )}
        </div>
      </Link>

      {detailed && post.tags.length > 0 && (
        <ul className="tag-list mt-1 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <li key={tag}>
              <Button title={tag} href={`/blog/tags/${tag}`} style="pill" />
            </li>
          ))}
        </ul>
      )}
    </Component>
  )
}
