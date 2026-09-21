# Node 26 项目基线与 CI 缓存实施计划

## 实施步骤

1. 确认生产服务器操作边界。仓库配置和本地验证可以直接执行；服务器安装、nvm 切换、服务重启和线上检查需要单独授权。
2. 启动任务并确认分支为 `fix/ci-node24-cache`。
3. 修改项目运行时配置：
   - `package.json` 的 `engines.node` 改为 `>=26.7.0`。
   - `README.md` 的环境说明改为 Node `26.7.0`，pnpm 继续写 `11.5.0`。
4. 修改 `.github/workflows/ci-cd.yml`：
   - 更新 `actions/checkout` 到 v7.0.1 固定 SHA。
   - 更新 `pnpm/action-setup` 到 v6.1.0 固定 SHA。
   - 更新 `actions/setup-node` 到 v7.0.0 固定 SHA。
   - 将 `node-version` 改为 `26.7.0`。
   - 保留 `cache: pnpm`，增加 `cache-dependency-path: pnpm-lock.yaml`。
   - 将远程部署脚本的 `nvm use` 改为 `26.7.0`。
5. 修改 `.trellis/spec/frontend/deployment-guidelines.md` 中的 Node 版本、服务器前置检查和手工部署脚本，保持文档与 workflow 一致。
6. 搜索活动配置与维护文档：检查旧版 Action、Node 20 兼容开关、Node `24.16.0` 活动引用和重复缓存步骤；历史归档任务文档保留原值，不改历史记录。
7. 检查 workflow：
   - 用 YAML 解析器读取 `.github/workflows/ci-cd.yml`。
   - 用 Prettier 检查 workflow、README 和部署规范。
   - 对 workflow 中的 shell `run` 块执行静态 `bash -n` 检查，不执行部署脚本。
8. 在本地 Node `26.7.0` 环境按项目质量门顺序运行：
   - 使用仓库约定的 pnpm `11.5.0`。
   - `pnpm typecheck`
   - `pnpm lint`
   - `pnpm format:check`
   - `pnpm db:check`
   - `pnpm test`
   - `pnpm build`
9. 检查 `git diff`、`git diff --check` 和工作区状态，确认只包含本次运行时、CI、部署规范与任务文档改动，不包含密钥、环境文件、锁文件无关变化或历史归档改动。
10. 不执行 `git commit`、`git push`、生产部署或服务器修改。提交前先向用户展示改动摘要并等待确认。
11. 获得服务器操作授权后，只读确认服务器 Node/pnpm、nvm 和工作区；若 Node `26.7.0` 不存在，先完成服务器 Node 安装与版本切换，再进入正式发布。
12. Pull Request 合并后观察 GitHub Actions：确认 Action Runtime 不再输出 Node 20 弃用提示、项目步骤使用 Node 26、缓存恢复失败不阻断 Quality；合并后的 main push 再确认部署使用 Node 26。

## 风险点

- Action 版本必须与固定 SHA 和行尾版本注释一致，避免审计时产生误导。
- 不要把 `cache: pnpm` 改成第二套 `actions/cache`，避免同一 pnpm store 被重复管理。
- 不要为了消除警告而设置 `ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true`，那会恢复已弃用的 Node 20 Runtime。
- Node 26 当前尚未进入 LTS；依赖兼容性以本地和 GitHub Quality 实际结果为准。
- 生产服务器没有 Node `26.7.0` 时，更新后的部署脚本会停止，不能绕过版本检查继续发布。

## 回滚点

- Action/缓存验证失败：只回滚 `.github/workflows/ci-cd.yml` 中的 Action 引用和缓存配置。
- Node 26 项目检查或服务器前置检查失败：将 `package.json`、README、workflow 和部署规范中的项目 Node 基线回滚到 `24.16.0`。
- 不回滚已经确认正确的安全检查、部署顺序和 Node 24 Action Runtime 升级。
