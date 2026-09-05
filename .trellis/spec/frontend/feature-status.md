# 功能状态

本表是功能状态与未实现功能的唯一清单。实现后在这里更新状态，并删除对应占位代码；README 只保留入口，不维护第二张表。

| 功能                               | 状态                   | 位置                                                                           |
| ---------------------------------- | ---------------------- | ------------------------------------------------------------------------------ |
| 文章列表 / 详情 / 标签 / 归档      | 已实现                 | `src/app/(site)/blog/`                                                         |
| 文章目录 TOC（滚动跟随高亮）       | 已实现                 | `src/app/(site)/_components/blog/toc.tsx`                                      |
| 详情页右侧粘性 TOC 侧栏            | 已实现                 | `src/app/(site)/blog/[slug]/page.tsx`                                          |
| Hero 图 + 更新日期                 | 已实现                 | `src/lib/content.ts`、`src/app/(site)/blog/[slug]/page.tsx`                    |
| 版权卡片（CC BY-NC-SA 4.0）        | 已实现                 | `src/app/(site)/_components/blog/copyright-card.tsx`                           |
| 笔记列表 / 详情（状态标记）        | 已实现                 | `src/app/(site)/notes/`                                                        |
| 三态主题切换（系统 / 浅色 / 深色） | 已实现                 | `src/app/(site)/_components/site/theme-toggle.tsx`                             |
| sticky 胶囊页头                    | 已实现                 | `src/app/(site)/_components/site/site-header.tsx`                              |
| 项目 / 友链 / 关于 / 联系          | 已实现                 | `src/app/(site)/` 对应目录                                                     |
| 站内搜索                           | 占位页，方案见页面注释 | `src/app/(site)/search/page.tsx`                                               |
| Giscus 评论                        | 已实现                 | `src/app/(site)/_components/comment/giscus-comments.tsx`                       |
| RSS                                | 未开始                 | 计划 `src/app/rss.xml/route.ts`                                                |
| sitemap / robots                   | 未开始                 | 计划 `src/app/sitemap.ts`、`src/app/robots.ts`                                 |
| OG 图自动生成                      | 未开始                 | 计划 `src/app/(site)/blog/[slug]/opengraph-image.tsx`，用 `next/og`            |
| 代码块高亮与复制                   | 已实现                 | `src/app/(site)/_components/blog/mdx-content.tsx`                              |
| Mac 实时活动（独立采集与首页展示） | 已实现                 | `src/lib/presence.ts`、`src/app/api/presence/`、`$HOME/.hammerspoon/presence/` |

Giscus 的环境变量和未配置时的展示见[组件规范](./component-guidelines.md)；活动服务配置及验证边界见[活动规范](./presence-guidelines.md)。已实现不代表外部服务当前在线。
