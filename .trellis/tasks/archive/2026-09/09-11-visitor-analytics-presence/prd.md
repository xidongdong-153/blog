# 访客统计与文章实时在线状态

## Goal

让站点能回答三个问题：累计有多少匿名浏览器访问过、现在有多少匿名访客在线、某篇文章当前有多少访客正在查看。公开页面以紧凑的实时状态信息展示结果，视觉方向参考用户提供的截图：状态数字紧邻绿色在线指示和帮助入口，首页统计区、文章列表和文章详情页都能看到与当前页面相关的状态。

实时传输协议明确使用同源 WebSocket。HTTP 只负责创建匿名访客记录和提供只读统计查询，不负责客户端轮询在线状态。

## Confirmed Facts

- 当前仓库只有 Mac 端“站长活动”能力：`src/lib/presence.ts`、`src/server/modules/presence/` 和首页 `PresenceStatus` 读取独立服务的活动数据，不统计网站访客。
- 当前没有访客身份标识、访问计数表、在线连接表、WebSocket、SSE 或页面级实时查看状态。
- API 统一挂载在 `src/server/app.ts` 的 Hono 应用中；生产当前是单台服务器上的单个 Node `next start` 进程，监听 `127.0.0.1:4400`，前面由 Caddy 反代，数据库使用 Turso/libSQL 与 Drizzle ORM。
- 文章使用 MDX 文件管理，详情页入口为 `src/app/(site)/blog/[slug]/page.tsx`，列表项为 `src/app/(site)/_components/blog/post-card.tsx`，首页站点统计为 `src/app/(site)/_components/home/site-stats.tsx`。
- 参考截图表达的是页面打开后建立实时连接，由服务端推送当前浏览人数；截图中的“正在被多少人浏览”是本需求的 UI 参考。

## Requirements

- R1：使用长期匿名浏览器标识统计累计访客。同一个有效 `site_visitor_id` 只计一位匿名访客；浏览器清除 cookie、换浏览器或 cookie 到期后可以计为新的匿名访客。不记录 IP 地址，不向浏览器返回内部访客标识。
- R2：首次访问时创建匿名访客记录并设置一年有效的 HttpOnly cookie。累计记录持久化到 Turso/libSQL，进程重启不能清空累计数量。
- R3：页面可见时建立同源 WebSocket，服务端登记当前页面会话；站点在线人数按 `visitorId` 去重，不能把同一匿名访客的多标签页算成多人。
- R4：文章详情页通过同一个 WebSocket 会话登记当前文章；文章在线人数按 `visitorId + articleSlug` 去重。文章切换、刷新、关闭、网络中断和服务重启都必须能最终释放旧状态。
- R5：服务端通过 WebSocket 推送站点累计访客数、站点在线访客数和文章在线人数变化。客户端不得以定时 HTTP 轮询作为实时主路径。
- R6：站点统计区展示累计匿名访客数和当前在线人数；文章列表在有人查看时显示紧凑状态或人数；文章详情页即使无人查看也显示明确的零状态。实时连接不可用时显示不可用状态，不把失败伪装成零或在线。
- R7：WebSocket 使用单个自定义 Node 服务器承载 Next.js 请求和升级处理，仍只运行一个 Blog 进程并监听 `127.0.0.1:4400`。Caddy 继续反代该端口并透传 WebSocket 升级；systemd 启动入口必须从 `next start` 切换为项目自定义启动脚本。
- R8：实时模块使用客户端级单连接和功能内 React Provider，不引入 Redux、Zustand、Jotai 或其他客户端状态管理依赖。现有 Mac Presence 继续使用 `/api/presence`，不与访客在线状态共用数据类型或指标。
- R9：接口异常、WebSocket 暂时不可用、数据库不可用或文章 slug 非法时，文章正文、文章列表、评论、认证和 Mac Presence 仍可正常使用；服务端错误响应不暴露 cookie、session、SQL 或内部异常内容。

## Acceptance Criteria

- [ ] 同一个浏览器在首页、列表页和文章详情页之间切换时，累计匿名访客数不重复增加；刷新同一浏览器也不会新增累计记录。
- [ ] 首次访问能收到 `site_visitor_id` cookie，cookie 具备 `HttpOnly`、`SameSite=Lax`、`Path=/` 和一年有效期；生产环境使用 `Secure`。应用代码、实时会话和错误日志都不保存 IP、完整 User-Agent、Referer、文章正文、位置或浏览历史。
- [ ] 页面可见时 WebSocket 能建立并完成初始同步；服务端能推送当前站点在线人数和文章在线人数；两次状态变化之间不依赖 HTTP 轮询。
- [ ] 同一匿名访客打开多个标签页时，站点在线人数只增加一位；同一篇文章的多个标签页只计一位该文章访客；不同匿名访客同时打开同一篇文章时，文章人数按访客数增加。
- [ ] 从一篇文章切换到另一篇文章时，旧文章人数减少、新文章人数增加；直接打开、刷新、浏览器前进/后退和客户端路由切换都能正确更新。
- [ ] 客户端断线后按退避策略自动重连；服务端 WebSocket 心跳、连接断开处理和过期清理能在约定 TTL 内移除失联会话；服务重启后的旧会话不会残留，客户端恢复后能重新登记。
- [ ] 文章列表显示紧凑的当前查看状态，文章详情页在零人数时显示明确零状态；数字变化不导致标题、日期、标签或元数据区域跳动；桌面端、390px 窄屏、亮色和暗色均无重叠或溢出。
- [ ] WebSocket 不可用或统计接口失败时，动态组件显示“暂不可用”一类的明确状态，不显示绿色在线点和伪造的 `0`；文章正文、站点其他统计、评论和现有 Mac Presence 仍可用。
- [ ] 自定义 Node 启动入口能同时处理普通 Next.js 请求、`/_next` 开发升级请求和访客 WebSocket 升级请求；`pnpm dev` 与 `pnpm start` 使用同一套运行入口，`pnpm build` 能成功验证该 Next.js 应用，生产端口仍为 `4400`。
- [ ] Caddy 现有通用反代能透传 `/api/visitors/socket` 的升级请求；systemd 服务实际启动自定义入口而不是直接执行 `next start`；发布重启后本机 HTTP 健康检查和公网 WebSocket 连接均可恢复。
- [ ] 通过项目质量门：`pnpm typecheck`、`pnpm lint`、`pnpm format:check`；涉及 schema 时再通过 `pnpm db:check`、迁移验证、相关单元/协议测试和 `pnpm build`。

## Out of Scope

- 不统计访问来源、地理位置、设备画像、停留时长、阅读轨迹、历史趋势报表或后台分析面板。
- 不记录 IP、完整 User-Agent、Referer、文章正文、账号隐私或跨站追踪信息。
- 不提供用户登录关联、广告统计、跨站访客识别或真实自然人数推断。
- 不改造现有 Mac Presence Service，也不把站长活动状态与访客在线人数混为一个指标。
- 不使用 Redis、独立实时服务、多实例负载均衡或第二个生产进程。未来扩容到多实例前，必须先把实时会话迁移到共享存储。
- 不要求把实时数字用于搜索、SEO、静态生成或文章正文内容。

## Key Decisions

- **访客身份**：服务器生成随机匿名浏览器标识，使用 `site_visitor_id` cookie 长期去重；不记录 IP。
- **实时传输**：使用 WebSocket。客户端只建立一个布局级连接，服务端推送初始快照和变化后的全量公开计数。
- **在线去重**：站点总在线数按 `visitorId` 去重；文章在线数按 `visitorId + articleSlug` 去重；页面会话用独立 `sessionId` 区分标签页和连接生命周期。
- **接口边界**：Hono 提供访客初始化和只读统计接口；自定义 Node server 直接处理 `/api/visitors/socket` 升级，不把 WebSocket 伪装成 Hono HTTP 轮询。
- **任务拆分**：不建立父子任务。匿名登记、实时会话、前端共享连接和单进程部署之间存在强依赖，按一个任务统一规划和验收。
- **实施门槛**：当前仍处于 Trellis `planning`。只有用户明确批准更新后的 `prd.md`、`design.md` 和 `implement.md` 后，才运行 `task.py start` 并修改产品源代码。
