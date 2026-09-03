# 接入 Giscus 评论系统

## Goal

在文章详情页（`/blog/[slug]`）接入基于 GitHub Discussions 的 Giscus 评论系统，替换原有占位组件，支持跟随全站系统/浅色/深色主题动态实时联动切换，并提供完善的环境变量与配置容错机制。

## Background & Confirmed Facts

1. `src/app/(site)/_components/comment/giscus-comments.tsx` 当前仅为静态占位组件（文案为“评论区待接入（Giscus，TODO）”）。
2. `src/app/(site)/blog/[slug]/page.tsx` 中已引入并挂载了 `<GiscusComments />`。
3. `README.md` 的「功能状态」表中记录 `Giscus 评论：占位组件，接入步骤见注释`，实现后需更新为 `已实现`。
4. 全站支持三态主题（system / light / dark），根节点由 `document.documentElement.dataset.theme` 和 class `dark` 标识，切换逻辑在 `src/app/(site)/_components/site/theme-toggle.tsx` 中执行。
5. 配置策略确定：采用环境变量优先（`NEXT_PUBLIC_GISCUS_*`），未配置时在组件中显示清晰的配置引导卡片（说明需要填写的环境变量），配置完整后自动加载 Giscus iframe 讨论区。

## Requirements

1. **配置管理**：
   - 支持通过环境变量配置 Giscus 核心参数：
     - `NEXT_PUBLIC_GISCUS_REPO`：GitHub 仓库（如 `owner/repo`）
     - `NEXT_PUBLIC_GISCUS_REPO_ID`：GitHub GraphQL 仓库 ID
     - `NEXT_PUBLIC_GISCUS_CATEGORY`：讨论分类名称（如 `Announcements` 或 `General`）
     - `NEXT_PUBLIC_GISCUS_CATEGORY_ID`：讨论分类 ID
     - `NEXT_PUBLIC_GISCUS_MAPPING`：映射方式，默认 `pathname`
     - `NEXT_PUBLIC_GISCUS_REACTIONS_ENABLED`：是否启用反应，默认 `1`
     - `NEXT_PUBLIC_GISCUS_INPUT_POSITION`：输入框位置，默认 `top`
     - `NEXT_PUBLIC_GISCUS_LANG`：语言，默认 `zh-CN`
   - 提供根目录 `.env.example`，列出上述变量及获取步骤，不提交任何私人 token 或未授权配置。
2. **评论组件实现**：
   - 在 `src/app/(site)/_components/comment/giscus-comments.tsx` 中实现客户端组件。
   - 当环境变量缺失关键字段（`repo`、`repoId`、`categoryId`）时，渲染友好的未配置引导提示卡片，列明配置方法，页面正常渲染不报错。
   - 当环境变量配置完备时，动态加载 Giscus script / iframe，设置 `loading="lazy"` 保证首屏性能。
3. **主题联动无缝切换**：
   - 探测当前实际生效的主题（若为 dark 或 system 下偏好深色则使用 `dark`，否则使用 `light`）。
   - 通过 `MutationObserver` 监听 `document.documentElement` 的 `class` 与 `data-theme` 属性变化。
   - 主题变化时，通过 `iframe.contentWindow.postMessage` 向 Giscus iframe 发送 `{ giscus: { setConfig: { theme } } }`，实现免刷新无缝主题切换。
4. **清理与质量保障**：
   - 移除 `giscus-comments.tsx` 中的 TODO 占位文案。
   - 更新 `README.md` 中的「功能状态」表，将 Giscus 评论状态改为 `已实现`。
   - 保证依次通过 `pnpm typecheck`、`pnpm lint`、`pnpm format:check`。

## Acceptance Criteria

- [x] 文章详情页在未配置环境变量时，优雅展示配置引导区域，不报错。
- [x] 文章详情页在配置有效参数时，正常加载 Giscus 讨论区 iframe。
- [x] 点击顶部主题切换按钮（浅色 / 深色 / 系统）时，Giscus 评论区即时同步切换明暗主题风格。
- [x] 提供了 `.env.example` 示例配置文件。
- [x] `README.md` 的「功能状态」表中 Giscus 评论状态已变更为 `已实现`。
- [x] `pnpm typecheck`、`pnpm lint`、`pnpm format:check` 全部零报错通过。

## Out of Scope

- 自建数据库存储评论。
- 笔记详情页（`/notes/[slug]`）挂载评论区。
