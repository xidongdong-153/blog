# Mac 活动服务规范

## 范围与依据

修改桌面白名单、Herdr 映射、活动字段、状态保存或首页轮询时，检查本文件。Blog 只读取独立 Mac Presence Service 的公开 API，不负责采集和写入状态，也不需要先启动 Blog 才能采集。

本文件依据 `src/app/api/presence/route.ts`、`src/lib/presence.ts`、首页 `presence.tsx` 和本机 `$HOME/.hammerspoon/presence/` 源码核对。该 runtime 不在 Blog 仓库内，部署到其他机器前需另行准备；本次仅核对可读源码，没有确认外部 frp、Caddy、线上配置或服务在线状态。

## 命令与 API

在已准备 runtime、Hammerspoon 和稳定 Node 的 Mac 上操作：

```bash
$HOME/.hammerspoon/presence/bin/install
$HOME/.hammerspoon/presence/bin/status
$HOME/.hammerspoon/presence/bin/start
curl --fail --silent http://127.0.0.1:4401/api/presence
curl --fail --silent http://127.0.0.1:4401/healthz
```

| 命令            | 效果                                                                                                              |
| --------------- | ----------------------------------------------------------------------------------------------------------------- |
| `bin/install`   | 校验 runtime、备份并调整 Hammerspoon 加载配置、重新加载 Hammerspoon、注册并启动用户级 LaunchAgent；不启动 Blog    |
| `bin/status`    | 读取一次 Hammerspoon 和 Herdr，只打印固定报告，不保存状态                                                         |
| `bin/once`      | 读取一次并保存到本机状态文件，不向 Blog 发请求                                                                    |
| `bin/start`     | bootstrap 或 kickstart 固定 label，启动唯一持续采集器和只读 API；恢复 Hammerspoon 监听，每轮完成后等待 2 秒再采集 |
| `bin/stop`      | bootout 服务、停止 Hammerspoon 监听并保存 hidden 状态                                                             |
| `bin/restart`   | 停止后重新启动                                                                                                    |
| `bin/uninstall` | 停止服务，删除生成的 plist 和 presence 加载行；保留 runtime、配置、日志、备份                                     |
| `bin/test`      | 运行本机协议与状态测试                                                                                            |

停止、重启、卸载分别执行：

```bash
$HOME/.hammerspoon/presence/bin/stop
$HOME/.hammerspoon/presence/bin/restart
$HOME/.hammerspoon/presence/bin/uninstall
```

独立服务只监听 `127.0.0.1`，默认端口 `4401`。`GET /api/presence` 返回公开活动，`GET /healthz` 返回 `{ "ok": true, "service": "presence" }`；非 GET 返回 `405`，未知路径返回 `404`。健康接口只表示服务能响应，不代表采集成功。

Blog 只提供 `GET /api/presence`，使用 `parsePublicPresence` 校验上游响应；上游读取和响应均禁止缓存，响应头为 `Cache-Control: no-store, max-age=0`。Blog 没有活动写入路由，也不读取采集 token。

## 配置、字段与隐私

| 配置                   | 位置与约束                                                                                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PRESENCE_SOURCE_URL`  | Blog `.env.local` 可选配置，默认 `http://127.0.0.1:4401/api/presence`；只接受无账号密码的 HTTP(S) URL。生产可填写 frp 在服务器的回环入口，如 `http://127.0.0.1:18100/api/presence`，实际地址需现场确认 |
| `PRESENCE_CONFIG_FILE` | runtime 可选配置文件路径，默认 `$HOME/.hammerspoon/presence/config.env`                                                                                                                                |
| `PRESENCE_PORT`        | runtime 监听端口，默认 `4401`，必须为 `1` 到 `65535` 的整数                                                                                                                                            |
| `HERDR_ENV`            | runtime 中为 `1` 时读取 Herdr，否则终端检测为 `unknown`；进程环境优先于配置文件，当前 plist 模板固定设置 `1`                                                                                           |

内部采集报告固定为以下六个字段，不等同于 Blog GET 的公开响应：

- `schemaVersion`：固定为 `1`。
- `availability`：`active` 或 `hidden`。
- `desktopApp`：`qq`、`vscode`、`ghostty`、`chatgpt`、`antigravity`、`qqmusic`、`workbuddy`，或 `null`。
- `foregroundTool`：`pi`、`agy`、`claude`，或 `null`。
- `backgroundTools`：去重后的 CLI ID 数组，不保留当前 CLI。
- `terminalDetection`：`known` 或 `unknown`。

桌面显示名称分别是 QQ、VS Code、Ghostty、ChatGPT、Antigravity、QQ 音乐、WorkBuddy。`foregroundTool` 只有在 Ghostty 前台且焦点为 `known` 时有效；hidden 状态清空桌面、当前和后台 CLI，终端为 `unknown`。

runtime 保存 `$HOME/.hammerspoon/presence/state/presence.json`，增加 `receivedAt` 和 15 秒后的 `expiresAt`。同一进程内串行写临时文件后原子重命名，只保留最新状态；目录权限 `700`，状态文件权限 `600`。Blog 不再读写仓库内快照。

公开响应包含 `status`（`active` / `offline`）、`desktopApp`、`foregroundTool`、`backgroundTools`、`terminalDetection`、`receivedAt`、`expiresAt`。活动项为白名单 `id`、`kind`、`label`、`icon`；桌面图标使用仓库内固定路径，CLI 图标为 `null`。离线响应清空活动和时间。

采集器不得保存或传输窗口标题、命令参数、cwd、提示词、聊天内容、终端输出、窗格标题、截图或原始 Herdr 响应。Pi、agy、Claude 只有在 Herdr 会话中才能参与终端焦点判断；后台运行只表示工具实例存在，不表示 AI 正在生成。

## 错误与过期处理

| 条件                                                                 | 当前行为                                                            |
| -------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 上游地址非法、非成功 HTTP、JSON 或公开活动校验失败、请求超过 1500 ms | Blog GET 返回 HTTP `200` 和固定 `offline`，不返回内部错误           |
| 独立服务状态文件不存在、损坏、hidden 或已到期                        | 独立服务返回 `offline`，不带旧活动                                  |
| Herdr 命令失败、结构未知或多个 CLI 同时焦点                          | 桌面仍可显示，终端为 `unknown`，当前 CLI 为 `null`                  |
| Hammerspoon 不可用、锁屏、休眠或监听停止                             | 生成 hidden 报告；若无法保存，旧状态到期后由独立服务判离线          |
| `PRESENCE_PORT` 非法或端口被占用                                     | 独立服务启动失败                                                    |
| 浏览器请求失败、校验失败或超过 6 秒                                  | 首页显示离线；可见页面约每 2 秒轮询一次，已有请求未完成时不并发请求 |

TTL 由独立服务处理。Blog 和浏览器的 `parsePublicPresence` 校验响应形状及白名单，不自行拒绝过期的 active 响应，因此上游必须正确处理到期状态。

## 运行维护与排查

- runtime 源码、Hammerspoon 模块、测试和命令只在 `$HOME/.hammerspoon/presence/`；Blog 不保留第二套采集脚本或 `presence:*` package script。
- 当前 LaunchAgent label 为 `com.xdd.presence`，plist 为 `$HOME/Library/LaunchAgents/com.xdd.presence.plist`；使用 `RunAtLoad`、`KeepAlive`、`ThrottleInterval=5`，直接调用稳定 Node 绝对路径，不调用交互式 shell、`fnm` 或 `pnpm`。
- plist 设置 `HOME`、显式 `PATH`、`PRESENCE_CONFIG_FILE` 和 `HERDR_ENV`。runtime 不依赖 Blog `.env.local`。
- 日志在 `$HOME/.hammerspoon/presence/logs/collector.out.log` 和 `collector.err.log`；Hammerspoon 配置备份在 runtime 的 `backups/`。
- 找不到稳定 Node 时，先核对 `bin/common.sh` 的 `find_node` 候选路径是否仍存在；更新为实际稳定路径后重新执行 `bin/install`。不要写入临时 fnm multishell 路径。
- Blog 不运行不影响本机采集；本机 API 正常但 Blog 离线时，检查 Blog 的 `PRESENCE_SOURCE_URL` 及它所在机器到上游的连通性。frp/Caddy 属于外部维护范围，不能仅凭本机源码宣称线上配置正确。

查看注册状态：

```bash
launchctl print "gui/$(id -u)/com.xdd.presence"
```

## 验证要求

```bash
node --experimental-strip-types --test src/lib/presence.test.ts
$HOME/.hammerspoon/presence/bin/test
```

- 白名单：7 个桌面 ID、Pi / agy / Claude 仅按固定映射展示。
- Herdr 与组合：CLI 去重，单焦点可得到当前 CLI，多焦点为 unknown；切到 VS Code 后 Pi 只能在后台。
- 边界：内部报告拒绝未知字段、未知 ID、重复后台 ID 和焦点冲突；公开活动拒绝伪造名称、图标和非法焦点。
- 状态：hidden、损坏和 TTL 到期不返回旧活动；Blog 上游错误返回离线且不缓存。
- 浏览器：轮询约 2 秒，超时显示离线，详情可用 Escape 关闭，390px 宽度无横向溢出。
- 本机协议与 Blog 不互相 import；修改共享字段时分别更新两侧协议测试。

## 容易写错的地方

错误：只在 Hammerspoon 没有缓存时刷新；事件可能晚到，旧缓存不代表当前前台应用。

正确：每次 IPC 调用 `getSnapshot()` 都先 `refresh()`，再返回 `M.latest`。

错误：Ghostty 焦点未知时仍把 Pi 标为当前工具，或用 `agent_status` 推断 AI 正在生成。

正确：保留桌面 Ghostty，终端为 `unknown`，当前 CLI 为 `null`；后台工具只表示实例存在。
