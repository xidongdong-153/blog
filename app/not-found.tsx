import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-5xl font-bold">404</p>
      <p className="text-stone-500 dark:text-stone-400">这一页不存在。</p>
      <Link href="/" className="underline underline-offset-4">
        回首页
      </Link>
    </div>
  )
}
