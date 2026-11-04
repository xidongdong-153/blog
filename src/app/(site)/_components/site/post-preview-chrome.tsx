'use client'

import { usePathname } from 'next/navigation'

/** 工作稿预览保留文章阅读区，隐藏站点页头和页脚。 */
export function PostPreviewChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (pathname.startsWith('/admin/posts/') && pathname.endsWith('/preview')) return null
  return children
}
