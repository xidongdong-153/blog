import { Sparkles } from 'lucide-react'
import { PaperSurface } from '../site/paper-surface'

interface AiSummaryProps {
  summary: string
}

/**
 * 文章关键洞察卡片。
 * 位于标题与正文之间，展示文章核心提炼内容。
 */
export function AiSummary({ summary }: AiSummaryProps) {
  if (!summary || !summary.trim()) {
    return null
  }

  return (
    <section aria-label="关键洞察" className="relative isolate rounded-lg p-5 sm:px-6 sm:py-5">
      <PaperSurface className="bg-card/90" />
      <div className="mb-2.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
        <span>关键洞察</span>
      </div>
      <p className="break-words font-sans text-sm leading-7 text-foreground/85">{summary.trim()}</p>
    </section>
  )
}
