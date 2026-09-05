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
 * 居中卷首布局：
 * - Background: 动态 SpatialField 全幅延展，径向 mask 边缘柔和羽化
 * - Content: 英文署名、头像、衬线主标题、开发方向、CTA 与滚动提示
 */
export function Hero({ profile }: HeroProps) {
  const githubItem = siteConfig.social.find(
    (item) => item.name.toLowerCase() === 'github' || item.href.includes('github.com'),
  )

  return (
    <section lang="en" className="relative flex min-h-[85vh] flex-col items-center justify-center py-12 text-center">
      {/* 动态空间场背景：全宽无界延展，通过大椭圆径向 mask 边缘柔和羽化至纯透明，融入全站氛围顶光 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-1/2 w-screen -translate-x-1/2 overflow-hidden [mask-image:radial-gradient(ellipse_65%_55%_at_50%_50%,black_15%,transparent_85%)] [-webkit-mask-image:radial-gradient(ellipse_65%_55%_at_50%_50%,black_15%,transparent_85%)]"
      >
        <SpatialField className="absolute inset-0" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* 署名式元数据：无状态点、底色与胶囊轮廓 */}
        <div className="flex w-full max-w-md items-center justify-center gap-3 font-mono text-xs tracking-wider text-muted-foreground sm:gap-4">
          <span aria-hidden="true" className="h-px w-6 shrink-0 bg-border/70 sm:w-10" />
          <div className="flex items-center justify-center whitespace-nowrap">
            {profile.location && (
              <>
                <span>{profile.location}</span>
                <span aria-hidden="true" className="mx-2 text-border sm:mx-3">
                  /
                </span>
              </>
            )}
            <span>XDD</span>
            <span aria-hidden="true" className="mx-2 text-border sm:mx-3">
              /
            </span>
            <Link
              href="/contact"
              className="text-foreground/75 underline decoration-border underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Contact <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <span aria-hidden="true" className="h-px w-6 shrink-0 bg-border/70 sm:w-10" />
        </div>

        {/* 圆形头像：居中卷首的视觉锚点 */}
        {profile.avatar ? (
          <Image
            src={profile.avatar}
            alt={siteConfig.author}
            width={80}
            height={80}
            priority
            className="size-16 rounded-full object-cover ring-1 ring-border/60 sm:size-20"
          />
        ) : (
          <div className="flex size-16 select-none items-center justify-center rounded-full bg-muted/60 font-serif text-xl font-bold text-foreground ring-1 ring-border/60 sm:size-20">
            {siteConfig.author.trim().slice(0, 1)}
          </div>
        )}

        {/* 英文主标题与开发方向 */}
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-balance font-serif text-4xl font-normal leading-[1.08] tracking-normal text-foreground sm:text-6xl lg:text-7xl">
            <span className="block">I build software</span>{' '}
            <span className="block">
              and <span className="italic text-primary">AI agents.</span>
            </span>
          </h1>
          <p className="text-balance font-serif text-base text-muted-foreground sm:text-lg">{profile.tagline}</p>
        </div>

        {/* CTA 排：黑胶囊 + 描边胶囊 + GitHub 图标 */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/blog"
            className="inline-flex items-center justify-center rounded-full bg-foreground px-6 py-2.5 text-xs font-medium text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:text-sm"
          >
            Writing
          </Link>

          <Link
            href="/about"
            className="inline-flex items-center justify-center rounded-full border border-border px-6 py-2.5 text-xs font-medium text-foreground transition-colors hover:border-foreground/30 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:text-sm"
          >
            About
          </Link>

          {githubItem && (
            <a
              href={githubItem.href}
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
              className="inline-flex items-center justify-center rounded-full p-2.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
            </a>
          )}
        </div>
      </div>

      {/* 向下滚动提示：细竖线 + 下方指示符 + 呼吸动效 */}
      <div aria-hidden="true" className="absolute bottom-6 left-1/2 -translate-x-1/2">
        <div className="flex flex-col items-center animate-pulse motion-reduce:animate-none">
          <div className="h-8 w-px bg-border" />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-3 stroke-border"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </div>
    </section>
  )
}
