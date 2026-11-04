import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PostEditor } from '@/app/(site)/_components/admin/posts/post-editor'
import { requirePostAdmin } from '@/server/modules/posts/posts-admin'
import { getManagedPost, PostServiceError } from '@/server/modules/posts/posts.service'

export const metadata: Metadata = { title: '编辑文章' }

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePostAdmin()
  const { id } = await params
  try {
    const post = await getManagedPost(id)
    return <PostEditor key={post.id} initial={post} />
  } catch (error) {
    if (error instanceof PostServiceError && error.statusCode === 404) notFound()
    throw error
  }
}
