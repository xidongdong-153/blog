# 实施清单：GitHub Actions 自动部署博客

## 进入实施前

- [x] 用户已审阅并明确批准最新的 `prd.md`、`design.md` 和本清单。
- [x] 运行 `python3 ./.trellis/scripts/task.py validate 09-04-github-cicd-blog-deploy`，确认任务材料完整。
- [x] 运行 `python3 ./.trellis/scripts/task.py start 09-04-github-cicd-blog-deploy`，将任务从 planning 切换为 in_progress。
- [x] 读取 `trellis-before-dev` 技能和前端规范，确认工作区没有新的用户改动。
- [x] 通过只读检查确认服务器项目工作区、GitHub 拉取权限、Node/pnpm 和 `sudo -n systemctl restart xdd-blog.service`；允许现有且内容精确匹配的 `pnpm-workspace.yaml` 留在服务器，发现 `src/site.config.ts` 或其他工作区改动时停止，不自动丢弃。

## 实施步骤

1. 新增 `.github/workflows/ci-cd.yml`。
   - 配置 Pull Request 和 `main` push 触发。
   - 配置 Node.js `24.16.0`、pnpm `11.5.0` 和 pnpm 缓存。
   - [x] 在 `quality` job 中临时生成 `pnpm-workspace.yaml` 允许 `sharp` 构建脚本，贯穿依赖安装和质量检查，job 结束时清理，再按顺序运行 `pnpm install --frozen-lockfile`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`。
   - 在 `deploy` job 中使用 `needs: quality`、`main` push 条件和 `production` Environment。
   - 使用 Runner 原生 OpenSSH、`DEPLOY_SSH_KEY`、`DEPLOY_KNOWN_HOSTS` 和严格 host key 校验。
   - 远程执行工作区状态检查；只允许内容精确为 `allowBuilds:\n  sharp: true` 的单个未跟踪 `pnpm-workspace.yaml` 留在服务器并原样保留，其他改动直接失败。
   - 远程执行目标 SHA 检查、快进更新、安装、构建、服务重启和本机 HTTP 检查。
   - 确保任何失败路径都不会执行服务重启，且不打印 secret。

2. 更新仓库文档和项目规范。
   - [x] 在 `README.md` 中记录 CI/CD 工作流用途、服务器部署方式和常规发布入口。
   - [x] 在 `.trellis/spec/frontend/index.md` 中同步当前部署事实。
   - [x] 在 `.trellis/spec/frontend/deployment-guidelines.md` 中记录 GitHub Actions、SSH、服务器和 systemd 的可执行契约。
   - 保留与当前服务器一致的 Node/pnpm、端口、服务名和目录；删除仅使用 Vercel 的过时描述。

3. 更新服务器维护记录。
   - [x] 在 `/Users/wuwanzhu/Projects/code-server-frp-maintenance/docs/services/blog.md` 中补充 GitHub 端创建 `production` Environment 的操作。
   - [x] 列出 Variables 和 Secrets 的准确名称、值来源和安全边界。
   - [x] 记录 SSH 公钥授权、known_hosts 核验、sudo 非交互权限、服务器工作区清理和第一次手工部署顺序。
   - [x] 记录第一次 Actions 发布、服务和公网验证、Actions/systemd/Caddy 排查命令及 GitHub revert 回滚方法。

4. 完成 GitHub 仓库侧手工配置说明。
   - [x] 创建 `production` Environment。
   - [x] 设置允许部署分支为 `main`，不配置 Required reviewers。
   - [x] 填写部署 Variables 和 Secrets。
   - [x] 为 `main` 配置 Pull Request 和质量检查保护；检查名以工作流实际产生的名称为准。

以上四项已在文档中写明操作步骤，但当前未在 GitHub 远程设置页实际执行。

5. 进行本地和静态验证。
   - [x] `pnpm typecheck`
   - [x] `pnpm lint`
   - [x] `pnpm format:check`
   - [x] `pnpm build`
   - [x] `git diff --check`
   - [x] 如果环境中安装了 `actionlint`，运行 `actionlint .github/workflows/ci-cd.yml`；当前未安装，已记录并未临时添加依赖。
   - [x] 检查工作流中没有私钥、`.env.local` 内容、服务器 GitHub 私钥或未经核验的 `ssh-keyscan` 逻辑。

6. 第一次发布验证。
   - [ ] 先在服务器按文档完成前置条件和手工 SSH 命令验证；当前 `src/site.config.ts` 未提交，不能执行发布。
   - [ ] 在 GitHub 完成 Environment、Variables、Secrets、分支保护后，观察 Pull Request 或 `main` 工作流的每个 job。
   - [ ] 确认 `quality` 通过后 `deploy` 自动运行，且部署日志不显示 secrets。
   - [x] 已完成服务器和公网只读基线验证：systemd active，本机和公网 HTTP 返回 `200`。
   - [x] 首次 Actions 运行 `33857059084` 已确认在 `Install dependencies` 因 pnpm 11 未看到 `allowBuilds` 而失败，`deploy` 正确跳过；workflow 已改为在整个 `quality` job 临时提供该配置，干净目录复现通过。
   - [x] 手工发布发现重启后单次本机 curl 存在启动竞态；workflow 已改为最多等待 15 秒重试 HTTP 200，并已确认服务最终 active 且连续 curl 返回 200。
   - [ ] 推送修复后的 workflow 后重新观察 Actions；若 GitHub Actions 登录或部署失败，保留错误日志，修复工作流或服务器前置条件后重新运行；不绕过主分支检查。

## 回滚点

- 工作流静态检查失败：只修改 `.github/workflows/ci-cd.yml`，不触碰服务器。
- 服务器前置检查失败：停止实施，先处理服务器工作区或权限，不执行清理性 Git 命令。
- 部署构建失败：确认服务没有被重启，再通过 Actions 日志和 systemd 日志定位。
- 发布后健康检查失败：在 GitHub 对问题提交执行 `git revert`，让回滚重新经过质量检查和自动部署。

## 完成门槛

- [x] 任务验收标准对应的仓库实现、文档和规范已完成；第一次真实发布仍等待服务器改动处理和 GitHub 远程配置。
- [x] `pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build` 全部通过。
- [x] Workflow 静态检查通过，`actionlint` 未安装并已记录。
- [x] 文档中的路径、命令、secret 名称与工作流一致。
- [x] 按 Trellis 要求运行 `trellis-check`，再更新相关 spec。
- [x] 向用户展示改动摘要并获得明确提交确认；未确认前不执行 `git commit`、`git push` 或 `git merge`。
