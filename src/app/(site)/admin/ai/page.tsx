import type { Metadata } from 'next'
import { AiWorkspace } from '@/app/(site)/_components/admin/ai/ai-workspace'
import { AiThemeProvider } from '@/app/(site)/_components/admin/ui/ai-theme-provider'
import { getAiAgents } from '@/server/modules/ai/agents.service'
import { getAiSummaryConfig, isAiMasterKeyAvailable } from '@/server/modules/ai/summary-config.service'
import { getAiTools } from '@/server/modules/ai/tools.registry'
import { requirePostAdmin } from '@/server/modules/posts/posts-admin'

export const metadata: Metadata = { title: 'AI' }

/** 站长 AI 工作区，首屏并行读取安全配置与内置角色。 */
export default async function AiPage() {
  await requirePostAdmin()
  const [agents, modelConfig] = await Promise.all([getAiAgents(), getAiSummaryConfig()])
  return (
    <AiThemeProvider>
      <AiWorkspace
        initialAgents={agents}
        initialModelConfig={modelConfig}
        tools={getAiTools()}
        masterKeyAvailable={isAiMasterKeyAvailable()}
      />
    </AiThemeProvider>
  )
}
