import type { Metadata } from 'next'
import { EmptyState } from '../_components/placeholder/empty-state'

export const metadata: Metadata = {
  title: '联系',
}

export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-3xl flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">联系</h1>
      <EmptyState
        title="联系页待实现"
        description="计划放邮箱、微信二维码展示和社交账号。二维码图片放 public/ 目录。"
      />
    </div>
  )
}
