# GitHub Actions CI/CD 研究记录

记录时间：2026-09-04

## 本地项目事实

- 仓库：`git@github.com:xidongdong-153/blog.git`。
- 项目使用 Next.js 16、Node.js 22 或更高版本、pnpm；锁文件是 `pnpm-lock.yaml`。
- 现有质量命令按顺序是 `pnpm typecheck`、`pnpm lint`、`pnpm format:check`；生产构建命令是 `pnpm build`。
- 服务器源码目录是 `/home/deploy/code/xdd/blog`，生产服务是 `xdd-blog.service`，服务监听 `127.0.0.1:4400`。
- 服务器现有更新命令是：进入项目目录后执行 `git pull --ff-only origin main`、`pnpm install --frozen-lockfile`、`pnpm build`，成功后执行 `sudo systemctl restart xdd-blog`。
- `pnpm approve-builds sharp` 会在服务器项目目录生成 `pnpm-workspace.yaml`；当前服务器上的内容是 `allowBuilds: sharp: true`。该文件是允许保留的服务器专用配置，自动部署会校验精确内容但不修改它；其他未提交或未跟踪改动会使部署停止。
- `.env.local` 不在 Git 中。当前 Giscus 配置是公开前缀环境变量，服务器首次部署时需要单独保留；自动部署不能把它提交进仓库或打印到 Actions 日志。

## GitHub 官方资料

来源：

- [Using secrets in GitHub Actions](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions)
- [Managing environments for deployment](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [Building and testing Node.js](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs)

已确认：

1. GitHub Actions 可以使用仓库 secrets 或 Environment secrets；Environment secrets 只对引用该 Environment 的 job 可用，并且要在配置的保护规则通过后才可用。
2. Environment 支持 Required reviewers、Wait timer，以及限制哪些分支或标签可以部署。公开仓库和私有仓库可用的保护能力取决于仓库可见性和 GitHub 计划，实施时需要在仓库设置页核对。
3. Fork 触发的工作流不会获得普通 secrets。生产部署工作流不能让不受信任的 PR 代码直接获得生产凭据。
4. `actions/setup-node` 是 GitHub 文档推荐的 Node 版本配置方式。pnpm 缓存需要先使用 `pnpm/action-setup`，然后在 `setup-node` 中启用 `cache: pnpm`；依赖安装使用仓库锁文件。
5. 构建和检查步骤应复用本地实际使用的命令，而不是在工作流中另造一套命令。

## 采用方案

- CI：Pull Request 和 `main` push 都运行 typecheck、lint、format check、build。
- CD：只有 `main` push 在 CI 成功后运行部署 job，并限制部署 job 使用 `production` Environment；根据用户确认，不配置 Required reviewers。
- 部署连接：GitHub Actions 使用单独的 SSH 登录凭据连接服务器；服务器继续使用自己的 GitHub 拉取凭据拉取仓库，避免把服务器 GitHub 私钥放到 Actions。
- 部署脚本：先检查工作区。服务器唯一允许保留的未跟踪文件是内容精确为 `allowBuilds: sharp: true` 的 `pnpm-workspace.yaml`；随后校验服务器 `main` 是 `origin/main` 的祖先、校验目标 SHA，最后安装依赖、构建、重启并检查本机 HTTP 响应。

## 主要风险

- SSH 私钥、服务器 host key、生产 Environment secrets 不能进入仓库或日志。
- 远程构建发生在当前运行目录；部署过程中构建失败时应保持旧进程继续运行，构建成功后再重启。
- 服务器工作区已有本地 `src/site.config.ts` 改动记录。自动部署前必须确认该工作区状态和正式域名改动已统一，否则自动部署会停止；服务器专用的 `pnpm-workspace.yaml` 可在内容精确匹配时保留。
- 远程构建发生在当前运行目录；部署过程中构建失败时应保持旧进程继续运行，构建成功后再重启。
- 服务器能否以 `deploy` 用户无交互执行 `sudo systemctl restart xdd-blog`、能否从服务器拉取 GitHub 仓库，需要在实施前通过一次手工检查确认。
