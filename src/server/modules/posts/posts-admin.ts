import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getSession, isSiteAdmin } from '@/server/modules/auth/auth.service'

export async function requirePostAdmin(): Promise<void> {
  const session = await getSession(await headers())
  if (!session?.user?.id || !isSiteAdmin(session.user)) notFound()
}
