/* eslint-disable next/no-img-element */
import type { Metadata } from 'next'
import { CopyInviteButton } from '@/app/(site)/_components/links/copy-invite-button'
import { FriendApplyButton } from '@/app/(site)/_components/links/friend-apply-button'
import { FriendsConstellation } from '@/app/(site)/_components/links/friends-constellation'
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
          <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">友链</h1>
        </div>

        <div className="flex items-baseline gap-1.5 sm:text-right">
          <span className="font-sans text-4xl font-light tabular-nums text-foreground">{friendLinksList.length}</span>
          <span className="text-xs text-muted-foreground">位</span>
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

      {/* 无卡片友链站点网格 */}
      <section className="flex flex-col gap-6">
        <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-hair pb-3">
          <h2 className="font-serif text-2xl font-normal tracking-wide text-foreground">常逛的站</h2>
          <FriendApplyButton className="group/ink inline-flex min-h-9 cursor-pointer items-center gap-1.5 font-mono text-xs text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
        </div>

        {friendLinksList.length > 0 ? (
          <div className="grid gap-x-12 gap-y-5 sm:grid-cols-2">
            {friendLinksList.map((link) => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ink-row group/item flex min-w-0 flex-col justify-between border-b border-hair py-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
              >
                <div className="ink-glide flex flex-col gap-2 group-hover/item:translate-x-2 group-focus-visible/item:translate-x-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      {link.avatarUrl ? (
                        <img
                          src={link.avatarUrl}
                          alt={link.name}
                          className="size-6 shrink-0 rounded-[7px] border border-hair object-cover"
                        />
                      ) : null}
                      <h3 className="truncate font-serif text-lg font-medium text-foreground transition-colors group-hover/item:text-primary">
                        {link.name}
                      </h3>
                    </div>
                    <span className="ink-glide shrink-0 font-mono text-xs text-muted-foreground/70 group-hover/item:translate-x-0.5 group-hover/item:-translate-y-0.5 group-hover/item:text-primary">
                      ↗
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{link.description}</p>
                  <span className="pt-1 break-all font-mono text-xs text-muted-foreground/75">
                    {link.url.replace(/^https?:\/\//, '')}
                  </span>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <p className="py-8 text-sm leading-relaxed text-muted-foreground">还没有友链。</p>
        )}
      </section>

      {/* 互换规则契约 */}
      <section className="flex max-w-[46rem] flex-col gap-4 border-t border-hair pt-8">
        <h2 className="font-serif text-2xl font-normal tracking-wide text-foreground">交换友链</h2>
        <div className="flex flex-col gap-3 text-[15px] leading-7 text-foreground/85">
          <p>经常更新的原创个人站都可以换，域名能正常访问就行。</p>
        </div>

        <div className="mt-2 flex flex-col gap-3 border-y border-hair py-5 font-mono text-xs text-muted-foreground">
          <div className="space-y-1">
            <div className="mb-2 font-semibold text-foreground">本站信息</div>
            <div>名称：{siteConfig.title}</div>
            <div>简介：{siteConfig.description}</div>
            <div>作者：{siteConfig.author}</div>
            <div className="break-all">网址：{siteConfig.url}</div>
          </div>
          <div className="pt-1">
            <CopyInviteButton />
          </div>
        </div>
      </section>
    </div>
  )
}
