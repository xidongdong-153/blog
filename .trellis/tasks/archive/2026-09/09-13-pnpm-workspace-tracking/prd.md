# 统一 pnpm 构建配置并规范工作区跟踪

## 目标

将 `pnpm-workspace.yaml` 作为项目依赖构建白名单配置纳入 Git 版本控制，移除 CI/CD 中对该文件的临时注入与服务器端特殊未跟踪断言，消除本地工作区常驻的未提交文件，统一三端（本地开发、CI 检查、生产部署）构建配置。

## 背景与问题

1. pnpm 10 与 11 默认开启依赖脚本执行沙箱，拦截第三方包的安装脚本。在安装 `esbuild` 与 `sharp` 时，依赖 `pnpm-workspace.yaml` 中的 `allowBuilds` 字段放行执行。
2. 历史部署方案将 `pnpm-workspace.yaml` 设定为“服务器专用的未跟踪文件”，并在 `.github/workflows/ci-cd.yml` 的远程部署脚本中显式断言：
   - 若该文件被 Git 跟踪，部署直接终止。
   - 若该文件被 `.gitignore` 忽略，部署直接终止。
   - 必须以未跟踪状态存在且精确匹配配置内容。
3. CI 环境中通过在安装前 `printf` 临时写入并在检查后 `rm -f` 强行清理。
4. 本地开发者运行 `pnpm install` 会生成该文件，但因部署脚本限制既不能提交也不能忽略，导致本地工作区持续显示未提交的未跟踪文件 `?? pnpm-workspace.yaml`。

## 需求

1. **统一配置文件管理**
   - 根目录 `pnpm-workspace.yaml` 正式纳入 Git 版本控制。
   - 配置内容仅保留实际需要的白名单项：
     ```yaml
     allowBuilds:
       esbuild: true
       sharp: true
     ```
2. **简化 CI/CD 工作流**
   - 移除 `.github/workflows/ci-cd.yml` 中 `quality` job 临时生成与删除 `pnpm-workspace.yaml` 的步骤。
   - 改造 `deploy` job 的远程脚本：
     - 支持首次上线平滑过渡：若服务器存在未被当前提交跟踪的历史未跟踪 `pnpm-workspace.yaml`，在 `git merge --ff-only` 前安全清理，避免 Git 合并报未跟踪文件覆盖错误。
     - 移除多套历史配置比对（`cmp -s`）与动态覆写逻辑。
     - 移除 `pnpm-workspace.yaml must be an untracked server-only file` 的特殊断言。
     - 恢复通用工作区校验：工作区除被忽略的 `.env.local` 外不得有任何未提交或未跟踪文件。
3. **规范文档对齐**
   - 更新 `.trellis/spec/frontend/deployment-guidelines.md`，删除服务器专用未跟踪文件的描述，记录 `pnpm-workspace.yaml` 已由版本库统一维护。

## 验收标准

- [x] `pnpm-workspace.yaml` 纳入 Git 跟踪，内容为 `esbuild` 与 `sharp` 的 `allowBuilds` 配置。
- [x] 本地执行 `pnpm install --frozen-lockfile` 成功，工作区保持完全干净，`git status` 无未提交变更。
- [x] `.github/workflows/ci-cd.yml` 的 `quality` job 不再临时创建和删除 `pnpm-workspace.yaml`。
- [x] `.github/workflows/ci-cd.yml` 的 `deploy` job 移除特例校验与旧配置覆写逻辑，支持首次合并平滑过渡，工作区检查无特殊文件豁免。
- [x] `.trellis/spec/frontend/deployment-guidelines.md` 规范与改动后逻辑完全一致。
- [x] 项目质量门全部通过：`pnpm typecheck`、`pnpm lint`、`pnpm format:check`。
