import { Sparkles } from 'lucide-react'

interface AiSummaryProps {
  summary: string
}

/**
 * 文章 AI 摘要展示卡片（Server Component）。
 * 位于文章介绍与 MDX 正文之间，提供低对比、无多余嵌套的轻量阅读辅助。
 */
export function AiSummary({ summary }: AiSummaryProps) {
  if (!summary || !summary.trim()) {
    return null
  }

  return (
    <section aria-label="AI 摘要" className="rounded-lg border border-border/60 bg-card/30 p-4 sm:p-5">
      <div className="mb-2 flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        <span>AI 摘要</span>
      </div>
      <p className="text-sm leading-relaxed text-foreground/90 break-words font-sans">{summary.trim()}</p>
    </section>
  )
}
