# 升级项目到 Node 26 并修复 CI 缓存

## Goal

把项目开发、CI 和生产部署的 Node.js 基线统一到 Node `26.7.0`，同时把 GitHub Actions 的执行 Runtime 升到官方当前的 Node 24 版本，并修复旧缓存客户端导致的 pnpm Cache 400 警告。

## Confirmed facts

- [`.github/workflows/ci-cd.yml`](../../../.github/workflows/ci-cd.yml) 当前使用 `actions/checkout@v4.2.2`、`pnpm/action-setup@v4.0.0`、`actions/setup-node@v4.1.0` 的固定 SHA；这些 Action 的执行 Runtime 仍是 Node 20。
- workflow 的项目 Node 版本和部署脚本当前固定为 `24.16.0`；README、部署规范和 `package.json` 也以 Node 24 为基线。
- `actions/setup-node` 当前通过 `cache: pnpm` 使用内置缓存，没有独立的 `actions/cache` 步骤。
- 近期 Quality 运行反复出现 `Failed to restore: Cache service responded with 400`，随后退化为 `pnpm cache is not found`，但没有使 Quality 作业失败。
- 官方当前三个 Action 的最新版本都声明使用 Node 24 Runtime：`actions/checkout@v7.0.1`、`actions/setup-node@v7.0.0`、`pnpm/action-setup@v6.1.0`；其中 `setup-node@v7` 使用 `@actions/cache` 5.1.0，不能把 Action Runtime 直接改成 Node 26。
- 当前本地 Node 为 `v26.7.0`，pnpm 为 `10.29.1`；仓库的 `engines.node` 是 `>=24.16.0`，所以本地 Node 26 已满足现有下限，但本地 pnpm 与 CI 的 `11.5.0` 不一致。
- Node 26 的官方 LTS 时间为 2026-10-28。用户明确选择把 Node 26 项目基线迁移纳入本次任务。

## Requirements

1. 将三个 Action 更新为官方当前 Node 24 Runtime 版本，并继续使用固定提交 SHA：
   - `actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1`（v7.0.1）
   - `pnpm/action-setup@ea17c68df8912ef543352723c149a84f56e3d413`（v6.1.0）
   - `actions/setup-node@820762786026740c76f36085b0efc47a31fe5020`（v7.0.0）
2. 将项目 Node 基线统一到 `26.7.0`：
   - `package.json` 的 `engines.node` 改为 `>=26.7.0`。
   - workflow 的 `node-version` 和部署脚本的 `nvm use` 改为 `26.7.0`。
   - README 和部署规范中的 Node 版本说明改为 `26.7.0`。
3. 保留 `cache: pnpm`，显式指定 `cache-dependency-path: pnpm-lock.yaml`，不新增独立 `actions/cache` 步骤。
4. 保持 pnpm `11.5.0` 作为仓库、CI 和生产部署约定；不把本地偶然使用的 pnpm `10.29.1` 写入项目配置。
5. 搜索活动配置与维护文档，确认没有遗漏的 Node `24.16.0`、Node 20 兼容开关、旧版 Action 引用或重复缓存步骤；历史归档任务文档保留原值，不改历史记录。
6. 在 Node 26 环境下完成 workflow 结构检查和项目质量验证。生产服务器实际切换到 Node 26 前，至少需要完成只读版本检查；未经用户单独授权，不直接修改或重启生产服务器。

## Out of scope

- 不修改应用业务源码、依赖版本或 `pnpm-lock.yaml`，除非 Node 26 验证明确发现必须升级依赖。
- 不尝试把 GitHub Action 自身 Runtime 改为 Node 26；官方 Action 当前只提供 Node 24 Runtime。
- 不把 pnpm 降级到本地当前的 `10.29.1`。
- 不通过 `ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION` 继续允许 Node 20。
- 不执行生产服务器安装、切换、重启、提交、推送或创建 Pull Request，除非用户另行确认。

## Acceptance Criteria

- [x] `.github/workflows/ci-cd.yml` 中三个 Action 使用上述 Node 24 Runtime SHA，行尾版本注释与 SHA 一致。
- [x] 项目运行时相关配置统一为 Node `26.7.0`：`package.json`、README、workflow、部署脚本和部署规范无活动的 Node `24.16.0` 配置。
- [x] workflow 仍保持 pnpm `11.5.0`、`cache: pnpm`、`cache-dependency-path: pnpm-lock.yaml` 和 `pnpm install --frozen-lockfile`。
- [x] workflow YAML 可被解析，`quality`、`deploy`、`needs: quality`、`Deployment` Environment 和原有部署脚本结构均保留。
- [x] 仓库活动配置中不再有本次范围内的旧版 Action、Node 20 兼容开关、Node 24 运行时配置或重复缓存步骤；历史归档文档不计入活动配置。
- [x] `pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm db:check`、`pnpm test`、`pnpm build` 全部通过；workflow、README 和部署规范通过 Prettier 检查。
- [ ] 修改后的 GitHub Actions 运行不再输出由 v4 Action 引起的 Node 20 弃用提示；缓存恢复失败时不阻断 Quality 作业。需要 Pull Request 运行后确认。
- [ ] 生产服务器在实际发布前确认已安装并可切换到 Node `26.7.0`；本次按用户授权不连接生产服务器。

## Open questions

无。用户已确认本次只修改仓库并完成本地验证，不连接生产服务器；服务器安装和切换到 Node `26.7.0` 是 Pull Request 合并前的独立运维前置条件。
