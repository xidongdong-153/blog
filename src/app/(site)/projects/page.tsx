import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '../_components/site/page-header'

export const metadata: Metadata = {
  title: '项目',
}

interface Project {
  title: string
  description: string
  tags: string[]
  href?: string
  github?: string
  period: string
  status: 'active' | 'maintained' | 'experimental' | 'archived'
}

const STATUS_CONFIG: Record<Project['status'], { label: string; className: string }> = {
  active: { label: '在写', className: 'text-emerald-700 dark:text-emerald-400' },
  maintained: { label: '维护中', className: 'text-primary' },
  experimental: { label: '实验中', className: 'text-amber-700 dark:text-amber-400' },
  archived: { label: '已归档', className: 'text-muted-foreground' },
}

const PROJECTS: Project[] = [
  {
    title: 'Pi meme',
    description:
      '基于 Pi SDK 构建的 AI Agent Desktop 工作台，面向桌面与 Web 编码场景，提供可恢复会话、计划与目标推进、子代理协作、文件与终端面板及插件扩展。',
    tags: ['TypeScript', 'Pi SDK', 'AI Agent', 'Desktop'],
    github: 'https://github.com/xidongdong-153/Pi-meme',
    period: '2026',
    status: 'active',
  },
  {
    title: '个人站点',
    description:
      '当前正在浏览的个人博客，基于 Next.js 与 libSQL/Turso 构建，支持 MDX 文章管理、本地笔记、站内搜索、评论友链、AI 摘要与实时活动状态。',
    tags: ['Next.js 16', 'React 19', 'Tailwind CSS 4', 'Turso'],
    github: 'https://github.com/xidongdong-153/blog',
    period: '2026',
    status: 'active',
  },
]

export default function ProjectsPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 sm:gap-12">
      <PageHeader title="项目" />

      {/* 双栏无框项目网格 */}
      <div className="grid gap-x-12 gap-y-8 sm:grid-cols-2">
        {PROJECTS.map((project) => {
          const status = STATUS_CONFIG[project.status]
          return (
            <article key={project.title} className="flex min-w-0 flex-col justify-between border-b border-hair pb-7">
              <div className="flex flex-col gap-2.5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h2 className="min-w-0 font-serif text-xl font-medium tracking-tight text-foreground [overflow-wrap:anywhere]">
                    {project.href ? (
                      <Link
                        href={project.href}
                        className="ink-link inline-block rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                      >
                        {project.title}
                      </Link>
                    ) : (
                      <span>{project.title}</span>
                    )}
                  </h2>

                  <div className="flex shrink-0 items-center gap-2 font-mono text-xs text-muted-foreground/75">
                    <span className={status.className}>{status.label}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{project.period}</span>
                  </div>
                </div>

                <p className="text-sm leading-relaxed text-muted-foreground">{project.description}</p>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <div className="flex flex-wrap gap-x-2.5 gap-y-1 font-mono text-xs text-muted-foreground/75">
                  {project.tags.map((tag) => (
                    <span key={tag} className="select-none">
                      #{tag}
                    </span>
                  ))}
                </div>

                {project.github && (
                  <div className="flex flex-wrap items-center gap-5 font-mono text-xs">
                    <a
                      href={project.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group/ink inline-flex min-h-9 items-center gap-1 rounded-sm text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                    >
                      <span className="ink-line">源码</span>
                      <span
                        aria-hidden="true"
                        className="ink-glide group-hover/ink:translate-x-0.5 group-hover/ink:-translate-y-0.5"
                      >
                        ↗
                      </span>
                    </a>
                  </div>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
