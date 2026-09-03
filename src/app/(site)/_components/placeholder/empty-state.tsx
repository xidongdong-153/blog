/**
 * 占位页内容。功能还没实现的路由统一用它：说明这个页面要做什么、
 * 对应的 TODO 记录在 README 的功能清单里。
 */
export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-10">
      <p className="text-lg font-semibold">{title}</p>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      <p className="mt-2 text-xs tracking-widest text-muted-foreground uppercase">TODO</p>
    </div>
  )
}
