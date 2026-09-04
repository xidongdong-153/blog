import { getAllBlogPosts, getAllBlogTags, getAllNotes } from '@/lib/content'

/**
 * 首页站点统计收尾组件。
 * 基于本地 MDX 内容计算文章、笔记与标签总量，
 * 以一行居中衬线大字的人文表达呈现（参考 innei.in 的「N 篇 · N 万字 · N 天」），无卡片边框。
 */
export function SiteStats() {
  const postsCount = getAllBlogPosts().filter((post) => !post.draft).length
  const notesCount = getAllNotes().filter((note) => !note.draft).length
  const tagsCount = getAllBlogTags().length

  const stats = [
    { label: '篇文章', value: postsCount },
    { label: '篇笔记', value: notesCount },
    { label: '个标签', value: tagsCount },
  ]

  return (
    <p className="text-center leading-relaxed">
      {stats.map(({ label, value }, index) => (
        <span key={label}>
          {index > 0 && <span className="mx-2 text-muted-foreground/60">·</span>}
          <span className="font-serif text-2xl tabular-nums text-foreground sm:text-3xl">{value}</span>
          <span className="ml-1 text-sm text-muted-foreground">{label}</span>
        </span>
      ))}
    </p>
  )
}
