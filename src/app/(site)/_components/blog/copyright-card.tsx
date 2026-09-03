import type { BlogPost } from '@/lib/content'
import { formatDate } from '@/lib/content'
import { siteConfig } from '@/site.config'

/**
 * 文章底部版权卡片。显示标题、作者、发布/更新日期、永久链接和许可协议。
 */
export function CopyrightCard({ post }: { post: BlogPost }) {
  const permalink = `${siteConfig.url}/blog/${post.slug}`

  return (
    <div className="rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground">
      <div className="flex flex-col gap-1.5">
        <p>
          <span className="font-medium text-foreground">{post.title}</span>
        </p>
        <p>作者：{siteConfig.author}</p>
        <p>
          发布于 {formatDate(post.date)}
          {post.updatedDate && <span>，更新于 {formatDate(post.updatedDate)}</span>}
        </p>
        <p>
          链接：
          <a href={permalink} className="break-all text-primary hover:underline">
            {permalink}
          </a>
        </p>
        <p className="mt-1">
          本文采用{' '}
          <a
            href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans"
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            CC BY-NC-SA 4.0
          </a>{' '}
          许可协议。转载请注明出处。
        </p>
      </div>
    </div>
  )
}
