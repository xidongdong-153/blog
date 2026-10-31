/* eslint-disable next/no-img-element */
import type { Metadata } from 'next'
import { CopyInviteButton } from '@/app/(site)/_components/links/copy-invite-button'
import { FriendApplyButton } from '@/app/(site)/_components/links/friend-apply-button'
import { getApprovedFriendLinks } from '@/server/modules/links/links.service'
import { siteConfig } from '@/site.config'
import { PageHeader } from '../_components/site/page-header'

export const metadata: Metadata = {
  title: '友链',
}

export default async function LinksPage() {
  const friendLinksList = await getApprovedFriendLinks()

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 sm:gap-10">
      <PageHeader eyebrow="友情链接" title="友链" description="志同道合的技术伙伴、独立博客与设计探索者。" />

      {/* 友链网格 */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-serif text-2xl font-medium tracking-tight text-foreground">推荐站点</h2>
          <FriendApplyButton className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border/60 bg-muted/30 px-3 py-2 font-mono text-xs text-foreground transition-colors hover:border-foreground/30 hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
        </div>
        {friendLinksList.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {friendLinksList.map((link) => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex min-w-0 flex-col justify-between rounded-lg border border-border/60 bg-card/30 p-5 transition-colors hover:border-foreground/30 hover:bg-muted/30 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring sm:p-6"
              >
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {link.avatarUrl ? (
                        <img
                          src={link.avatarUrl}
                          alt={link.name}
                          className="h-5 w-5 rounded border border-border/50 object-cover"
                        />
                      ) : null}
                      <h3 className="font-serif text-lg font-medium text-foreground transition-colors group-hover:text-primary">
                        {link.name}
                      </h3>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground transition-transform group-hover:translate-x-0.5">
                      ↗
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{link.description}</p>
                </div>

                <div className="mt-4 border-t border-border/30 pt-2">
                  <span className="break-all font-mono text-xs text-muted-foreground">
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
      <section className="flex max-w-[46rem] flex-col gap-4 border-t border-border/40 pt-8">
        <h2 className="font-serif text-2xl font-medium tracking-tight text-foreground">友链申请约定</h2>
        <div className="flex flex-col gap-3 text-base leading-7 text-foreground">
          <p>欢迎原创技术博客、独立开发者或数字花园交换链接。为保证阅读体验，希望你的站点：</p>
          <ul className="flex flex-col gap-1.5 ps-5">
            <li className="list-disc">具有独立域名并保持稳定访问</li>
            <li className="list-disc">以原创技术、设计或开发实践为主</li>
            <li className="list-disc">排版整洁，无低俗推广与广告干扰</li>
          </ul>
        </div>

        <div className="mt-2 flex flex-col gap-3 rounded-lg border border-border/60 bg-card/40 p-4 font-mono text-xs text-muted-foreground">
          <div>
            <div className="text-foreground font-semibold mb-1.5">本站信息</div>
            <div>名称：{siteConfig.title}</div>
            <div>简介：{siteConfig.description}</div>
            <div>作者：{siteConfig.author}</div>
            <div className="break-all">网址：{siteConfig.url}</div>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-border/30 pt-3">
            <CopyInviteButton />
          </div>
        </div>
      </section>
    </div>
  )
}
