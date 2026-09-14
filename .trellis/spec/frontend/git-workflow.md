# Git 开发与发布流程规范

## 1. 范围与触发

在本项目（blog）中进行任何代码开发、缺陷修复、配置调整或依赖升级时，必须遵守本规范。
远端仓库对 `main` 分支开启了分支保护（禁止直接推送、禁止删除分支、禁止非 fast-forward 合并），所有代码必须通过 Pull Request 流程合并。

## 2. 标准 6 步开发流程

### 步骤 1：本地准备（拉取最新代码并切出分支）

开始任何新任务前，确保本地 `main` 分支与远端同步，然后切出独立特性或修复分支。严禁直接在 `main` 分支上开发或提交。

```bash
git checkout main
git pull origin main
git checkout -b <type>/<slug>
```

分支命名规则：
- 新增功能：`feat/<slug>`（例如：`feat/visitor-analytics`）
- 问题修复：`fix/<slug>`（例如：`fix/server-websocket-hub`）
- 基础设施与维护：`chore/<slug>`（例如：`chore/deps-upgrade`）

### 步骤 2：本地开发与质量门检查

完成代码修改后，在提交前必须在本地依次运行以下质量门检查。前一项通过后方可执行下一项：

```bash
# 1. 类型检查（必须零错误）
pnpm typecheck

# 2. Lint 代码规范检查（必须零错误）
pnpm lint

# 3. 格式化检查（代码与配置文件必须符合 Prettier 规范）
pnpm format:check

# 4. 自动化测试（若涉及业务服务、服务端路由、加密或核心工具层）
pnpm test
```

### 步骤 3：本地核验与提交

提交前先检查工作区状态，确认无意外遗留的临时文件或未跟踪文件：

```bash
# 检查工作区状态
git status

# 暂存并提交（遵循 Conventional Commits 规范）
git add <改动文件>
git commit -m "<type>(<scope>): <简明中文描述>"
```

### 步骤 4：推送分支与创建 Pull Request

将本地分支推送到远端仓库，并创建目标为 `main` 的 Pull Request：

```bash
# 首次推送到远端
git push -u origin <type>/<slug>

# 创建 Pull Request
gh pr create --base main --head <type>/<slug> --title "<type>: 简明说明" --body "## 变更说明\n具体改动内容\n\n## 验证\n测试结果"
```

### 步骤 5：等待 CI Quality 检查并合并 PR

PR 创建后，GitHub Actions 会自动触发 `Quality` 工作流，运行依赖检查、静态分析、迁移校验、测试和生产构建。

1. 检查状态：运行 `gh pr checks` 或在 GitHub PR 页面观察。
2. 确认所有检查显示通过后，执行合并并自动删除远端分支：
   ```bash
   gh pr merge --merge --delete-branch
   ```

### 步骤 6：生产发布审批与本地环境对齐

PR 合并到 `main` 分支后，会自动触发生产环境部署流水线：

1. **生产环境审批**：
   - 合并触发的流水线会复验 `Quality`。
   - 通过后，由于 `Deployment` 环境配置了部署保护规则，`Deploy production` 任务会进入待审批状态。
   - 打开 GitHub Actions 页面，点击当前运行中的 **Review deployments**，勾选 **Deployment** 并点击 **Approve and deploy**；或通过 GitHub CLI 审批：
     ```bash
     gh api -X POST repos/xidongdong-153/blog/actions/runs/<RUN_ID>/pending_deployments \
       -F "environment_ids[]=21228460532" \
       -F "state=approved"
     ```
   - 批准后，工作流通过 SSH 登录服务器，自动执行代码拉取、环境更新、依赖安装、数据库迁移、服务重启及本机与公网健康检查。
2. **本地环境对齐**：
   ```bash
   # 切回 main 并拉取最新已合并提交
   git checkout main
   git pull origin main

   # 删除本地特性分支
   git branch -d <type>/<slug>
   ```

## 3. 常见错误与防范对策

| 错误行为 | 导致的后果 | 正确做法 |
| -------- | ---------- | -------- |
| 在 `main` 分支直接修改并执行 `git push origin main` | 触发 GitHub 规则拦截 `GH013: Repository rule violations`，推送失败 | 编码前通过 `git checkout -b <branch>` 建立独立分支 |
| 本地未跑 `pnpm typecheck` / `lint` / `format:check` 即提交 | PR 的 CI `Quality` job 失败，阻塞合并流程 | 本地修改完毕后，严格按顺序跑通三项质量门检查 |
| PR 合并后未进行 `Deployment` 环境审批 | 部署流水线挂起在 `waiting` 状态，生产服务器不会更新上线 | 合并后主动在 Actions 页面或通过 CLI 批准部署并观察结果 |
| 合并后未拉取 `main` 就在旧提交基础上继续开发 | 后续切出的分支缺少最新主干提交，产生冲突或分叉 | 每次开发前先 `git checkout main && git pull origin main` |
