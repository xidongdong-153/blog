# 本机运行时调查记录

## 当前入口

- Blog 的 `package.json` 有 5 个 `presence:*` 脚本。
- `scripts/presence/collector.mts` 通过相对导入 `../../src/lib/presence.ts`，并在当前工作目录读取 `.env.local`。
- `scripts/presence/install-hammerspoon.sh` 把 Lua 模块复制到 `/Users/wuwanzhu/.hammerspoon/presence.lua`，并修改 `init.lua`。
- `/Users/wuwanzhu/.hammerspoon/init.lua` 当前加载 `require("presence")`，根目录存在 `presence.lua`。

## 本机可执行文件

- 当前 shell 的 `node`：`/Users/wuwanzhu/.local/state/fnm_multishells/3343_1788594425248/bin/node`，这是临时路径，不能写入长期 LaunchAgent。
- 稳定 Node 候选：
  - `/Users/wuwanzhu/.local/share/fnm/node-versions/v24.14.0/installation/bin/node`
  - `/Users/wuwanzhu/.local/share/fnm/node-versions/v26.7.0/installation/bin/node`
- `fnm`：`/opt/homebrew/bin/fnm`。
- `herdr`：`/Users/wuwanzhu/.local/bin/herdr`。
- `hs`：`/opt/homebrew/bin/hs`。

安装脚本需要选择当前可执行的稳定 Node，并把绝对路径写入生成的 plist；Node 版本变化后重新运行安装脚本。

## launchd 结论

本机尚无 `com.xdd.blog.presence` LaunchAgent。`launchctl` 支持：

```text
launchctl bootstrap <domain-target> [service-path]
launchctl kickstart [-k] [-p] <service-target>
launchctl bootout [--wait] <domain-target> [service-path]
```

`man launchd.plist` 确认：

- `KeepAlive` 会保持进程运行，并隐含 `RunAtLoad`。
- `RunAtLoad` 在服务被加载时启动一次。
- `EnvironmentVariables` 可以为服务设置字符串环境变量。
- `WorkingDirectory` 可设置进程工作目录。
- `StandardOutPath` 和 `StandardErrorPath` 可把输出写到文件。
- `ThrottleInterval` 可以限制频繁退出后的重启频率。
- `ProcessType=Background` 适合没有用户界面的长期进程。

活动采集需要当前用户的 GUI、Hammerspoon 和 Herdr 会话，因此使用 `gui/$(id -u)` 的 `LaunchAgent`，不使用系统级 `LaunchDaemon`。自启语义是用户登录后，不是登录前的系统启动阶段。

## 当前注册状态

本机没有匹配 presence、blog 或 xdd 的 LaunchAgent。Hammerspoon 当前有自己的应用进程，但不能据此假设它会在每次登录时启动；采集器应在首次运行时通过 `open -ga Hammerspoon` 尝试启动应用，并在读取失败时继续重试。

## 采用的方案

- 本机目录是 runtime 的唯一源码位置，不从 Blog 导入 TypeScript 或依赖 `pnpm`。
- 使用 Node `--experimental-strip-types` 运行本机 `.mts`，保留 TypeScript，不新增 npm 依赖。
- LaunchAgent 直接调用绝对 Node 和本机 `collector.mts`，不依赖交互式 shell 的 PATH。
- `config.env` 保存 endpoint、Herdr 开关和 Blog `.env.local` 的绝对路径；token 仍只保存在 Blog `.env.local`，不写 plist 或日志。
- Blog API 未启动时只记录连接失败并重试；不由该 LaunchAgent 启动 Blog 开发服务。
