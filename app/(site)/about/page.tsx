import type { Metadata } from 'next'
import { EmptyState } from '../_components/placeholder/empty-state'

export const metadata: Metadata = {
  title: '关于',
}

export default function AboutPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">关于</h1>
      <EmptyState title="关于页待实现" description="计划放个人介绍、技能栈、常用工具和外部平台数据。" />
    </div>
  )
}
