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
 * 居中卷首布局（参考 innei.in / pear.no 的出版物封面手法）：
 * - Background: 动态 SpatialField 全幅延展，径向 mask 边缘柔和羽化
 * - Content: 徽章排、圆形头像、衬线巨标题（斜体词高亮）、全大写副标题、斜体金句、CTA 排、滚动提示
 */
export function Hero({ profile }: HeroProps) {
  const githubItem = siteConfig.social.find(
    (item) => item.name.toLowerCase() === 'github' || item.href.includes('github.com'),
  )

  return (
    <section className="relative flex min-h-[85vh] flex-col items-center justify-center py-12 text-center">
      {/* 动态空间场背景：全宽无界延展，通过大椭圆径向 mask 边缘柔和羽化至纯透明，融入全站氛围顶光 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-1/2 w-screen -translate-x-1/2 overflow-hidden [mask-image:radial-gradient(ellipse_65%_55%_at_50%_50%,black_15%,transparent_85%)] [-webkit-mask-image:radial-gradient(ellipse_65%_55%_at_50%_50%,black_15%,transparent_85%)]"
      >
        <SpatialField className="absolute inset-0" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* 状态徽章与位置 */}
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1 text-xs font-mono text-muted-foreground backdrop-blur-sm">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500 motion-reduce:animate-none" />
            <span>独立开发 · 全栈 · 智能体</span>
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
            <span>联系我</span>
          </Link>
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

        {/* 巨标题：第一行常规体，第二行斜体高亮 */}
        <h1 className="tracking-tight text-foreground">
          <span className="block font-serif text-5xl font-normal leading-[1.1] sm:text-6xl lg:text-7xl">
            造东西的人，
          </span>
          <span className="block font-serif text-5xl font-normal italic leading-[1.1] text-primary sm:text-6xl lg:text-7xl">
            也让机器造东西。
          </span>
        </h1>

        {/* 全大写副标题（站点定位） */}
        <p className="max-w-2xl font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground sm:text-sm">
          {profile.tagline}
        </p>

        {/* 斜体金句 */}
        <p className="font-serif text-base italic text-muted-foreground sm:text-lg">「{profile.quote}」</p>

        {/* CTA 排：黑胶囊 + 描边胶囊 + GitHub 图标 */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/blog"
            className="inline-flex items-center justify-center rounded-full bg-foreground px-6 py-2.5 text-xs font-medium text-background transition-opacity hover:opacity-90 sm:text-sm"
          >
            阅读文章
          </Link>

          <Link
            href="/about"
            className="inline-flex items-center justify-center rounded-full border border-border px-6 py-2.5 text-xs font-medium text-foreground transition-colors hover:border-foreground/30 hover:bg-muted/40 sm:text-sm"
          >
            关于我
          </Link>

          {githubItem && (
            <a
              href={githubItem.href}
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
              className="inline-flex items-center justify-center rounded-full p-2.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
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
