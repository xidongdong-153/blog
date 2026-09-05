# 本地活动接口规范

## 1. 范围与触发条件

本规范约束 Mac 本地活动采集器、Next.js API 和首页活动组件之间的数据。新增或修改桌面白名单、Herdr CLI 映射、上报字段、状态文件、Bearer 鉴权或轮询逻辑时，先检查本文件。

活动只用于本机验证。采集器不能把窗口标题、命令参数、cwd、提示词、聊天内容、终端输出、窗格标题、截图或原始 Herdr 响应写入报告。

## 2. 命令与 API 签名

- `$HOME/.hammerspoon/presence/bin/status`：读取一次 Hammerspoon 和 Herdr 状态，只打印固定报告，不发送请求。
- `$HOME/.hammerspoon/presence/bin/once`：读取一次并调用 `POST /api/presence/report`。
- `$HOME/.hammerspoon/presence/bin/start`：先恢复 Hammerspoon 监听，再每 2 秒串行读取并上报。
- `$HOME/.hammerspoon/presence/bin/stop`：卸载 LaunchAgent，停止 Hammerspoon 监听并上报 hidden 报告。
- `$HOME/.hammerspoon/presence/bin/restart`：停止后重新加载唯一的 LaunchAgent。
- `$HOME/.hammerspoon/presence/bin/uninstall`：停止并移除 LaunchAgent，不删除本机 runtime。
- `$HOME/.hammerspoon/presence/bin/test`：运行本机采集协议测试。
- `GET /api/presence`：返回公开活动快照；响应必须使用 `Cache-Control: no-store`。
- `POST /api/presence/report`：校验 Bearer token 和固定报告，成功后写入 `.cache/presence/state.json`。
- `parseHerdrAgentList(value: unknown): TerminalObservation`：只返回 CLI 身份、焦点和去重后的运行列表。
- `composePresenceReport(availability, desktopApp, terminal): PresenceReport`：合并桌面和 Herdr 状态。

## 3. 字段、响应和环境变量

上报报告只有以下字段：

- `schemaVersion`：固定为 `1`。
- `availability`：`active` 或 `hidden`。
- `desktopApp`：`qq`、`vscode`、`ghostty`、`chatgpt`、`antigravity`、`qqmusic`、`workbuddy`，或 `null`。
- `foregroundTool`：`pi`、`agy`、`claude`，或 `null`。
- `backgroundTools`：去重后的 CLI ID 数组。
- `terminalDetection`：`known` 或 `unknown`。

`foregroundTool` 只有在 `desktopApp` 为 `ghostty` 且 `terminalDetection` 为 `known` 时有效。`hidden` 报告被归一化为无桌面应用、无当前 CLI、无后台 CLI 和 `unknown`。

服务端写入 `receivedAt` 和 15 秒后的 `expiresAt`，客户端不能提供这两个字段。GET 只返回白名单映射后的名称和仓库内图标路径，CLI 不使用品牌图标。

- `PRESENCE_TOKEN`：服务端和采集器共用的 Bearer 密钥，只放 Blog `.env.local`，不能使用 `NEXT_PUBLIC_` 前缀；文件权限必须为 `600`。
- `PRESENCE_ENV_FILE`：本机 runtime 配置中的 Blog `.env.local` 绝对路径，采集器从这里读取 `PRESENCE_TOKEN`，不把 token 写入 plist 或日志。
- `PRESENCE_ENDPOINT`：本机 `config.env` 中的可选 endpoint；只能是 HTTP 回环地址 `127.0.0.1`、`localhost` 或 `[::1]`。默认值为 `http://127.0.0.1:4400/api/presence/report`。
- `HERDR_ENV`：等于 `1` 时读取 Herdr，否则终端检测为 `unknown`。

## 4. 校验与错误矩阵

| 条件 | 行为 |
| ---- | ---- |
| Bearer 密钥缺失、长度不同或值错误 | POST 返回 `401`，不读取请求体 |
| 请求体超过 2048 字节 | POST 返回 `413` |
| 非法 JSON | POST 返回 `400` |
| 字段缺失、字段增加、未知 ID、重复后台 CLI 或焦点关系冲突 | POST 返回 `400` |
| 状态文件不存在、损坏或过期 | GET 返回 `offline`，不带旧活动 |
| Herdr 命令失败、返回结构未知或多个 CLI 同时焦点 | 桌面状态仍可显示，终端为 `unknown`，当前 CLI 为 `null` |
| Hammerspoon 不可用、锁屏、休眠或监听停止 | 上报 `hidden`；没有 token 时等待现有快照 TTL 结束 |
| `PRESENCE_ENDPOINT` 不是允许的本机 HTTP 地址 | 采集器退出并报错，不发送请求 |
| `PRESENCE_ENV_FILE` 不存在、不是绝对路径或权限不是 `600` | 采集器拒绝读取密钥并退出 |

状态写入必须在单进程内串行执行，先写临时文件，再原子重命名为 `state.json`。只保存最新成功状态。

## 5. Good、Base、Bad

- Good：Ghostty 前台、Herdr 返回一个焦点 Pi 和后台 Claude，报告为 `foregroundTool: "pi"`、`backgroundTools: ["claude"]`。
- Base：VS Code 前台、Herdr 仍有 Pi，报告为 `desktopApp: "vscode"`、`foregroundTool: null`、`backgroundTools: ["pi"]`。
- Base：Ghostty 前台但 Herdr 不可用，报告保留 Ghostty，`terminalDetection: "unknown"`，不保留旧当前 CLI。
- Bad：把窗口标题或 cwd 放进报告，或者用 `agent_status` 推断 AI 正在生成。
- Bad：焦点为 `unknown` 时仍上报 `foregroundTool: "pi"`，或把 `PRESENCE_ENDPOINT` 指向公网地址。

## 6. 必要测试

- 白名单测试：7 个桌面 ID 和 Pi、agy、Claude 都能通过固定映射。
- Herdr 测试：三种 CLI 按 ID 去重；一个焦点能得到当前 CLI；多个焦点得到 `unknown`。
- 组合测试：只有 Ghostty 和 known 焦点产生当前 CLI；切到其他桌面应用后 CLI 只留在后台。
- 边界测试：未知字段、未知 ID、重复后台 ID、焦点冲突和非法公开活动对象均被拒绝。
- 状态测试：hidden、损坏状态和 TTL 到期都不返回旧活动。
- API 手工检查：错误 token 为 `401`，非法报告为 `400`，超过 2048 字节为 `413`。
- 浏览器检查：公开页面没有 token，活动轮询约 2 秒，详情可用键盘关闭，390px 宽度没有横向溢出。

## 7. 错误与正确写法

错误：只在 Hammerspoon 没有缓存时刷新快照。

```lua
function M.getSnapshot()
  if not M.latest then refresh() end
  return M.latest
end
```

正确：每次 IPC 读取都刷新当前前台应用。Hammerspoon 事件可能在应用启动或切换期间晚到，旧缓存不能代表当前前台状态。

```lua
function M.getSnapshot()
  refresh()
  return M.latest
end
```

错误：只检查 `Content-Length` 后直接调用 `request.json()`，因此没有 `Content-Length` 的超大请求仍会被完整读入。

正确：先用请求流限制 2048 字节，再解析 JSON；未授权请求在读取请求体前返回 `401`。

## 8. 本机 runtime 和启动约定

- 采集器源码、Hammerspoon 模块、测试和命令只放在 `$HOME/.hammerspoon/presence/`，Blog 仓库不保留 `scripts/presence/` 或 `presence:*` package script。
- LaunchAgent label 固定为 `com.xdd.blog.presence`，使用 `RunAtLoad`、`KeepAlive` 和 `ThrottleInterval=5`；命令入口直接调用稳定 Node 的绝对路径，不调用交互式 shell、`fnm` 或 `pnpm`。
- LaunchAgent 只设置 `HOME`、显式 `PATH`、`PRESENCE_CONFIG_FILE` 和 `HERDR_ENV`。`PRESENCE_TOKEN` 不进入 plist，采集器从 `PRESENCE_ENV_FILE` 指向的 Blog `.env.local` 读取，并要求文件权限为 `600`。
- `bin/start` 只 bootstrap 或 kickstart 固定 label；`bin/stop` 先 bootout，再停止 Hammerspoon 并发送 hidden 报告；`bin/uninstall` 移除生成的 plist 和 presence 加载行，但保留 runtime、配置、日志和备份。
- 本机 runtime 不导入 Blog `src/lib/*`。两侧通过 `schemaVersion: 1`、固定字段和白名单保持协议一致，修改字段时必须同时更新本地协议测试和 Blog 服务端测试。

错误：把当前 shell 的 fnm multishell Node 路径直接写入 LaunchAgent。

正确：由 `bin/install` 选择稳定 Node 绝对路径，写入生成的 `~/Library/LaunchAgents/com.xdd.blog.presence.plist`，Node 版本变化后重新安装。
