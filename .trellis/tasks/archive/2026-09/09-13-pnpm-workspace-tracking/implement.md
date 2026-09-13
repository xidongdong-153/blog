# 统一 pnpm 构建配置执行计划

## 执行检查清单

1. **规范化并跟踪 `pnpm-workspace.yaml`**
   - [x] 将 `pnpm-workspace.yaml` 修改为仅包含 `esbuild` 与 `sharp`：
     ```yaml
     allowBuilds:
       esbuild: true
       sharp: true
     ```
   - [x] 执行 `git add pnpm-workspace.yaml` 将其纳入版本控制。

2. **改造 CI/CD 工作流 (`.github/workflows/ci-cd.yml`)**
   - [x] 在 `quality` job 中，移除生成 `pnpm-workspace.yaml` 的 `printf` 逻辑，仅保留 `pnpm install --frozen-lockfile`。
   - [x] 移除 `quality` job 末尾的 `Clean up pnpm build approval file` 步骤。
   - [x] 在 `deploy` job 中，移除多版本字符串变量、比对覆写逻辑以及对 `pnpm-workspace.yaml` 状态的特殊断言。
   - [x] 在 `deploy` job 中，在合并前添加未跟踪旧配置的平滑清理指令，确保 `git merge --ff-only` 不会因工作区冲突失败。
   - [x] 恢复服务器工作区完全干净断言（不允许任何未提交或未跟踪文件）。

3. **同步更新规范文档 (`.trellis/spec/frontend/deployment-guidelines.md`)**
   - [x] 更新构建白名单管理方式说明，明确该文件由 Git 统一管理。
   - [x] 更新服务器发布契约说明，移除未跟踪白名单特例。
   - [x] 更新参考部署脚本，移除已废弃的比对逻辑。

4. **本地验证与质量门检查**
   - [x] 运行 `pnpm install --frozen-lockfile`，确认安装正常且不产生新的工作区改动。
   - [x] 运行 `pnpm typecheck`，确认零类型错误。
   - [x] 运行 `pnpm lint`，确认零 lint 错误。
   - [x] 运行 `pnpm format:check`，确认格式检查通过。
   - [x] 运行 `git status`，确认工作区仅包含本次预期改动文件，无其他脏文件。

## 验证命令

```bash
# 1. 依赖安装验证
pnpm install --frozen-lockfile

# 2. 质量门检查
pnpm typecheck
pnpm lint
pnpm format:check

# 3. 工作区状态核验
git status --short
```

## 回滚方案

若需回滚本次改动：
```bash
git checkout HEAD -- .github/workflows/ci-cd.yml .trellis/spec/frontend/deployment-guidelines.md
git rm --cached pnpm-workspace.yaml
```
恢复原有的部署逻辑与未跟踪状态。
