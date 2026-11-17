/* eslint-disable next/no-img-element */
import type { Metadata } from 'next'
import { CopyInviteButton } from '@/app/(site)/_components/links/copy-invite-button'
import { FriendApplyButton } from '@/app/(site)/_components/links/friend-apply-button'
import { FriendsConstellation } from '@/app/(site)/_components/links/friends-constellation'
import { PaperSurface } from '@/app/(site)/_components/site/paper-surface'
import { getApprovedFriendLinks } from '@/server/modules/links/links.service'
import { siteConfig } from '@/site.config'

export const metadata: Metadata = {
  title: '友链',
}

export default async function LinksPage() {
  const friendLinksList = await getApprovedFriendLinks()

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 sm:gap-12">
      {/* 页面头：左标题 + 右数字统计 */}
      <header className="flex flex-col justify-between gap-4 border-b border-hair pb-6 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[11px] tracking-[0.22em] text-muted-foreground/80 uppercase">Friends · 友邻</p>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">朋友们</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">海内存知己，天涯若比邻。</p>
        </div>

        <div className="flex items-baseline gap-1.5 sm:text-right">
          <span className="font-sans text-4xl font-light tabular-nums text-foreground">{friendLinksList.length}</span>
          <span className="text-xs text-muted-foreground">位友邻</span>
        </div>
      </header>

      {/* 交互式友邻星图 */}
      <FriendsConstellation
        friends={friendLinksList.map((link) => ({
          name: link.name,
          url: link.url,
          description: link.description,
          avatarUrl: link.avatarUrl,
        }))}
      />

      {/* 友链站点网格 */}
      <section className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-serif text-2xl font-normal tracking-wide text-foreground">推荐站点</h2>
          <FriendApplyButton className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-hair bg-card/90 px-3.5 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary/45 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
        </div>

        {friendLinksList.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {friendLinksList.map((link) => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative isolate flex min-w-0 flex-col justify-between rounded-lg p-5 transition-all duration-300 ease-[var(--ease-spring)] hover:-translate-y-0.5 hover:[&>span]:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring sm:p-6"
              >
                <PaperSurface className="bg-card/90" />
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {link.avatarUrl ? (
                        <img
                          src={link.avatarUrl}
                          alt={link.name}
                          className="size-6 rounded-[7px] border border-hair object-cover"
                        />
                      ) : null}
                      <h3 className="font-serif text-lg font-medium text-foreground transition-colors group-hover:text-primary">
                        {link.name}
                      </h3>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground/70 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary">
                      ↗
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{link.description}</p>
                </div>

                <div className="mt-4 border-t border-hair pt-2.5">
                  <span className="break-all font-mono text-xs text-muted-foreground/80">
                    {link.url.replace(/^https?:\/\//, '')}
                  </span>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <p className="py-8 text-sm leading-relaxed text-muted-foreground">
            暂无友链。双方确认交换后，站点会展示在这里。
          </p>
        )}
      </section>

      {/* 互换规则契约 */}
      <section className="flex max-w-[46rem] flex-col gap-4 border-t border-hair pt-8">
        <h2 className="font-serif text-2xl font-normal tracking-wide text-foreground">友链申请约定</h2>
        <div className="flex flex-col gap-3 text-[15px] leading-7 text-foreground/85">
          <p>欢迎原创技术博客、独立开发者或数字花园交换链接。为保证阅读体验，希望你的站点：</p>
          <ul className="flex flex-col gap-1.5 ps-5 text-sm text-muted-foreground">
            <li className="list-disc">具有独立域名并保持稳定访问</li>
            <li className="list-disc">以原创技术、设计或开发实践为主</li>
            <li className="list-disc">排版整洁，无低俗推广与广告干扰</li>
          </ul>
        </div>

        <div className="relative isolate mt-2 flex flex-col gap-3 rounded-lg p-5 font-mono text-xs text-muted-foreground">
          <PaperSurface className="bg-card/90" />
          <div>
            <div className="mb-2 font-semibold text-foreground">本站信息</div>
            <div>名称：{siteConfig.title}</div>
            <div>简介：{siteConfig.description}</div>
            <div>作者：{siteConfig.author}</div>
            <div className="break-all">网址：{siteConfig.url}</div>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-hair pt-3">
            <CopyInviteButton />
          </div>
        </div>
      </section>
    </div>
  )
}
