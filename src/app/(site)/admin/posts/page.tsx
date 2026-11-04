import type { Metadata } from 'next'
import { PostList } from '@/app/(site)/_components/admin/posts/post-list'
import { requirePostAdmin } from '@/server/modules/posts/posts-admin'
import { getManagedPostList } from '@/server/modules/posts/posts.service'

export const metadata: Metadata = { title: '文章管理' }

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>
}) {
  await requirePostAdmin()
  const params = await searchParams
  const query = (params.q ?? '').slice(0, 240)
  const status = params.status === 'draft' || params.status === 'published' ? params.status : 'all'
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1)
  const data = await getManagedPostList({ query, status, page })
  return <PostList data={data} query={query} status={status} />
}
