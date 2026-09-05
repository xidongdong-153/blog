# frp 与线上 Blog 活动接口调研记录

## 现有配置

- `/Users/wuwanzhu/Projects/code-server-frp-maintenance/docs/services/xdd-core-dev.md` 已记录同一类 TCP 反向通道：Caddy -> 服务器本机远端端口 -> frps -> Mac frpc -> Mac localhost。
- `/Users/wuwanzhu/Projects/code-server-frp-maintenance/docs/services/blog.md` 当前说明 Blog 只由服务器 Caddy 反代服务器 `127.0.0.1:4400`，不使用 frp。
- 服务器当前 `frps` 使用 `bindPort = 7000` 和 `proxyBindAddr = "127.0.0.1"`，现有 `allowPorts` 为 `18880`、`18080`、`18088`、`18033`、`18099`、`2222`。
- 服务器 `127.0.0.1:18100` 当前没有监听者，适合作为新增的 server-only frp 远端端口。
- Mac 已有 `ink.xdd.frpc` 用户 LaunchAgent，现有代理没有使用 `18100`；配置包含 code-server、三个 XDD Core dev、GBDP 和 SSH 代理。
- Caddy 的 Blog 站点当前只有：

```caddyfile
blog.xdd.ink {
    reverse_proxy 127.0.0.1:4400
}
```

## 路由选择

线上页面已经使用同源 `fetch('/api/presence')`。因此把 Caddy 的精确 `GET /api/presence` 路由到 frp 远端端口，可以不改 Blog 前端和 API 源码；其他页面继续使用服务器 Blog。

只匹配 GET 是必要边界：`POST /api/presence/report` 不应通过 Caddy 到 Mac，避免把写入接口和采集 token 传入隧道。Caddy 上游设置 `response_header_timeout 5s`，活动组件设置 6 秒请求 deadline，Mac API 不可用时不会长期保留或等待旧活动。服务器的通用 Next.js API 路由仍可保留。

## 运行依赖

Mac presence collector 仍需要 Mac Blog API 运行。现有 `$HOME/.hammerspoon/presence/` LaunchAgent 只管理 collector，不启动 `pnpm dev`。API 停止时，Mac API 不可连接，Caddy 会返回上游错误；前端 `PresenceStatus` 的请求异常分支会显示 offline。

## CI/CD 结论

现有 `.github/workflows/ci-cd.yml` 只部署服务器 Blog。frpc 是 Mac 用户服务，frps 和 Caddy 是服务器服务；把它们放进 GitHub Actions 会让部署依赖用户 Mac 在线，也会把基础设施密钥带入工作流，不符合当前边界。

因此本任务不改 workflow、GitHub Environment variables 或 secrets。配置通过 Mac 本机、服务器 SSH 和 Caddy 维护命令完成。

## 待验证命令

```bash
/Users/wuwanzhu/.local/bin/frpc verify -c /Users/wuwanzhu/.config/frp/frpc.toml
ssh "$DEPLOY_USER@$DEPLOY_HOST" 'sudo -n ss -ltnp "sport = :18100"'
ssh "$DEPLOY_USER@$DEPLOY_HOST" 'curl --fail --silent http://127.0.0.1:18100/api/presence'
curl --fail --silent https://blog.xdd.ink/api/presence
```
