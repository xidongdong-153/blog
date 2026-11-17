import type { Profile } from '@/profile.config'
import { Activity, Archive, ArrowRight, Compass, Mail, Rss } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { siteConfig } from '@/site.config'
import { GithubIcon } from '../comment/comment-icons'
import { PaperSurface } from '../site/paper-surface'
import { HeroLiveBadge, HeroSearchChip } from './hero-live-badge'

interface HeroProps {
  profile: Profile
  stats?: {
    postsCount: number
    notesCount: number
    tagsCount: number
  }
}

/**
 * 首页 Hero 组件（非对称双栏造物室排版）。
 * 左侧呈现真实工位状态、主标题与快捷动作；右侧以和纸索引卡收敛头像与内容体量，
 * 首屏克制高度使下方「最近更新」自然露出。
 */
export function Hero({ profile, stats }: HeroProps) {
  const githubItem = siteConfig.social.find(
    (item) => item.name.toLowerCase() === 'github' || item.href.includes('github.com'),
  )

  return (
    <section className="relative py-4 sm:py-8 lg:py-12">
      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1fr)_272px] lg:gap-12">
        {/* 左栏：真实状态 + 工程宣言 + 主动作流 */}
        <div className="flex min-w-0 flex-col items-start gap-5 text-left">
          <div className="entrance">
            <HeroLiveBadge location={profile.location} />
          </div>

          <div className="flex flex-col gap-3">
            <h1 className="entrance text-balance font-serif text-3xl font-medium leading-[1.18] tracking-tight text-foreground [--entrance-delay:60ms] sm:text-5xl lg:text-[3.15rem]">
              写代码，也造一起干活的{' '}
              <span className="italic text-primary underline decoration-primary/30 decoration-1 underline-offset-8">
                AI Agents.
              </span>
            </h1>

            <p className="entrance max-w-xl text-base leading-relaxed text-foreground/85 [--entrance-delay:110ms] sm:text-[17px]">
              {siteConfig.description}
            </p>

            <p
              lang="en"
              className="entrance font-mono text-xs tracking-wide text-muted-foreground [--entrance-delay:140ms]"
            >
              {profile.tagline}
            </p>
          </div>

          {/* 操作行：实色书签主按钮 + 下划线文本链 + 搜索触发 + 图标列 */}
          <div className="entrance flex flex-wrap items-center gap-3 pt-1 [--entrance-delay:180ms]">
            <Link
              href="/blog"
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground shadow-2xs transition-colors duration-200 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span>阅读文章</span>
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>

            <Link
              href="/about"
              className="inline-flex h-9 items-center px-1.5 text-xs font-medium text-foreground/90 underline decoration-border underline-offset-8 transition-colors hover:text-primary hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              关于我
            </Link>

            <HeroSearchChip />

            <span aria-hidden="true" className="hidden h-4 w-px bg-hair sm:inline-block" />

            <div className="flex flex-wrap items-center gap-1">
              {githubItem && (
                <a
                  href={githubItem.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="GitHub"
                  title="GitHub"
                  className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <GithubIcon className="size-4" />
                </a>
              )}

              <a
                href="/rss.xml"
                target="_blank"
                rel="noreferrer"
                aria-label="RSS 订阅"
                title="RSS 订阅"
                className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Rss className="size-4" strokeWidth={1.75} />
              </a>

              <Link
                href="/contact"
                aria-label="联系"
                title="联系"
                className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Mail className="size-4" strokeWidth={1.75} />
              </Link>

              <Link
                href="/blog/archives"
                aria-label="归档"
                title="归档"
                className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Archive className="size-4" strokeWidth={1.75} />
              </Link>

              <Link
                href="/links"
                aria-label="友链"
                title="友链"
                className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Compass className="size-4" strokeWidth={1.75} />
              </Link>

              <Link
                href="/status"
                aria-label="服务状态"
                title="服务状态"
                className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Activity className="size-4" strokeWidth={1.75} />
              </Link>
            </div>
          </div>
        </div>

        {/* 右栏：作者与站点内容索引卡 */}
        <aside aria-label="站点索引卡" className="entrance relative isolate rounded-xl p-5 [--entrance-delay:140ms]">
          <PaperSurface className="bg-card/90" />

          <div className="flex items-center gap-3.5">
            <div className="size-13 shrink-0 overflow-hidden rounded-[14px] bg-card ring-1 ring-border/75">
              {profile.avatar ? (
                <Image
                  src={profile.avatar}
                  alt={siteConfig.author}
                  width={52}
                  height={52}
                  priority
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full select-none items-center justify-center bg-muted/60 font-serif text-xl font-medium text-foreground">
                  {siteConfig.author.trim().slice(0, 1)}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="font-serif text-lg font-medium text-foreground">{siteConfig.author}</div>
              <div className="truncate font-mono text-[11px] text-muted-foreground">
                {siteConfig.url.replace(/^https?:\/\//, '')}
                {profile.location ? ` · ${profile.location}` : ''}
              </div>
            </div>
          </div>

          {stats && (
            <div className="mt-4 grid grid-cols-3 divide-x divide-hair border-y border-hair py-3 text-center">
              <Link
                href="/blog"
                className="group flex flex-col gap-0.5 px-1 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <span className="font-serif text-xl font-medium tabular-nums text-foreground transition-colors group-hover:text-primary">
                  {stats.postsCount}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">文章</span>
              </Link>

              <Link
                href="/notes"
                className="group flex flex-col gap-0.5 px-1 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <span className="font-serif text-xl font-medium tabular-nums text-foreground transition-colors group-hover:text-primary">
                  {stats.notesCount}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">笔记</span>
              </Link>

              <Link
                href="/blog/tags"
                className="group flex flex-col gap-0.5 px-1 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <span className="font-serif text-xl font-medium tabular-nums text-foreground transition-colors group-hover:text-primary">
                  {stats.tagsCount}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">标签</span>
              </Link>
            </div>
          )}

          <div className="mt-3.5 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
            <span>TypeScript · Next.js · Pi</span>
            <Link href="/projects" className="text-primary transition-colors hover:underline underline-offset-4">
              项目 →
            </Link>
          </div>
        </aside>
      </div>
    </section>
  )
}
