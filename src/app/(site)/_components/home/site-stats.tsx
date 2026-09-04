import { getAllBlogPosts, getAllBlogTags, getAllNotes } from '@/lib/content'

/**
 * 首页站点统计卡片组件。
 * 基于本地 MDX 内容计算文章、笔记与标签总量，采用 3 列半透明卡片展示。
 */
export function SiteStats() {
  const postsCount = getAllBlogPosts().filter((post) => !post.draft).length
  const notesCount = getAllNotes().filter((note) => !note.draft).length
  const tagsCount = getAllBlogTags().length

  const stats = [
    { label: '文章', value: postsCount },
    { label: '笔记', value: notesCount },
    { label: '标签', value: tagsCount },
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map(({ label, value }) => (
        <div key={label} className="rounded-lg border border-border/60 bg-card/30 px-4 py-3 text-center">
          <div className="font-serif text-2xl font-medium tabular-nums text-foreground">{value}</div>
          <div className="mt-1 font-mono text-[0.7rem] uppercase tracking-wider text-muted-foreground">{label}</div>
        </div>
      ))}
    </div>
  )
}
