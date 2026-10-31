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
  /** 关联的博客专栏 ID，若配置则展示配套教程链接 */
  seriesId?: string
  status: 'active' | 'maintained' | 'experimental' | 'archived'
}

const STATUS_CONFIG: Record<Project['status'], { label: string; className: string }> = {
  active: { label: '活跃', className: 'text-emerald-700 dark:text-emerald-400' },
  maintained: { label: '维护中', className: 'text-primary' },
  experimental: { label: '实验性', className: 'text-amber-700 dark:text-amber-400' },
  archived: { label: '已归档', className: 'text-muted-foreground' },
}

const PROJECTS: Project[] = [
  {
    title: 'Pi Agent Desktop',
    description: '基于 Pi SDK 核心框架构建的个人专属 AI 工作台，探索会话生命周期调度与多 Agent 协同。',
    tags: ['TypeScript', 'Pi SDK', 'AI Agent', 'Desktop'],
    github: 'https://github.com/xidongdong-153/blog',
    seriesId: 'pi-agent-desktop',
    status: 'experimental',
  },
  {
    title: 'Personal Blog',
    description: '采用 Next.js 16 与 React 19 构建的技术博客，落地纸本暖色调、西文衬线排版与轨道式阅读导轨。',
    tags: ['Next.js 16', 'React 19', 'Tailwind CSS 4', 'TypeScript'],
    github: 'https://github.com/xidongdong-153/blog',
    status: 'active',
  },
  {
    title: 'Starter',
    description:
      'TypeScript 全栈 Monorepo 脚手架，包含 Next.js 前台、Vite React 管理后台与 Hono API 服务，集成 Better Auth、Drizzle ORM 与 SQLite。',
    tags: ['TypeScript', 'Turborepo', 'Next.js', 'Hono', 'Drizzle ORM'],
    github: 'https://github.com/xidongdong-153/starter',
    status: 'maintained',
  },
]

export default function ProjectsPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 sm:gap-10">
      <PageHeader eyebrow="作品与开源" title="项目" description="开源工具、Web 应用与 AI Agent 实践项目。" />

      <div className="grid gap-4 sm:grid-cols-2">
        {PROJECTS.map((project) => {
          const status = STATUS_CONFIG[project.status]
          return (
            <div
              key={project.title}
              className="flex min-w-0 flex-col justify-between rounded-lg border border-border/60 bg-card/30 p-5 sm:p-6"
            >
              <div className="flex flex-col gap-2.5">
                <div className="font-mono text-xs tracking-wider text-muted-foreground">
                  <span className={status.className}>状态: {status.label}</span>
                </div>

                <h2 className="font-serif text-xl font-medium tracking-tight text-foreground">
                  {project.href ? (
                    <Link
                      href={project.href}
                      className="rounded-sm hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                    >
                      {project.title}
                    </Link>
                  ) : (
                    <span>{project.title}</span>
                  )}
                </h2>

                <p className="text-sm leading-relaxed text-muted-foreground">{project.description}</p>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <div className="flex flex-wrap gap-2 font-mono text-xs text-muted-foreground">
                  {project.tags.map((tag) => (
                    <span key={tag} className="select-none">
                      #{tag}
                    </span>
                  ))}
                </div>

                {(project.github || project.seriesId) && (
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/30">
                    {project.github && (
                      <a
                        href={project.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-sm font-mono text-xs text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                      >
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
                          <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                          <path d="M9 18c-4.51 2-5-2-7-2" />
                        </svg>
                        <span>源码仓库 →</span>
                      </a>
                    )}

                    {project.seriesId && (
                      <Link
                        href={`/blog/series/${project.seriesId}`}
                        className="inline-flex min-h-11 items-center gap-1 rounded-sm font-mono text-xs text-primary transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                      >
                        <span>配套系列教程</span>
                        <span>→</span>
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
