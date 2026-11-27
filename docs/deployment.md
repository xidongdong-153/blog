---
description: 'GitHub Actions 检查与手动发布、服务器安全前置条件、健康检查和回滚'
status: implemented
paths:
  - '.github/workflows/ci-cd.yml'
  - 'package.json'
  - 'pnpm-workspace.yaml'
  - 'server.ts'
  - 'next.config.ts'
  - 'scripts/sync-summaries.ts'
---

# 部署与排查

发布实现唯一来源：[ci-cd.yml](../.github/workflows/ci-cd.yml)。日常提交与发布授权见 [Git 与发布](git-workflow.md)。以下是仓库脚本和既有运维约定，不表示本轮读取了 GitHub Settings、登录服务器或执行了发布。

## 发布入口

- main push 和目标为 main 的 PR 只运行 Quality，不自动发布。
- Actions → CI/CD → Run workflow，选择 main、勾选“确认发布到生产环境”。仅 workflow_dispatch、refs/heads/main、confirm_deploy=true 且 Quality 成功时运行 Deploy production；默认不勾选只检查。
- 工作流按分支串行，不取消正在执行的发布。部署使用 Deployment Environment。
- 生产发布另获明确授权，提交或推送的授权不包含发布。

## 运行时与 Quality

| 项目      | 仓库配置                                                                  |
| --------- | ------------------------------------------------------------------------- |
| 项目 Node | setup-node 和远程 nvm use 均为 26.7.0；engines.node 至少该版本            |
| pnpm      | action-setup 固定 11.5.0，安装使用 frozen-lockfile                        |
| Action    | 固定 SHA，以 workflow 为准；Action 自身 runs.using 与项目 Node 是不同配置 |
| 缓存      | setup-node 管 pnpm 缓存，绑定 pnpm-lock.yaml；不新增第二套 store 缓存     |
| 依赖构建  | pnpm-workspace.yaml 的 allowBuilds 统一本地、CI 与生产                    |

Quality 依次安装依赖、typecheck、lint、format:check、db:check、db:migrate、build。数据库步骤与构建指定 runner 的 `DATABASE_URL=file:ci.db`（本地 SQLite 无需 token）；构建用固定非生产认证配置，不读生产数据库和 AI 凭据。

Action Runtime 升级与项目 Node 升级分开核对，不能用 node-version 改 Action 的 runs.using，也不设置旧 Runtime 兼容开关。缓存未命中不代替或跳过 frozen install。版本不匹配先修配置与锁文件，不跳过检查。

## GitHub 环境配置约定

Deployment branches and tags 明确限定 main，不配置 Required reviewers 或等待时间；main 允许直接推送，PR 按需使用。这里保留已确认约定，当前 GitHub 设置需在网页另查。

| 类型     | 名称                                  | 用途                                      |
| -------- | ------------------------------------- | ----------------------------------------- |
| Variable | DEPLOY_HOST、DEPLOY_PORT、DEPLOY_USER | SSH 目标；既有用户 deploy、端口 22        |
| Secret   | DEPLOY_SSH_KEY                        | Actions 专用 Ed25519 私钥                 |
| Secret   | DEPLOY_KNOWN_HOSTS                    | 人工核对指纹后的 known_hosts 行           |
| Secret   | AI_CREDENTIAL_ENCRYPTION_KEY          | 32 字节 Base64 主密钥；非空时同步到服务器 |

应用的数据库（`DATABASE_URL`、远程模式所需的 `DATABASE_AUTH_TOKEN`、可选 `DATABASE_AUTO_MIGRATE`）、Better Auth、OAuth、管理员邮箱与邮件等键按 workflow 中的 env 定义提供。部署脚本将非空环境配置写入发布目录并挂载为容器 `env_file`；当使用 Docker 默认 SQLite 部署时，容器默认落盘持久化卷 `blog-data:/app/data/blog.db` 并在启动时自动执行迁移。

Actions 密钥与服务器拉 GitHub 的密钥分开，公钥放 deploy 的 authorized_keys。SSH 使用 BatchMode、15 秒连接超时、StrictHostKeyChecking、IdentitiesOnly 和已核对 known_hosts，不临时 ssh-keyscan。临时目录 700，私钥和 known_hosts 600，不打印值。

## 服务器发布顺序

工作目录约定为 /home/deploy/code/xdd/blog，服务 xdd-blog.service，默认监听 127.0.0.1:4400。Caddy 提供 https://blog.xdd.ink 并转发 WebSocket upgrade；当前服务器与 Caddy 状态需现场确认。

workflow 通过 SSH 的 bash stdin 传入目标 SHA、非空应用配置和发布脚本：

1. 检查工作区与 .env.local。环境文件必须存在、被忽略且未跟踪。
2. 切 main、fetch origin/main；远端 SHA 必须等于工作流目标 SHA，当前服务器 main 必须是它的祖先。main 在检查期间更新会使旧运行停止，应重新发布最新提交。
3. 快进更新，nvm use 26.7.0，同步非空环境键。
4. frozen install → db:migrate → db:verify → summary:sync → build。
5. sudo -n 重启服务，检查 systemd active、首页 HTTP、访客 API 和 WebSocket 鉴权。

工作区检查有一处既有兼容例外：workflow 会先删除“存在但未跟踪的根 pnpm-workspace.yaml”，再检查其余改动；不校验该旧文件内容。本轮只如实记录该行为，不扩大为自动清理规则。其他未提交或未跟踪文件使发布停止。

生产启动走 pnpm start，即 tsx server.ts，同时提供 Next.js 与访客 WebSocket；不使用 standalone 或绕过入口的 next start。tsx 与 ws 是直接运行时依赖。

## 健康检查与失败边界

- 重启前安装、迁移或构建失败，不主动重启服务。但构建在原工作目录执行，非原子发布，失败也可能影响旧服务文件。
- 首页最多请求 15 次，单次 curl 最长 5 秒，失败后等待 1 秒，要求 HTTP 200；不是总计 15 秒 deadline。
- 访客 /api/visitors/stats 必须 HTTP 200；无 Cookie 的 /api/visitors/socket 升级检查预期 HTTP 401。这只证明路径和鉴权响应，不证明登录后的实时连接可用。
- 重启后 systemd 不 active、首页或访客检查不符均视为发布失败，服务可能已受影响。
- 摘要同步命令 best-effort，失败不阻断构建；退出码 0 不证明生成了摘要，实际计数和缓存另查 [AI](ai.md)。

## 只读排查入口

替换实际服务器目标后使用；下面命令本轮未执行，不读取 .env.local 内容。

```bash
export DEPLOY_HOST='<Deployment Environment 中的 DEPLOY_HOST>'
RUN_ID='<run-id>'
gh run list --repo xidongdong-153/blog --workflow ci-cd.yml --limit 10
gh run view "$RUN_ID" --repo xidongdong-153/blog --log-failed
ssh "deploy@$DEPLOY_HOST" 'cd /home/deploy/code/xdd/blog && git status --short --branch'
ssh "deploy@$DEPLOY_HOST" 'sudo systemctl status xdd-blog.service --no-pager --full'
ssh "deploy@$DEPLOY_HOST" 'sudo journalctl -u xdd-blog.service -n 80 --no-pager'
ssh "deploy@$DEPLOY_HOST" 'curl -i http://127.0.0.1:4400/'
ssh "deploy@$DEPLOY_HOST" 'sudo ss -ltnp "sport = :4400"'
curl -I https://blog.xdd.ink/
```

公网 502 先查 systemd、本机端口和 HTTP，再查 Caddy。Mac 活动离线时按[活动接口](presence.md)核对读取模式、采集器确认时间和数据库快照。

旧记录的服务器维护文档位于仓库外 `/Users/wuwanzhu/Projects/code-server-frp-maintenance/docs/services/blog.md`，本轮未核对该位置，其他机器需另行定位。

## 回滚与修改发布脚本

回滚用 git revert 创建新提交，检查并按授权推送 main，再手动发布；不在服务器 reset/clean 覆盖未知改动，不覆盖环境文件。

修改部署脚本时核对事件条件、needs: quality、Environment、目标 SHA、工作区、密钥和健康检查分支。shell 块只做 bash -n 语法检查，不把检查变成部署；代码质量命令见[开发约定](development.md)。配置存在或检查通过不能替代真实 Actions 日志和线上用户路径。
