import type { Profile } from '@/profile.config'
import Image from 'next/image'
import Link from 'next/link'
import { siteConfig } from '@/site.config'

interface HeroProps {
  profile: Profile
}

/**
 * 首页 Hero 区域组件。
 * 包含头像（或名字首字圆形占位）、姓名、位置、GitHub 入口以及 Connect Me 脉冲圆点徽章。
 */
export function Hero({ profile }: HeroProps) {
  const githubItem = siteConfig.social.find(
    (item) => item.name.toLowerCase() === 'github' || item.href.includes('github.com'),
  )

  const firstLetter = siteConfig.author.trim().slice(0, 1)

  return (
    <div className="flex flex-col-reverse items-start gap-8 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{siteConfig.author}</h1>
          <Link
            href="/contact"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            <span>Connect Me</span>
          </Link>
        </div>

        <p className="text-sm text-muted-foreground">{siteConfig.description}</p>

        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          {profile.location && (
            <div className="flex items-center gap-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-3.5"
              >
                <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>{profile.location}</span>
            </div>
          )}

          {githubItem && (
            <a
              href={githubItem.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 hover:text-foreground"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-3.5"
              >
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                <path d="M9 18c-4.51 2-5-2-7-2" />
              </svg>
              <span>GitHub</span>
            </a>
          )}
        </div>
      </div>

      <div className="relative">
        {profile.avatar ? (
          <Image
            src={profile.avatar}
            alt={siteConfig.author}
            width={112}
            height={112}
            className="h-28 w-28 rounded-full border border-border object-cover p-1"
          />
        ) : (
          <div
            aria-label={siteConfig.author}
            className="flex h-28 w-28 select-none items-center justify-center rounded-full border border-border bg-muted p-1 text-3xl font-bold text-foreground"
          >
            {firstLetter}
          </div>
        )}
      </div>
    </div>
  )
}
