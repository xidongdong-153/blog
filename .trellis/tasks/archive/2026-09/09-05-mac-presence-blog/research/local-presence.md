# 本机采集证据

## 来源

- Hammerspoon 官方入门：<https://www.hammerspoon.org/go/>，`hs.application.watcher` 的 activated 事件以及保留 watcher 引用的要求。
- 已安装配置：`~/.hammerspoon/init.lua`、`~/.hammerspoon/presence.lua`，本地 `hs` IPC 可读取 `presenceTest.latest`。
- `/Applications/*.app/Contents/Info.plist`，使用 `plutil` 转为 JSON 后只取名称和 Bundle ID。
- `agy --help`：独立 AI CLI。
- `herdr --help`、`herdr pane`、`herdr agent`：本机 CLI 为命令契约。无子命令帮助的退出码 2 是帮助行为，不是业务接口失败。

## 桌面映射

| 展示名称 | Bundle ID |
| --- | --- |
| QQ | com.tencent.qq |
| VS Code | com.microsoft.VSCode |
| Ghostty | com.mitchellh.ghostty |
| ChatGPT | com.openai.codex |
| Antigravity | com.google.antigravity |
| QQ 音乐 | com.tencent.QQMusicMac |
| WorkBuddy | com.workbuddy.workbuddy |

ChatGPT 的 ID 是从本机读取的，不按名称猜测为其他 OpenAI ID。

## Herdr

用户已明确允许只读焦点和进程信息，禁止终端正文。当前 `test "${HERDR_ENV:-}" = 1` 成功。

- `herdr agent list` 的 `result.agents` 包含 `agent`、`focused`、`pane_id` 等字段。本次实际识别到 Pi 且 focused 为 true。
- `herdr pane list` 的 `result.panes` 提供窗格焦点。
- `herdr pane process-info --current` 提供 foreground_process_group_id、foreground_processes[].name/pid 等。
- CLI 内置 agent kinds 包含 pi、agy、claude。
- 返回结构还包含 cwd、terminal_title 等字段，必须立即丢弃，不能输出日志或传给网站。严禁 pane read / agent read。
- `agent_status` 当前显示 idle，不能用此值推断生成状态；本期只使用 agent 身份和焦点。
- 检查进程 TTY 的事实证明：多个 TTY 同时拥有各自前台组，单纯进程扫描不能代替 UI 焦点。

## 实现约束

- 本地采集进程从真实 Herdr 会话启动并继承环境，不伪造 HERDR_ENV，不从 Hammerspoon 外部冒充 Herdr pane。
- 不把单个 Herdr focused 标志等同于 macOS 前台。需要同时确认 Ghostty 是前台；无法关联宿主时宁可未知，不误报。
- GUI 外部状态变化可由 Hammerspoon 保存精简快照，本地 Node 采集器通过 hs IPC 读取后统一上报。
- 原始进程列表、终端正文和应用标题都不是允许的传输字段。
