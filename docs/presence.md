---
description: 'Mac 采集器安装、活动上报、首页读取与故障排查'
status: implemented
paths:
  - 'tools/mac-presence/**'
  - 'src/lib/presence.ts'
  - 'src/server/modules/presence/**'
  - 'src/server/infra/db/schema/presence.ts'
  - 'src/app/(site)/_components/home/presence.tsx'
---

# Mac 实时活动

Mac 上的 AppKit 程序读取前台应用和锁屏状态，Node 采集器读取 Herdr 的终端焦点。采集器主动向博客发 HTTPS 请求。首页约每 2 秒读取 `GET /api/presence`，读到隐藏或过期快照时显示待机。[采集器源码](../tools/mac-presence/collector.mts) · [Blog 接口](../src/server/modules/presence/presence.route.ts)

## 在菜单栏设置上报

在 Finder 的个人「应用程序」目录打开 **Mac Presence**，或点击屏幕顶部的天线图标，选择「设置…」。暂停时图标变为暂停符号。初次安装可以从仓库根目录运行 `tools/mac-presence/bin/install`，随后在窗口里完成配置。

1. 在「博客 API 地址」填博客首页地址或完整的 `/api/presence/report` 地址。本地示例是 `http://127.0.0.1:4400`，远端使用 HTTPS。
2. 如果已有 Bearer Token，填入凭据框。留空会复用该来源的钥匙串条目，首次保存时会生成凭据。点击「保存地址和凭据」。服务端需要 `PRESENCE_REPORT_TOKEN_SHA256` 时，点击「复制凭据摘要」取得对应值。
3. 打开「启用活动上报」，查看连接状态和最近成功时间。也可以直接在菜单栏选「暂停上报」或「开启上报」。暂停时采集器尝试发送一次隐藏状态，然后停止桌面采样、Herdr 查询和心跳。旧活动最迟在原快照过期后消失。

关闭设置窗口后，菜单栏仍可使用。地址和开关保存在 `~/Library/Application Support/XDD/MacPresence/preferences.json`，下次登录和升级会沿用。首次空配置安装默认暂停；升级原先运行的命令行版本会迁移其上报地址并继续上报。

## 先在本机跑通

在有图形登录会话的 Mac 上安装 Xcode Command Line Tools 和 Node 26.7 或更高版本。以下命令从仓库根目录运行。`bin/configure` 在登录钥匙串生成或复用专用于该上报地址来源的凭据，只打印给 Blog 配置的 SHA-256 摘要。

```bash
endpoint=http://127.0.0.1:4400/api/presence/report
tools/mac-presence/bin/configure "$endpoint"
```

使用本地 Docker 时，把输出的摘要填入下方环境变量。在同一终端构建镜像、应用数据库迁移并启动 Blog。`compose.local.yaml` 将本地 SQLite 放在这个 Compose 项目的数据卷中。

```bash
export PRESENCE_REPORT_TOKEN_SHA256='<上一步输出的 64 位十六进制摘要>'
export PRESENCE_READ_MODE=push
export BLOG_IMAGE=xdd-blog:local
docker build -t "$BLOG_IMAGE" .
docker compose -f compose.yaml -f compose.local.yaml run --rm blog pnpm db:migrate
docker compose -f compose.yaml -f compose.local.yaml up -d blog
```

安装采集器，打开本地首页，把鼠标移到左上角站点名称查看工位详情。`lastAckAt` 会在服务端接受上报后更新。

```bash
tools/mac-presence/bin/install "$endpoint"
tools/mac-presence/bin/status
curl -fsS http://127.0.0.1:4400/api/presence
```

使用 `pnpm dev` 时把 `PRESENCE_READ_MODE=push` 和摘要写入博客的 `.env.local`，核对目标数据库后执行 `pnpm db:migrate`。本地端口可改，上报地址须指向同一个端口。每个来源（协议、主机、端口）对应一个钥匙串条目。

## 部署到生产

1. 在采集 Mac 运行 `tools/mac-presence/bin/configure https://blog.xdd.ink/api/presence/report`。把摘要放进 GitHub `Deployment` 环境的 Secret `PRESENCE_REPORT_TOKEN_SHA256`。原始凭据保存在 Mac 登录钥匙串。
2. 第一次发布沿用 `PRESENCE_READ_MODE=pull` 和现有 `PRESENCE_SOURCE_URL`。手动运行 `CI/CD`、选择 `main` 并确认发布。工作流将摘要传进 Blog 容器，在启动新镜像前执行数据库迁移。此时写入入口已经接受上报，公开首页继续读取旧来源。[发布工作流](../.github/workflows/ci-cd.yml) · [容器部署脚本](../scripts/deploy-docker.sh)
3. 在 Mac 执行 `tools/mac-presence/bin/install https://blog.xdd.ink/api/presence/report`，用 `bin/status` 查看 `lastAckAt` 和 `lastError`。线上只需要博客的 HTTPS 入口，采集器无需监听端口。
4. 将 `Deployment` 环境的 Variable `PRESENCE_READ_MODE` 改为 `push` 并重新发布。切换 App、锁屏、解锁，观察首页。观察期内保留原采集器和隧道，如需回滚，将读取模式改回 `pull` 并重新发布。确认切换完成后可以停用旧采集器 `$HOME/.hammerspoon/presence/bin/stop` 并撤下其专用隧道。

## Mac 安装与维护

Mac Presence 由喜东东在自己的 Mac 上手动打包。更新本机应用时，从仓库根目录运行 `tools/mac-presence/bin/install`。安装完成后，可在任意目录运行 `open "$HOME/Applications/Mac Presence.app"` 打开设置。

`bin/install` 用 `xcrun swiftc` 编译原生菜单栏应用和桌面监听程序，把它们与 TypeScript 及共享协议安装到 `~/Library/Application Support/XDD/MacPresence/releases/`，在 `~/Applications/Mac Presence.app` 创建 Finder 入口。LaunchAgent `com.xdd.mac-presence` 在图形登录时启动菜单栏应用，由它按保存的开关管理采集进程。原 Hammerspoon 服务的 label 是 `com.xdd.presence`，两者可以并行运行。

| 命令                                        | 作用                                                                       |
| ------------------------------------------- | -------------------------------------------------------------------------- |
| `tools/mac-presence/bin/status`             | 显示 launchd 状态、版本、桌面与 Herdr 状态、最近一次确认时间和上报错误     |
| `tools/mac-presence/bin/stop` / `bin/start` | 停止或恢复本次登录会话的菜单栏应用。仅暂停上报可直接使用界面开关           |
| `tools/mac-presence/bin/uninstall`          | 移除登录启动项和 Finder 入口，保留设置、版本、启动代次和钥匙串凭据供重装   |
| `tools/mac-presence/bin/build <空目录>`     | 在空目录中编译 `.app` 和采集器。`bin/install` 会为 `.app` 写入本机运行配置 |

安装脚本会记录 Node 可执行文件的真实路径。需要指定工具时，在运行 `bin/install` 前设置 `PRESENCE_NODE_BIN` 和 `PRESENCE_HERDR_BIN`。Herdr 默认使用当前终端找到的命令，找不到时尝试 `~/.local/bin/herdr`。没有 Herdr 也能上报桌面状态。

前台联调可用 `node <产物目录>/tools/mac-presence/collector.mts <上报地址>`。`PRESENCE_HOME` 可指向独立的本地状态目录。前台运行和 LaunchAgent 都从登录钥匙串取凭据；回环地址支持 HTTP，公网地址使用 HTTPS。停止前台进程使用 Ctrl-C。

## 协议与隐私

`PUT /api/presence/report` 使用 `Authorization: Bearer <token>`，请求体上限 4 KiB。外层固定为 `generation`、`seq`、`observedAt` 和 `report`。前两个字段是正的安全整数，`observedAt` 是带毫秒和 `Z` 的 ISO 时间。`report` 使用 [共享协议](../src/lib/presence.ts) 定义的六个字段。

- `schemaVersion` 为 `1`。`availability` 为 `active` 或 `hidden`。`desktopApp` 只接受白名单 ID 或 `null`。前台应用不在白名单时，首页可以显示工位在线。
- `foregroundTool` 仅在 Ghostty 位于前台且 Herdr 确认唯一工具焦点时填写。`backgroundTools` 是去重的实例列表。`terminalDetection` 为 `known` 或 `unknown`。原始窗口标题、路径、终端输出、命令参数和 Herdr 回包均不写入上报或状态日志。
- AppKit 同时观察应用、用户会话、锁屏和睡眠通知，并每秒重新采样。锁屏、睡眠、切走用户、前台读取失败都会隐藏活动。唤醒后重新检查系统锁屏标志和当前用户会话。原生进程退出或停止输出新样本时，Node 转为隐藏。
- 桌面和 Herdr 状态变化时立即安排发送，保持同一活动时约每 5 秒续报。断线时只保留当前观测，按 1 至 15 秒退避，恢复后重新取样。Herdr 约每 2 秒查询一次，失败时桌面仍可展示。
- 服务端拒绝距接收时间已超过或等于 15 秒、或向未来偏移超过 5 秒的样本。`site_presence_latest` 只维护一行，按启动代次与序号原子更新。重复和乱序上报不会延长有效期。到期时间按采样和接收两者较早的时刻加 15 秒计算。

`GET /api/presence` 返回 `PublicPresence`，响应使用 `Cache-Control: no-store, max-age=0`。推送模式每次读取都检查到期时间，隐藏、过期和读取失败统一返回 `200` 和离线对象，清空活动与时间。切换到推送模式后，锁屏或断网会保持待机，读取来源仅随配置切换。状态页还可以用新鲜的隐藏心跳判断采集器仍在运行。

## 排查顺序

先看 `bin/status` 的 `lastAckAt`。`HTTP 401` 时核对上报来源对应的钥匙串摘要，`HTTP 409` 时核对 Mac 与服务端系统时间，并检查是否有两个实例同时向同一博客写入。`HTTP 503` 时检查部署的摘要、数据库连接和 `0007_mac_presence_latest` 迁移。`400` 表示字段或白名单校验失败，`413` 表示请求体超出限制。接口接受新样本后返回 `204`。

有最近的确认时间但首页仍显示待机时，查看 Blog 的 `PRESENCE_READ_MODE`。`pull` 默认读取 `http://127.0.0.1:4401/api/presence` 或配置的 `PRESENCE_SOURCE_URL`。容器里的 `127.0.0.1` 指向容器自身。`push` 模式下检查 Mac 的 `desktop` 状态，`hidden` 表示正在主动隐藏，`unavailable` 表示原生程序未提供有效的新样本。
