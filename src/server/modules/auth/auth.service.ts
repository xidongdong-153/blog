import { eq } from 'drizzle-orm'
import { db } from '@/server/infra/db/client'
import { account } from '@/server/infra/db/schema/auth'
import { auth } from './auth.config'

export type AuthSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>

export interface PublicAuthConfig {
  providers: {
    github: boolean
    google: boolean
  }
  isOwner: boolean
}

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
 * 获取公开认证配置（社交登录可用性与当前访问者是否为站长）
 */
export async function getPublicAuthConfig(headers: Headers): Promise<PublicAuthConfig> {
  const session = await getSession(headers)
  const isOwner = isSiteAdmin(session?.user?.email)

  return {
    providers: {
      github: Boolean(process.env.OAUTH_GITHUB_CLIENT_ID?.trim() && process.env.OAUTH_GITHUB_CLIENT_SECRET?.trim()),
      google: Boolean(process.env.OAUTH_GOOGLE_CLIENT_ID?.trim() && process.env.OAUTH_GOOGLE_CLIENT_SECRET?.trim()),
    },
    isOwner,
  }
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
