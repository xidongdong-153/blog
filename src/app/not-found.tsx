import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-[66vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="font-mono text-xs text-muted-foreground">404</div>
      <h1 className="font-serif text-4xl font-medium tracking-tight text-foreground sm:text-5xl">页面未找到</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">所请求的页面已被移动、撤回或从未存在。</p>
      <Link
        href="/"
        className="group/ink mt-2 inline-flex min-h-10 items-center gap-1.5 font-serif text-sm text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      >
        <span aria-hidden="true" className="ink-glide group-hover/ink:-translate-x-1">
          ←
        </span>
        <span className="ink-line">返回首页</span>
      </Link>
    </div>
  )
}
