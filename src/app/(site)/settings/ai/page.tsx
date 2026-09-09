import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getSession, isSiteAdmin } from '@/server/auth/session'
import { isMasterKeyConfigured } from '@/server/infra/ai/credential-crypto'
import { AiSummarySettingsForm } from '../../_components/settings/ai-summary-settings-form'

export const metadata: Metadata = {
  title: 'AI 摘要配置',
}

export default async function AiSettingsPage() {
  const reqHeaders = await headers()
  const session = await getSession(reqHeaders)

  if (!session?.user?.id || !isSiteAdmin(session.user.email)) {
    notFound()
  }

  const masterKeyAvailable = isMasterKeyConfigured()

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      {/* 头部元数据与标题 */}
      <header className="mb-8 flex flex-col gap-2">
        <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          // PRIVATE SETTINGS / AI_CONFIG
        </div>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">AI 摘要配置</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          维护博客文章摘要所使用的模型协议、中转地址与访问凭据。配置变更后需测试通过方可启用。
        </p>
      </header>

      {/* 设置表单主体 */}
      <AiSummarySettingsForm initialMasterKeyAvailable={masterKeyAvailable} />
    </div>
  )
}
