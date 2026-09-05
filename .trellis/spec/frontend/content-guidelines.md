# 内容约定

文章和笔记的读取、frontmatter 校验、排序、标签统计与目录提取统一在 `src/lib/content.ts`。组件不直接读取内容文件。

## 文件与 URL

```text
content/blog/
  20260615-hello-blog/    文件夹名是 URL slug
    post.mdx             正文和 frontmatter
content/notes/
  first-note.md          文件名去掉 .md 是 slug
```

文章只读取子目录中的 `post.mdx`，笔记只读取 `.md` 文件。重命名文件夹或笔记文件等于换 URL，发布后不要随意改 slug。

## 文章字段

| 字段          | 必填 | 说明                                                                                             |
| ------------- | ---- | ------------------------------------------------------------------------------------------------ |
| `title`       | 是   | 非空字符串标题                                                                                   |
| `date`        | 是   | 按 ISO 日期填写，如 `2026-06-15`                                                                 |
| `description` | 否   | 列表摘要和 SEO description，未填写时为空字符串                                                   |
| `tags`        | 否   | 字符串数组；非数组返回空数组，数组中的非字符串项被忽略                                           |
| `draft`       | 否   | 只有布尔值 `true` 才标记草稿；列表、归档和标签页不展示，但详情仍可直接访问                       |
| `updatedDate` | 否   | ISO 更新日期；有值时详情显示更新日期，未填写时为空字符串                                         |
| `heroImage`   | 否   | `public/` 下图片的站点路径，如 `/images/blog/hero.jpg`；未填写时为空字符串                       |
| `heroColor`   | 否   | 文章高光色，如 `"#659EB9"` 或 `"hsl(195 85% 65%)"`；非空字符串会去掉首尾空白，否则为 `undefined` |

## 笔记字段

笔记读取 `title`、`date`、`description`、`tags`、`draft`，规则与文章相同；不读取文章专有的 `updatedDate`、`heroImage`、`heroColor`。笔记还必须填写 `status`：

| `status`      | 列表标记 |
| ------------- | -------- |
| `in-progress` | 进行中   |
| `incomplete`  | 待补充   |
| `ready`       | 已整理   |
| `archived`    | 已归档   |

`status` 缺失或不是以上四项时，内容读取直接报错，错误带文件路径。

## 日期与校验边界

- `title` 缺失、不是字符串或只有空白时，读取报错；`date` 缺失或不是非空字符串 / YAML 日期时也报错。构建会因此失败，错误带文件路径。
- YAML 裸日期会由 gray-matter 解析为 `Date`，读取层转为 ISO 日期字符串；带引号的非空日期字符串只去掉首尾空白，当前代码不验证其日历合法性。维护者必须填写有效 ISO 日期，不能把接受字符串误写成完整日期校验。
- `updatedDate` 接受 YAML 日期或非空字符串，其他输入返回空字符串；同样不校验字符串的日历合法性。
- 数据层按日期字符串倒序返回全量内容，`draft` 过滤由页面处理；草稿不是访问权限控制。
- 渲染日期调用 `formatDate`；首页短日期调用 `formatTimelineDate`，使用 UTC，规则见[类型安全](./type-safety.md)。
- 修改内容后运行 `pnpm build`，确认 frontmatter 与页面生成通过。正文渲染能力见[组件规范](./component-guidelines.md)。
