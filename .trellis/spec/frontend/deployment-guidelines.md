# GitHub Actions 部署规范

## Scenario: blog 生产发布

### 1. Scope / Trigger

- Trigger：修改 `.github/workflows/ci-cd.yml`、GitHub `Deployment` Environment、服务器 `/home/deploy/code/xdd/blog` 部署流程，或排查 CI/CD、SSH、systemd 发布问题时遵守本规范。
- 范围：GitHub Actions 检查 Pull Request 和 `main` push，并在 `main` push 的质量检查通过后通过 SSH 发布博客。
- 运行服务：`xdd-blog.service` 监听 `127.0.0.1:4400`，Caddy 负责公网 HTTPS。

### 2. Signatures

- 质量检查触发：`pull_request` 目标分支 `main`、`push` 分支 `main`。
- 质量命令顺序：CI 在 `quality` job 中临时生成只包含 `allowBuilds: sharp: true` 的 `pnpm-workspace.yaml`，然后执行 `pnpm install --frozen-lockfile`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`，job 结束时清理该文件；服务器使用同内容的服务器专用配置。
- 部署条件：`github.event_name == 'push' && github.ref == 'refs/heads/main'`，并且 `needs: quality` 成功。
- 远程脚本入口：通过 SSH 执行 `bash -s -- <target-sha>`。
- 服务重启命令：`sudo -n systemctl restart xdd-blog.service`。
- 本机健康检查：重启后最多等待 15 秒，请求 `http://127.0.0.1:4400/`，状态码必须是 `200`。

### 3. Contracts

GitHub `Deployment` Environment 的配置契约：

| 类型     | 名称                   | 约束                                     |
| -------- | ---------------------- | ---------------------------------------- |
| Variable | `DEPLOY_HOST`        | 服务器地址                               |
| Variable | `DEPLOY_PORT`        | SSH 端口，当前为`22`                   |
| Variable | `DEPLOY_USER`        | 当前为`deploy`                         |
| Secret   | `DEPLOY_SSH_KEY`     | 只用于 Actions 登录服务器的 Ed25519 私钥 |
| Secret   | `DEPLOY_KNOWN_HOSTS` | 已人工核验的服务器`known_hosts` 完整行 |

服务器契约：

- Git 工作目录：`/home/deploy/code/xdd/blog`。
- Git 远端：`origin` 必须能读取 `main`。
- `.env.local` 留在服务器项目目录，由 `.gitignore` 忽略；Actions 不读取、上传或打印它。
- 服务器可以保留唯一一项未跟踪文件 `pnpm-workspace.yaml`，其内容必须精确为：

  ```yaml
  allowBuilds:
    sharp: true
  ```
- 任何其他受跟踪文件改动、未跟踪文件、服务器 `main` 历史分叉或远端 SHA 不匹配都会阻止发布。
- `origin/main` 与本次工作流的 `github.sha` 必须相同；服务器当前 `main` 必须是它的祖先。
- 只有依赖安装和构建成功后才能重启服务。

### 4. Validation & Error Matrix

| 条件                                     | 结果                        | 必须保留的证据                  |
| ---------------------------------------- | --------------------------- | ------------------------------- |
| Pull Request 触发                        | 只运行`quality`           | Actions 中的检查结果            |
| `main` push 且 `quality` 成功        | 允许运行`deploy`          | workflow run 和目标 SHA         |
| SSH key 或 known_hosts 为空              | 部署 job 失败，不连接服务器 | Actions 失败 step               |
| 工作区为空                               | 继续部署                    | `git status --porcelain` 为空 |
| 只有精确匹配的`pnpm-workspace.yaml`    | 保留该文件并继续，不修改它  | 文件内容和状态检查              |
| 其他工作区改动                           | 立即失败，不拉取、不重启    | `git status --short --branch` |
| `origin/main` 与 `github.sha` 不同   | 立即失败，不合并、不重启    | 两个 SHA                        |
| 当前`main` 不是 `origin/main` 的祖先 | 立即失败，不合并、不重启    | 当前 SHA 和远端 SHA             |
| `pnpm install` 或 `pnpm build` 失败  | 失败，不执行服务重启        | Actions 和服务器构建日志        |
| systemd 未 active 或本机 HTTP 非`200`  | 部署失败，按回滚流程处理    | systemd、journal 和 curl 结果   |

### 5. Good / Base / Bad Cases

- Good：工作区只有被允许的 `pnpm-workspace.yaml`，`.env.local` 被忽略，`origin/main` 等于工作流 SHA，服务器 `main` 是其祖先，构建成功后服务 active 且本机返回 `200`。
- Base：工作区完全干净，没有 `pnpm-workspace.yaml`；所有 Git、安装、构建和健康检查也必须通过。
- Bad：`src/site.config.ts` 有本地改动、出现第二个未跟踪文件、`pnpm-workspace.yaml` 内容被修改、服务器存在未推送提交，或 `origin/main` 已在质量检查后继续前进；这些情况必须停止发布，不能用 `git reset --hard` 或 `git clean` 绕过。

### 6. Tests Required

- 本地按顺序运行 `pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`，断言全部退出码为 `0`。
- 用 Prettier 检查 workflow 和相关文档，断言格式检查通过。
- 用 YAML 解析器检查 `.github/workflows/ci-cd.yml`，断言包含 `quality`、`deploy`、`needs: quality` 和 `Deployment` Environment。
- 对 workflow 中的每个 `run` 块执行 Bash 语法检查，断言无语法错误。
- 手工只读检查服务器的 Git 远端、工作区、Node/pnpm、`.env.local`、sudo 权限、systemd 状态和本机 HTTP。
- 第一次真实发布后，断言 Pull Request 只执行 `quality`，`main` push 先执行 `quality` 再执行 `deploy`，Actions 日志中没有私钥或 `.env.local` 内容。

### 7. Wrong vs Correct

#### Wrong

```bash
git pull --ff-only origin main
pnpm build
sudo systemctl restart xdd-blog.service
```

这段命令没有验证服务器工作区、目标 commit 和分支历史，也没有要求 sudo 非交互执行；它可能发布未经过当前 CI 的提交，并可能覆盖服务器本地改动。

#### Correct

```bash
worktree_status="$(git status --porcelain --untracked-files=all)"
# 只允许内容精确匹配的服务器专用 pnpm-workspace.yaml
# 其他工作区改动直接退出

git fetch --prune origin main
test "$(git rev-parse origin/main)" = "$target_sha"
git merge-base --is-ancestor "$(git rev-parse HEAD)" "$(git rev-parse origin/main)"
git merge --ff-only origin/main
pnpm install --frozen-lockfile
pnpm build
sudo -n systemctl restart xdd-blog.service
```

构建步骤必须位于重启步骤之前；失败时保留当前服务，不自动清理服务器文件。
