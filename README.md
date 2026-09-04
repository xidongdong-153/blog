# blog

Next.js 单应用个人博客。文章和笔记用 MDX 文件管理，合并到 `main` 后由 GitHub Actions 完成检查并发布到现有服务器，不需要数据库和后端。

架构参考 `xdd/starter` 的 web 应用（App Router、`(site)` 路由组、组件按功能分组内聚），内容组织参考 `joye-blog`（博客按文件夹、笔记按单文件）。

## 目录

代码在 `src/`，内容和配置文件在仓库根。

- `src/app/`：页面和布局。公开页面在 `src/app/(site)/`，页面私有组件在同级的 `_components/` 里按 `site`、`home`、`blog`、`notes`、`comment`、`placeholder` 分组；本地自托管字体在 `src/app/fonts/`。
- `src/lib/content.ts`：MDX 内容读取层，frontmatter 校验、排序、标签统计、目录提取都在这里。
- `src/site.config.ts`：站点标题、导航、社交链接、正式域名。
- `src/profile.config.ts`：个人简介、所在城市、技术栈、经历与教育等主页信息。
- `content/blog/`：文章，每篇一个文件夹。
- `content/notes/`：笔记，一条一个 `.md` 文件。

## 环境要求

- Node.js 24.16.0
- pnpm 11.5.0

## 安装和开发

```bash
pnpm install
pnpm dev
```

打开 `http://localhost:4400`。

## 内容约定

文章：

```text
content/blog/
  20260615-hello-blog/    文件夹名是 URL slug
    post.mdx              正文和 frontmatter
```

frontmatter 字段：

| 字段        | 必填 | 说明                                                   |
| ----------- | ---- | ------------------------------------------------------ |
| title       | 是   | 标题                                                   |
| date        | 是   | ISO 日期，如 2026-06-15                                |
| description | 否   | 列表页摘要和 SEO description                           |
| tags        | 否   | 字符串数组                                             |
| draft       | 否   | true 时不出现在列表、归档和标签页                      |
| updatedDate | 否   | ISO 日期，有值时详情页显示"更新于 ..."                 |
| heroImage   | 否   | 封面图路径（相对于 public/），如 /images/blog/hero.jpg |

笔记：`content/notes/first-note.md`，文件名是 slug。frontmatter 比文章多一个 `status` 字段，可选 `in-progress`、`incomplete`、`ready`、`archived`，列表页显示中文状态标记。

frontmatter 缺 `title` 或 `date` 时构建直接报错，错误信息带文件路径。

## 检查

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
```

## 功能状态

| 功能                               | 状态                   | 位置                                                              |
| ---------------------------------- | ---------------------- | ----------------------------------------------------------------- |
| 文章列表 / 详情 / 标签 / 归档      | 已实现                 | `src/app/(site)/blog/`                                            |
| 文章目录 TOC（滚动跟随高亮）       | 已实现                 | `src/app/(site)/_components/blog/toc.tsx`                         |
| 详情页右侧粘性 TOC 侧栏            | 已实现                 | `src/app/(site)/blog/[slug]/page.tsx`                             |
| Hero 图 + 更新日期                 | 已实现                 | `src/lib/content.ts`、`src/app/(site)/blog/[slug]/page.tsx`       |
| 版权卡片（CC BY-NC-SA 4.0）        | 已实现                 | `src/app/(site)/_components/blog/copyright-card.tsx`              |
| 笔记列表 / 详情（状态标记）        | 已实现                 | `src/app/(site)/notes/`                                           |
| 三态主题切换（系统 / 浅色 / 深色） | 已实现                 | `src/app/(site)/_components/site/theme-toggle.tsx`                |
| sticky 胶囊页头                    | 已实现                 | `src/app/(site)/_components/site/site-header.tsx`                 |
| 项目 / 友链 / 关于 / 联系          | 已实现                 | `src/app/(site)/` 对应目录                                        |
| 站内搜索                           | 占位页，方案见页面注释 | `src/app/(site)/search/page.tsx`                                  |
| Giscus 评论                        | 已实现                 | `src/app/(site)/_components/comment/giscus-comments.tsx`          |
| RSS                                | 未开始                 | 计划 `src/app/rss.xml/route.ts`                                   |
| sitemap / robots                   | 未开始                 | 计划 `src/app/sitemap.ts`、`src/app/robots.ts`                    |
| OG 图自动生成                      | 未开始                 | 计划 `src/app/(site)/blog/[slug]/opengraph-image.tsx`，用 next/og |
| 代码块高亮与复制                   | 已实现                 | `src/app/(site)/_components/blog/mdx-content.tsx`                 |

## 部署

正式发布由 `.github/workflows/ci-cd.yml` 完成，不使用 Vercel：

- 目标分支为 `main` 的 Pull Request 运行 `quality` 检查，依次执行 `pnpm typecheck`、`pnpm lint`、`pnpm format:check` 和 `pnpm build`。
- 合并到 `main` 后，`push` 工作流先运行同一套 `quality` 检查；检查通过后才运行 `deploy` job。
- `deploy` 使用 GitHub 的 `production` Environment，通过 SSH 连接服务器 `/home/deploy/code/xdd/blog`。
- 服务器使用自己的 GitHub 拉取权限，保留 `/home/deploy/code/xdd/blog/.env.local`；Actions 不读取、上传或打印这个文件。
- 服务器上的 `pnpm-workspace.yaml` 是 `pnpm approve-builds sharp` 生成的服务器专用配置；workflow 只接受内容精确为 `allowBuilds: sharp: true` 的这一项未跟踪文件，并不修改它。其他工作区改动都会停止部署。
- 服务器服务是 `xdd-blog.service`，监听 `127.0.0.1:4400`，公网入口仍由 Caddy 提供 `https://blog.xdd.ink`。

### GitHub 配置

在仓库 `Settings` -> `Environments` 中创建 `production`：

- Deployment branches and tags 只允许 `main`。
- 不配置 Required reviewers，`main` 的 `quality` 成功后直接发布。

在 `production` Environment 中填写以下值。实际服务器地址只放在 Environment Variable，不写入 workflow 文件：

| 类型     | 名称                 | 内容                                     |
| -------- | -------------------- | ---------------------------------------- |
| Variable | `DEPLOY_HOST`        | 服务器地址                               |
| Variable | `DEPLOY_PORT`        | SSH 端口，当前为 `22`                    |
| Variable | `DEPLOY_USER`        | SSH 用户，当前为 `deploy`                |
| Secret   | `DEPLOY_SSH_KEY`     | 专用于 Actions 登录服务器的 Ed25519 私钥 |
| Secret   | `DEPLOY_KNOWN_HOSTS` | 已人工核对指纹的服务器 `known_hosts` 行  |

`DEPLOY_SSH_KEY` 对应的公钥必须写入服务器 `deploy` 用户的 `/home/deploy/.ssh/authorized_keys`。它不能复用服务器访问 GitHub 的私钥。workflow 使用 `StrictHostKeyChecking=yes`、`IdentitiesOnly=yes` 和这个 Environment Secret 写入的 `known_hosts` 文件，不使用未经核验的 `ssh-keyscan`。

`main` 分支保护需要要求 Pull Request，并要求第一次工作流运行后 GitHub 页面显示的 `Quality` 检查通过。检查名称以仓库实际显示的状态为准。

### 首次发布

先在服务器确认：

```bash
export DEPLOY_HOST='<production Environment 中的 DEPLOY_HOST>'
ssh "deploy@$DEPLOY_HOST" 'cd /home/deploy/code/xdd/blog && git status --short --branch'
ssh "deploy@$DEPLOY_HOST" 'cd /home/deploy/code/xdd/blog && git ls-remote --heads origin main'
ssh "deploy@$DEPLOY_HOST" 'source /home/deploy/.nvm/nvm.sh && node --version && pnpm --version'
ssh "deploy@$DEPLOY_HOST" 'cd /home/deploy/code/xdd/blog && test -f .env.local && git check-ignore -q .env.local'
ssh "deploy@$DEPLOY_HOST" 'sudo -n -l systemctl restart xdd-blog.service'
```

工作区除服务器生成的 `pnpm-workspace.yaml` 外必须没有未提交或未跟踪改动，且服务器的 `main` 不能包含未推送的本地提交或历史分叉。这个文件只能是唯一一项未跟踪文件，内容必须精确为：

```yaml
allowBuilds:
  sharp: true
```

workflow 会校验并原样保留它，不会覆盖。`.env.local` 应该留在服务器上且由 `.gitignore` 忽略；不要因为自动部署而复制或覆盖它。`src/site.config.ts`、其他受 Git 跟踪文件或其他未跟踪文件有改动时，自动部署会停止。

```bash
ssh "deploy@$DEPLOY_HOST" 'bash -s' <<'REMOTE'
set -euo pipefail
cd /home/deploy/code/xdd/blog
worktree_status="$(git status --porcelain --untracked-files=all)"
expected_pnpm_config=$'allowBuilds:\n  sharp: true\n'
pnpm_config_status="$(git status --porcelain --untracked-files=all --ignored -- pnpm-workspace.yaml)"
if git ls-files --error-unmatch -- pnpm-workspace.yaml >/dev/null 2>&1 ||
  [[ "$pnpm_config_status" != '' && "$pnpm_config_status" != '?? pnpm-workspace.yaml' ]]; then
  echo 'pnpm-workspace.yaml must be an untracked server-only file; deployment stopped.' >&2
  git status --short --branch >&2
  exit 1
fi
if [[ "$pnpm_config_status" == '?? pnpm-workspace.yaml' ]]; then
  if [[ ! -f pnpm-workspace.yaml || -L pnpm-workspace.yaml ]] ||
    ! cmp -s pnpm-workspace.yaml <(printf '%s' "$expected_pnpm_config"); then
    echo 'pnpm-workspace.yaml does not exactly match the approved server-only config; deployment stopped.' >&2
    git status --short --branch >&2
    exit 1
  fi
  echo 'keeping the approved server-only pnpm config'
fi
if [[ -n "$worktree_status" && "$worktree_status" != '?? pnpm-workspace.yaml' ]]; then
  echo 'server worktree has unexpected uncommitted or untracked changes' >&2
  git status --short --branch >&2
  exit 1
fi

if [[ ! -f .env.local ]] ||
  ! git check-ignore -q -- .env.local ||
  git ls-files --error-unmatch -- .env.local >/dev/null 2>&1; then
  echo 'missing or tracked .env.local; deployment stopped without restarting the service' >&2
  exit 1
fi
git switch main
git fetch --prune origin main
current_sha="$(git rev-parse HEAD)"
if ! git merge-base --is-ancestor "$current_sha" origin/main; then
  echo "server main ($current_sha) is not an ancestor of origin/main" >&2
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

如果 pnpm 提示忽略 `sharp` 构建脚本，只在服务器上单独执行 `pnpm approve-builds sharp`，再执行 `pnpm install --frozen-lockfile`，不要使用 `pnpm approve-builds --all`。手工发布后先执行 `ssh "deploy@$DEPLOY_HOST" 'curl -I http://127.0.0.1:4400/'` 检查服务器本机，再检查公网地址。

首次 GitHub Actions 发布的顺序是：

1. 在工作分支提交 workflow 和文档，创建目标为 `main` 的 Pull Request，确认 `quality` 通过。
2. 合并 Pull Request。不要从 Fork 的 Pull Request 触发生产发布。
3. 在 `Actions` 页面观察 `main` 的 `quality` job；通过后 `deploy` 才会运行。
4. 检查服务器的 systemd 日志、本机 `127.0.0.1:4400` 和公网 `https://blog.xdd.ink`。

### 日常发布

日常只通过 Pull Request 合并到 `main` 发布。不要在服务器执行会留下工作区改动的编辑，也不要手工把 `.env.local` 或 SSH 私钥传给 Actions。服务器可以保留内容精确匹配的 `pnpm-workspace.yaml`，其他工作区改动会让 workflow 停止。workflow 会串行处理同一分支的运行，远程先确认工作区状态，再确认当前服务器 `main` 是 `origin/main` 的祖先且 `origin/main` 的 SHA 与本次 `github.sha` 一致，最后才快进更新、安装依赖、构建和重启服务。

### 检查与排查

网页入口：仓库 `Actions` -> `CI/CD`。命令行可以使用 GitHub CLI；使用 CLI 前先执行 `gh auth login`，也可以直接在网页中查看运行记录。

```bash
gh run list --repo xidongdong-153/blog --workflow ci-cd.yml --limit 10
RUN_ID='<run-id>'
gh run view "$RUN_ID" --repo xidongdong-153/blog --log-failed
```

查看服务器服务和应用：

```bash
ssh "deploy@$DEPLOY_HOST" 'sudo systemctl status xdd-blog.service --no-pager --full'
ssh "deploy@$DEPLOY_HOST" 'sudo journalctl -u xdd-blog.service -n 80 --no-pager -o cat'
ssh "deploy@$DEPLOY_HOST" 'curl -i http://127.0.0.1:4400/'
ssh "deploy@$DEPLOY_HOST" 'sudo ss -ltnp "sport = :4400"'
curl -I https://blog.xdd.ink/
```

如果公网返回 `502`，先确认 `xdd-blog.service` 正常且服务器本机端口有监听，再检查 Caddy。完整的服务器初始化、Caddy 配置和故障记录见 `/Users/wuwanzhu/Projects/code-server-frp-maintenance/docs/services/blog.md`。

### 失败与回滚

SSH、工作区检查、目标 SHA 检查、服务器 `main` 历史检查、依赖安装或构建失败时，workflow 会失败并停止在重启之前；正在运行的上一版服务不会被主动重启。服务器工作区如果有 `src/site.config.ts`、其他受跟踪文件或其他未跟踪文件改动，先用 `git status --short --branch` 和 `git diff` 确认来源，不要使用 `git reset --hard` 或 `git clean` 覆盖它们。唯一允许的未跟踪文件是内容精确匹配的服务器专用 `pnpm-workspace.yaml`。

如果服务已经重启但本机健康检查失败，先看 `systemctl status`、`journalctl` 和本机端口。正常回滚方式是在 GitHub 对问题提交执行 `git revert`，创建 Pull Request 并重新合并到 `main`，让回滚提交重新经过 `quality` 和自动部署。不要在服务器直接 reset 到旧提交，也不要覆盖 `.env.local`。
