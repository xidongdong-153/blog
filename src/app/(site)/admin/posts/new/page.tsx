import type { Metadata } from 'next'
import { PostEditor } from '@/app/(site)/_components/admin/posts/post-editor'
import { requirePostAdmin } from '@/server/modules/posts/posts-admin'

export const metadata: Metadata = { title: '新建文章' }

export default async function NewPostPage() {
  await requirePostAdmin()
  return <PostEditor />
}
