# AGENTS.md

为 `blog` 项目提供工作规则。AI 代理在这个仓库里执行任务时，按这份文件处理。

## 项目概况

Next.js 16 + React 19 + Tailwind CSS 4 + TypeScript 单应用博客，App Router，无数据库，内容用 MDX 文件管理，Blog 另提供只读活动 API。开发端口 4400（4399 是 site 和 starter web 的端口，避免冲突）。

主要目录（代码在 `src/`，内容和配置文件在仓库根）：

- `src/app/(site)/`：公开页面，页面私有组件在同级 `_components/` 按功能分组。
- `src/lib/content.ts`：MDX 内容读取层，frontmatter 校验在这里。
- `src/site.config.ts`：站点标题、导航、社交链接。
- `content/blog/`、`content/notes/`：文章和笔记源文件。

内容约定见 [.trellis/spec/frontend/content-guidelines.md](.trellis/spec/frontend/content-guidelines.md)。

## 命令

```bash
pnpm dev           # 开发，http://localhost:4400
pnpm typecheck     # next typegen && tsc --noEmit
pnpm lint          # eslint .
pnpm format:check  # prettier --check .
pnpm build         # 生产构建
```

## 工作规则

- 涉及 README、docs、注释、JSDoc、提示词、错误提示等说明性文本，先读 `xdd-plain-docs` 技能再动笔。
- 每次代码修改后按顺序过质量门：`pnpm typecheck`、`pnpm lint`、`pnpm format:check`，全过才算完成。
- 功能状态以 [.trellis/spec/frontend/feature-status.md](.trellis/spec/frontend/feature-status.md) 为唯一清单，实现后更新状态并删掉对应占位代码。README 只保留项目简介、本地启动、常用检查、核心路径和维护文档链接，不添加详细维护说明。
- 新增页面放进 `src/app/(site)/`，页面专属组件放 `src/app/(site)/_components/` 对应分组，不建第二套目录结构。
- 日期在数据层一律存 ISO 字符串，渲染时用 `src/lib/content.ts` 的 `formatDate`，不直接在组件里 new Date 再格式化。
