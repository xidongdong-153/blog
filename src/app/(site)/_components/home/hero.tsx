import type { ReactNode } from 'react'
import type { Profile } from '@/profile.config'
import { Activity, Archive, Compass, Mail, Rss } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { siteConfig } from '@/site.config'
import { GithubIcon } from '../comment/comment-icons'
import { HeroLiveBadge } from './hero-live-badge'

interface HeroProps {
  profile: Profile
  stats?: {
    postsCount: number
    notesCount: number
    tagsCount: number
  }
}

interface HeroIconEntry {
  key: string
  label: string
  href: string
  external?: boolean
  icon: ReactNode
}

/**
 * 首页 Hero 组件（无卡片、无按钮排版）。
 * 左侧呈现工位状态、主标题、简介与极简图标通道；右侧以无框竖向发丝线呈现作者署名与内容索引数。
 */
export function Hero({ profile, stats }: HeroProps) {
  const githubItem = siteConfig.social.find(
    (item) => item.name.toLowerCase() === 'github' || item.href.includes('github.com'),
  )

  const iconLinks: HeroIconEntry[] = [
    ...(githubItem
      ? [
          {
            key: 'github',
            label: 'GitHub',
            href: githubItem.href,
            external: true,
            icon: <GithubIcon className="size-4" />,
          },
        ]
      : []),
    {
      key: 'rss',
      label: 'RSS',
      href: '/rss.xml',
      external: true,
      icon: <Rss className="size-4" strokeWidth={1.75} />,
    },
    {
      key: 'contact',
      label: '联系',
      href: '/contact',
      icon: <Mail className="size-4" strokeWidth={1.75} />,
    },
    {
      key: 'archives',
      label: '归档',
      href: '/blog/archives',
      icon: <Archive className="size-4" strokeWidth={1.75} />,
    },
    {
      key: 'links',
      label: '友链',
      href: '/links',
      icon: <Compass className="size-4" strokeWidth={1.75} />,
    },
    {
      key: 'status',
      label: '状态',
      href: '/status',
      icon: <Activity className="size-4" strokeWidth={1.75} />,
    },
  ]

  const statItems = stats
    ? [
        { href: '/blog', value: stats.postsCount, label: '文章' },
        { href: '/notes', value: stats.notesCount, label: '笔记' },
        { href: '/blog/tags', value: stats.tagsCount, label: '标签' },
      ]
    : []

  const iconClassName =
    'group/icon ink-glide hit-expand relative flex size-10 items-center justify-center text-muted-foreground hover:-translate-y-0.5 hover:text-primary focus-visible:-translate-y-0.5 focus-visible:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

  return (
    <section className="relative py-4 sm:py-8 lg:py-10">
      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1fr)_248px] lg:gap-12">
        {/* 左栏：工位状态 + 标题 + 简介 + 无框图标通道 */}
        <div className="flex min-w-0 flex-col items-start gap-5 text-left">
          <div className="entrance">
            <HeroLiveBadge location={profile.location} />
          </div>

          <div className="flex flex-col gap-3">
            <h1 className="entrance text-balance font-serif text-3xl font-medium leading-[1.18] tracking-tight text-foreground [--entrance-delay:60ms] sm:text-5xl lg:text-[3.15rem]">
              写全栈应用，也给{' '}
              <span className="italic text-primary underline decoration-primary/30 decoration-1 underline-offset-8">
                AI Agent
              </span>{' '}
              搭工作台。
            </h1>

            <p className="entrance max-w-xl text-base leading-relaxed text-foreground/85 [--entrance-delay:110ms] sm:text-[17px]">
              {siteConfig.description}
            </p>
          </div>

          <div className="entrance flex flex-wrap items-center gap-x-3 gap-y-4 pt-1 [--entrance-delay:160ms]">
            {iconLinks.map((item) => {
              const inner = (
                <>
                  <span className="ink-glide group-hover/icon:scale-110">{item.icon}</span>
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-1 left-1/2 h-[1.5px] w-3.5 -translate-x-1/2 origin-center scale-x-0 rounded-full bg-primary opacity-0 transition-[transform,scale,opacity] duration-[280ms] ease-[var(--ease-spring)] group-hover/icon:scale-x-100 group-hover/icon:opacity-100 group-focus-visible/icon:scale-x-100 group-focus-visible/icon:opacity-100 motion-reduce:transition-opacity"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-5 left-1/2 hidden -translate-x-1/2 sm:block"
                  >
                    <span className="ink-glide block translate-y-1 whitespace-nowrap font-mono text-[10px] text-primary opacity-0 group-hover/icon:translate-y-0 group-hover/icon:opacity-100 group-focus-visible/icon:translate-y-0 group-focus-visible/icon:opacity-100">
                      {item.label}
                    </span>
                  </span>
                </>
              )

              return item.external ? (
                <a
                  key={item.key}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={item.label}
                  className={iconClassName}
                >
                  {inner}
                </a>
              ) : (
                <Link key={item.key} href={item.href} aria-label={item.label} className={iconClassName}>
                  {inner}
                </Link>
              )
            })}
          </div>
        </div>

        {/* 右栏：无卡片外壳的作者印记与内容计数 */}
        <aside
          aria-label="作者与站点索引"
          className="entrance border-t border-hair pt-6 [--entrance-delay:140ms] lg:border-l lg:border-t-0 lg:pl-9 lg:pt-0"
        >
          <div className="flex items-center gap-3.5">
            <div className="size-12 shrink-0 overflow-hidden rounded-[13px] ring-1 ring-border/75">
              {profile.avatar ? (
                <Image
                  src={profile.avatar}
                  alt={siteConfig.author}
                  width={48}
                  height={48}
                  priority
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full select-none items-center justify-center bg-muted/60 font-serif text-lg font-medium text-foreground">
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

          {statItems.length > 0 && (
            <div className="mt-5 grid grid-cols-3 gap-2 border-t border-hair pt-4">
              {statItems.map((stat) => (
                <Link
                  key={stat.href}
                  href={stat.href}
                  className="group/ink flex flex-col items-start gap-0.5 py-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <span className="ink-glide font-serif text-xl font-medium tabular-nums text-foreground group-hover/ink:-translate-y-0.5 group-hover/ink:text-primary">
                    {stat.value}
                  </span>
                  <span className="ink-line font-mono text-[11px] text-muted-foreground transition-colors group-hover/ink:text-foreground">
                    {stat.label}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </aside>
      </div>
    </section>
  )
}
