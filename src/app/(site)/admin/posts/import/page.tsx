import type { Metadata } from 'next'
import { PostImport } from '@/app/(site)/_components/admin/posts/post-import'
import { requirePostAdmin } from '@/server/modules/posts/posts-admin'

export const metadata: Metadata = { title: '导入文章' }

export default async function ImportPostsPage() {
  await requirePostAdmin()
  return <PostImport />
}
