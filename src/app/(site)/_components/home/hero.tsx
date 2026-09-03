import type { Profile } from '@/profile.config'
import Image from 'next/image'
import Link from 'next/link'
import { siteConfig } from '@/site.config'
import { SpatialField } from './spatial-field'

interface HeroProps {
  profile: Profile
}

/**
 * 首页 Hero 组件。
 *
 * 采用开阔无界的空间场设计，移除外层卡片框线与组件硬边框：
 * - Background: 动态 SpatialField 全幅延展，自然弥散
 * - Overlay: 底部与边缘柔和渐隐羽化，与正文自然连通
 * - Hero Content: 现代技术出版物排版，纯净无框层次
 */
export function Hero({ profile }: HeroProps) {
  const githubItem = siteConfig.social.find(
    (item) => item.name.toLowerCase() === 'github' || item.href.includes('github.com'),
  )

  const firstLetter = siteConfig.author.trim().slice(0, 1)

  return (
    <section className="relative -mx-6 -mt-10 mb-8 flex min-h-[70vh] w-[calc(100%+3rem)] flex-col justify-center overflow-hidden px-6 py-16 sm:-mx-8 sm:w-[calc(100%+4rem)] sm:min-h-[75vh] sm:px-8 sm:py-20 md:-mx-12 md:w-[calc(100%+6rem)] md:px-12 lg:-mx-16 lg:w-[calc(100%+8rem)] lg:min-h-[82vh] lg:px-16">
      {/* 动态空间场背景：自由蔓延，无任何线框束缚 */}
      <SpatialField className="absolute inset-0" />

      {/* 渐隐遮罩：底部大面积自然过渡，与正文无缝融合 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background via-background/70 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,transparent_35%,hsl(var(--background)/0.55)_100%)]"
      />

      {/* Hero 核心内容 */}
      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col-reverse items-start justify-between gap-10 lg:flex-row lg:items-center">
        <div className="flex max-w-2xl flex-col items-start gap-6">
          {/* 状态徽章与位置（去除硬线框，保持呼吸感） */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1 text-xs font-mono text-muted-foreground backdrop-blur-sm">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Engineering &amp; Systems</span>
            </span>

            {profile.location && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/85">
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
              </span>
            )}

            <Link
              href="/contact"
              className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              <span>Connect Me</span>
            </Link>
          </div>

          {/* 标题（现代技术出版物排版） */}
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              <span className="block text-lg font-normal text-muted-foreground sm:text-xl">
                Hi, I&apos;m {siteConfig.author}
              </span>
              <span className="mt-1 block font-medium">Building with TypeScript,</span>
              <span className="block font-medium text-foreground/90">AI Agents and the Web.</span>
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              记录软件工程、AI Agent、Web 开发与技术研究。
            </p>
          </div>

          {/* 导航与动作按钮（无框化设计） */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              href="/blog"
              className="inline-flex items-center justify-center rounded-xl bg-foreground px-5 py-2.5 text-xs font-medium text-background transition-opacity hover:opacity-90 sm:text-sm"
            >
              阅读文章
            </Link>

            <Link
              href="/about"
              className="inline-flex items-center justify-center rounded-xl bg-muted/65 px-5 py-2.5 text-xs font-medium text-foreground backdrop-blur-sm transition-colors hover:bg-muted sm:text-sm"
            >
              About Me
            </Link>

            {githubItem && (
              <a
                href={githubItem.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground sm:text-sm"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4"
                >
                  <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                  <path d="M9 18c-4.51 2-5-2-7-2" />
                </svg>
                <span>GitHub</span>
              </a>
            )}
          </div>
        </div>

        {/* 头像与首字母标牌（去硬边框，自然阴影） */}
        <div className="relative shrink-0">
          {profile.avatar ? (
            <Image
              src={profile.avatar}
              alt={siteConfig.author}
              width={128}
              height={128}
              priority
              className="size-24 rounded-2xl bg-muted/40 object-cover shadow-sm sm:size-28 lg:size-32"
            />
          ) : (
            <div
              aria-label={siteConfig.author}
              className="flex size-24 select-none items-center justify-center rounded-2xl bg-muted/60 text-3xl font-bold text-foreground shadow-sm sm:size-28 sm:text-4xl lg:size-32"
            >
              {firstLetter}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
