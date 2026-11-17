import type { Metadata } from 'next'
import Link from 'next/link'
import { FriendApplyForm } from '@/app/(site)/_components/links/friend-apply-form'

export const metadata: Metadata = {
  title: '交换友链',
  description: '喜东东小站的友链申请与邀请页面。',
}

export default function FriendApplyPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <div>
        <Link
          href="/links"
          className="group/ink inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-primary"
        >
          <span aria-hidden="true" className="ink-glide group-hover/ink:-translate-x-1">
            ←
          </span>
          <span className="ink-line">返回友链列表</span>
        </Link>
      </div>

      <header className="flex flex-col gap-2 border-b border-hair pb-6">
        <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">来交换友链吧</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          欢迎原创技术博客、独立开发者或数字花园交换链接。为保证阅读体验，希望你的小站拥有独立域名，以原创技术与设计内容为主，且无低俗干扰广告。
        </p>
      </header>

      <FriendApplyForm />
    </div>
  )
}
