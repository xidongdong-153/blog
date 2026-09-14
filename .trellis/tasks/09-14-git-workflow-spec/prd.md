# 规范化 Git 分支开发与 PR 发布流程

## 目标

将规范的 Git 分支开发、本地质量门检查、Pull Request 协作流程以及生产环境部署审批要求，固化到 `AGENTS.md` 和 `.trellis/spec/frontend/` 规范体系中，确保后续所有 AI 代理和开发者在本项目中自动遵守该流程，杜绝直接向 `main` 分支推送或跳过门禁。

## 背景与问题

1. 仓库已为 `main` 分支配置了严格的分支保护规则（禁止直接推送、禁止删除与非 fast-forward 合并）。
2. 在此前的开发中，由于根目录 `AGENTS.md` 仅包含基础的质量门和未经细化的 Git 提示，容易出现 Agent 试图直接在 `main` 上开发并推送失败的情况。
3. 项目已建立完善的 GitHub Actions 部署流水线（包含 PR 质量检查与生产 `Deployment` 环境审批），需要统一记录标准操作命令与边界条件。

## 需求

1. **更新根目录 `AGENTS.md`**
   - 增加分支开发规则：开始新任务前必须拉取最新 `origin/main` 并切出新分支（如 `feat/*`、`fix/*`）。禁止直接在 `main` 开发与提交。
   - 明确质量门门禁：提交前必须依次通过 `pnpm typecheck`、`pnpm lint`、`pnpm format:check`，涉及后端模块必须通过 `pnpm test`。
   - 明确 PR 与发布流：提交后推送到远端特性分支，通过 `gh pr create` 创建 PR，等待 CI 验证通过后使用 `gh pr merge --merge --delete-branch` 合并，并指导或协助完成生产环境审批。
2. **新增 `.trellis/spec/frontend/git-workflow.md`**
   - 详细说明从分支检出、开发自测、代码提交、PR 创建、CI 门禁检查、PR 合并、生产环境审批到本地分支清理的完整 6 步闭环。
   - 明确各项边界：为什么不能直接推送 `main`、如何处理审批挂起（pending_deployments）、如何保持本地同步。
3. **更新前端规范索引与质量规范**
   - 在 `.trellis/spec/frontend/index.md` 的索引表与检查清单中加入 `git-workflow.md`。
   - 在 `.trellis/spec/frontend/quality-guidelines.md` 的 `## Git` 章节引用 `git-workflow.md`。

## 验收标准

- [x] 根目录 `AGENTS.md` 包含明确的 Git 分支开发与 PR 发布工作规则。
- [x] `.trellis/spec/frontend/git-workflow.md` 规范文档落盘，涵盖从分支检出到部署审批的完整流程与命令。
- [x] `.trellis/spec/frontend/index.md` 与 `quality-guidelines.md` 正确索引并链接该规范。
- [x] 文档格式通过 `prettier --check`，相对链接与命令语法全部准确。
- [ ] 本次任务自身严格遵守该流程（在 `feat/git-workflow-spec` 分支完成并通过 PR 合并）。
