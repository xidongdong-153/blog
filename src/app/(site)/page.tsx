import type { WritingEntry } from './_components/home/writing-timeline'
import Link from 'next/link'
import { getAllBlogPosts, getAllNotes } from '@/lib/content'
import { profileConfig } from '@/profile.config'
import { Hero } from './_components/home/hero'
import { Section } from './_components/home/section'
import { SiteStats } from './_components/home/site-stats'
import { SkillList } from './_components/home/skill-list'
import { WritingTimeline } from './_components/home/writing-timeline'

export default function HomePage() {
  const entries: WritingEntry[] = [
    ...getAllBlogPosts()
      .filter((post) => !post.draft)
      .map((post) => ({ kind: 'article' as const, slug: post.slug, title: post.title, date: post.date })),
    ...getAllNotes()
      .filter((note) => !note.draft)
      .map((note) => ({ kind: 'note' as const, slug: note.slug, title: note.title, date: note.date })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8)

  return (
    <div className="mx-auto flex w-full flex-col gap-12 md:w-4/5 lg:w-5/6">
      {/* 卷首 Hero */}
      <Hero profile={profileConfig} />

      {/* 最近写作：文章 + 笔记合并时间线 */}
      <Section title="最近写作">
        {entries.length > 0 ? (
          <>
            <WritingTimeline entries={entries} />
            <div className="pt-1 text-right">
              <Link
                href="/blog"
                className="inline-flex items-center font-mono text-xs tracking-wider text-muted-foreground transition-colors hover:text-foreground hover:underline"
              >
                // 查看全部文章 →
              </Link>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            还没有内容。在 content/blog/ 或 content/notes/ 下新建文件，写作就会出现在这里。
          </p>
        )}
      </Section>

      {/* 关于 */}
      {profileConfig.about.length > 0 && (
        <Section title="关于">
          <div className="flex flex-col gap-2 text-sm leading-relaxed text-muted-foreground">
            {profileConfig.about.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </Section>
      )}

      {/* 技能栈 */}
      {profileConfig.skills.length > 0 && (
        <Section title="技能">
          <SkillList skills={profileConfig.skills} />
        </Section>
      )}

      {/* 站点统计 */}
      <SiteStats />
    </div>
  )
}
