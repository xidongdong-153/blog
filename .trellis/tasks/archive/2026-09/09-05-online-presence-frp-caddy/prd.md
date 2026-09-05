# 让线上 Blog 通过 frp 读取 Mac 活动接口

## 目标

让 `https://blog.xdd.ink` 的首页活动组件读取当前 Mac 的活动状态。Mac 上的 collector 继续向 Mac 本地 Blog API 上报，服务器通过现有 frp 和 Caddy 链路只读取 Mac 的公开活动 GET 接口。

## 已确认事实

- Mac collector 当前把报告发送到 `http://127.0.0.1:4400/api/presence/report`。
- Mac Blog API 由 `pnpm dev` 提供，当前端口为 `4400`；本机 presence LaunchAgent 不启动这个 Blog 服务。
- Mac 上已有用户级 `frpc` LaunchAgent，配置在 `/Users/wuwanzhu/.config/frp/frpc.toml`。
- 服务器已有 `frps` 和 Caddy。`frps` 的 `proxyBindAddr` 为 `127.0.0.1`，现有远端端口为 `18080`、`18088`、`18033`、`18099`、`18880` 和 `2222`；拟用的 `18100` 当前未占用。
- 服务器 Caddy 当前将 `blog.xdd.ink` 全部反代到服务器 `127.0.0.1:4400`，没有活动接口的专用路由。
- 既有 XDD Core dev 配置已经采用“服务器本机端口 -> frps -> Mac frpc -> Mac localhost”的模式。
- 用户已选择 `frp + Caddy` 方案，并接受 Mac 持续运行 Blog API；本任务不改为 collector 直报线上 Blog API。

## 需求

- R1：Mac frpc 增加一个 TCP 代理，把 Mac `127.0.0.1:4400` 映射到服务器 `127.0.0.1:18100`；保留已有代理和现有 frpc LaunchAgent。
- R2：服务器 frps 放行并监听新的远端端口 `18100`，保持远端端口绑定在 `127.0.0.1`，不直接对公网开放。
- R3：服务器 Caddy 仅将 `GET /api/presence` 转发到 `127.0.0.1:18100`；其他 Blog 请求继续转发到服务器 Next.js，`POST /api/presence/report` 不经过该隧道。
- R4：线上首页通过同源 `/api/presence` 读取 Mac 的状态；Mac API 不运行、frpc 断线或上游请求超时时，页面在有限时间内显示已有的离线状态，不读取旧服务器活动状态。
- R5：CI/CD workflow 保持不变，不在 GitHub Actions 中运行 frpc，不把 token、frps 鉴权配置或服务器连接信息写进仓库。
- R6：更新维护文档，写清新增端口、frpc/Caddy/frps 重启顺序、Mac API 依赖、离线行为和回滚步骤。
- R7：实施前备份 Mac frpc 配置、服务器 frps 配置和 Caddyfile；失败时只恢复本任务修改的配置项，不覆盖其他代理或 Caddy 站点。

## 验收标准

- [ ] Mac frpc 配置包含 `xdd-blog-presence`，本地端口为 `4400`，远端端口为 `18100`，配置校验通过，已有代理不变。
- [ ] `launchctl print gui/$(id -u)/ink.xdd.frpc` 显示运行，且 Mac frpc 日志没有新增配置错误。
- [ ] 服务器 `frps` 配置允许 `18100`，`ss` 显示 `127.0.0.1:18100`，frps 重启后保持 active。
- [ ] Caddy 校验通过并重载；其 Blog 站点只把精确的 `GET /api/presence` 转发到隧道，并设置 5 秒上游响应超时；通用 Blog 页面和 `POST /api/presence/report` 路由不变。
- [ ] 从服务器访问 `http://127.0.0.1:18100/api/presence` 能取得 Mac API 的固定公开响应；访问 `https://blog.xdd.ink/api/presence` 能取得相同状态，Mac API 无响应时线上请求在有限时间内失败并由前端显示 offline。
- [ ] Mac API 停止或 frpc 断开时，线上活动接口不返回服务器旧状态，首页显示离线；恢复 Mac API 和 frpc 后，线上接口恢复最新状态。
- [ ] Blog 的 `pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build` 通过；没有新增 CI/CD 配置或密钥。
- [ ] 维护文档包含端口、路径、命令、故障排查和回滚内容；配置备份存在且无 token 输出。

## 非目标

- 不修改 Blog 的 presence schema、API 认证、前端轮询频率或本地 collector 协议；活动请求可增加固定 deadline。
- 不让 collector 直接向 `https://blog.xdd.ink` 上报。
- 不让本机 presence LaunchAgent 启动、管理或重启 `pnpm dev`。
- 不把 `18100` 作为公网活动 API 端口暴露；公网访问只经过 `blog.xdd.ink` 的 HTTPS 路由。
- 不把 frpc、frps 或 Caddy 纳入 Blog GitHub Actions 部署流程。
- 不修改 Pi、agy、claude、Hammerspoon 或现有其他 frp 代理。

## 当前没有阻塞问题

端口选择、公开 GET 路由和 Mac API 持续运行边界已由用户确认；服务器现有 frps/Caddy 配置和权限可通过 SSH 读取并维护。