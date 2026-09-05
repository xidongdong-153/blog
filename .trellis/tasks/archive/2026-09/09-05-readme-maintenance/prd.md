# 精简 README 并迁移维护说明到 Trellis

## 目标

README 只保留认识项目和本地启动所需的信息；详细维护说明统一在 `.trellis/spec/frontend/` 保存，避免维护两份相同内容。

## 已确认事实

- README 包含目录说明、环境要求、启动命令、Mac 活动服务、内容约定、检查命令、功能状态和完整部署说明。
- `deployment-guidelines.md` 已记录发布契约，但缺少 README 中的部分配置、首次发布和排查说明。
- `presence-guidelines.md` 仍描述旧的 Blog POST 上报和 token 配置；`src/app/api/presence/route.ts` 当前只读取独立服务 API，默认端口 4401，请求超时 1500 ms。
- `AGENTS.md`、规范索引和质量规范仍要求在 README 维护内容约定与功能状态。

## 范围与要求

- README 保留项目简介、Node/pnpm 版本、安装启动、常用检查命令、核心配置与内容路径，以及 Trellis 文档链接，目标不超过 60 行。
- 内容约定迁入 `content-guidelines.md`，功能表迁入 `feature-status.md`；功能状态以迁入后的文件为唯一清单，不实现未开始的功能。
- Mac 活动说明并入现有 `presence-guidelines.md`；根据当前源码及可读取的本机 runtime 核对旧规范，删除已失效的 Blog 上报、token 和 LaunchAgent 说明。无法核实的外部状态明确标记，不凭空补充。
- 部署说明并入现有 `deployment-guidelines.md`；合并重复信息，保留配置、操作命令、安全边界、排查和回滚说明。
- 目录详情复用 `directory-structure.md`，仅补充迁移中发现的必要遗漏。
- 更新 `AGENTS.md`、规范索引和质量规范的引用，使后续维护不再要求向 README 添加详细说明。
- 不修改应用代码、依赖、CI、服务器或本机 runtime，不执行部署，不读取密钥内容，不整理历史归档任务中的 README 引用。

## 验收标准

- [x] README 不超过 60 行，照着可安装并启动到 `http://localhost:4400`。
- [x] 内容字段、功能状态、活动服务操作和部署维护信息在 Trellis 可找到，README 不再重复维护全文。
- [x] README 与相关规范的相对链接目标存在；当前生效规则不再指向被删除的 README 章节。
- [x] 活动规范与当前 Blog GET API 一致，不把已移除接口描述为当前行为。
- [x] 迁移后的命令和路径经过源码或现有文件核对；未执行生产命令。
- [x] 文档格式检查和 `git diff --check` 通过；Trellis 被默认 Prettier 忽略，改动 Markdown 需显式纳入检查。

## 风险与边界

迁移不是全文复制：现有规范重复或过期的内容需要在同一主题文件内合并、纠正。外部服务是否在线与生产发布是否成功不属于本次验证范围。

本任务仅调整文档，采用轻量 PRD；不需要设计文档或架构变更。

## 验证记录

- README 为 43 行；安装与启动命令按 `package.json` 的 `dev: next dev -p 4400` 核对，Node/pnpm 版本按 `.github/workflows/ci-cd.yml` 核对。本次未重新安装依赖或启动开发服务，启动条件只做静态核对。
- 新增 `content-guidelines.md`、`feature-status.md`，部署和活动维护合并进同主题规范；同步 AGENTS、索引、目录、质量、组件、状态及类型规范的相关引用。
- 活动说明按 Blog GET route、协议与组件，以及本机 runtime 的 collector、server、state、bin 命令、plist 模板和 Hammerspoon 模块核对。未读取环境文件、密钥、运行状态快照或日志。
- 修正规范中的笔记必填 status、日期字符串未验证日历合法性、活动上游 1500 ms 超时和部署健康检查最多 15 次请求等事实；未修改源码。
- `pnpm format:check` 通过；改动 Markdown 使用 `pnpm exec prettier --check --ignore-path /dev/null <文件列表>` 显式检查，包含 Trellis 规范和本 PRD。
- 使用 Prettier Markdown AST 核对改动文档中的 35 个相对链接目标，全部存在；17 个 Bash 代码块逐个送入 `bash -n`，均通过，仅解析未执行。
- `git diff --check` 通过；当前 AGENTS 和 spec 中未再查到被删除的 README 章节引用或旧活动 POST/token/LaunchAgent 约定。
- 纯文档修改，未运行 typecheck、lint、build、活动测试或浏览器测试；未连接服务器、执行部署、修改本机 runtime，也未提交。外部 frp/Caddy、GitHub 配置和线上服务状态未验证。

## 独立复核

- trellis-check 已检查全部文档 diff 和新增规范，未发现需要修复的迁移遗漏、事实错误或相对链接断链；现有规范已覆盖本次核实的边界，无需追加重复规则。
- 从原 README 和迁入的部署规范提取首次发布脚本，排除输出文案与空行后逐行一致，工作区、pnpm 配置、环境文件、分支历史和构建成功后重启的检查均保留。手工脚本不绑定 Actions SHA 的限制已明确说明。
- 独立运行 `pnpm format:check` 和显式 Prettier 检查，13 个改动 Markdown 均通过；README 为 43 行，35 个相对链接目标存在，17 个 Bash 代码块及远程 heredoc 正文通过 `bash -n`，`git diff --check` 通过。
- 活动规范再次对照 Blog GET route、协议、组件及本机 collector、server、state、命令、plist 模板和 Hammerspoon 源码；仅静态读取源码，未读取配置密钥、快照或日志，未运行生产操作。
