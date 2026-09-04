/**
 * 占位页内容。功能还没实现的路由统一用它：说明这个页面要做什么、
 * 对应的 TODO 记录在 README 的功能清单里。
 */
export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border/60 bg-card/20 p-8">
      <div className="font-mono text-xs tracking-wider text-muted-foreground">// 待实现</div>
      <p className="font-serif text-lg font-medium text-foreground">{title}</p>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  )
}
