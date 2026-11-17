import { Sparkles } from 'lucide-react'

interface AiSummaryProps {
  summary: string
}

/**
 * 文章关键洞察提要（无卡片外壳，采用上下发丝线刊头提要样式）。
 */
export function AiSummary({ summary }: AiSummaryProps) {
  if (!summary || !summary.trim()) {
    return null
  }

  return (
    <section aria-label="AI 摘要" className="border-y border-hair py-5">
      <div className="mb-2 flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
        <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
        <span>AI 摘要</span>
      </div>
      <p className="break-words font-sans text-sm leading-7 text-foreground/85">{summary.trim()}</p>
    </section>
  )
}
