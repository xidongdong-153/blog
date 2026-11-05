# Git 开发与发布流程

## 日常开发

个人站点允许直接开发、提交和推送 `main`，不强制使用分支或 Pull Request。较大改动需要隔离或评审时，可使用 `feat/*`、`fix/*` 或 `chore/*` 分支。

开始任务前先检查工作区并获取远端状态。工作区干净时，在 `main` 上快进更新：

```bash
git status --short --branch
git fetch origin main
git switch main
git pull --ff-only origin main
```

已有未提交改动时先保留并确认来源，不使用 reset、clean 或强制推送覆盖。发现本地与远端分叉时先处理分叉，不自动合并历史。

## 检查、提交与推送

代码修改后依次执行，前一项通过后再运行下一项：

```bash
pnpm typecheck
pnpm lint
pnpm format:check
```

涉及服务端业务或核心工具时还需运行 `pnpm test`；部署逻辑改动的完整验证见[部署规范](./deployment-guidelines.md)。纯文档修改按[质量规范](./quality-guidelines.md)检查。

AI 执行 `git commit`、`git push` 或 `git merge` 前，必须展示改动摘要并获得用户明确确认；已有授权不重复询问。只暂存本次确认的文件，提交信息遵循 Conventional Commits。

```bash
git diff --check
git add <改动文件>
git commit -m "<type>(<scope>): 简明说明"
git push origin main
```

推送 `main` 会自动运行 `CI/CD` 的 `Quality`，不会发布生产环境。使用 Pull Request 时，目标为 `main` 的 PR 同样自动检查，确认检查通过后再合并。

## 手动发布

代码已推送到 `main` 后，在 GitHub 打开 `Actions` → `CI/CD` → `Run workflow`，选择 `main`，勾选「确认发布到生产环境」后点击运行。手动运行会重新执行 `Quality`，勾选确认且检查通过后进入 `Deploy production`，无需额外人工审批。确认框默认不勾选，保持默认值时只检查。

- 只有 `workflow_dispatch` 事件、分支为 `main` 且 `inputs.confirm_deploy == true` 才能部署；未确认或其他分支手动运行只执行检查。
- `Deployment` 环境保留密钥和变量，允许部署的分支明确限定为 `main`，不配置 Required reviewers 或等待时间。
- AI 只有获得生产发布授权后才能点击 `Run workflow`；提交、推送和合并的授权不包含发布。
- 若发布检查期间 `main` 又有新提交，服务器会因目标 SHA 与最新 `origin/main` 不一致而停止部署。需要发布最新代码时，重新手动运行工作流。
- 在 Actions 确认检查、部署和健康检查通过，才算完成发布。

使用独立分支时，合入后在工作区干净的前提下切回 `main` 并快进更新，可删除已经合并的开发分支。

## 失败与回滚

`Quality` 失败时先修复并重新推送；推送不会自动重试生产发布。发布失败按[部署规范](./deployment-guidelines.md)查看日志。

回滚通过 `git revert` 创建新的回滚提交，检查并推送到 `main` 后，再手动运行发布。不在服务器强制重置历史。
