# 配置 GitHub CI/CD 自动部署博客

## Goal

让 `xidongdong-153/blog` 在 GitHub 上完成代码检查和生产发布：Pull Request 先验证，`main` 分支的合并代码按确认的发布规则自动部署到现有服务器。你可以按文档完成 GitHub 配置、服务器准备和第一次发布，并能在失败时定位或回滚。

## Background

- 当前仓库没有 `.github/workflows`。
- 项目使用 Next.js 16、Node.js 22 或更高版本、pnpm 和 `pnpm-lock.yaml`。
- 本地质量检查命令是 `pnpm typecheck`、`pnpm lint`、`pnpm format:check`，生产构建命令是 `pnpm build`。
- 服务器源码目录是 `/home/deploy/code/xdd/blog`，生产服务是 `xdd-blog.service`，Caddy 反代 `127.0.0.1:4400`。
- 服务器当前手工更新流程是拉取 `origin main`、执行 `pnpm install --frozen-lockfile`、执行 `pnpm build`，成功后重启 `xdd-blog.service`。
- `.env.local` 不在 Git 中，包含 Giscus 配置；自动部署不能把它提交到仓库或输出到 Actions 日志。
- `pnpm approve-builds sharp` 在服务器生成了服务器专用的 `pnpm-workspace.yaml`，当前内容是 `allowBuilds: sharp: true`；自动部署只允许这一份精确匹配的未跟踪配置原样留在服务器，其他工作区改动都会停止部署。
- 服务器维护记录位于 `/Users/wuwanzhu/Projects/code-server-frp-maintenance/docs/services/blog.md`。

## Requirements

### R1. Pull Request 检查

为 Pull Request 提供 GitHub Actions 工作流，使用项目锁文件安装依赖，并依次运行 `pnpm typecheck`、`pnpm lint`、`pnpm format:check` 和 `pnpm build`。检查失败时，Pull Request 不能显示为可合并的成功检查。

### R2. 生产发布

为 `main` 分支配置生产部署流程。部署只允许使用通过 R1 的代码，并在远程服务器上完成依赖安装、生产构建和服务重启；构建或前置检查失败时不得重启正在运行的博客服务。

### R3. 凭据与权限

生产 SSH 登录凭据和服务器连接信息必须使用 GitHub Secrets 或生产 Environment secrets 保存，不得写入仓库文件。工作流不得把私钥、`.env.local` 内容或其他 secret 打印到日志。生产部署只允许由受信任的 `main` 分支触发，不让来自 Fork 的 Pull Request 访问生产凭据。

### R4. 服务器准备与首次发布

文档必须说明服务器侧需要确认的项目状态、GitHub 拉取权限、`sudo systemctl restart xdd-blog` 的非交互权限、Node/pnpm 环境和 `.env.local` 保留方式，并给出第一次手工验证和第一次 GitHub Actions 发布的顺序。

### R5. 可观察性与失败处理

部署流程必须在关键步骤失败时保留可读的 Actions 日志，并提供检查 GitHub Actions、systemd 日志、本机 `127.0.0.1:4400` 和公网 `https://blog.xdd.ink` 的命令。文档必须说明部署失败时如何保持或恢复上一版服务，以及服务器工作区存在未提交改动时不能直接覆盖的边界；服务器现有且内容精确匹配的 `pnpm-workspace.yaml` 可以作为 `sharp` 构建许可保留，不能被工作流修改。

### R6. 文档同步

更新仓库 README 的部署说明，移除与当前正式服务器部署不一致的表述；同步更新服务器维护记录，使 GitHub Actions、GitHub Secrets、服务器初始化、发布、验证和排查步骤能被单独照着执行。

## Acceptance Criteria

- [x] 仓库新增可被 GitHub 识别的工作流文件；Pull Request 和 `main` push 的触发范围符合最终确认的发布规则。
- [x] 工作流在固定的 Node/pnpm 环境中使用 `pnpm-lock.yaml` 安装依赖，并按顺序执行 `pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`。
- [x] 生产部署 job 只从受信任的 `main` 分支、通过 CI 的代码进入，并使用 `Deployment` Environment 的最小权限 secrets 配置。
- [x] 生产 SSH 私钥、服务器敏感配置和 `.env.local` 不出现在 Git 跟踪文件或 Actions 日志中；SSH 主机身份校验方式有明确配置，服务器专用 `pnpm-workspace.yaml` 只在内容精确匹配时被保留且不会被工作流修改。
- [x] 远程部署在构建成功后才重启 `xdd-blog.service`，部署命令失败时能从 Actions 日志和服务器日志判断失败步骤。
- [x] 文档给出从 GitHub 设置页配置 Secrets / Environment、服务器首次准备、手工试运行、触发第一次自动发布、验证公网访问和失败处理的逐步操作；命令、路径和参数与实际配置一致。
- [x] README 和 `/Users/wuwanzhu/Projects/code-server-frp-maintenance/docs/services/blog.md` 不再把当前正式部署描述为仅使用 Vercel，并记录 GitHub Actions 自动发布入口。
- [x] 代码和配置修改完成后依次通过 `pnpm typecheck`、`pnpm lint`、`pnpm format:check`；并完成 `pnpm build` 和工作流静态检查。

## Out Of Scope

- 不改 Caddy 的域名、HTTPS 或反向代理结构。
- 不把博客迁移到 Docker、Vercel、GitHub Pages 或自托管 GitHub Runner。
- 不在本任务中新增数据库、测试框架、RSS、搜索或其他博客功能。
- 不把服务器现有的 `.env.local`、SSH 私钥或 GitHub 拉取私钥迁移进仓库。

## Key Decisions

- `main` 分支合并后的 CI 成功结果直接触发生产部署，不设置每次发布的人工审批。
- 生产发布仍使用现有服务器、Caddy 和 `xdd-blog.service`，不改变公网入口。
- GitHub Actions 只负责连接服务器并触发部署；服务器保留自己的 GitHub 拉取权限，避免把服务器拉取私钥复制到 Actions。

## Deferred Checks

- 实施前通过只读或手工命令确认服务器工作区除精确匹配的 `pnpm-workspace.yaml` 外没有阻塞自动部署的未提交改动。
- 实施前确认 `deploy` 用户可以无交互执行 `sudo systemctl restart xdd-blog`，并确认服务器可以从 GitHub 拉取仓库。
- GitHub Environment secrets、仓库可见性和分支保护能力以实际仓库设置页为准。

## Research

- GitHub Actions 官方资料和服务器现状记录：`.trellis/tasks/09-04-github-cicd-blog-deploy/research/github-actions-deployment.md`
