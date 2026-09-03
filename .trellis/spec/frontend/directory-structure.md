# 目录结构

## 顶层布局

应用代码全部在 `src/`，内容源文件和配置文件在仓库根。

```text
src/app/(site)/              公开页面，唯一页面区
src/app/(site)/_components/  页面私有组件，按功能分组
src/lib/content.ts           MDX 内容读取层（唯一数据层）
src/site.config.ts           站点标题、导航、社交链接、正式域名
content/blog/                文章，每篇一个文件夹
content/notes/               笔记，一条一个 .md
```

`src/app/` 下还有 `layout.tsx`（根布局）、`globals.css`、`not-found.tsx`，不在这个清单外建新的顶层源码目录。

路径别名 `@/*` 指向 `src/`（在 `tsconfig.json` 的 `paths` 里），`@/lib/content` 就是 `src/lib/content.ts`。`content/` 由 `src/lib/content.ts` 用 `process.cwd()` 拼绝对路径读取，锚在仓库根，不跟源码位置走。

## 页面

- 所有公开页面在 `src/app/(site)/` 路由组下，路由组不带 URL 前缀。
- 页面文件是 `page.tsx`，default export；布局是 `layout.tsx`。
- 现有页面参考：`src/app/(site)/blog/page.tsx`（列表）、`src/app/(site)/blog/[slug]/page.tsx`（详情）、`src/app/(site)/about/page.tsx`（静态页）。
- 根布局 `src/app/layout.tsx` 管 SEO metadata 模板和主题防闪烁脚本；站点共享的页头页脚在 `src/app/(site)/layout.tsx`。

## 组件

页面私有组件放 `src/app/(site)/_components/<分组>/`，下划线开头让 Next.js 不把它当路由。分组按功能：

| 分组 | 放什么 | 现有文件 |
| ---- | ---- | ---- |
| `site/` | 页头、页脚、主题切换 | `site-header.tsx`、`site-footer.tsx`、`theme-toggle.tsx` |
| `blog/` | 文章相关 | `post-card.tsx`、`mdx-content.tsx`、`toc.tsx` |
| `notes/` | 笔记相关 | `note-card.tsx` |
| `comment/` | 评论 | `giscus-comments.tsx`（占位） |
| `placeholder/` | 占位页通用内容 | `empty-state.tsx` |

新增分组需要有新功能域才建，不要按组件类型（`ui/`、`common/`）分组。

## 数据层

`src/lib/content.ts` 是唯一的内容读取入口：frontmatter 校验、排序、标签统计、目录提取都在这里。组件不直接 import `node:fs`，新内容需求先在这里加函数。

## 内容文件

- 文章：`content/blog/<文件夹名>/post.mdx`，文件夹名是 URL slug。
- 笔记：`content/notes/<文件名>.md`，文件名是 slug。
- frontmatter 字段和校验规则见 `src/lib/content.ts`，README「内容约定」有字段表。

## 反模式

- 不在仓库根建 `app/` 或 `pages/`：跟 `src/app/` 同时存在时 Next.js 只认根目录那份，`src/app/` 被静默忽略，不报错。
- 不建第二套组件目录（如 `src/components/`）。
- 不把页面私有组件提到 `src/lib/`；只有跨页面复用的才考虑提升。
- 配置不散落：站点级常量进 `src/site.config.ts`，内容读取常量留在 `src/lib/content.ts`。
