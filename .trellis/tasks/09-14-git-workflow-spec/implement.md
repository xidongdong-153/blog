# 规范化 Git 分支开发与 PR 发布流程执行计划

## 执行检查清单

1. **编写规范文档 (`.trellis/spec/frontend/git-workflow.md`)**
   - [x] 详细编写从拉取 main、切出分支、本地质量门、创建 PR、CI 自动化门禁、合并 PR 到部署审批与本地清理的 6 步标准操作。
   - [x] 补充关键边界说明：分支保护规则原因、环境审批机制、为什么必须使用 `pnpm format:check` 等。

2. **更新前端规范索引与质量规范**
   - [x] 更新 `.trellis/spec/frontend/index.md`，在规范索引表加入 `git-workflow.md`，并在开发前检查清单补充对应项。
   - [x] 更新 `.trellis/spec/frontend/quality-guidelines.md` 中的 `## Git` 章节，明确分支与 PR 规范链接。

3. **强化根目录 `AGENTS.md`**
   - [x] 在 `## 工作规则` 中增加分支开发与 PR 合并的强制规则，要求所有 Agent 在 `main` 分支时必须先切分支再修改。
   - [x] 强化 `## Git 提交` 章节，要求说明推送分支与 PR 提交动作。

4. **验证与自测**
   - [x] 检查所有修改的 Markdown 文档格式：`pnpm exec prettier --check AGENTS.md .trellis/spec/frontend/*.md`。
   - [x] 运行全套质量门检查：`pnpm typecheck`、`pnpm lint`、`pnpm format:check`。
   - [ ] 本次任务遵循该流程：提交至 `feat/git-workflow-spec`，创建 PR 并观察 CI 状态。

## 验证命令

```bash
# 1. 格式化检查
pnpm exec prettier --check AGENTS.md .trellis/spec/frontend/*.md

# 2. 质量门检查
pnpm typecheck
pnpm lint
pnpm format:check

# 3. 工作区与分支状态
git status
git branch --show-current
```

## 回滚方案

若需回滚本次改动：
```bash
git checkout main -- AGENTS.md .trellis/spec/frontend/index.md .trellis/spec/frontend/quality-guidelines.md
rm -f .trellis/spec/frontend/git-workflow.md
```
