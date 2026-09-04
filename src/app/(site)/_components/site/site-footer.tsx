import { siteConfig } from '@/site.config'

export function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-20 border-t border-border/40 py-8 text-xs text-muted-foreground">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
        <div className="flex flex-col gap-1 text-center sm:text-left">
          <div className="font-mono uppercase tracking-wider text-foreground">{siteConfig.title}</div>
          <p className="text-muted-foreground/70">
            © {year} {siteConfig.author}. Built with Next.js &amp; TypeScript.
          </p>
        </div>

        <nav className="flex items-center gap-4 font-mono uppercase tracking-wider">
          {siteConfig.social.map((item) => (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-foreground"
            >
              {item.name} ↗
            </a>
          ))}
        </nav>
      </div>
    </footer>
  )
}
