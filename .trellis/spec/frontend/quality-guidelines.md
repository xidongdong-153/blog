# 质量规范

## 检查命令

```bash
pnpm typecheck     # next typegen && tsc --noEmit
pnpm lint          # eslint .
pnpm format:check  # prettier --check .
pnpm build         # 生产构建，改动页面、数据层或内容结构后跑
```

每次代码修改后按顺序过前三条，全过才算完成。`pnpm build` 会验证 `generateStaticParams` 和 frontmatter，并生成静态内容页面；活动 API 是动态路由。

纯文档修改不要求类型检查、lint 或构建；运行 `pnpm format:check`、相对链接核对和 `git diff --check`，并显式检查默认被忽略的 Trellis Markdown。例如：

```bash
pnpm exec prettier --check --ignore-path /dev/null .trellis/spec/frontend/content-guidelines.md
```

将示例路径替换为本次所有改动的 Markdown，包括新文件和任务文档；不要格式化无关模板、技能或历史归档。

## 无测试框架

项目没有测试框架（无 vitest / jest），活动协议使用 Node 内置测试：

```bash
node --experimental-strip-types --test src/lib/presence.test.ts
```

页面验证使用 typecheck、build 和本地 `pnpm dev` 手查，修 bug 先复现再修。若引入测试框架，更新本文件；README 仅同步常用命令，不重复维护详细测试说明。

## ESLint

基座是 `@antfu/eslint-config`（`nextjs: true`），追加规则见 `eslint.config.mjs`，关键点：

- `@typescript-eslint/no-explicit-any: error`，不许 `any`。
- `no-console` 关闭但只允许 `warn` / `error` / `info`，不要留裸 `console.log`。
- `jsdoc/check-param-names` 关闭（JSDoc 允许只写说明不写参数标签）。
- `**/*.md` / `**/*.mdx` 不参与 lint。

## Prettier

`prettier.config.mjs`：无分号、单引号、行宽 120、`arrowParens: always`、`trailingComma: all`。

`.prettierignore` 排除的内容及原因：

| 排除项                                  | 原因                                                                          |
| --------------------------------------- | ----------------------------------------------------------------------------- |
| `content/`                              | MDX 正文和 frontmatter 不重排，避免破坏中文排版和日期写法                     |
| `.trellis/` `.pi/` `.agents/` `.agent/` | AI / Trellis 工具链的模板与技能文件，由工具管理，避免被 prettier 重写破坏格式 |
| `.impeccable/` `PRODUCT.md` `DESIGN.md` | 由 Impeccable 设计系统管理的文件与本地运行时配置                              |
| `.next/` `node_modules/` 等             | 构建产物                                                                      |

新增生成物目录时同步更新这个文件。

## UI 设计与反模式检查

项目集成了 Impeccable 设计系统检查工具。运行：

```bash
node .agent/skills/impeccable/scripts/detect.mjs --json src/
```

可扫描代码中可能存在的 AI slop（如 side-tab 单侧粗边框等反模式）及设计系统偏离。退出码为 0 表示无阻断性缺陷。

## 功能状态表

[功能状态](./feature-status.md)是已实现与未实现功能的唯一清单。规则：

- 实现某功能后，把状态改成「已实现」，删掉该功能对应的占位代码和注释（如搜索页的 `EmptyState`）；不删除其他页面仍在使用的通用组件。
- 规划中的实现位置写在表的「位置」列（如 `src/app/rss.xml/route.ts`），新功能落地时按这个位置建文件。
- 不另建 TODO 清单，功能规划以这张表为准。

## Git

- 不擅自 `git commit` / `git push` / `git merge`，提交前把改动摘要给用户确认。
- 提交信息风格参考 `git log`：`init: Next.js 博客骨架` 这类「前缀: 中文描述」。

## 内容文件改动

- 文章 / 笔记的 frontmatter 规则见[内容约定](./content-guidelines.md)；缺 `title` 或 `date` 构建直接报错，笔记还必须提供合法 `status`，错误带文件路径。
- 文件夹名 / 文件名就是 URL slug，重命名等于换 URL，发布过的内容不要动 slug。
