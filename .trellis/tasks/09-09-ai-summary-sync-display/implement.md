# AI 摘要同步与展示实施计划

## 实施清单

- [x] 1. 为 `BlogPost` 增加 `disableAiSummary`，更新读取校验与内容规范。
- [x] 2. 新增文章摘要 schema、聚合导出和 migration。
- [x] 3. 实现稳定正文 SHA-256 与摘要缓存查询/upsert。
- [x] 4. 复用 AI 配置 service 和三协议 model factory，实现单篇生成、结果校验和安全日志。
- [x] 5. 实现全站同步流程：跳过未变化与关闭文章、逐篇失败开放、最终计数汇总。
- [x] 6. 使用现有项目 TypeScript loader，新增 `scripts/sync-summaries.ts` 与 `summary:sync` 命令。
- [x] 7. 实现 `AiSummary` Server Component，并在文章页按当前哈希安全读取。
- [x] 8. 修改生产部署顺序，安装后依次迁移、同步、构建；通用 `build` 保持不变。
- [x] 9. 更新部署规范、内容规范、数据库规范和功能状态表；本功能无新增环境变量，因此 `.env.example` 无需修改。

## 自动化验证

```bash
node --test src/lib/ai-summary.test.ts
node --test src/server/services/ai-summary.test.ts
pnpm summary:sync
pnpm typecheck
pnpm lint
pnpm format:check
pnpm db:generate
pnpm db:check
pnpm db:migrate
pnpm db:verify
pnpm build
```

测试使用临时数据库和 fake model/local HTTP upstream，覆盖：

- 新文章、正文变化、哈希未变和 `disableAiSummary`。
- 三协议成功生成、空文本、截断、超时、认证失败和部分文章失败。
- 失败不覆盖旧摘要，哈希不匹配不展示。
- frontmatter 非正文变化不改变哈希。
- 摘要输出纯文本边界和计数汇总。

本地直接执行 `pnpm summary:sync` 时，如果没有 ready 配置，必须成功退出并打印安全的跳过统计；自动化检查不使用生产中转服务。

## 页面与部署验收

- 生成有效摘要后构建文章页，确认卡片位于正文前且文案无 Markdown。
- 修改正文但不运行同步，重新构建后旧摘要不显示。
- 检查亮色、暗色、桌面与移动端，确认卡片不挤压标题或正文。
- 对 workflow 做 YAML 解析和远程 shell 块语法检查，不执行 SSH、migration 或生产模型调用。

## 风险与回滚点

- 部署 migration 必须在同步前，顺序错误会让首发读取不存在的表。
- `summary:sync` 的失败开放只适用于摘要；不能吞掉 migration 或 `next build` 错误。
- 脚本接入异常时只移除部署调用，不删除缓存和配置表。
