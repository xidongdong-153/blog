import type { WritingEntry } from './_components/home/writing-timeline'
import type { YearlyTimelineEntry } from './_components/home/yearly-timeline'
import Link from 'next/link'
import { getAllBlogPosts, getAllBlogTags, getAllNotes } from '@/lib/content'
import { profileConfig } from '@/profile.config'
import { Hero } from './_components/home/hero'
import { Section } from './_components/home/section'
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

  return (
    <div data-page-entrance className="mx-auto flex w-full max-w-5xl flex-col gap-12 sm:gap-16">
      <Hero
        profile={profileConfig}
        stats={{
          postsCount: publishedPosts.length,
          notesCount: publishedNotes.length,
          tagsCount: allTags.length,
        }}
      />

      <Section
        title="最近更新"
        action={
          <Link
            href="/blog"
            className="group/ink inline-flex items-center gap-1 font-mono text-xs text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <span className="ink-line">全部文章</span>
            <span aria-hidden="true" className="ink-glide group-hover/ink:translate-x-1">
              →
            </span>
          </Link>
        }
      >
        {recentEntries.length > 0 ? (
          <WritingTimeline entries={recentEntries} />
        ) : (
          <p className="py-4 text-sm text-muted-foreground">还没有公开文章或笔记。</p>
        )}
      </Section>

      {timelineEntries.length > 0 && (
        <YearlyTimeline
          entries={timelineEntries}
          totalYearCount={currentYearEntries.length || publishedPosts.length}
          yearLabel={timelineYear}
        />
      )}
    </div>
  )
}
