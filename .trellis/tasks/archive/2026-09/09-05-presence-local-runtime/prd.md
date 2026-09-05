# 将活动采集器迁移到本机 Hammerspoon 并开机自启

## 目标

将当前 Blog 中的 `presence:*` 运行脚本迁移到 `/Users/wuwanzhu/.hammerspoon/presence/`，由本机目录维护，通过 macOS `launchd` 在用户登录后自动运行；Blog 只保留活动 API、首页展示和服务端状态校验。

## 已确认事实

- Blog 当前在 `package.json` 维护 5 个 `presence:*` 脚本，采集器位于 `scripts/presence/collector.mts`，直接导入 Blog 的 `src/lib/presence.ts`。
- 采集器需要调用 `hs`、`herdr` 和本机 `POST /api/presence/report`；当前默认端点为 `http://127.0.0.1:4400/api/presence/report`。
- Hammerspoon 当前从 `/Users/wuwanzhu/.hammerspoon/init.lua` 加载 `/Users/wuwanzhu/.hammerspoon/presence.lua`；本机目录尚无 presence 专用子目录，也没有匹配的 LaunchAgent。
- 当前 shell 的 `node` 来自 fnm multishell 路径，不能直接写入 LaunchAgent；本机已有稳定版本目录 `/Users/wuwanzhu/.local/share/fnm/node-versions/v24.14.0/installation/bin/node` 和 `v26.7.0/installation/bin/node`，`fnm` 位于 `/opt/homebrew/bin/fnm`。
- Hammerspoon 和 Herdr 都需要当前登录用户会话；因此“开机自启”应按用户登录后的 `LaunchAgent` 设计，不使用系统级 `LaunchDaemon`。
- Blog API 和首页仍属于 Blog；迁移的是本地采集、Hammerspoon 模块、测试、安装/启停入口和自动启动配置。
- 既有隐私边界继续有效：只上报 7 个桌面应用 ID、Pi/agy/claude 身份和焦点状态，不读窗口标题、命令参数、cwd、提示词、聊天内容、终端输出、窗格标题、截图或原始 Herdr 响应。

## 需求

- R1：删除 Blog 的 5 个 `presence:*` package script，Blog 不再维护本地采集器启动入口。
- R2：在 `/Users/wuwanzhu/.hammerspoon/presence/` 集中维护采集器、Hammerspoon 模块、配置说明、测试和启停脚本；本地运行时不能导入 Blog 源码或依赖 `pnpm`。
- R3：保持现有上报 schema、白名单、Herdr 只读命令、Bearer 鉴权、回环 endpoint、2 秒轮询、15 秒 TTL、hidden 清除和不读取敏感内容的规则。
- R4：使用一个用户级 `LaunchAgent` 在登录后启动采集器；使用绝对路径调用稳定 Node、`herdr` 和必要的 Homebrew 命令，显式设置 `PATH`、`HOME`、工作目录和日志路径。
- R5：提供本地命令完成安装/加载、启动、停止、重启、一次采集、状态查看和测试；重复启动不能产生多个持续采集器。
- R6：迁移 Hammerspoon 模块时只修改必要的 `init.lua` 加载行，备份现有本机文件，不覆盖用户其他 Hammerspoon 配置。
- R7：本地 `config.env` 只保存运行配置和 Blog `.env.local` 路径，不保存 token；Blog 的 `.env.local` 使用权限为 `600`，token 不进入 LaunchAgent plist、日志或浏览器 bundle，服务端和采集器继续使用同一密钥。
- R8：文档明确采集器与 Blog 本地 API 的依赖关系、开机登录语义、日志位置、卸载方式和失败排查方法。

## 推荐设计边界

- Blog 保留 `src/lib/presence.ts`、`src/lib/presence-store.ts`、两个 API route、首页组件和服务端测试；本地目录维护采集端自己的固定 schema 实现与测试，使用 `schemaVersion: 1` 防止两侧契约漂移。
- 本地持续服务使用无 npm 依赖的 `collector.mts`，由固定 Node 直接运行；本地命令使用 shell wrapper 调用 `launchctl`，不再让 launchd 依赖交互式 shell 或 `pnpm`。
- 使用 `~/Library/LaunchAgents/com.xdd.blog.presence.plist`。服务只在当前用户登录会话运行，`RunAtLoad` 启动，`KeepAlive` 保持运行，stdout/stderr 写入本地日志。
- 不自动启动 Blog 开发服务器；Blog 服务未运行时采集器记录连接失败并继续重试，页面在 API 恢复后自动得到最新状态。Blog 仍由用户手动运行 `pnpm dev`。

## 验收标准

- [x] Blog `package.json` 不再有 5 个 `presence:*` 脚本；Blog 中不再存放采集器、Hammerspoon 模块或本地启动 wrapper。
- [x] `/Users/wuwanzhu/.hammerspoon/presence/` 具备独立可运行的采集器、Hammerspoon 模块、配置和测试；从非 Blog 工作目录运行也能工作。
- [x] LaunchAgent 安装后可通过 `launchctl print gui/$(id -u)/com.xdd.blog.presence` 查看，登录后自动运行且最多只有一个采集器进程。
- [x] 采集器可在 Blog API 未启动时保持重试；API 启动后能在 5 秒内写入 active，停止/锁屏/休眠/TTL 到期仍能清除旧状态。
- [x] 本地命令覆盖启动、停止、重启、一次采集、状态、测试和卸载；停止后不留下持续采集器，不把状态长期保持为 active。
- [x] 迁移前后的 Hammerspoon 事件、7 个桌面应用映射、Pi/agy/claude 前后台规则、unknown 和隐私字段测试全部通过。
- [x] 权限检查确认 `config.env` 和 Blog `.env.local` 为 `600`，plist 和日志不含 token，仓库不新增本机绝对路径或本地密钥。
- [x] 文档说明用户登录自启而非系统启动，并给出 API 未运行、Node 路径失效、launchd 未加载和回滚步骤。
- [x] 修改 Blog 代码后依次通过 `pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`；本地运行时测试通过。

## 非目标

- 不把采集器部署到公网，不新增数据库、WebSocket、远程管理接口或多设备同步。
- 不启动或修改 Pi、agy、claude 的全局配置、命令入口或插件。
- 不自动启动 Blog 开发服务、浏览器或其他桌面工具；Hammerspoon 只由现有登录项或一次性安装命令启动，不由本 LaunchAgent 管理登录项。
- 不把本地 runtime 目录提交到 Blog 仓库；Blog 只提交 API/UI 所需代码和迁移说明。
