# 实现 AI 摘要同步与展示

## Goal

读取已测试并启用的摘要模型配置，按文章正文哈希生成和缓存摘要，并在博客文章详情页正文前展示。

## Background

- 文章由 `src/lib/content.ts` 读取，`BlogPost.content` 是不含 frontmatter 的 MDX 原文。
- 通用 `pnpm build` 在本地和 PR 检查中不具备数据库或模型凭据。
- Vercel AI SDK 的 OpenAI Chat Completions、OpenAI Responses 和 Anthropic Messages 已通过仓库外本地 HTTP 模拟验证。

## Requirements

1. 对文章正文计算 SHA-256，以 slug、正文哈希、摘要、协议、模型 ID 和时间戳缓存到数据库。
2. 同一 slug 且哈希未变化时不得调用模型；哈希变化时才生成并更新。
3. 同步脚本只读取已测试并启用的配置，通过对应协议的 Vercel AI SDK provider 调用中转服务。
4. 提供 `pnpm summary:sync`，只在生产部署脚本中于 `next build` 前显式执行；通用 `pnpm build` 保持离线可运行。
5. frontmatter 支持 `disableAiSummary: true`；关闭的文章不生成也不展示摘要。
6. 摘要提示词要求中文纯文本 2 至 3 句、约 120 至 180 字，不输出 Markdown。
7. 模型或数据库失败时不得覆盖已有摘要；同步逐篇记录失败并成功退出，不阻止部署。页面只展示 `contentHash` 与当前正文一致的摘要，哈希不匹配的旧摘要保留但不展示。
8. 文章详情页只读缓存摘要，不在页面请求期间调用模型；无记录或读取失败时正文继续渲染。
9. 摘要卡片明确标识 AI 生成内容，沿用当前主题，并覆盖空状态和长文本换行。

## Acceptance Criteria

- [x] 新文章或正文变化会生成并保存摘要，哈希未变化时零模型调用。
- [x] 修改非正文 frontmatter 不触发重新生成。
- [x] `disableAiSummary: true` 不调用模型且页面不展示摘要。
- [x] 三种协议配置都能驱动同一摘要生成流程。
- [x] 摘要为中文纯文本 2 至 3 句、约 120 至 180 字，不包含 Markdown。
- [x] 单篇失败不会阻止其他文章同步或最终部署，且页面不展示哈希不匹配的旧摘要。
- [x] 页面无摘要或数据库不可用时仍正常展示正文。
- [x] 同步逻辑、哈希逻辑、数据库写入和页面展示有针对性测试。

## Out of Scope

- 笔记摘要、实时流式生成和读者手动触发。
- 摘要人工审核后台、多语言摘要和写回 MDX。
- 自动删除已移除文章或已关闭文章的历史摘要缓存。
- 管理 AI 配置；该能力属于前置子任务 `09-09-ai-summary-settings`。

## Dependencies

- 必须先完成并启用 `09-09-ai-summary-settings` 中的模型配置。
