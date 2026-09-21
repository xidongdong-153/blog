# Node 26 项目基线与 CI 缓存设计

## 变更边界

- 最小行为缺口：项目本地已经使用 Node 26，但仓库、CI 和生产部署仍固定 Node 24；三个基础 Action 仍以 Node 20 Runtime 执行，setup-node 的旧缓存客户端近期返回 400。
- 行为实际所在位置：`.github/workflows/ci-cd.yml`、`package.json`、`README.md` 和 `.trellis/spec/frontend/deployment-guidelines.md`。生产服务器本身是外部运行环境，不能由仓库文件自动完成安装。
- 预计修改文件：`.github/workflows/ci-cd.yml`、`package.json`、`README.md`、`.trellis/spec/frontend/deployment-guidelines.md`，以及本任务计划文档。
- 明确不做：不修改应用业务代码、不升级依赖、不把 Action Runtime 改成 Node 26、不新增第二套缓存、不直接操作生产服务器。

## 方案

1. 将 `actions/checkout`、`pnpm/action-setup`、`actions/setup-node` 更新到官方当前 Node 24 Runtime 版本，并继续使用提交 SHA 固定 Action 版本。
2. 将项目运行时固定值统一替换为 Node `26.7.0`：`package.json` 的 engines、workflow 的 `node-version`、部署脚本的 `nvm use`、README 与部署规范。
3. 保留 `actions/setup-node` 的 `cache: pnpm`，补充 `cache-dependency-path: pnpm-lock.yaml`。缓存仍由 setup-node 管理，缓存键明确绑定根目录锁文件，不引入重复的 `actions/cache` 步骤。
4. 使用 `setup-node@v7` 的新版缓存依赖。官方 v7 发布说明显示其使用 `@actions/cache` 5.1.0；缓存服务异常时只影响缓存命中，不改变锁文件安装和 Quality 作业结果。
5. 使用本地 Node `26.7.0` 运行完整质量检查。pnpm 仍按仓库约定使用 `11.5.0`；本地 `10.29.1` 只作为环境差异记录，不写入项目配置。
6. 生产服务器需要在发布前具备 Node `26.7.0`。本任务只更新仓库中的部署契约；实际安装、nvm 切换和服务重启需要单独授权。

## 版本边界

Action Runtime 与项目运行时是两个独立版本：

- Action 的 `runs.using` 由 Action 自己声明。官方当前三个 Action 的最新版本都声明为 `node24`，不能通过 workflow 的 `node-version` 把 Action Runtime 改成 Node 26。
- workflow 的 `with.node-version` 和服务器上的 `nvm use` 才是项目运行时。本次把它们统一为 Node `26.7.0`。
- Node 26 的 LTS 时间是 2026-10-28。本次迁移由用户明确要求，验证重点是当前依赖和生产部署前置条件，不把 LTS 状态当成阻止本地验证的理由。

## 官方版本映射

| Action | 版本 | 固定 SHA | Runtime |
| --- | --- | --- | --- |
| `actions/checkout` | v7.0.1 | `3d3c42e5aac5ba805825da76410c181273ba90b1` | Node 24 |
| `pnpm/action-setup` | v6.1.0 | `ea17c68df8912ef543352723c149a84f56e3d413` | Node 24 |
| `actions/setup-node` | v7.0.0 | `820762786026740c76f36085b0efc47a31fe5020` | Node 24 |

## CI 数据流

```mermaid
%%{init: {"theme": "dark"}}%%
flowchart LR
  Trigger["Pull Request 或 main push"] --> Quality["quality job"]
  Quality --> Checkout["checkout v7 / Action Runtime Node 24"]
  Checkout --> Pnpm["pnpm setup v6 / Action Runtime Node 24"]
  Pnpm --> Node["setup-node v7 / Action Runtime Node 24"]
  Node --> ProjectNode["安装项目 Node 26.7.0"]
  ProjectNode --> Cache["pnpm store cache\nkey: pnpm-lock.yaml"]
  Cache --> Install["pnpm install --frozen-lockfile"]
  Install --> Checks["typecheck → lint → format → db → test → build"]
  Checks --> Deploy{ "main push 且 quality 成功?" }
  Deploy -->|是| Production["deploy / Deployment Environment\n服务器需有 Node 26.7.0"]
  Deploy -->|否| End["结束"]
```

## 兼容性与风险

- `actions/setup-node@v7.0.0` 可以安装 Node `26.7.0`，但其 Action Runtime 仍是 Node 24。
- `pnpm/action-setup@v6.1.0` 支持当前 workflow 使用的 pnpm `11.5.0`，不随项目 Node 基线迁移而降级。
- Node 26 仍处于 LTS 前阶段；必须用本地完整质量检查和 Pull Request Quality 运行验证依赖兼容性。
- 生产服务器如果没有 Node `26.7.0`，部署脚本会在 `nvm use` 处停止，不能把“仓库配置完成”当成“生产迁移完成”。
- GitHub 缓存服务仍可能临时不可用。缓存不能作为安装成功的前提；workflow 继续使用锁文件安装，缓存失败只能造成较慢运行。

## 回滚

如果 Node 26 下的项目检查或生产前置检查失败，回滚以下运行时配置到 Node `24.16.0`：`package.json`、README、workflow 和部署规范；Action 的 Node 24 Runtime 升级与缓存配置可以独立保留。不要重新启用 Node 20 兼容开关。
