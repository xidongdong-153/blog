import { eq } from 'drizzle-orm'
import { db } from '@/server/infra/db/client'
import { account } from '@/server/infra/db/schema/auth'
import { auth } from './config'

export type AuthSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>

/**
 * 从原始请求 Header 中解析 Better Auth Session。若未登录或解析失败返回 null。
 */
export async function getSession(headers: Headers): Promise<AuthSession | null> {
  try {
    const session = await auth.api.getSession({ headers })
    return session
  } catch {
    return null
  }
}

/**
 * 校验指定邮箱是否为站长邮箱（只读取 ADMIN_EMAIL）。
 * 配置缺失、为空或不匹配时统一返回 false。
 */
export function isSiteAdmin(email?: string | null): boolean {
  if (!email) return false
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  if (!adminEmail) return false
  return email.trim().toLowerCase() === adminEmail
}

/**
 * 查询指定用户关联的所有 OAuth 提供商标识（去重排序），用于评论作者来源投影。
 */
export async function getUserProviders(userId: string): Promise<string[]> {
  try {
    const accounts = await db.select({ providerId: account.providerId }).from(account).where(eq(account.userId, userId))
    const providers = Array.from(new Set(accounts.map((a) => a.providerId))).sort()
    return providers
  } catch {
    return []
  }
}
