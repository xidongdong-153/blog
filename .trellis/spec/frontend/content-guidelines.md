# 内容约定

博文存入数据库，笔记保留本地文件。公开页面通过 `src/lib/content.ts` 读取；写入、管理和导入导出由 `src/server/modules/posts/` 负责。浏览器可用的文章输入类型和 Zod 校验在 `src/lib/posts.ts`，客户端不能值导入数据库或文件读取模块。

## 博文存储与发布

- `site_posts` 保存稳定 ID、唯一 slug、工作稿 `document`、当前公开快照 `published` 和版本号；两份快照各自包含完整正文、标签和其他元数据。
- `getAllBlogPosts()`、`getBlogPost(slug)` 及标签、专栏查询均为异步函数，只返回已发布快照。草稿不存在公开详情、评论、访客统计、RSS 或 sitemap 入口。
- 公开文章返回 `draft: false`；管理服务使用 `ManagedPost`，不能将工作稿混入公开列表。
- 保存仅更新工作稿。发布检查指定版本的正文后，原子替换公开快照；版本冲突返回 409，原公开内容保持可用。
- 撤回取消公开快照，保留工作稿和评论；永久删除在事务内清理文章、关联评论和摘要。
- 文章首次发布后锁定 slug。评论的 `targetKey` 使用文章 ID，公开组件仍传 slug，由服务端解析稳定键。
- 新文章、更新、撤回不需要代码构建。文章相关公开页面采用动态 SSR，读取只做 React 单请求去重；RSS 不使用长期公开缓存。
- `content/blog/` 不再是线上内容源。可在本地撰写 MDX，再由后台导入为草稿。

## 字段与限制

| 字段                           | 规则                                                           |
| ------------------------------ | -------------------------------------------------------------- |
| slug                           | 最长 128 字符，小写字母、数字与单个连字符分隔                  |
| title                          | 最长 240 字符；草稿允许为空，发布前必须非空                    |
| content                        | UTF-8 不超过 1 MiB；草稿允许未完成的语法，发布前完整校验       |
| description                    | 最长 1000 字符，缺省为空                                       |
| category                       | tech / tinkering / thoughts，缺省 tech                         |
| date / updatedDate             | 合法 YYYY-MM-DD；更新日期允许空字符串                          |
| tags                           | 最多 30 项，每项 1 至 60 字符，去空白并去重                    |
| heroImage                      | HTTP(S) URL 或站点公共资源路径；图片不依赖 Next 图片优化白名单 |
| heroColor                      | 空字符串或 3/6 位十六进制色值                                  |
| aiGenerated / disableAiSummary | 布尔值，缺省 false；错误类型拒绝写入                           |
| series                         | 已注册的专栏 ID、正整数 order，以及可选 group                  |

新增内容表时间存 ISO 字符串。组件显示日期调用 `formatDate`，首页短日期调用 `formatTimelineDate`，均按 UTC 渲染。

## 编辑、预览与 MDX

后台入口为 `/admin/posts`。Tiptap 只在编辑页按需加载，以纯文本节点保留 MDX 原文；支持显式保存、Cmd/Ctrl+S、常用格式与组件片段、撤销与重做。文章属性在顶部折叠区按两行排列，专栏附加字段在专栏控件下展开。桌面默认编辑与预览分栏，窄屏切换编辑或预览；保存失败保留输入，离开未保存内容时确认。

内部预览在正文变化后防抖 350ms，通过鉴权 Server Action 渲染当前 MDX，不保存工作稿；忽略过期响应，语法错误时保留并标记上次成功内容。独立的「保存并外部预览」按钮保存后打开工作版本页面，仅站长可访问。内部预览接收服务端编译结果，由 `MDXRemote` 渲染；公开正文与外部预览继续使用 `MdxContent`。三处共用 `mdx-components.tsx` 组件映射及 `posts/mdx-options.ts` 编译配置，保持代码高亮、公式、表格、图片、目录锚点一致。外部预览隐藏站点导航和页脚，不挂评论或触发访客登记。

MDX 允许 Markdown、预设 HTML 元素和现有 Callout、Collapse、Video；拒绝任意 JavaScript、import/export、属性表达式、展开属性、事件处理器、未知组件和危险 URL。布尔属性使用简写，例如 `<Collapse title="详情" defaultOpen>`。Callout type 只支持 note / tip / warning / important。校验基于 AST，发布时还需通过实际编译。

## 导入导出

- 单篇支持 .md / .mdx，以 YAML frontmatter 携带元数据，正文保留原文。批量 ZIP 内使用 `<slug>/post.mdx`，manifest 版本为 1。
- 导出必须选择工作稿或公开版本。该功能导出文章，不包含账号、评论、AI 凭据或媒体附件。
- 导入只创建草稿，不信任文件中的发布状态。先预检，再确认写入；重名不能自动覆盖，批量写入失败整体回滚。
- 单次最多 100 篇，文件及解压后总量均不超过 20 MiB。ZIP 拒绝非法路径、链接、重复条目及非内容文件；不解压到项目目录、不自动抓取外链。
- YAML 使用不自动转换日期的 schema，避免将 2026-02-30 静默转成其他日期。导出再导入应保持正文字符、标签、日期、专栏引用和 AI 开关一致。
- 本地 AI 草稿仍可保留在被忽略的 `content/drafts/`，发布时通过后台导入。旧写作工具若假定移入 content/blog 即可上线，需要按本契约调整。

## 来源、搜索与专栏

`aiGenerated` 与主题标签、摘要开关独立。主要由 AI 起草的文章保留来源标记，纠错或排版辅助不改变人工来源。`/blog?source=human` 只显示非 AI 文章；顺序为已发布、来源、分类计数与筛选、排序、每页 8 篇分页。

`getBlogListData(await getAllBlogPosts(), options)` 是列表数据的唯一排序与分页入口。搜索保持浏览器内评分，只接收公开快照；标签、归档、首页、专栏、RSS 和 sitemap 保留全部已发布来源。

专栏定义仍在 `src/lib/series.ts` 的 REGISTERED_SERIES 中，不新增专栏管理系统。文章持有完整专栏引用，工作稿修改不会提前改变公开专栏导航。章节按 order 升序，分组遵循注册的 groups。

## 笔记

`content/notes/<slug>.md` 仍由文件名确定 URL。读取 title、date、description、tags、draft、content，并要求 status 为 in-progress / incomplete / ready / archived。标题或日期缺失、状态非法时读取报错，错误包含路径。

笔记保留原日期解析和 draft 语义，本次不迁移数据库、不新增笔记后台。不能将其宽松日期解析作为博文写入校验规则。

## 测试

`pnpm test` 在临时 SQLite 数据库应用迁移后运行全部 Node 测试，不读取生产数据库；测试文件通过 glob 自动发现。

需要公开文章时使用 `t.after(await createBlogPostFixture(slug))`。fixture 异步写入数据库，返回异步清理函数；`frontmatter.draft: true` 或兼容参数 `directory: 'drafts'` 创建不可公开访问的工作稿，不再写本地文章目录。

必测工作/公开版本隔离、版本冲突、发布失败保留旧内容、撤回后的公开接口、关联删除、MDX 约束、导入事务与正文往返保真。编辑器同时检查中文输入、撤销、键盘保存和窄屏预览。
