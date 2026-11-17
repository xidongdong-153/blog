interface PageHeaderProps {
  eyebrow: string
  title: string
  description: string
}

/** 五个一级内容页共用的标题区。 */
export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-2 border-b border-hair pb-6">
      <p className="font-mono text-[11px] tracking-[0.22em] text-muted-foreground/80 uppercase">{eyebrow}</p>
      <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">{title}</h1>
      <p className="max-w-[46rem] text-sm leading-relaxed text-muted-foreground">{description}</p>
    </header>
  )
}
