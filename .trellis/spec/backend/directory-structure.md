# 目录结构

`src/server/` 采用模块化结构，按业务领域划分为高内聚模块，并下沉共享基础设施：

```text
src/server/
├── app.ts                 Hono 应用入口与路由链式组装，导出 app 和 AppType
├── modules/               业务域模块（高内聚包含 service、route、types、test）
│   ├── auth/              账号认证与权限（Better Auth 实例、authService、authRoute）
│   ├── comments/          评论系统（评论树、平铺回复、置顶、邮件软删除凭证）
│   ├── links/             友链管理（申请流、频控、审核与详情查询）
│   ├── ai/                AI 摘要（配置管理、模型连通测试、文章摘要生成与缓存同步）
│   ├── presence/          活动状态代理与服务健康探测
│   └── system/            系统监控与数据库连通性探测
├── infra/                 跨模块技术基础设施
│   ├── db/                数据库客户端、Schema 与迁移
│   │   ├── client.ts      libsql client + drizzle 实例，导出单例 db 与 AppDatabase 类型
│   │   ├── schema/        Drizzle 表定义（ai/auth/comments/links/system）
│   │   └── migrations/    drizzle-kit 迁移历史
│   ├── ai/                AI 模型协议与凭证加解密
│   │   ├── types.ts       纯协议枚举与上游模型类型
│   │   ├── summary-model.ts 上游 HTTP 客户端封装（安全校验、manual 重定向、错误分类）
│   │   └── credential-crypto.ts AES-256-GCM 凭证加密、解密与掩码处理
│   └── email.ts           Resend 邮件投递封装与本地开发自动 Mock
└── shared/                跨领域轻量工具
    └── response.ts        统一 ApiResponse<T> 响应封装
```

## 模块内组织规范

每个 `src/server/modules/<域>/` 是独立的业务领域单元，内部固定包含以下文件职责：

- `<域>.service.ts`：领域业务逻辑、数据库读写、状态转换与异常抛出。该服务直接被 Hono 路由和 Next.js 服务端页面调用。
- `<域>.route.ts`：Hono 路由定义。负责解析 HTTP 请求输入、校验参数、调用当前域 service，并将领域错误映射为 HTTP 状态码。
- `<域>.types.ts`：当前领域的公共入参、返回值 DTO 和展示对象类型。页面组件需要类型时从该文件导入。
- `*.test.ts`：随模块就近存放的自动化测试文件，覆盖 service 业务规则与 route HTTP 契约。

跨模块协作规则：

- 跨模块只调用对方导出的 `*.service.ts` 函数或公共类型，不绕过 service 直读私有状态。
- 不在 `modules/` 外部创建别名或 re-export 过渡文件。

## app.ts 路由装配

`src/server/app.ts` 是顶层 Hono 应用：

1. 创建 `new Hono().basePath('/api')` 实例。
2. 链式挂载各模块路由：`.route('/system', systemRoute).route('/presence', presenceRoute)...`。
3. `AppType` 由 `typeof app` 直接推导导出，供 RPC 客户端使用。
4. 应用通过 `src/app/api/[[...route]]/route.ts` 接入 Next.js App Router。

## infra/ 基础设施

- `infra/db/`：包含连接工厂 `client.ts`、按域拆分的 `schema/*.ts` 和 SQL 迁移历史 `migrations/`。
- `infra/ai/`：包含 AI 上游协议客户端、安全校验与 AES-256-GCM 凭据加密层。上游模型错误映射为安全错误码，不向下游透传原始异常。
- `infra/email.ts`：Resend 邮件发送函数。未配置环境变量时自动降级为日志 Mock，不阻塞开发与测试。

## shared/ 共享工具

仅存放无状态、跨多模块复用的工具，当前仅包含 `src/server/shared/response.ts`（`createSuccessResponse` 与 `createFailureResponse`）。

## 放置规则速查

| 要加什么 | 放哪 |
| --- | --- |
| 业务逻辑与数据库查询 | `src/server/modules/<域>/<域>.service.ts` |
| HTTP API 端点 | `src/server/modules/<域>/<域>.route.ts` 并在 `src/server/app.ts` 链式挂载 |
| 领域类型定义 | `src/server/modules/<域>/<域>.types.ts` |
| 新数据库表 | `src/server/infra/db/schema/<域>.ts` 并在 `schema/index.ts` 导出 |
| 外部技术服务适配 | `src/server/infra/` |
| 跨模块无状态工具 | `src/server/shared/` |

## 反模式

- 禁止在 `src/server/` 根目录下平铺创建散乱的 `routes/`、`services/` 目录。
- 禁止在页面组件中绕过 service 层直接调用 `db` 进行复杂操作；统一由 `<域>.service.ts` 封装并调用。
- 禁止在服务端内部发出指向自身 `/api/*` 的自调用 HTTP 请求，服务端页面一律直接调用模块 service。
- 禁止引入向后兼容 re-export 文件或过渡 shim。
- 禁止在 `src/server/` 里读写 MDX 文件；MDX 读取收敛在 `src/lib/content.ts`。
