import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '项目',
}

interface Project {
  title: string
  description: string
  tags: string[]
  href?: string
  github?: string
  status: 'active' | 'maintained' | 'experimental' | 'archived'
}

const STATUS_CONFIG: Record<Project['status'], { label: string; className: string }> = {
  active: { label: '活跃', className: 'text-emerald-600 dark:text-emerald-400' },
  maintained: { label: '维护中', className: 'text-primary' },
  experimental: { label: '实验性', className: 'text-amber-600 dark:text-amber-400' },
  archived: { label: '已归档', className: 'text-muted-foreground' },
}

const PROJECTS: Project[] = [
  {
    title: 'Personal Blog',
    description: '采用 Next.js 16 与 React 19 构建的技术博客，落地纸本暖色调、西文衬线排版与轨道式阅读导轨。',
    tags: ['Next.js 16', 'React 19', 'Tailwind CSS 4', 'TypeScript'],
    github: 'https://github.com/xidongdong-153/blog',
    status: 'active',
  },
  {
    title: 'Starter Web',
    description: 'TypeScript 全栈模板，包含 Next.js Web、Vite 管理后台与 Hono API，集成 Drizzle ORM 与 Better Auth。',
    tags: ['TypeScript', 'Next.js', 'Hono', 'Drizzle ORM', 'Turborepo'],
    github: 'https://github.com/xidongdong-153/starter',
    status: 'maintained',
  },
  {
    title: 'Trellis Workflow Engine',
    description: '任务驱动的 AI Agent 协作工作流引擎，规范人机协同开发流程与上下文管理。',
    tags: ['AI Agent', 'CLI', 'Workflow', 'Specification'],
    status: 'active',
  },
  {
    title: 'Impeccable Design System',
    description: '高反差技术出版物美学组件库，聚焦工业克制微标、细线导轨与流体交融动效。',
    tags: ['Design System', 'Typography', 'Micro-interactions'],
    status: 'maintained',
  },
]

export default function ProjectsPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
      <div className="flex flex-col gap-2 border-b border-border/40 pb-6">
        <div className="font-mono text-xs tracking-wider text-muted-foreground">// 作品与开源</div>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">项目</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">开源工具、Web 应用与 AI Agent 实践项目。</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {PROJECTS.map((project) => {
          const status = STATUS_CONFIG[project.status]
          return (
            <div
              key={project.title}
              className="group flex flex-col justify-between rounded-lg border border-border/60 bg-card/30 p-5 transition-all hover:border-foreground/30 hover:bg-muted/30"
            >
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between font-mono text-xs tracking-wider text-muted-foreground">
                  <span>// 项目</span>
                  <span className={status.className}>状态: {status.label}</span>
                </div>

                <h2 className="font-serif text-xl font-medium tracking-tight text-foreground transition-colors group-hover:text-primary">
                  {project.href ? (
                    <Link href={project.href} className="hover:underline">
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

                {project.github && (
                  <div className="pt-2 border-t border-border/30">
                    <a
                      href={project.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
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
