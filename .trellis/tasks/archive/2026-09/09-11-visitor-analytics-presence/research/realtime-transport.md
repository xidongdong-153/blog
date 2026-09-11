# WebSocket 与 Next 自定义入口调研

## 问题

项目要求使用真实 WebSocket，同时保留现有 Next.js 16、Hono、Turso/libSQL、单个 systemd 服务和 Caddy 反代。需要确认连接入口、开发升级、生产启动、反代和断线清理是否能在一个 Node 进程内完成。

## 本地事实

- `package.json` 当前使用 `next dev -p 4400` 和 `next start -p 4400`，Node 引擎要求 `>=24.16.0`。
- `next.config.ts` 没有 `output: 'standalone'`，可以采用自定义 server；Next standalone 输出不会追踪自定义 server，后续不能只切换输出模式而保留当前方案。
- 生产 workflow 通过 `pnpm install --frozen-lockfile`、`pnpm build`、重启 `xdd-blog.service`，并检查 `http://127.0.0.1:4400/` 返回 200；仓库没有 systemd unit 或 Caddyfile，具体 unit 和 Caddy 配置在服务器外维护。
- 当前服务端 API 由 `src/app/api/[[...route]]/route.ts` 和 `src/server/app.ts` 提供。Hono 适合继续处理 bootstrap/stats 等普通 HTTP 路由，但不能仅靠现有 `next start` 拦截 Node 的 `upgrade` 事件。
- `tsx` 已经出现在 lockfile 的传递依赖中，但当前不是 `package.json` 的直接依赖。生产启动脚本需要显式使用它，因此实现时必须把它声明为直接运行时依赖；`ws` 也必须声明为直接依赖，不能依赖其他包的传递安装。

## 外部资料与结论

### Next.js custom server

来源：Next.js 官方 Custom Server 文档

- https://nextjs.org/docs/pages/guides/custom-server
- https://nextjs.org/docs/app/guides/self-hosting

结论：

- Next 默认由 `next start` 自己监听 HTTP；需要自定义 Node 模式时，入口使用 `next()`、`app.prepare()` 和 `app.getRequestHandler()`。
- Next 的自定义 server API 提供 `getUpgradeHandler()`。因此可以在同一个 Node HTTP server 的 `upgrade` 监听器中，把 `/_next/webpack-hmr` 等开发升级交还 Next，把访客路径交给 `ws`。
- Next 官方明确指出，自定义 server 文件不经过 Next Compiler 或 bundling；当前项目用 `tsx server.ts` 直接运行 TypeScript，且不启用 standalone 输出。
- 自定义 server 需要更新 `package.json` 的 `dev`/`start` 脚本。它改变的是启动入口，不改变 Next 页面和 App Router 的 HTTP 请求处理。

### `ws`

来源：`ws` 官方 README

- https://github.com/websockets/ws/blob/master/README.md

结论：

- `WebSocketServer({ noServer: true })` 配合 Node HTTP server 的 `upgrade` 事件，可以按路径调用 `handleUpgrade()`，适合与 Next 共用同一监听端口。
- 浏览器端使用原生 `WebSocket`，服务端只使用 Node 的 `ws` 包；不需要引入 Socket.IO 或浏览器 wrapper。
- 官方 heartbeat 示例使用服务端 `ping()`、客户端自动 `pong`、`isAlive` 标记和定时 `terminate()`，可以检测浏览器断网但 TCP 连接尚未立即触发 close 的情况。
- `permessage-deflate` 会引入额外 zlib 开销，当前公开计数消息很小，关闭压缩更简单；同时设置 `maxPayload` 限制客户端消息大小。
- `ws` 官方示例展示了多 WebSocket server 共用一个 HTTP server 的路径分流方式，和本任务的 Next HMR/访客 socket 分流相同。

### Caddy reverse_proxy

来源：Caddy 官方 `reverse_proxy` 文档

- https://caddyserver.com/docs/caddyfile/directives/reverse_proxy

结论：

- `reverse_proxy` 支持 WebSocket：收到 HTTP Upgrade 后转为双向隧道，不需要另开端口。
- 现有 Blog 通用反代 `127.0.0.1:4400` 可以继续承载 `/api/visitors/socket`，但必须确认私有 Caddyfile 没有删除 `Upgrade`/`Connection` 头，也没有配置过短的 `stream_timeout`。
- Caddy 重新加载配置时，`stream_close_delay` 可以减少现有长连接同时断开的冲击；本任务不要求修改 Caddy 私有配置，但部署验证要检查重载和重连行为。
- Caddy 会默认处理 `X-Forwarded-*`，Node 只用于 Origin 校验，不读取或保存客户端 IP。

## 选择

采用“自定义 Node server + `ws` + Hono HTTP 初始化/查询 + 进程内实时 Map”：

1. 自定义入口是满足真实 WebSocket 的最小必要变化，同时保留 Next 页面和 Hono API。
2. `ws` 提供经过验证的 Node upgrade、广播和 ping/pong 能力，避免手写 WebSocket 协议或引入更大的实时框架。
3. 单进程 Map 与当前单实例部署匹配，不为 MVP 引入 Redis；设计明确禁止在未来多实例时继续沿用该假设。
4. Cookie 初始化放在 HTTP 响应中，避免尝试在 `ws` 握手之后补发 `Set-Cookie`；WebSocket 只消费同源浏览器已经保存的 cookie。
5. Hono 的 bootstrap/stats 仍可被测试和运维调用，但前端实时数字只消费 WebSocket snapshot，不回退到轮询。

## 不选择的方案

- **继续 `next start` + 独立 WebSocket 进程**：会违反当前单进程部署边界，并引入第二个 systemd 服务、端口和进程状态。
- **SSE**：只能服务端推送，客户端还需要 HTTP 请求维护心跳和路由状态；用户已经明确选择 WebSocket。
- **仅 HTTP 心跳 + polling**：不能满足用户要求的 WebSocket 实时传输，且会产生固定频率的 HTTP 请求。
- **Socket.IO**：提供了超出需求的协议层和客户端包；当前只需要标准 WebSocket、广播、ping/pong 和重连逻辑。

## 发布前必须验证

- 本机 `pnpm dev` 能同时服务页面、Next HMR 和 `/api/visitors/socket`。
- `pnpm build && pnpm start` 后，普通 HTTP 页面、bootstrap、stats 和 WebSocket 均可用。
- 服务器 `xdd-blog.service` 的 `ExecStart` 已从直接 `next start` 改为 `pnpm start` 或等价的 `tsx server.ts`。
- Caddy 配置验证通过，公网 `wss://<host>/api/visitors/socket` 能完成握手并在服务重启后自动重连。
- WebSocket close、服务端 ping/pong 超时和客户端 heartbeat 超时都能使在线人数最终回落；迁移或服务重启不会删除累计访客记录。
