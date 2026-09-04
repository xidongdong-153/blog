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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
      <div className="flex flex-col gap-2 border-b border-border/40 pb-6">
        <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">// SEARCH &amp; INDEX</div>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">搜索</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">站内文章与笔记全文检索。</p>
      </div>
      <EmptyState title="站内搜索待实现" description="计划构建时生成静态索引，客户端过滤，无后端。" />
    </div>
  )
}
