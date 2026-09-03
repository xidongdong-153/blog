import type { Metadata } from 'next'
import { EmptyState } from '../_components/placeholder/empty-state'

export const metadata: Metadata = {
  title: '项目',
}

export default function ProjectsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">项目</h1>
      <EmptyState
        title="项目展示待实现"
        description="计划从 GitHub 读取仓库数据，按类型分组展示项目卡片、star 数和主页链接。"
      />
    </div>
  )
}
