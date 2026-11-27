---
description: '个人站点功能现状、已确认规划与待核对信息的唯一清单'
status: mixed
paths:
  - 'src/app/**'
  - 'src/lib/**'
  - 'src/server/modules/**'
  - 'server.ts'
  - '.github/workflows/ci-cd.yml'
---

# 功能状态

本表是功能状态与未实现功能的唯一清单。实现后在这里更新状态，并删除对应占位代码；README 只保留入口，不维护第二张表。

沿用原功能清单并核对关键源码入口。本轮未运行功能路径，“已实现”不表示已验收，也不表示数据库、模型、登录渠道、邮件或外部采集器当前可用。

| 功能                                                      | 状态   | 位置                                                                                                                                                                                                            |
| --------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 博文数据库存储 / 工作稿与公开版本隔离                     | 已实现 | `src/server/modules/posts/`、`src/server/infra/db/schema/posts.ts`、`src/lib/content.ts`                                                                                                                        |
| 站长文章管理 / Tiptap 编辑 / MDX 实时预览 / 发布撤回删除  | 已实现 | `src/app/(site)/admin/posts/`、`src/app/(site)/_components/admin/posts/`                                                                                                                                        |
| MDX 单篇与 ZIP 批量导入导出                               | 已实现 | `src/server/modules/posts/posts-transfer.ts`、`src/app/(site)/admin/posts/import/`                                                                                                                              |
| 文章列表 / 详情 / 标签 / 归档                             | 已实现 | `src/app/(site)/blog/`                                                                                                                                                                                          |
| 文章主题分类与多维时间排序                                | 已实现 | `src/lib/content.ts`、`src/app/(site)/blog/`、`src/app/(site)/_components/blog/`                                                                                                                                |
| AI 文章来源标记与主列表 / 搜索过滤                        | 已实现 | `src/lib/content.ts`、`src/lib/blog-meta.ts`、`src/app/(site)/_components/blog/`                                                                                                                                |
| 本地 MDX 草稿（通过后台导入）                             | 已实现 | `src/server/modules/posts/posts-transfer.ts`；本地可选 `content/drafts/`（Git 忽略），外部写作技能另行核对                                                                                                      |
| 文章目录 TOC（青脉裂隙与滚动渗墨高亮）                    | 已实现 | `src/app/(site)/_components/blog/toc.tsx`、`src/app/(site)/_components/blog/toc-vein.ts`                                                                                                                        |
| 详情页右侧粘性 TOC 侧栏与无框进度操作栏                   | 已实现 | `src/app/(site)/blog/[slug]/page.tsx`、`src/app/(site)/_components/blog/toc.tsx`、`toc-vein.ts`                                                                                                                 |
| Hero 图 + 更新日期                                        | 已实现 | `src/lib/content.ts`、`src/app/(site)/blog/[slug]/page.tsx`                                                                                                                                                     |
| 版权落款（CC BY-NC-SA 4.0）                               | 已实现 | `src/app/(site)/_components/blog/copyright-card.tsx`                                                                                                                                                            |
| 笔记列表 / 详情（状态标记）                               | 已实现 | `src/app/(site)/notes/`                                                                                                                                                                                         |
| 三态主题切换（明 / 系统 / 暗 + 圆形视图过渡）             | 已实现 | `src/app/(site)/_components/site/theme-toggle.tsx`（页脚工具条）                                                                                                                                                |
| 随机岩石细纹 / Bokashi 顶光背景及开关                     | 已实现 | `src/app/(site)/_components/site/paper-canvas.tsx`、`rock-texture.ts`、`ambient-backdrop.tsx`、`mist-texture.ts`、`backdrop-noise.ts`、`fx-toggle.tsx`、`paper-surface.tsx`                                     |
| 文章专注阅读模式（横向分形青脉、目录折叠与背景降噪）      | 已实现 | `src/app/(site)/_components/blog/article-reader-shell.tsx`、`src/app/(site)/_components/blog/toc.tsx`、`toc-vein.ts`、`src/app/globals.css`                                                                     |
| 全局 ⌘K 命令检索弹窗 / 按钮展开与收回动效                 | 已实现 | `src/app/(site)/_components/site/command-search-modal.tsx`、`src/app/(site)/_components/site/site-header.tsx`                                                                                                   |
| 全站浮层从触发位置展开与收回                              | 已实现 | `src/app/(site)/_components/site/use-overlay-motion.ts`、`src/app/(site)/_components/admin/ui/overlay-motion.tsx`；覆盖范围见[组件约定](components.md#浮层展开与收回)                                           |
| 首页无框 Hero 与年度双轨季度时间轴                        | 已实现 | `src/app/(site)/page.tsx`、`src/app/(site)/_components/home/hero.tsx`、`yearly-timeline.tsx`、`writing-timeline.tsx`                                                                                            |
| 首页与文章列表交错入场                                    | 已实现 | `src/app/globals.css`、`src/app/(site)/template.tsx`、`src/app/(site)/_components/home/`、`src/app/(site)/_components/blog/`                                                                                    |
| 交互式友邻星图与站点列表                                  | 已实现 | `src/app/(site)/links/page.tsx`、`src/app/(site)/_components/links/friends-constellation.tsx`                                                                                                                   |
| sticky 页头与文章分类悬停预览                             | 已实现 | `src/app/(site)/_components/site/site-header.tsx`                                                                                                                                                               |
| 项目 / 友链 / 关于 / 联系                                 | 已实现 | `src/app/(site)/` 对应目录                                                                                                                                                                                      |
| 五个一级页面统一布局与标题区                              | 已实现 | `src/app/(site)/_components/site/page-header.tsx`，文章、笔记、项目、友链、关于页面；设计值见 `DESIGN.md`                                                                                                       |
| 友链申请与邮件一键审批                                    | 已实现 | `src/app/(site)/links/`、`src/server/modules/links/`、`src/server/infra/email.ts`                                                                                                                               |
| 无标签文章列表单列 / 搜索前后列宽一致                     | 已实现 | `src/app/(site)/blog/page.tsx`、`src/app/(site)/_components/blog/blog-search.tsx`                                                                                                                               |
| 站内搜索                                                  | 已实现 | `src/app/(site)/_components/blog/blog-search.tsx`、`src/lib/search.ts`                                                                                                                                          |
| Better Auth 社交评论                                      | 已实现 | `src/app/(site)/_components/comment/`、`src/server/modules/comments/`、`src/server/modules/auth/`                                                                                                               |
| RSS（含文章标签）                                         | 已实现 | `src/app/rss.xml/route.ts`                                                                                                                                                                                      |
| sitemap / robots                                          | 已实现 | `src/app/sitemap.ts`、`src/app/robots.ts`                                                                                                                                                                       |
| OG 图自动生成                                             | 未开始 | 计划 `src/app/(site)/blog/[slug]/opengraph-image.tsx`，用 `next/og`                                                                                                                                             |
| 代码块高亮与复制                                          | 已实现 | `src/app/(site)/_components/blog/mdx-content.tsx`                                                                                                                                                               |
| Mac 实时活动（独立采集与首页展示）                        | 已实现 | `src/lib/presence.ts`、`src/server/modules/presence/`、`tools/mac-presence/`（菜单栏设置、上报开关与旧源切换）                                                                                                  |
| AI 文章初稿生成 / 属性与正文自动填充                      | 已实现 | `src/app/(site)/_components/admin/posts/post-generate-dialog.tsx`、`src/server/modules/posts/posts-draft.tool.ts`；复用 AI 设置中的模型，强制 tool + JSON Schema + MDX 校验，最多修正一次；结果需手动保存与发布 |
| AI 模型配置（摘要、初稿与 Agent 共用默认模型）            | 已实现 | `src/app/(site)/admin/ai/`、`src/app/(site)/_components/admin/ai/`、`src/server/modules/ai/summary-config.service.ts`                                                                                           |
| 写作 Agent / 头像角色选择 / 临时对话 / 提示词与 Tool 绑定 | 已实现 | `src/app/(site)/_components/admin/ai/ai-workspace.tsx`、`src/server/modules/ai/agents.service.ts`、`src/server/infra/db/schema/ai.ts`                                                                           |
| AI Tool 目录 / 调用过程 / 摘要与初稿结果 / 显式保存草稿   | 已实现 | `src/server/modules/ai/tools.registry.ts`、`src/app/(site)/_components/admin/ai/ai-tool-message.tsx`；聊天摘要不写公开缓存，初稿仍需手动发布                                                                    |
| AI 摘要同步与展示                                         | 已实现 | `scripts/sync-summaries.ts`、`src/server/modules/ai/summary.service.ts`、`src/app/(site)/_components/blog/ai-summary.tsx`、`src/app/(site)/blog/[slug]/page.tsx`                                                |
| 访客统计与文章实时在线状态                                | 已实现 | `server.ts`、`src/lib/visitor.ts`、`src/server/modules/visitors/`、`src/app/(site)/_components/visitor/`                                                                                                        |
| 顶栏站长登录入口与弹窗                                    | 已实现 | `src/app/(site)/_components/site/site-header.tsx`、`src/app/(site)/_components/site/header-auth.tsx`、`src/app/(site)/_components/site/auth-modal.tsx`                                                          |
| 管理员管理控制台 (/admin)                                 | 已实现 | `src/app/(site)/admin/`、`src/server/modules/admin/`、`src/app/(site)/_components/admin/`                                                                                                                       |
| CI 自动检查 / 生产发布手动确认                            | 已实现 | `.github/workflows/ci-cd.yml`                                                                                                                                                                                   |

评论配置与状态见[组件规范](components.md)；活动服务配置及验证边界见[活动规范](presence.md)。已实现不代表外部服务当前在线。

## 来源与待核对项

AI 来源过滤、五页视觉统一与无标签单列的原任务未全部归档，但对应约定已进入当前源码和本文，不迁入任务状态机。原需求与记录可按[迁移来源](index.md#迁移来源)中的 Git 版本追溯，不继承历史发布授权。

- OG 图自动生成仍按原清单保留为未开始，不从已有 metadata 推断已经实现。
- 外部 `xdd-blog-writing` 技能在原任务中有交付记录，本轮未核对安装和当前可用性；本地草稿现在通过后台导入，不再移动到 content/blog 上线。
- 文章列表间隔的设计约定与源码偏差见[搜索文档](search.md#已确认约定与现状差异)，本次不修改业务样式或替换设计决定。
