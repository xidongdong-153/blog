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
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-xs tracking-wider text-muted-foreground">渠道</h2>
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
        <p className="text-sm leading-relaxed text-muted-foreground">
          有事可以直接在 GitHub 提 Issue，或者去对应文章底下留言。
        </p>
      </section>
    </div>
  )
}
