---
description: 'TypeScript、局部状态、内容读取、主题同步、质量命令与文档维护约定'
status: implemented
paths:
  - 'src/**'
  - 'package.json'
  - 'tsconfig.json'
  - 'eslint.config.mjs'
  - 'prettier.config.mjs'
  - '.prettierignore'
---

# 开发约定

开始任务、提交与生产发布的授权规则以 [AGENTS.md](../AGENTS.md) 和 [Git 与发布](git-workflow.md)为准。源码放置先查[架构与目录](architecture.md)，界面视觉值查 [DESIGN.md](../DESIGN.md)。

## 检查命令

配置入口：[package.json](../package.json)。代码修改后按顺序运行，前一项通过后再运行下一项：

```bash
pnpm typecheck
pnpm lint
pnpm format:check
```

页面、数据层或内容结构变更还运行 `pnpm build`。文章是动态 SSR，构建不会检查数据库中每篇正文；正文由预览和发布服务校验。

纯文档修改运行 `pnpm format:check`、相对链接核对和 `git diff --check`，不为文档运行构建、数据库迁移或生产发布。`docs/` 参与默认格式检查；被忽略的 `PRODUCT.md`、`DESIGN.md` 本次改动时显式检查：

```bash
pnpm exec prettier --check --ignore-path /dev/null PRODUCT.md DESIGN.md
```

不新增、扩张或修复历史测试，不把测试、静态检查或构建通过当作功能可用证据。业务改动由未参与编写的人或代理沿真实用户路径 Hack，报告 oracle、Hacker、实际反例和未验范围；文档编写本身不安排或代写验收回执。

## TypeScript 与格式

- [tsconfig.json](../tsconfig.json) 保持 strict；不放松 strict 选项，不用 `any`。非空断言现有规则允许，但不能代替边界校验。
- 跨源码目录用 `@/` 别名，组件分组内部可相对引用。类型跟随数据就近定义，不建统一 `types/` 目录，也不重复定义 Service DTO 或内容形状。
- 公开文章、笔记类型来自 `src/lib/content.ts`；浏览器可用的管理输入与 Zod Schema 来自 `src/lib/posts.ts`；配置类型可从 `as const` 值推导。
- 状态用字面量联合类型，不用 TypeScript enum；显示映射用 `Record<状态, string>`。边界输入先作为 unknown 收窄，再交给组件。
- [ESLint](../eslint.config.mjs) 基于 Antfu，Markdown/MDX 不参与 lint。`no-console` 当前关闭，不据配置声称只允许 warn/error/info；业务日志仍不得泄漏凭据、正文或上游响应。
- [Prettier](../prettier.config.mjs)：无分号、单引号、行宽 120、LF、arrowParens always、trailingComma all。
- [.prettierignore](../.prettierignore) 保留内容原文、依赖、构建产物、其他技能与 Impeccable 管理文件的排除，不格式化无关技能或生成物。仓库仍有 Impeccable 技能副本，不把它误记为已移除。

新增字段、常量或工具前先搜索现有定义与消费方，避免重复实现。跨页面、API、Service 和数据库的变更核对实际调用链，特别留意默认值、序列化、未知输入、取消、并发和重放；只迁入项目需要的约定，不保留通用工具链模板。

## 数据获取与状态

公开文章经 `src/lib/content.ts` 读取数据库已发布快照，当前规模保留全量筛选和单请求去重，不加跨请求内容缓存。RSC 直接 await 读取函数，不自调用 HTTP；浏览器保存、导入、发布走 Hono API。

需要客户端交互的搜索索引由 RSC 在请求时下发纯数据，浏览器按文章集合引用建索引；不是构建期内容，也不另建搜索 API。组件不值导入含 Node 文件读取或数据库初始化的模块，公共日期用 `src/lib/date.ts`，文章标签与来源用 `src/lib/blog-meta.ts`。

项目没有 Redux/Zustand/Jotai。表单和编辑器用局部 React 状态，访客实时连接使用既有 Context；新增状态先按页面和组件边界组织。相关服务边界见 [API](api.md)。

## 日期与运行时校验

新数据日期存 ISO 字符串。服务端渲染从 `src/lib/content.ts` 使用 `formatDate`、`formatTimelineDate`；客户端从无 Node 依赖的日期或元数据模块引用。统一按 UTC 显示，不在组件里 new Date 后自行格式化。已有账号、评论、AI 等毫秒时间戳列保留，不能把新数据约定误写为全库已经迁移。

博文 API 和导入使用严格 Zod Schema，拒绝非法类型、未知字段和无效日历日期；MDX 另做 AST 与编译校验。笔记的 frontmatter 读取较宽松：非空日期字符串只去空白，裸 YAML 日期转 ISO，标签只保留字符串，非法 status 报错。不能把笔记解析规则用于数据库文章。具体字段与限制只在[内容管理](content.md)维护。

## 主题同步

存储键 `theme`，值 system/light/dark。改存储键、挂载属性或解析方式时同时核对：

1. `src/app/layout.tsx`：body 前执行防闪烁脚本，设置 html 的 data-theme 和 dark 类。
2. `_components/site/theme-toggle.tsx`：页脚切换、写回存储、监听系统偏好。
3. `src/app/globals.css`：theme-system/light/dark 变体用 CSS 决定图标可见性。
4. Tailwind dark 变体：实际颜色由 html.dark 驱动。

`suppressHydrationWarning` 仅放 html，不用它掩盖组件的 hydration 问题。

## 文档维护

从[文档索引](index.md)按主题查阅，整理与同步使用全局 repo-atlas。保留用户补充，现状按当前源码描述；已确认需求与实现不一致时记录偏差，不自行修改需求。未知项明确写待核对，不从旧任务状态、配置存在或检查通过推断已完成。

[功能状态](features.md)是唯一功能和规划清单。功能落地后更新状态并移除对应占位代码，不建第二份功能清单、任务目录、会话日志或自动同步机制。README 保持上手入口，产品与视觉规则分别保留在 PRODUCT.md、DESIGN.md。
