import type { Metadata } from 'next'
import { EmptyState } from '../_components/placeholder/empty-state'

export const metadata: Metadata = {
  title: '搜索',
}

/**
 * 站内搜索占位。
 *
 * 实现思路（纯静态，无后端）：
 * 1. build 时在 app/search/route.ts 或 public/search.json 输出全部文章和
 *    笔记的标题、描述、正文摘要索引。
 * 2. 本页面做成 client 组件，进入时 fetch 索引，客户端过滤关键词。
 * 3. 中英文分词可用简单的双字切分，不引分词库。
 */
export default function SearchPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">搜索</h1>
      <EmptyState title="站内搜索待实现" description="计划构建时生成静态索引，客户端过滤，无后端。" />
    </div>
  )
}
