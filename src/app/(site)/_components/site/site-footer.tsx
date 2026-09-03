import { siteConfig } from '@/site.config'

export function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-stone-200 dark:border-stone-800">
      <div className="mx-auto flex max-w-3xl flex-col gap-2 px-6 py-6 text-sm text-stone-500 dark:text-stone-400">
        <nav className="flex gap-4">
          {siteConfig.social.map((item) => (
            <a key={item.href} href={item.href} target="_blank" rel="noreferrer" className="hover:underline">
              {item.name}
            </a>
          ))}
        </nav>
        <p>
          {year} {siteConfig.author}
        </p>
      </div>
    </footer>
  )
}
