# GitHub Actions 部署规范

## 发布范围与入口

修改 CI/CD、GitHub `Deployment` Environment 或服务器发布操作时遵守本文件。正式发布由 [ci-cd.yml](../../../.github/workflows/ci-cd.yml) 完成，不使用 Vercel。

- 目标为 `main` 的 Pull Request 只运行 `quality`。`main` push 的 `quality` 成功后才运行 `deploy`，不要从 Fork Pull Request 触发生产发布。
- `quality` 依次运行 `pnpm install --frozen-lockfile`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`。
- CI 临时生成只包含 `allowBuilds: sharp: true` 的 `pnpm-workspace.yaml`，允许 pnpm 11 执行 sharp 构建脚本；该文件贯穿检查步骤，job 结束时清理，不提交仓库。
- `deploy` 使用 `Deployment` Environment，通过 SSH 执行 `bash -s -- <target-sha>`，工作目录为 `/home/deploy/code/xdd/blog`。
- 同一分支的 workflow 串行执行，不取消正在运行的发布。只有服务器安装、构建、重启和健康检查全部通过才算发布成功。
- 运行服务为 `xdd-blog.service`，监听 `127.0.0.1:4400`；公网入口由 Caddy 提供 `https://blog.xdd.ink`。

以下操作是维护手册，不表示已执行。本次文档整理只核对仓库 workflow，未连接服务器或核验 GitHub Environment、分支保护和线上服务状态。

## GitHub 配置与安全边界

仓库 `Settings` -> `Environments` -> `Deployment`：Deployment branches and tags 只允许 `main`，不设置 Required reviewers，质量检查通过后直接发布。

| 类型     | 名称                 | 内容                                                   |
| -------- | -------------------- | ------------------------------------------------------ |
| Variable | `DEPLOY_HOST`        | 服务器地址，只放 Environment Variable，不写进 workflow |
| Variable | `DEPLOY_PORT`        | SSH 端口，现有维护约定为 `22`                          |
| Variable | `DEPLOY_USER`        | SSH 用户，现有维护约定为 `deploy`                      |
| Secret   | `DEPLOY_SSH_KEY`     | 专用于 Actions 登录服务器的 Ed25519 私钥               |
| Secret   | `DEPLOY_KNOWN_HOSTS` | 已人工核对指纹的服务器 `known_hosts` 完整行            |

`DEPLOY_SSH_KEY` 对应公钥放在 `/home/deploy/.ssh/authorized_keys`，不能复用服务器访问 GitHub 的私钥。服务器用自己的 GitHub 拉取权限；Actions 不读取、上传或打印服务器 `.env.local`。

workflow 使用 `BatchMode=yes`、`ConnectTimeout=15`、`StrictHostKeyChecking=yes`、`IdentitiesOnly=yes` 和 Secret 写入的 `known_hosts`，不使用未经核验的 `ssh-keyscan`。SSH 临时目录权限 `700`，私钥和 known_hosts 权限 `600`。

`main` 分支保护应要求 Pull Request 和 `Quality` 检查通过；必需检查名称以第一次工作流运行后 GitHub 实际显示的状态为准。

## 服务器发布契约

- Git 远端 `origin` 必须能读取 `main`。服务器 `.env.local` 必须存在、被 `.gitignore` 忽略且未被 Git 跟踪；不得复制或覆盖它。
- 工作区必须干净，唯一允许的例外是未跟踪的普通文件 `pnpm-workspace.yaml`。它不能是软链接、被 Git 跟踪或忽略，内容必须精确为以下内容（含末尾换行）：

```yaml
allowBuilds:
  sharp: true
```

- 该文件是服务器执行 `pnpm approve-builds sharp` 生成的专用配置，workflow 校验后原样保留；不修改它，也不允许第二个未跟踪文件。
- 远程先检查工作区和 `.env.local`，再 `git switch main`、`git fetch --prune origin main`。`origin/main` 必须等于本次 `github.sha`，服务器当前 `main` 必须是其祖先，禁止未推送提交或历史分叉。
- 通过检查后才执行 `git merge --ff-only origin/main`，加载 `/home/deploy/.nvm/nvm.sh`，安装依赖并构建；只有成功后才 `sudo -n systemctl restart xdd-blog.service`。
- 重启后检查 systemd active，再对 `http://127.0.0.1:4400/` 最多请求 15 次，单次 `curl --max-time 5`，失败轮次等待 1 秒，要求 HTTP `200`。这是重试次数限制，不是总计 15 秒的 deadline。

## 首次发布

先确认服务器前置条件。以下命令按现有 `deploy` 用户和 SSH 22 端口编写；端口或用户变更时同步调整 `ssh -p` 和登录用户。

```bash
export DEPLOY_HOST='<Deployment Environment 中的 DEPLOY_HOST>'
ssh "deploy@$DEPLOY_HOST" 'cd /home/deploy/code/xdd/blog && git status --short --branch'
ssh "deploy@$DEPLOY_HOST" 'cd /home/deploy/code/xdd/blog && git ls-remote --heads origin main'
ssh "deploy@$DEPLOY_HOST" 'source /home/deploy/.nvm/nvm.sh && node --version && pnpm --version'
ssh "deploy@$DEPLOY_HOST" 'cd /home/deploy/code/xdd/blog && test -f .env.local && git check-ignore -q .env.local'
ssh "deploy@$DEPLOY_HOST" 'sudo -n -l systemctl restart xdd-blog.service'
```

Node/pnpm 版本应与 workflow 的 Node.js `24.16.0`、pnpm `11.5.0` 一致。工作区与分支历史必须满足上节契约，发现 `src/site.config.ts` 或其他文件改动时先确认来源，不自动覆盖。

需要手工完成首次服务器构建时，使用以下检查脚本。它发布当前 `origin/main`，不绑定 Actions 的 `github.sha`，不能替代日常自动发布。执行前必须确认该提交已经通过质量检查并获得发布授权。

```bash
ssh "deploy@$DEPLOY_HOST" 'bash -s' <<'REMOTE'
set -euo pipefail
cd /home/deploy/code/xdd/blog
worktree_status="$(git status --porcelain --untracked-files=all)"
expected_pnpm_config=$'allowBuilds:\n  sharp: true\n'
pnpm_config_status="$(git status --porcelain --untracked-files=all --ignored -- pnpm-workspace.yaml)"
if git ls-files --error-unmatch -- pnpm-workspace.yaml >/dev/null 2>&1 ||
  [[ "$pnpm_config_status" != '' && "$pnpm_config_status" != '?? pnpm-workspace.yaml' ]]; then
  echo 'pnpm-workspace.yaml 必须是未跟踪的服务器专用文件，停止部署。' >&2
  git status --short --branch >&2
  exit 1
fi
if [[ "$pnpm_config_status" == '?? pnpm-workspace.yaml' ]]; then
  if [[ ! -f pnpm-workspace.yaml || -L pnpm-workspace.yaml ]] ||
    ! cmp -s pnpm-workspace.yaml <(printf '%s' "$expected_pnpm_config"); then
    echo 'pnpm-workspace.yaml 与允许的配置不完全一致，停止部署。' >&2
    git status --short --branch >&2
    exit 1
  fi
  echo '保留已核验的服务器专用 pnpm 配置。'
fi
if [[ -n "$worktree_status" && "$worktree_status" != '?? pnpm-workspace.yaml' ]]; then
  echo '服务器工作区有其他未提交或未跟踪改动，停止部署。' >&2
  git status --short --branch >&2
  exit 1
fi
if [[ ! -f .env.local ]] ||
  ! git check-ignore -q -- .env.local ||
  git ls-files --error-unmatch -- .env.local >/dev/null 2>&1; then
  echo '.env.local 不存在、未被忽略或已被跟踪，停止部署，不重启服务。' >&2
  exit 1
fi
git switch main
git fetch --prune origin main
current_sha="$(git rev-parse HEAD)"
if ! git merge-base --is-ancestor "$current_sha" origin/main; then
  echo "服务器 main ($current_sha) 不是 origin/main 的祖先，停止部署。" >&2
  exit 1
fi
git merge --ff-only origin/main
source /home/deploy/.nvm/nvm.sh
pnpm install --frozen-lockfile
pnpm build
sudo -n systemctl restart xdd-blog.service
systemctl is-active --quiet xdd-blog.service
REMOTE
```

若 pnpm 提示忽略 sharp 构建脚本，只在服务器单独执行 `pnpm approve-builds sharp`，再执行 `pnpm install --frozen-lockfile`，不要使用 `pnpm approve-builds --all`。手工脚本只检查 systemd 状态，完成后还必须检查服务器本机 HTTP 和公网：

```bash
ssh "deploy@$DEPLOY_HOST" 'curl -I http://127.0.0.1:4400/'
curl -I https://blog.xdd.ink/
```

首次 Actions 发布时，在工作分支提交 workflow 和文档，创建目标为 `main` 的 Pull Request 并确认 `quality` 通过；合并后在 `Actions` 观察 `main` 的 `quality` 和 `deploy`，最后检查 systemd 日志、本机 HTTP 和公网。配置变更、提交和部署均需各自获得授权。

## 日常发布与排查

日常只通过 Pull Request 合并到 `main` 发布。不在服务器编辑受跟踪文件，不把 `.env.local` 或 SSH 私钥传给 Actions。

查看仓库 `Actions` -> `CI/CD`。命令行可使用 GitHub CLI；使用前先 `gh auth login`，也可直接使用网页：

```bash
gh run list --repo xidongdong-153/blog --workflow ci-cd.yml --limit 10
RUN_ID='<run-id>'
gh run view "$RUN_ID" --repo xidongdong-153/blog --log-failed
```

使用首次发布一节的 `DEPLOY_HOST` 变量，检查服务、日志、端口和 HTTP：

```bash
ssh "deploy@$DEPLOY_HOST" 'sudo systemctl status xdd-blog.service --no-pager --full'
ssh "deploy@$DEPLOY_HOST" 'sudo journalctl -u xdd-blog.service -n 80 --no-pager -o cat'
ssh "deploy@$DEPLOY_HOST" 'curl -i http://127.0.0.1:4400/'
ssh "deploy@$DEPLOY_HOST" 'sudo ss -ltnp "sport = :4400"'
curl -I https://blog.xdd.ink/
```

公网 `502` 时先确认 systemd 正常且本机端口监听，再查 Caddy。完整服务器初始化、Caddy 配置与故障记录位于仓库外 `/Users/wuwanzhu/Projects/code-server-frp-maintenance/docs/services/blog.md`；已确认本机文件存在，其他机器需另行定位。首页活动上游的配置见[活动服务规范](./presence-guidelines.md)。

## 失败与回滚

| 条件                                        | 结果与检查证据                                               |
| ------------------------------------------- | ------------------------------------------------------------ |
| SSH 私钥或 known_hosts 为空                 | job 失败，不连接服务器，查看失败 step                        |
| 工作区干净，或只有精确匹配的 pnpm 配置      | 继续检查；有配置时保留原文件                                 |
| 其他工作区改动或 pnpm 配置不符合要求        | 立即停止，不拉取、不重启；查看 `git status --short --branch` |
| `origin/main` 与 `github.sha` 不同          | 停止，不合并、不重启；比较两个 SHA                           |
| 服务器 main 不是 origin/main 的祖先         | 停止，不合并、不重启；查看当前和远端 SHA                     |
| 安装或构建失败                              | 不执行重启；查看 Actions 和服务器构建日志                    |
| 重启后 systemd 不 active 或本机 HTTP 非 200 | 发布失败；查看 systemd、journal、curl，服务可能已受影响      |

重启前失败不会主动重启上一版进程，但构建在原工作目录内执行，不是原子发布，不能保证失败构建完全不影响旧服务文件。检查服务器改动时使用 `git status --short --branch` 和 `git diff` 确认来源，不使用 `git reset --hard` 或 `git clean` 绕过检查。

正常回滚是在 GitHub 对问题提交执行 `git revert`，创建 Pull Request 并合并到 `main`，让回滚提交重新经过 `quality` 和自动部署。不要在服务器直接 reset 到旧提交，也不要覆盖 `.env.local`。

错误：只执行 `git pull --ff-only origin main`、`pnpm build` 和 `sudo systemctl restart`。这会漏掉工作区、目标 SHA、历史和非交互 sudo 检查。

正确：使用 workflow 的完整远程脚本，先检查所有前置条件，再快进、安装、构建和重启，最后确认 systemd 与 HTTP；任何一步失败都停止，不自动清理服务器文件。

## 修改部署逻辑后的验证

- 本地依次运行 `pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`，均要求退出码 `0`。
- 用 Prettier 检查 workflow 和相关文档；Trellis 文档显式检查方法见[质量规范](./quality-guidelines.md)。
- 用 YAML 解析器检查 workflow 包含 `quality`、`deploy`、`needs: quality` 和 `Deployment` Environment；每个 `run` 块只做 `bash -n` 语法检查，不把检查变成真实部署。
- 获得服务器检查授权后，只读确认 Git 远端、工作区、Node/pnpm、环境文件是否存在且被忽略、sudo 权限、systemd 和本机 HTTP，不读取密钥或 `.env.local` 内容。
- 首次真实发布后确认 PR 只执行 quality，main push 先 quality 再 deploy，日志没有私钥或环境文件内容。纯文档迁移不执行这些生产操作。
