'use client'

import type { ModelSettingsState } from './use-model-settings'
import type { SummaryProtocol } from '@/server/modules/ai/ai.types'
import * as Form from '@radix-ui/react-form'
import { Badge, Box, Callout, Flex, Heading, Text } from '@radix-ui/themes'
import { AlertCircle, RefreshCw, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'

const PROTOCOLS: { value: SummaryProtocol; label: string }[] = [
  { value: 'openai-completions', label: 'Chat Completions' },
  { value: 'openai-responses', label: 'Responses' },
  { value: 'anthropic-messages', label: 'Anthropic Messages' },
]

/** 维护 Agent、摘要与初稿共用的默认模型，保留凭据的显式清除确认。 */
export function AiSummarySettingsForm({ state, running }: { state: ModelSettingsState; running: boolean }) {
  const busy = Boolean(state.operation) || running
  return (
    <Box className="max-w-3xl py-6">
      <Flex direction="column" gap="6">
        <Flex justify="between" align="center" gap="3" wrap="wrap">
          <Flex align="center" gap="3">
            <Heading as="h2" size="5">
              默认模型
            </Heading>
            <Badge color={state.config?.status === 'ready' ? 'green' : 'amber'}>
              {state.config?.status === 'ready' ? '已启用' : state.config ? '待测试' : '未配置'}
            </Badge>
            {state.dirty && <Badge color="gray">未保存</Badge>}
          </Flex>
          <Button
            variant="ghost"
            size="sm"
            disabled={busy || state.dirty}
            pending={state.operation === 'refresh'}
            onClick={() => void state.refresh()}
          >
            <RefreshCw aria-hidden="true" />
            刷新配置
          </Button>
        </Flex>
        {!state.masterKeyAvailable && (
          <Callout.Root color="amber" role="alert">
            <Callout.Icon>
              <AlertCircle />
            </Callout.Icon>
            <Callout.Text>服务端凭据加密主密钥未配置或无效，暂时无法保存或使用 API Key。</Callout.Text>
          </Callout.Root>
        )}
        {running && (
          <Text size="2" color="gray">
            对话正在运行，结束后可修改模型配置。
          </Text>
        )}
        {state.error && (
          <Callout.Root color="red" role="alert">
            <Callout.Text>{state.error}</Callout.Text>
          </Callout.Root>
        )}
        {state.message && (
          <Text role="status" size="2">
            {state.message}
          </Text>
        )}
        <Form.Root
          onSubmit={(event) => {
            event.preventDefault()
            if (!busy) void state.save()
          }}
        >
          <Flex direction="column" gap="5">
            <Form.Field name="protocol">
              <Flex direction="column" gap="2">
                <Form.Label htmlFor="ai-model-protocol">协议</Form.Label>
                <Select
                  value={state.protocol}
                  onValueChange={(value) => state.setProtocol(value as SummaryProtocol)}
                  disabled={busy}
                >
                  <SelectTrigger id="ai-model-protocol" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROTOCOLS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Flex>
            </Form.Field>
            <Form.Field name="baseUrl">
              <Flex direction="column" gap="2">
                <Form.Label htmlFor="ai-model-base-url">服务地址</Form.Label>
                <Form.Control asChild>
                  <Input
                    id="ai-model-base-url"
                    type="url"
                    required
                    maxLength={2048}
                    value={state.baseUrl}
                    disabled={busy}
                    aria-describedby="ai-model-base-url-hint"
                    onChange={(event) => {
                      state.setBaseUrl(event.target.value)
                      state.setCustomModel(true)
                    }}
                    placeholder="https://api.openai.com/v1"
                  />
                </Form.Control>
                <Text id="ai-model-base-url-hint" size="2" color="gray">
                  填写接口前缀，例如 https://api.openai.com/v1。
                </Text>
              </Flex>
            </Form.Field>
            <Form.Field name="modelId">
              <Flex direction="column" gap="2">
                <Flex justify="between" align="center" gap="2" wrap="wrap">
                  <Form.Label htmlFor="ai-model-id">模型 ID</Form.Label>
                  <Flex gap="2" wrap="wrap">
                    {state.models.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() => state.setCustomModel(!state.customModel)}
                      >
                        {state.customModel ? '从列表选择' : '手动输入'}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy || (!state.apiKey.trim() && !state.config?.hasCredential)}
                      pending={state.operation === 'models'}
                      onClick={() => void state.fetchModels()}
                    >
                      拉取模型列表
                    </Button>
                  </Flex>
                </Flex>
                {state.customModel || state.models.length === 0 ? (
                  <Form.Control asChild>
                    <Input
                      id="ai-model-id"
                      required
                      maxLength={240}
                      value={state.modelId}
                      disabled={busy}
                      onChange={(event) => state.setModelId(event.target.value)}
                      placeholder="填写服务商提供的模型 ID"
                    />
                  </Form.Control>
                ) : (
                  <Select value={state.modelId} onValueChange={state.setModelId} disabled={busy}>
                    <SelectTrigger id="ai-model-id" className="w-full">
                      <SelectValue placeholder="选择模型" />
                    </SelectTrigger>
                    <SelectContent>
                      {state.models.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.displayName !== model.id ? `${model.displayName} (${model.id})` : model.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </Flex>
            </Form.Field>
            <Form.Field name="apiKey">
              <Flex direction="column" gap="2">
                <Flex justify="between" align="center" gap="2" wrap="wrap">
                  <Form.Label htmlFor="ai-model-api-key">API Key</Form.Label>
                  {state.config?.hasCredential && (
                    <Text size="2" color="gray">
                      已保存 {state.config.credentialMask}
                    </Text>
                  )}
                </Flex>
                <Flex gap="2">
                  <Form.Control asChild>
                    <Input
                      id="ai-model-api-key"
                      type="password"
                      autoComplete="new-password"
                      value={state.apiKey}
                      disabled={busy || !state.masterKeyAvailable}
                      onChange={(event) => state.setApiKey(event.target.value)}
                      placeholder={state.config?.hasCredential ? '留空保留现有凭据' : '输入 API Key'}
                    />
                  </Form.Control>
                  {state.config?.hasCredential && (
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={busy}
                      aria-label="清除已保存的 API Key"
                      onClick={() => state.setClearOpen(true)}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  )}
                </Flex>
              </Flex>
            </Form.Field>
            <Flex align="center" gap="3" wrap="wrap" pt="2">
              <Button
                type="submit"
                disabled={busy || !state.masterKeyAvailable || !state.baseUrl.trim() || !state.modelId.trim()}
                pending={state.operation === 'save'}
              >
                保存配置
              </Button>
              <Button
                variant="outline"
                disabled={busy || state.dirty || !state.config?.hasCredential || !state.masterKeyAvailable}
                pending={state.operation === 'check'}
                onClick={() => void state.check()}
              >
                测试并启用
              </Button>
              {state.config && (
                <Text size="2" color="gray">
                  版本 {state.config.revision}
                </Text>
              )}
            </Flex>
          </Flex>
        </Form.Root>
      </Flex>
      <AlertDialog
        open={state.clearOpen}
        onOpenChange={(open) => {
          if (!state.operation) state.setClearOpen(open)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>清除 API Key？</AlertDialogTitle>
            <AlertDialogDescription>
              已保存的凭据将被删除，写作 Agent、文章摘要与初稿生成将暂停，直到重新配置并测试通过。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>取消</AlertDialogCancel>
            <Button
              variant="destructive"
              pending={state.operation === 'clear'}
              disabled={busy}
              onClick={() => void state.clearCredential()}
            >
              清除凭据
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Box>
  )
}
