import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-[66vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="font-mono text-[11px] tracking-[0.24em] text-muted-foreground/80 uppercase">404 · Not Found</div>
      <h1 className="font-serif text-4xl font-medium tracking-tight text-foreground sm:text-5xl">页面未找到</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">所请求的页面已被移动、撤回或从未存在。</p>
      <Link
        href="/"
        className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-hair bg-card/90 px-4 py-2 font-serif text-xs text-foreground/85 shadow-2xs transition-colors hover:border-primary/45 hover:text-primary"
      >
        <span>← 返回首页</span>
      </Link>
    </div>
  )
}
