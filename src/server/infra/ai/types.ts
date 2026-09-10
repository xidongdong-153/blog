export type SummaryProtocol = 'openai-completions' | 'openai-responses' | 'anthropic-messages'

export const SUPPORTED_SUMMARY_PROTOCOLS: readonly SummaryProtocol[] = [
  'openai-completions',
  'openai-responses',
  'anthropic-messages',
] as const

export function isSupportedProtocol(protocol: string): protocol is SummaryProtocol {
  return (SUPPORTED_SUMMARY_PROTOCOLS as readonly string[]).includes(protocol)
}

export interface UpstreamModelItem {
  id: string
  displayName: string
}
