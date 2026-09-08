# 站点地图与 SEO 爬虫配置实施计划

## 实施清单

- [x] **步骤 1：域名与根元数据修正**
  - 修改 `src/site.config.ts`：将 `url` 更新为 `https://xdd.ink`。
  - 修改 `src/app/layout.tsx`：为 `metadata` 增加 `metadataBase` 与 `alternates.canonical`。
- [x] **步骤 2：创建站点地图生成器**
  - 新建 `src/app/sitemap.ts`。
  - 导入 `MetadataRoute`、`siteConfig` 以及 `src/lib/content.ts` 数据获取函数。
  - 组装静态路由、已发布博客文章、已发布笔记及标签路由数组并返回。
- [x] **步骤 3：创建爬虫规则配置**
  - 新建 `src/app/robots.ts`。
  - 配置全局爬取规则与禁止路径（`/api/`、`/search`），声明 sitemap 绝对 URL。
- [x] **步骤 4：功能状态更新**
  - 在 `.trellis/spec/frontend/feature-status.md` 将 `sitemap / robots` 状态更新为「已实现」。
- [x] **步骤 5：项目质量门与构建验证**
  - 执行 `pnpm typecheck`（类型检查）。
  - 执行 `pnpm lint`（语法检查）。
  - 执行 `pnpm format:check`（格式规范核验）。
  - 执行 `pnpm build`（确保 `/sitemap.xml` 和 `/robots.txt` 成功生成）。

## 验证命令

```bash
# 1. 质量门
pnpm typecheck
pnpm lint
pnpm format:check

# 2. 生产构建验证
pnpm build
```

## 回滚方案

若实施中出现不可预知的问题，回滚以下文件修改即可恢复原始状态：
- `git checkout src/site.config.ts src/app/layout.tsx .trellis/spec/frontend/feature-status.md`
- `rm -f src/app/sitemap.ts src/app/robots.ts`
