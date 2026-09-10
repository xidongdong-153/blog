import type { SummaryProtocol, UpstreamModelItem } from '@/server/infra/ai/types'

export type { SummaryProtocol, UpstreamModelItem }

export type AiSummaryConfigStatus = 'needs_check' | 'ready'

export interface AiSummaryConfigDto {
  id: string
  protocol: SummaryProtocol
  baseUrl: string
  modelId: string
  hasCredential: boolean
  credentialMask: string | null
  status: AiSummaryConfigStatus
  revision: number
  checkedAt: number | null
  updatedAt: number
  masterKeyAvailable: boolean
}

export interface SaveAiSummaryConfigInput {
  protocol: SummaryProtocol
  baseUrl: string
  modelId: string
  apiKey?: string
}

export interface GetAvailableSummaryModelsInput {
  baseUrl?: string
  apiKey?: string
}
