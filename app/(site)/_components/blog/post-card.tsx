import type { BlogPost } from '@/lib/content'
import Link from 'next/link'
import { formatDate } from '@/lib/content'

export function PostCard({ post }: { post: BlogPost }) {
  return (
    <article className="flex flex-col gap-1">
      <Link href={`/blog/${post.slug}`} className="text-lg font-semibold hover:underline">
        {post.title}
      </Link>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-500 dark:text-stone-400">
        <time dateTime={post.date}>{formatDate(post.date)}</time>
        {post.tags.length > 0 && (
          <span className="flex gap-2">
            {post.tags.map((tag) => (
              <Link key={tag} href={`/blog/tags/${tag}`} className="hover:underline">
                #{tag}
              </Link>
            ))}
          </span>
        )}
      </div>
      {post.description && (
        <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">{post.description}</p>
      )}
    </article>
  )
}
