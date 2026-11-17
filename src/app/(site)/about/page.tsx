import type { Metadata } from 'next'
import { profileConfig } from '@/profile.config'
import { siteConfig } from '@/site.config'
import { PageHeader } from '../_components/site/page-header'

export const metadata: Metadata = {
  title: '关于',
}

export default function AboutPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 sm:gap-12">
      <PageHeader title="关于" description="关于作者、技术栈与实践记录。" />

      {/* 个人简介与引语 */}
      <section className="flex max-w-[46rem] flex-col gap-5">
        <blockquote className="border-l border-primary/50 pl-4 font-serif text-[15px] leading-relaxed text-foreground/85">
          保持好奇，在代码、交互与 AI 协同的工作流中持续造物。
        </blockquote>

        <h2 className="font-serif text-2xl font-normal tracking-wide text-foreground">现状与方向</h2>
        <div className="flex flex-col gap-3 text-[15px] leading-7 text-foreground/85">
          {profileConfig.about.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <p>
            偏好{' '}
            <span className="bg-[linear-gradient(to_top,color-mix(in_oklch,hsl(var(--primary))_18%,transparent)_42%,transparent_42%)] px-0.5 font-medium">
              TypeScript 全栈体系
            </span>
            ，采用 Next.js 与 Hono 构建端到端类型安全的应用；长期关注{' '}
            <span className="bg-[linear-gradient(to_top,color-mix(in_oklch,hsl(var(--primary))_18%,transparent)_42%,transparent_42%)] px-0.5 font-medium">
              AI Agent 工作流
            </span>
            、界面微动效细节与直观克制的产品体验。
          </p>
        </div>
      </section>

      {/* 无卡片技术体系 */}
      <section className="flex flex-col gap-5 border-t border-hair pt-8">
        <h2 className="font-serif text-2xl font-normal tracking-wide text-foreground">技术体系</h2>
        <div className="grid gap-8 sm:grid-cols-3">
          {profileConfig.skills.map((group) => (
            <div key={group.title} className="flex flex-col gap-3 border-t border-hair pt-4">
              <span className="font-mono text-xs font-medium tracking-wider text-primary">{group.title}</span>
              <ul className="flex flex-col gap-2 font-mono text-xs text-muted-foreground">
                {group.items.map((item) => {
                  const name = typeof item === 'string' ? item : item.name
                  const href = typeof item === 'string' ? undefined : item.href
                  return (
                    <li key={name} className="flex min-w-0 items-center gap-2">
                      <span aria-hidden="true" className="size-1 shrink-0 rounded-full bg-primary/45" />
                      {href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group/ink inline-flex min-w-0 items-center gap-1 rounded-sm [overflow-wrap:anywhere] transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                        >
                          <span className="ink-line min-w-0 [overflow-wrap:anywhere]">{name}</span>
                          <span
                            aria-hidden="true"
                            className="ink-glide shrink-0 group-hover/ink:translate-x-0.5 group-hover/ink:-translate-y-0.5"
                          >
                            ↗
                          </span>
                        </a>
                      ) : (
                        <span className="min-w-0 [overflow-wrap:anywhere]">{name}</span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* 无按钮社交通道 */}
      <section className="flex flex-col gap-4 border-t border-hair pt-8">
        <h2 className="font-serif text-2xl font-normal tracking-wide text-foreground">社交通道</h2>
        <p className="text-sm text-muted-foreground">欢迎交流探讨 AI Agent、Web 开发与 TypeScript 全栈技术。</p>
        <div className="flex flex-wrap gap-6">
          {siteConfig.social.map((item) => (
            <a
              key={item.name}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group/ink inline-flex min-h-9 items-center gap-1.5 font-mono text-xs text-foreground/85 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >
              <span className="ink-line">{item.name}</span>
              <span
                aria-hidden="true"
                className="ink-glide group-hover/ink:translate-x-0.5 group-hover/ink:-translate-y-0.5"
              >
                ↗
              </span>
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}
