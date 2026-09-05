# blog

Next.js 16 + React 19 + TypeScript 个人博客，文章和笔记用 MDX 文件管理，不依赖数据库。合并到 `main` 后由 GitHub Actions 检查并发布到自有服务器；首页实时活动读取独立 Mac Presence Service。

## 本地启动

环境：Node.js 24.16.0、pnpm 11.5.0。

```bash
pnpm install
pnpm dev
```

打开 <http://localhost:4400>。未配置评论或未启动活动服务不影响浏览文章，活动服务不可用时显示离线。

## 配置与内容

- `src/site.config.ts`：站点标题、导航、社交链接、正式域名。
- `src/profile.config.ts`：个人简介、城市、技术栈、经历与教育。
- `.env.example`：评论和活动服务配置示例；需要时在 `.env.local` 配置，不提交该文件。
- `content/blog/<slug>/post.mdx`：文章。
- `content/notes/<slug>.md`：笔记。
- `src/lib/content.ts`：内容读取与 frontmatter 校验。

## 检查

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
node --experimental-strip-types --test src/lib/presence.test.ts
```

## 维护文档

- [规范索引](.trellis/spec/frontend/index.md)
- [目录结构](.trellis/spec/frontend/directory-structure.md)
- [内容约定](.trellis/spec/frontend/content-guidelines.md)
- [功能状态](.trellis/spec/frontend/feature-status.md)
- [Mac 活动服务](.trellis/spec/frontend/presence-guidelines.md)
- [部署、排查与回滚](.trellis/spec/frontend/deployment-guidelines.md)
- [质量检查](.trellis/spec/frontend/quality-guidelines.md)
