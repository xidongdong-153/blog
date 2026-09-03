# 目录结构

## 顶层布局

```text
app/(site)/          公开页面，唯一页面区
app/(site)/_components/  页面私有组件，按功能分组
lib/content.ts       MDX 内容读取层（唯一数据层）
content/blog/        文章，每篇一个文件夹
content/notes/       笔记，一条一个 .md
site.config.ts       站点标题、导航、社交链接、正式域名
```

根目录还有 `app/layout.tsx`（根布局）、`app/globals.css`、`app/not-found.tsx`，不在这个清单外建新的顶层源码目录。

## 页面

- 所有公开页面在 `app/(site)/` 路由组下，路由组不带 URL 前缀。
- 页面文件是 `page.tsx`，default export；布局是 `layout.tsx`。
- 现有页面参考：`app/(site)/blog/page.tsx`（列表）、`app/(site)/blog/[slug]/page.tsx`（详情）、`app/(site)/about/page.tsx`（静态页）。
- 根布局 `app/layout.tsx` 管 SEO metadata 模板和主题防闪烁脚本；站点共享的页头页脚在 `app/(site)/layout.tsx`。

## 组件

页面私有组件放 `app/(site)/_components/<分组>/`，下划线开头让 Next.js 不把它当路由。分组按功能：

| 分组 | 放什么 | 现有文件 |
| ---- | ---- | ---- |
| `site/` | 页头、页脚、主题切换 | `site-header.tsx`、`site-footer.tsx`、`theme-toggle.tsx` |
| `blog/` | 文章相关 | `post-card.tsx`、`mdx-content.tsx`、`toc.tsx` |
| `notes/` | 笔记相关 | `note-card.tsx` |
| `comment/` | 评论 | `giscus-comments.tsx`（占位） |
| `placeholder/` | 占位页通用内容 | `empty-state.tsx` |

新增分组需要有新功能域才建，不要按组件类型（`ui/`、`common/`）分组。

## 数据层

`lib/content.ts` 是唯一的内容读取入口：frontmatter 校验、排序、标签统计、目录提取都在这里。组件不直接 import `node:fs`，新内容需求先在这里加函数。

## 内容文件

- 文章：`content/blog/<文件夹名>/post.mdx`，文件夹名是 URL slug。
- 笔记：`content/notes/<文件名>.md`，文件名是 slug。
- frontmatter 字段和校验规则见 `lib/content.ts`，README「内容约定」有字段表。

## 反模式

- 不建 `src/` 目录，不建第二套组件目录（如顶层 `components/`）。
- 不把页面私有组件提到 `lib/`；只有跨页面复用的才考虑提升。
- 配置不散落：站点级常量进 `site.config.ts`，内容读取常量留在 `lib/content.ts`。
