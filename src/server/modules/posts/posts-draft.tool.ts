import type { GeneratedPostDraft } from '@/lib/post-draft'
import { tool, zodSchema } from 'ai'
import { generatedPostDraftSchema } from '@/lib/post-draft'

type PostDraftToolResult = { success: true; draft: GeneratedPostDraft } | { success: false; error: string }

/** 将文章字段转换为模型可用的 JSON Schema，并在工具执行时校验正文；不保存或发布文章。 */
export const postDraftTool = tool({
  description: '提交一篇完整的文章初稿及属性。所有字段必填，只调用一次；正文必须能作为安全的 Markdown/MDX 预览。',
  inputSchema: zodSchema(generatedPostDraftSchema),
  strict: true,
  execute: async (input, { abortSignal }): Promise<PostDraftToolResult> => {
    abortSignal?.throwIfAborted()
    try {
      const { validatePostCompilation } = await import('./posts-compile')
      await validatePostCompilation(input.content)
    } catch (cause) {
      abortSignal?.throwIfAborted()
      const reason = cause instanceof Error ? cause.message.slice(0, 300) : '正文无法编译'
      return { success: false, error: `正文未通过 MDX 校验：${reason}` }
    }
    abortSignal?.throwIfAborted()
    return { success: true, draft: input }
  },
})
