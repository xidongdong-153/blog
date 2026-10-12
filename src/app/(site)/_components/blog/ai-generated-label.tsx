/** 仅 AI 生成的文章显示来源文字，文章和搜索结果共用。 */
export function AiGeneratedLabel({ aiGenerated }: { aiGenerated: boolean }) {
  if (!aiGenerated) return null

  return <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">AI 生成</span>
}
