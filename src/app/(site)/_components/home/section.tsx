import type { ReactNode } from 'react'

interface SectionProps {
  /** 模块标题，如 关于、文章、技术栈 等 */
  title: string
  children: ReactNode
}

/**
 * 首页双列 Section 容器。
 * 桌面端为左标题、右内容布局；移动端自适应堆叠。
 */
export function Section({ title, children }: SectionProps) {
  return (
    <section className="flex flex-col gap-y-5 md:flex-row">
      <h2 className="text-xl font-semibold tracking-tight md:min-w-36">{title}</h2>
      <div className="flex flex-1 flex-col gap-y-4">{children}</div>
    </section>
  )
}
