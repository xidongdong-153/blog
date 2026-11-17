import type { WritingEntry } from './_components/home/writing-timeline'
import type { YearlyTimelineEntry } from './_components/home/yearly-timeline'
import Link from 'next/link'
import { formatDate, getAllBlogPosts, getAllBlogTags, getAllNotes } from '@/lib/content'
import { profileConfig } from '@/profile.config'
import { Hero } from './_components/home/hero'
import { Section } from './_components/home/section'
import { SkillList } from './_components/home/skill-list'
import { WritingTimeline } from './_components/home/writing-timeline'
import { YearlyTimeline } from './_components/home/yearly-timeline'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [allPosts, allTags] = await Promise.all([getAllBlogPosts(), getAllBlogTags()])
  const publishedPosts = allPosts.filter((post) => !post.draft)
  const publishedNotes = getAllNotes().filter((note) => !note.draft)

  const recentEntries: WritingEntry[] = [
    ...publishedPosts.map((post) => ({
      kind: 'article' as const,
      slug: post.slug,
      title: post.title,
      date: post.date,
      category: post.category,
      aiGenerated: post.aiGenerated,
    })),
    ...publishedNotes.map((note) => ({
      kind: 'note' as const,
      slug: note.slug,
      title: note.title,
      date: note.date,
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)

  const currentYear = String(new Date().getFullYear())
  const allYearlyCandidates: YearlyTimelineEntry[] = [
    ...publishedPosts.map((post) => ({
      kind: 'article' as const,
      slug: post.slug,
      title: post.title,
      date: post.date,
    })),
    ...publishedNotes.map((note) => ({
      kind: 'note' as const,
      slug: note.slug,
      title: note.title,
      date: note.date,
    })),
  ]
  const currentYearEntries = allYearlyCandidates.filter((item) => item.date.startsWith(currentYear))
  const timelineEntries = currentYearEntries.length > 0 ? currentYearEntries : allYearlyCandidates.slice(0, 24)
  const timelineYear =
    currentYearEntries.length > 0 ? currentYear : (allYearlyCandidates[0]?.date.slice(0, 4) ?? currentYear)

  const latestNotes = publishedNotes.slice(0, 3)

  return (
    <div data-page-entrance className="mx-auto flex w-full max-w-5xl flex-col gap-14 sm:gap-18">
      {/* 非对称首屏卷首 */}
      <Hero
        profile={profileConfig}
        stats={{
          postsCount: publishedPosts.length,
          notesCount: publishedNotes.length,
          tagsCount: allTags.length,
        }}
      />

      {/* 双栏主体：左栏最近更新 / 右栏随记与技术栈 */}
      <div className="grid grid-cols-1 gap-x-12 gap-y-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)]">
        <Section
          eyebrow="RECENT"
          title="最近更新"
          action={
            <Link href="/blog" className="font-mono text-xs text-muted-foreground transition-colors hover:text-primary">
              全部文章 →
            </Link>
          }
        >
          {recentEntries.length > 0 ? (
            <WritingTimeline entries={recentEntries} />
          ) : (
            <p className="py-4 text-sm text-muted-foreground">还没有公开文章或笔记。</p>
          )}
        </Section>

        <div className="flex flex-col gap-9 lg:border-l lg:border-hair lg:pl-10">
          <Section
            eyebrow="FIELD NOTES"
            index="01"
            title="随记"
            action={
              <Link
                href="/notes"
                className="font-mono text-xs text-muted-foreground transition-colors hover:text-primary"
              >
                全部笔记 →
              </Link>
            }
          >
            {latestNotes.length > 0 ? (
              <div className="flex flex-col divide-y divide-hair">
                {latestNotes.map((note) => (
                  <Link
                    key={note.slug}
                    href={`/notes/${note.slug}`}
                    className="group py-2.5 transition-colors first:pt-0 last:pb-0"
                  >
                    <div className="font-serif text-[15px] text-foreground transition-colors group-hover:text-primary">
                      {note.title}
                    </div>
                    <time dateTime={note.date} className="mt-1 block font-mono text-[11px] text-muted-foreground">
                      {formatDate(note.date)}
                    </time>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">暂无公开随记，日常工程沉淀先收在文章里。</p>
            )}
          </Section>

          <Section
            eyebrow="STACK"
            index="02"
            title="关于与技术栈"
            action={
              <Link
                href="/about"
                className="font-mono text-xs text-muted-foreground transition-colors hover:text-primary"
              >
                关于我 →
              </Link>
            }
          >
            {profileConfig.about.length > 0 && (
              <div className="flex flex-col gap-2 text-sm leading-relaxed text-muted-foreground">
                {profileConfig.about.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            )}

            {profileConfig.skills.length > 0 && (
              <div className="pt-1">
                <SkillList skills={profileConfig.skills} />
              </div>
            )}
          </Section>
        </div>
      </div>

      {/* 年度双轨季度脉络 */}
      {timelineEntries.length > 0 && (
        <YearlyTimeline
          entries={timelineEntries}
          totalYearCount={currentYearEntries.length || publishedPosts.length}
          yearLabel={timelineYear}
        />
      )}

      {/* 底部快速导航收尾条 */}
      <section
        aria-label="站内更多入口"
        className="entrance flex flex-wrap items-center justify-between gap-4 border-t border-hair pt-6 text-xs text-muted-foreground [--entrance-delay:320ms]"
      >
        <span className="font-serif text-sm text-foreground/85">欢迎就 TypeScript、全栈工程与 AI Agent 展开交流。</span>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono">
          <Link href="/projects" className="transition-colors hover:text-primary">
            项目
          </Link>
          <span aria-hidden="true" className="text-muted-foreground/40">
            /
          </span>
          <Link href="/blog/archives" className="transition-colors hover:text-primary">
            归档
          </Link>
          <span aria-hidden="true" className="text-muted-foreground/40">
            /
          </span>
          <Link href="/blog/tags" className="transition-colors hover:text-primary">
            标签
          </Link>
          <span aria-hidden="true" className="text-muted-foreground/40">
            /
          </span>
          <Link href="/links" className="transition-colors hover:text-primary">
            友链
          </Link>
          <span aria-hidden="true" className="text-muted-foreground/40">
            /
          </span>
          <Link href="/contact" className="text-primary transition-colors hover:underline underline-offset-4">
            联系 →
          </Link>
        </nav>
      </section>
    </div>
  )
}
