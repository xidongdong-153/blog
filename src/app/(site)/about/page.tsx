import type { Metadata } from 'next'
import { profileConfig } from '@/profile.config'
import { siteConfig } from '@/site.config'

export const metadata: Metadata = {
  title: '关于',
}

export default function AboutPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-12">
      {/* 页面主标题 */}
      <div className="flex flex-col gap-2 border-b border-border/40 pb-6">
        <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">// PROFILE &amp; BIO</div>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">关于</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">关于作者、技术追求与工程哲学。</p>
      </div>

      {/* 个人简介与理念 */}
      <section className="flex flex-col gap-4">
        <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">// 01. INTRODUCTION</div>
        <h2 className="font-serif text-2xl font-medium tracking-tight text-foreground">理念与背景</h2>
        <div className="flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">
          {profileConfig.about.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <p>
            偏好 TypeScript
            系技术栈，坚持短路径与高内聚的系统设计。追求直观敏捷的代码组织，推崇出版物排版的克制感与流体动效的自然呼吸感。
          </p>
        </div>
      </section>

      {/* 技能与技术体系 */}
      <section className="flex flex-col gap-4 border-t border-border/40 pt-8">
        <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">// 02. TECHNICAL STACK</div>
        <h2 className="font-serif text-2xl font-medium tracking-tight text-foreground">技术体系</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {profileConfig.skills.map((group) => (
            <div key={group.title} className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/30 p-4">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-foreground">
                {group.title}
              </span>
              <ul className="flex flex-col gap-1.5 font-mono text-xs text-muted-foreground">
                {group.items.map((item) => (
                  <li key={item} className="flex items-center gap-1.5">
                    <span className="size-1 rounded-full bg-border" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* 社交与联系 */}
      <section className="flex flex-col gap-4 border-t border-border/40 pt-8">
        <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">// 03. CHANNELS</div>
        <h2 className="font-serif text-2xl font-medium tracking-tight text-foreground">社交通道</h2>
        <p className="text-sm text-muted-foreground">欢迎交流探讨软件工程、前端架构与人机交互设计。</p>
        <div className="flex flex-wrap gap-3">
          {siteConfig.social.map((item) => (
            <a
              key={item.name}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-card/40 px-4 py-2 font-mono text-xs uppercase text-muted-foreground transition-all hover:border-foreground/30 hover:bg-muted/30 hover:text-foreground"
            >
              <span>{item.name} →</span>
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}
