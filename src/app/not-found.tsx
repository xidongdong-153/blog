import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">// 404 NOT FOUND</div>
      <h1 className="font-serif text-5xl font-medium tracking-tight text-foreground">页面不存在</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">所请求的页面已被移动、删除或从未存在。</p>
      <Link
        href="/"
        className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-card/40 px-4 py-2 font-mono text-xs uppercase text-muted-foreground transition-all hover:border-foreground/30 hover:bg-muted/30 hover:text-foreground"
      >
        <span>← 返回首页</span>
      </Link>
    </div>
  )
}
