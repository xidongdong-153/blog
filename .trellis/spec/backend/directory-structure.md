# 目录结构

`src/server/` 放 Hono 应用、路由和数据库访问层，当前 7 个文件，位置和职责如下：

```text
src/server/
├── app.ts               Hono 应用工厂，basePath /api
├── routes/              路由层，按业务域拆文件
│   ├── index.ts         聚合所有域路由，导出 apiRoutes
│   └── system.ts        system 域：/health、/db-check 两个端点
├── infra/
│   └── db/              数据库基础设施
│       ├── client.ts    libsql client + drizzle 实例，导出单例 db
│       └── schema/      Drizzle 表定义
│           ├── index.ts schema 聚合出口
│           └── system.ts system_health_checks 表
└── shared/              跨路由复用的工具
    └── response.ts      ApiResponse<T> 响应封装
```

`src/server/` 之外还有两处 server 端代码：`src/app/api/` 下的 Next Route Handler（`src/app/api/presence/route.ts`、`src/app/api/links/apply/route.ts`），以及服务端组件里的 `db` 直连（`src/app/(site)/status/page.tsx`）。新代码放哪一层，按[服务调用规范](./service-call-guidelines.md)的判断规则选。

## app.ts

`src/server/app.ts` 是应用工厂：`createApp()` 返回 `new Hono().basePath('/api')`，把 `apiRoutes` 挂到根路径，同时导出单例 `app` 和类型 `AppType`。`basePath('/api')` 意味着路由文件里写的路径不带 `/api` 前缀，完整 URL 是 `/api/<域>/<端点>`。

这个应用目前没有被任何文件引用，未挂载到 Next.js，现状与接入方式见[API 设计规范](./api-design-guidelines.md)。

## routes/

按业务域拆文件，一个域一个文件：

- `src/server/routes/<域>.ts` 导出一个 `new Hono()` 实例，里面定义该域的所有端点。
- `src/server/routes/index.ts` 把域实例逐个挂上：`new Hono().route('/system', systemRoute)`，导出 `apiRoutes`。
- 只被一个端点用的辅助函数直接写在域文件里，不提到 `shared/`。

新增域路由的操作步骤见[API 设计规范](./api-design-guidelines.md)的「路由命名与注册」。

## infra/db/

- `src/server/infra/db/client.ts`：连接层。`createDatabase()` 是工厂（参数可注入），同时导出单例 `client` 和 `db` 供业务代码直接 import。环境变量和本地回退规则见[数据库规范](./database-guidelines.md)。
- `src/server/infra/db/schema/`：表定义，一个域一个文件，`schema/index.ts` 用 spread 聚合。拆分与命名规则见[数据库规范](./database-guidelines.md)。
- `src/server/infra/db/migrations/`：`db:generate` 的输出目录，进 git。这个目录现在不存在，迁移从未生成过。

## shared/

放被多个路由文件复用的纯函数和类型，当前只有 `src/server/shared/response.ts`。判断标准：被两个以上路由文件 import 才放进来；只服务一个域的留在域文件里。

## 放置规则速查

| 要加什么               | 放哪                                                |
| ---------------------- | --------------------------------------------------- |
| 新 Hono 端点           | `src/server/routes/<域>.ts`                         |
| 新表                   | `src/server/infra/db/schema/<域>.ts`                |
| 跨路由复用的工具或类型 | `src/server/shared/`                                |
| 不碰数据库的轻量 API   | `src/app/api/<路径>/route.ts`（Next Route Handler） |

## 反模式

- 不建 `service/`、`repository/`、`presenter/` 目录。当前没有 service 层，什么时候才需要拆见[服务调用规范](./service-call-guidelines.md)。
- 不把 React 组件或页面放进 `src/server/`，页面和页面组件都在 `src/app/` 下。
- 不在 `src/server/` 里读 MDX 内容，内容读取唯一入口是 `src/lib/content.ts`。
- 不在 `src/server/` 里另建配置文件读取环境变量，数据库相关变量的取值顺序固定在 `src/server/infra/db/client.ts`。
