import type { Metadata } from 'next'
import { CopyInviteButton } from '@/app/(site)/_components/links/copy-invite-button'
import { LinksShowcase } from '@/app/(site)/_components/links/links-showcase'
import { getApprovedFriendLinks } from '@/server/modules/links/links.service'
import { siteConfig } from '@/site.config'

export const metadata: Metadata = {
  title: '友链',
}

export default async function LinksPage() {
  const friendLinksList = await getApprovedFriendLinks()

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 sm:gap-12">
      <LinksShowcase links={friendLinksList} />

      {/* 互换规则与本站信息 */}
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
