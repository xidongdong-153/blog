import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@/server/infra/db/client'
import { account, session, user, verification } from '@/server/infra/db/schema/auth'

function getSocialProviders() {
  const providers: Record<string, { clientId: string; clientSecret: string }> = {}

  const githubClientId = process.env.OAUTH_GITHUB_CLIENT_ID?.trim()
  const githubClientSecret = process.env.OAUTH_GITHUB_CLIENT_SECRET?.trim()
  if (githubClientId && githubClientSecret) {
    providers.github = {
      clientId: githubClientId,
      clientSecret: githubClientSecret,
    }
  }

  const googleClientId = process.env.OAUTH_GOOGLE_CLIENT_ID?.trim()
  const googleClientSecret = process.env.OAUTH_GOOGLE_CLIENT_SECRET?.trim()
  if (googleClientId && googleClientSecret) {
    providers.google = {
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    }
  }

  return providers
}

function getTrustedOrigins(): string[] {
  const origins = new Set<string>(['http://localhost:4400', 'http://127.0.0.1:4400'])
  const siteUrl = process.env.BETTER_AUTH_URL?.trim()
  if (siteUrl) {
    try {
      origins.add(new URL(siteUrl).origin)
    } catch {
      origins.add(siteUrl)
    }
  }
  return Array.from(origins)
}

export function getAuthSecret(options?: { secret?: string; nodeEnv?: string }): string {
  const configuredSecret = (options?.secret !== undefined ? options.secret : process.env.BETTER_AUTH_SECRET)?.trim()
  const isProduction = (options?.nodeEnv !== undefined ? options.nodeEnv : process.env.NODE_ENV) === 'production'

  if (isProduction) {
    if (!configuredSecret) {
      throw new Error('[Better Auth] 生产环境缺少 BETTER_AUTH_SECRET 环境变量，服务启动失败')
    }
    if (configuredSecret.length < 32) {
      throw new Error('[Better Auth] 生产环境 BETTER_AUTH_SECRET 长度不足（至少需 32 字符），服务启动失败')
    }
    return configuredSecret
  }

  return configuredSecret || 'default-secret-for-dev-and-cli-runs-only-min-32-chars-long'
}

export const auth = betterAuth({
  appName: '喜东东的博客',
  basePath: '/api/auth',
  baseURL: process.env.BETTER_AUTH_URL?.trim() || 'http://localhost:4400',
  secret: getAuthSecret(),
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema: {
      user,
      session,
      account,
      verification,
    },
  }),
  account: {
    accountLinking: {
      enabled: true,
      requireLocalEmailVerified: false,
    },
  },
  socialProviders: getSocialProviders(),
  trustedOrigins: getTrustedOrigins(),
})

export type AuthInstance = typeof auth
