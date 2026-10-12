# 内容约定

文章和笔记的读取、frontmatter 校验、排序、标签统计与目录提取统一在 `src/lib/content.ts`。组件不直接读取内容文件。

## 文件与 URL

```text
content/blog/
  20260615-hello-blog/    文件夹名是 URL slug
    post.mdx             正文和 frontmatter
content/notes/
  first-note.md          文件名去掉 .md 是 slug
content/drafts/
  20261012-example/
    post.mdx             本地 AI 草稿，不被站点读取
    generation.md        写作要求、来源与待核验项
```

文章只读取子目录中的 `post.mdx`，笔记只读取 `.md` 文件。重命名文件夹或笔记文件等于换 URL，发布后不要随意改 slug。

`content/drafts/` 被 Git 忽略。初稿在这里审阅 MDX 源码，审核后正文才移入 `content/blog/`；生成记录留在本地。`pnpm build` 不读取草稿目录，不能作为初稿已经通过构建校验的依据。

## 测试文章 fixture

需要让 `getBlogPost` 返回有效文章的测试，从 `src/test/fixtures/content.ts` 导入 `createBlogPostFixture(slug)`，并把返回的清理函数注册到 Node 测试上下文的 `t.after`。fixture 在测试期间写入 `content/blog/<slug>/post.mdx`，清理时只删除自身创建的文件和仍为空的目录。

```ts
const cleanupFixture = createBlogPostFixture('test-article')
t.after(cleanupFixture)
```

不要让评论、访客等测试依赖仓库内的示例文章；也不要绕过 `src/lib/content.ts` 的文章读取与校验。

fixture 的可选第二参数支持 `frontmatter`、`content` 和 `directory: 'blog' | 'drafts'`，缺省仍写正式文章目录。多篇 fixture 注册一个 `t.after` 并逆序调用清理函数，避免创建父目录的首篇先清理后留下空目录。

## 文章字段

| 字段               | 必填 | 说明                                                                                                                      |
| ------------------ | ---- | ------------------------------------------------------------------------------------------------------------------------- |
| `title`            | 是   | 非空字符串标题                                                                                                            |
| `date`             | 是   | 按 ISO 日期填写，如 `2026-06-15`                                                                                          |
| `category`         | 是   | 主题分类，合法值为 `tech`（技术）、`tinkering`（捣鼓）、`thoughts`（随想）                                                |
| `description`      | 否   | 列表摘要和 SEO description，未填写时为空字符串                                                                            |
| `tags`             | 否   | 字符串数组；非数组返回空数组，数组中的非字符串项被忽略                                                                    |
| `draft`            | 否   | 只有布尔值 `true` 才标记草稿；列表、归档和标签页不展示，但详情仍可直接访问                                                |
| `aiGenerated`      | 否   | 只有布尔值 `true` 表示 AI 生成，缺省为 `false`；与主题标签和 AI 摘要开关独立                                              |
| `updatedDate`      | 否   | ISO 更新日期；有值时详情显示更新日期，未填写时为空字符串                                                                  |
| `heroImage`        | 否   | `public/` 下图片的站点路径，如 `/images/blog/hero.jpg`；未填写时为空字符串                                                |
| `heroColor`        | 否   | 文章高光色，如 `"#659EB9"` 或 `"hsl(195 85% 65%)"`；非空字符串会去掉首尾空白，否则为 `undefined`                          |
| `disableAiSummary` | 否   | 只有布尔值 `true` 时关闭该文章的 AI 摘要生成与展示，哈希变化不触发模型调用                                                |
| `series`           | 否   | 专栏系列绑定对象，包含 `id`（专栏标识）、`order`（章节序号，从 1 开始）与可选的 `group`（大章节分类名称）；格式非法时忽略 |

## AI 来源与写作边界

### 范围与接口

文章读取返回 `BlogPost.aiGenerated: boolean`。`src/lib/blog-meta.ts` 定义浏览器可用的 `BlogSourceFilter = 'all' | 'human'`、`filterBlogPostsBySource(posts, source)` 和 `buildBlogListUrl({ source, category, sort, page })`；客户端不得从带 `node:fs` 的内容模块值导入这些函数。

主列表在 `src/lib/content.ts` 调用 `getBlogListData(allPosts, { source, category, sort, page })`，返回 `sourcePosts`、`categoryCounts`、`posts` 和 `totalPages`。固定每页 8 篇；页面传入 `getAllBlogPosts()` 的原始结果，不再复制另一套筛选与分页顺序。

### 读取与展示契约

读取规则为 `data.aiGenerated === true`。正文主要由 AI 起草即标记，人工修改后保留标记；仅纠错、排版辅助不改变人工文章来源。普通 `tags` 只存主题，不添加“AI 生成”标签。来源标记由统一 `AiGeneratedLabel` 显示为次要文字。

`/blog?source=human` 只显示非 AI 文章，默认 `/blog` 显示全部。按“已发布 → 来源 → 分类计数/分类筛选 → 排序 → 分页”处理。搜索只约束来源，规则见[站内搜索](./search-guidelines.md)。标签、归档、首页、专栏导航、RSS 和 sitemap 保留全部已发布文章。

### 输入与错误边界

| 输入                    | 结果                                             |
| ----------------------- | ------------------------------------------------ |
| 缺省、`false`           | `aiGenerated: false`                             |
| 布尔值 `true`           | `aiGenerated: true`，显示来源标记                |
| 字符串 `"true"`、数字等 | `aiGenerated: false`，不把错误类型识别为 AI 来源 |
| 未知 URL `source` 值    | 视为全部文章                                     |
| 来源筛选后无文章        | 显示空态并保留来源切换和搜索，不变成 404         |

### 正常、兼容与错误写法

AI 初稿写 `aiGenerated: true` 和 `draft: true`。旧文章不写来源字段也能读取。不要写 `aiGenerated: "true"`，它不会被识别为 AI 生成；不要用 `draft` 控制来源，草稿状态与来源不是同一件事。

### 必须验证的断言

测试覆盖来源缺省/false/true/错误类型、AI 摘要开关独立、主题标签统计不变，以及草稿目录在 `getAllBlogPosts`、`getBlogPost` 中不可见。混合分页测试调用页面实际使用的 `getBlogListData`，断言非 AI 第一页 8 篇、第二页 2 篇和分类计数；不要在测试里复制页面处理顺序。另验证分类/排序/分页 URL 保留来源，搜索不返回被排除的 AI 文章。

### 生成指导入口

共享技能为 `$HOME/.agents/skills/xdd-blog-writing/SKILL.md`，先识别当前博客仓库或 worktree，再读本文件及组件规范。技能默认只交付本地草稿和生成记录；未经明确授权不覆盖已有内容、不移入正式目录、不提交或发布。正文移入正式目录后通过本地预览和 `pnpm build` 验证 MDX 渲染。

## 专栏系列约定

专栏全局元数据统一在 `src/lib/series.ts` 的 `REGISTERED_SERIES` 中定义（包含 `id`、`title`、`description`、`status`、`tags`、`repositoryUrl` 与可选的 `groups` 大章节顺序列表等），文章通过 frontmatter 的 `series.id` 进行关联。

- 专栏专题主页为 `/blog/series/[id]`，展示大纲分类时间轴与配套资源；顶部不放专栏描述段，章节卡片保留日期、阅读时长与描述。
- 文章详情页左侧常驻章节目录侧栏，只呈现搜索框、折叠按钮与分组章节大纲（大章节手风琴折叠展开、即时检索），不放专栏标题、统计与返回入口；顶部专栏微标只写专栏名，文末呈现上一讲/下一讲导轨卡片。
- 章节序号统一取 `post.series.order` 直接渲染为纯数字（`1`、`2`…），不用 `01` 补零；界面不出现「第 N 讲」表述。
- 文章列表页 `/blog` 顶部在存在活跃专栏时展示精选专栏卡片，卡片只保留标题、状态与讲次、标签和进入入口，不放专栏描述段。

## 笔记字段

笔记读取 `title`、`date`、`description`、`tags`、`draft`，规则与文章相同；不读取文章专有的 `category`、`updatedDate`、`heroImage`、`heroColor`。笔记还必须填写 `status`：

| `status`      | 列表标记 |
| ------------- | -------- |
| `in-progress` | 进行中   |
| `incomplete`  | 待补充   |
| `ready`       | 已整理   |
| `archived`    | 已归档   |

`status` 缺失或不是以上四项时，内容读取直接报错，错误带文件路径。

## 日期与校验边界

- `title` 缺失、不是字符串或只有空白时，读取报错；`date` 缺失或不是非空字符串 / YAML 日期时也报错；`category` 缺失或不是 `tech` / `tinkering` / `thoughts` 之一时报错。构建会因此失败，错误带文件路径。
- YAML 裸日期会由 gray-matter 解析为 `Date`，读取层转为 ISO 日期字符串；带引号的非空日期字符串只去掉首尾空白，当前代码不验证其日历合法性。维护者必须填写有效 ISO 日期，不能把接受字符串误写成完整日期校验。
- `updatedDate` 接受 YAML 日期或非空字符串，其他输入返回空字符串；同样不校验字符串的日历合法性。
- 数据层按日期字符串倒序返回全量内容，`draft` 过滤由页面处理；草稿不是访问权限控制。
- 渲染日期调用 `formatDate`；首页短日期调用 `formatTimelineDate`，使用 UTC，规则见[类型安全](./type-safety.md)。
- 修改内容后运行 `pnpm build`，确认 frontmatter 与页面生成通过。正文渲染能力见[组件规范](./component-guidelines.md)。
