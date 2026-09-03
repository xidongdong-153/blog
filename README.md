# blog

Next.js 单应用个人博客。文章和笔记用 MDX 文件管理，git 提交即发布，构建产物是纯静态页面，部署到 Vercel 不需要数据库和后端。

架构参考 `xdd/starter` 的 web 应用（App Router、`(site)` 路由组、组件按功能分组内聚），内容组织参考 `joye-blog`（博客按文件夹、笔记按单文件）。

## 目录

代码在 `src/`，内容和配置文件在仓库根。

- `src/app/`：页面和布局。公开页面在 `src/app/(site)/`，页面私有组件在同级的 `_components/` 里按 `site`、`home`、`blog`、`notes`、`comment`、`placeholder` 分组；本地自托管字体在 `src/app/fonts/`。
- `src/lib/content.ts`：MDX 内容读取层，frontmatter 校验、排序、标签统计、目录提取都在这里。
- `src/site.config.ts`：站点标题、导航、社交链接、正式域名。
- `src/profile.config.ts`：个人简介、所在城市、技术栈、经历与教育等主页信息。
- `content/blog/`：文章，每篇一个文件夹。
- `content/notes/`：笔记，一条一个 `.md` 文件。

## 环境要求

- Node.js 22.19.0 或更高
- pnpm 10

## 安装和开发

```bash
pnpm install
pnpm dev
```

打开 `http://localhost:4400`。

## 内容约定

文章：

```text
content/blog/
  20260615-hello-blog/    文件夹名是 URL slug
    post.mdx              正文和 frontmatter
```

frontmatter 字段：

| 字段        | 必填 | 说明                                                   |
| ----------- | ---- | ------------------------------------------------------ |
| title       | 是   | 标题                                                   |
| date        | 是   | ISO 日期，如 2026-06-15                                |
| description | 否   | 列表页摘要和 SEO description                           |
| tags        | 否   | 字符串数组                                             |
| draft       | 否   | true 时不出现在列表、归档和标签页                      |
| updatedDate | 否   | ISO 日期，有值时详情页显示"更新于 ..."                 |
| heroImage   | 否   | 封面图路径（相对于 public/），如 /images/blog/hero.jpg |

笔记：`content/notes/first-note.md`，文件名是 slug。frontmatter 比文章多一个 `status` 字段，可选 `in-progress`、`incomplete`、`ready`、`archived`，列表页显示中文状态标记。

frontmatter 缺 `title` 或 `date` 时构建直接报错，错误信息带文件路径。

## 检查

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
```

## 功能状态

| 功能                               | 状态                     | 位置                                                              |
| ---------------------------------- | ------------------------ | ----------------------------------------------------------------- |
| 文章列表 / 详情 / 标签 / 归档      | 已实现                   | `src/app/(site)/blog/`                                            |
| 文章目录 TOC（滚动跟随高亮）       | 已实现                   | `src/app/(site)/_components/blog/toc.tsx`                         |
| 详情页右侧粘性 TOC 侧栏            | 已实现                   | `src/app/(site)/blog/[slug]/page.tsx`                             |
| Hero 图 + 更新日期                 | 已实现                   | `src/lib/content.ts`、`src/app/(site)/blog/[slug]/page.tsx`       |
| 版权卡片（CC BY-NC-SA 4.0）        | 已实现                   | `src/app/(site)/_components/blog/copyright-card.tsx`              |
| 笔记列表 / 详情（状态标记）        | 已实现                   | `src/app/(site)/notes/`                                           |
| 三态主题切换（系统 / 浅色 / 深色） | 已实现                   | `src/app/(site)/_components/site/theme-toggle.tsx`                |
| sticky 胶囊页头                    | 已实现                   | `src/app/(site)/_components/site/site-header.tsx`                 |
| 项目 / 友链 / 关于 / 联系          | 占位页                   | `src/app/(site)/` 对应目录                                        |
| 站内搜索                           | 占位页，方案见页面注释   | `src/app/(site)/search/page.tsx`                                  |
| Giscus 评论                        | 占位组件，接入步骤见注释 | `src/app/(site)/_components/comment/giscus-comments.tsx`          |
| RSS                                | 未开始                   | 计划 `src/app/rss.xml/route.ts`                                   |
| sitemap / robots                   | 未开始                   | 计划 `src/app/sitemap.ts`、`src/app/robots.ts`                    |
| OG 图自动生成                      | 未开始                   | 计划 `src/app/(site)/blog/[slug]/opengraph-image.tsx`，用 next/og |
| 代码块高亮与复制                   | 已实现                   | `src/app/(site)/_components/blog/mdx-content.tsx`                 |

## 部署

Vercel 直接导入仓库即可，构建命令 `pnpm build`，无环境变量。部署前把 `src/site.config.ts` 里的 `url` 换成正式域名，RSS 和 OG 图生成链接时要用它。
