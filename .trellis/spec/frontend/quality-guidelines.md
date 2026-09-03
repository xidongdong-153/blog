# 质量规范

## 检查命令

```bash
pnpm typecheck     # next typegen && tsc --noEmit
pnpm lint          # eslint .
pnpm format:check  # prettier --check .
pnpm build         # 生产构建，改动页面、数据层或内容结构后跑
```

每次代码修改后按顺序过前三条，全过才算完成。构建产物是纯静态页面，`pnpm build` 顺带验证所有 `generateStaticParams` 能跑通、frontmatter 校验不炸。

## 无测试框架

项目没有测试框架（无 vitest / jest），验证手段是 typecheck + build + 本地 `pnpm dev` 手查。修 bug 先在 dev 里复现再修。如果引入测试框架，更新本文件和 README。

## ESLint

基座是 `@antfu/eslint-config`（`nextjs: true`），追加规则见 `eslint.config.mjs`，关键点：

- `@typescript-eslint/no-explicit-any: error`，不许 `any`。
- `no-console` 关闭但只允许 `warn` / `error` / `info`，不要留裸 `console.log`。
- `jsdoc/check-param-names` 关闭（JSDoc 允许只写说明不写参数标签）。
- `**/*.md` / `**/*.mdx` 不参与 lint。

## Prettier

`prettier.config.mjs`：无分号、单引号、行宽 120、`arrowParens: always`、`trailingComma: all`。

`.prettierignore` 排除的内容及原因：

| 排除项 | 原因 |
| ------ | ---- |
| `content/` | MDX 正文和 frontmatter 不重排，避免破坏中文排版和日期写法 |
| `.trellis/` `.pi/` `.agents/` | Trellis 管理的模板文件，由 `trellis update` 块级替换，被 prettier 重写会破坏模板跟踪 |
| `.next/` `node_modules/` 等 | 构建产物 |

新增生成物目录时同步更新这个文件。

## 功能状态表

README「功能状态」表是未实现功能的唯一清单。规则：

- 实现某功能后，把状态改成「已实现」，删掉对应占位代码（`EmptyState` 页面、`giscus-comments.tsx` 这类占位组件及其注释）。
- 规划中的实现位置写在表的「位置」列（如 `app/rss.xml/route.ts`），新功能落地时按这个位置建文件。
- 不另建 TODO 清单，功能规划以这张表为准。

## Git

- 不擅自 `git commit` / `git push` / `git merge`，提交前把改动摘要给用户确认。
- 提交信息风格参考 `git log`：`init: Next.js 博客骨架` 这类「前缀: 中文描述」。

## 内容文件改动

- 文章 / 笔记的 frontmatter 规则见 README「内容约定」；缺 `title` 或 `date` 构建直接报错，错误带文件路径。
- 文件夹名 / 文件名就是 URL slug，重命名等于换 URL，发布过的内容不要动 slug。
