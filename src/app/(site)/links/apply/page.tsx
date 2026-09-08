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
      {/* 顶部导航 */}
      <div>
        <Link
          href="/links"
          className="group inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <span className="transition-transform group-hover:-translate-x-0.5">←</span>
          <span>返回友链列表</span>
        </Link>
      </div>

      {/* 页面主标题区 */}
      <div className="flex flex-col gap-2 border-b border-border/40 pb-6">
        <div className="font-mono text-xs tracking-wider text-muted-foreground">// 交换友链 / CONNECT</div>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">来交换友链吧</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          欢迎原创技术博客、独立开发者或数字花园交换链接。为保证阅读体验，希望你的小站拥有独立域名，以原创技术与设计内容为主，且无低俗干扰广告。
        </p>
      </div>

      {/* 申请表单 */}
      <FriendApplyForm />
    </div>
  )
}
