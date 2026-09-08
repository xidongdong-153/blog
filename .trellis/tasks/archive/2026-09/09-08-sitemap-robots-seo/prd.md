# 站点地图与 SEO 爬虫配置 PRD

## 目标

为博客项目提供符合 Next.js 16 约定的静态站点地图（`sitemap.xml`）与爬虫协议（`robots.txt`），基准域名设定为 `https://xdd.ink`，以确保谷歌搜索等搜索引擎爬虫能够准确抓取并收录已发布页面。

## 需求范围

### 包含项

1. **统一域名基准**
   - 将 `src/site.config.ts` 中的 `siteConfig.url` 修正为 `https://xdd.ink`。
   - 在 `src/app/layout.tsx` 的根元数据中配置 `metadataBase: new URL(siteConfig.url)`，并添加全站 Canonical 基础声明。
2. **生成站点地图 (`src/app/sitemap.ts`)**
   - 核心静态路由：`/`、`/blog`、`/notes`、`/projects`、`/about`、`/links`、`/contact`、`/blog/archives`、`/blog/tags`。
   - 博客文章动态路由：通过 `src/lib/content.ts` 的 `getAllBlogPosts()` 提取，**严格过滤草稿（`!post.draft`）**。最后修改时间取 `new Date(post.updatedDate || post.date)`。
   - 笔记动态路由：通过 `getAllNotes()` 提取，**严格过滤草稿（`!note.draft`）**。最后修改时间取 `new Date(note.date)`。
   - 标签动态聚合页：通过 `getAllBlogTags()` 提取，URL 使用 `encodeURIComponent(tag)` 编码中文。
3. **生成爬虫规则 (`src/app/robots.ts`)**
   - 允许所有搜索引擎爬取公开页面（`allow: '/'`）。
   - 明确排除 API 与占位页面（`disallow: ['/api/', '/search']`）。
   - 显式声明站点地图地址：`sitemap: 'https://xdd.ink/sitemap.xml'`。
4. **状态与规范同步**
   - 将 `.trellis/spec/frontend/feature-status.md` 中 `sitemap / robots` 的状态更新为「已实现」。

### 排除项

- 不修改现有文章或笔记的正文与 frontmatter 逻辑。
- 不引入第三方 sitemap 生成库（直接使用 Next.js 内置 `MetadataRoute.Sitemap` 与 `MetadataRoute.Robots`）。
- 外部 Google Search Console 的 DNS 验证与手动提交不在本地代码范围内，作为部署后步骤由用户执行。

## 验收标准

1. `pnpm build` 能够成功执行，并在输出路由清单中显示 `/sitemap.xml` 与 `/robots.txt`。
2. 本地请求或构建产物中，`/robots.txt` 包含 `Sitemap: https://xdd.ink/sitemap.xml`，且包含 `/api/` 与 `/search` 的 Disallow 规则。
3. `/sitemap.xml` 生成的绝对路径均以 `https://xdd.ink` 开头，草稿文章不出现在列表中，中文标签经过编码。
4. 质量门检查全部通过：`pnpm typecheck`、`pnpm lint`、`pnpm format:check`。
5. `.trellis/spec/frontend/feature-status.md` 已将对应功能标记为已实现。
