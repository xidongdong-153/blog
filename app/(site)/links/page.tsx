import type { Metadata } from 'next'
import { EmptyState } from '../_components/placeholder/empty-state'

export const metadata: Metadata = {
  title: '友链',
}

export default function LinksPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">友链</h1>
      <EmptyState
        title="友链列表待实现"
        description="计划用 public/links.json 存友链数据，渲染头像、站点名、描述和申请方式。"
      />
    </div>
  )
}
