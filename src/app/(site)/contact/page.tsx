import type { Metadata } from 'next'
import { ArrowUpRight } from 'lucide-react'
import { siteConfig } from '@/site.config'

export const metadata: Metadata = {
  title: '联系',
}

export default function ContactPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
      <header className="flex flex-col gap-2 border-b border-hair pb-6">
        <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">联系</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">沟通交流、项目探讨与反馈通道。</p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-xs tracking-wider text-muted-foreground">直接联系</h2>
        <div className="flex flex-col divide-y divide-hair border-t border-hair">
          {siteConfig.social.map((item) => (
            <a
              key={item.name}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="ink-row group/item block py-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >
              <div className="ink-glide flex items-center justify-between gap-4 group-hover/item:translate-x-2 group-focus-visible/item:translate-x-2">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-serif text-lg font-medium text-foreground transition-colors group-hover/item:text-primary">
                    {item.name}
                  </span>
                  <span className="truncate font-mono text-xs text-muted-foreground">
                    {item.href.replace(/^https?:\/\//, '')}
                  </span>
                </div>
                <ArrowUpRight
                  aria-hidden="true"
                  className="ink-glide size-4 shrink-0 text-muted-foreground group-hover/item:translate-x-0.5 group-hover/item:-translate-y-0.5 group-hover/item:text-primary"
                />
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3 border-t border-hair pt-8">
        <h2 className="font-serif text-2xl font-normal tracking-wide text-foreground">交流说明</h2>
        <div className="flex flex-col gap-2.5 text-sm leading-relaxed text-muted-foreground">
          <p>如果你有关于文章、技术探讨或开源合作的交流想法，可以通过上方渠道联系我。</p>
          <p>也可以在任一文章详情页下方的评论区留言交流。</p>
        </div>
      </section>
    </div>
  )
}
