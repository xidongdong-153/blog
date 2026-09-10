import { syncAllArticleSummaries } from '@/server/services/ai-summary'

async function main() {
  try {
    const result = await syncAllArticleSummaries()
    console.log(
      `[AI Summary Sync] 同步结束: 共 ${result.total} 篇 (生成: ${result.generated}, 跳过: ${result.skipped}, 禁用: ${result.disabled}, 失败: ${result.failed})`,
    )
  } catch (error) {
    // 即使发生未捕获异常，也保持失败开放，不阻断部署
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[AI Summary Sync] 执行异常 (已自动降级跳过): ${message}`)
  }
}

main()
  .catch((err) => {
    console.warn('[AI Summary Sync] 意外退出，保持非零阻断降级:', err)
  })
  .finally(() => {
    // 明确成功退出，不阻断后续构建流程
    process.exit(0)
  })
