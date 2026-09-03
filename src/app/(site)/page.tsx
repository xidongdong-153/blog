import Link from 'next/link'
import { getAllBlogPosts, getAllNotes } from '@/lib/content'
import { profileConfig } from '@/profile.config'
import { EntryListItem } from './_components/home/entry-list-item'
import { Hero } from './_components/home/hero'
import { LinkCard } from './_components/home/link-card'
import { Section } from './_components/home/section'
import { SiteStats } from './_components/home/site-stats'
import { SkillList } from './_components/home/skill-list'

export default function HomePage() {
  const posts = getAllBlogPosts()
    .filter((post) => !post.draft)
    .slice(0, 5)

  const notes = getAllNotes()
    .filter((note) => !note.draft)
    .slice(0, 5)

  return (
    <div className="mx-auto flex w-full flex-col gap-12 md:w-4/5 lg:w-5/6">
      {/* 头部信息 */}
      <Hero profile={profileConfig} />

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

      {/* 最新文章 */}
      <Section title="文章">
        <div className="flex flex-col gap-2.5">
          {posts.length > 0 ? (
            posts.map((post) => (
              <EntryListItem key={post.slug} href={`/blog/${post.slug}`} title={post.title} date={post.date} />
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              还没有文章。在 content/blog/ 下新建文件夹和 post.mdx，文章就会出现在这里。
            </p>
          )}

          {posts.length > 0 && (
            <div className="pt-1 text-right">
              <Link
                href="/blog"
                className="inline-flex items-center text-xs font-medium text-muted-foreground transition-colors hover:text-primary hover:underline"
              >
                查看全部文章 →
              </Link>
            </div>
          )}
        </div>
      </Section>

      {/* 最近笔记 */}
      <Section title="笔记">
        <div className="flex flex-col gap-2.5">
          {notes.length > 0 ? (
            notes.map((note) => (
              <EntryListItem key={note.slug} href={`/notes/${note.slug}`} title={note.title} date={note.date} />
            ))
          ) : (
            <p className="text-sm text-muted-foreground">还没有笔记。在 content/notes/ 下新建 .md 文件。</p>
          )}

          {notes.length > 0 && (
            <div className="pt-1 text-right">
              <Link
                href="/notes"
                className="inline-flex items-center text-xs font-medium text-muted-foreground transition-colors hover:text-primary hover:underline"
              >
                查看全部笔记 →
              </Link>
            </div>
          )}
        </div>
      </Section>

      {/* 技能栈 */}
      {profileConfig.skills.length > 0 && (
        <Section title="技能">
          <SkillList skills={profileConfig.skills} />
        </Section>
      )}

      {/* 经历（有数据时才渲染） */}
      {profileConfig.experience.length > 0 && (
        <Section title="经历">
          <div className="flex flex-col gap-3">
            {profileConfig.experience.map((item) => (
              <LinkCard key={item.heading} href={item.href} heading={item.heading} subheading={item.subheading}>
                {item.points.length > 0 && (
                  <ul className="list-inside list-disc text-xs text-muted-foreground">
                    {item.points.map((pt) => (
                      <li key={pt}>{pt}</li>
                    ))}
                  </ul>
                )}
              </LinkCard>
            ))}
          </div>
        </Section>
      )}

      {/* 开源项目（有数据时才渲染） */}
      {profileConfig.openSource.length > 0 && (
        <Section title="开源">
          <div className="flex flex-col gap-3">
            {profileConfig.openSource.map((item) => (
              <LinkCard key={item.name} href={item.href} heading={item.name} subheading={item.description} />
            ))}
          </div>
        </Section>
      )}

      {/* 教育（有数据时才渲染） */}
      {profileConfig.education.length > 0 && (
        <Section title="教育">
          <div className="flex flex-col gap-3">
            {profileConfig.education.map((item) => (
              <LinkCard key={item.heading} heading={item.heading} subheading={item.subheading} period={item.period} />
            ))}
          </div>
        </Section>
      )}

      {/* 站点统计 */}
      <Section title="统计">
        <SiteStats />
      </Section>
    </div>
  )
}
