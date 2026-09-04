# 首页风格重设计 · 执行计划

按顺序执行，每步完成后跑对应的验证命令。

## 前置确认

- [x] `EntryListItem` 仅被首页 `page.tsx` 引用（`rg -l EntryListItem src/` 确认），时间线改版后删除该文件，箭头动效语言迁入 WritingTimeline。
- [x] `profileConfig.experience / education / openSource` 均为空数组，首页实际只渲染 Hero / 关于 / 文章 / 笔记 / 技能 / 统计。

## 实施清单

1. **配置与数据层** [x]
   - `src/profile.config.ts`：`Profile` 接口新增 `tagline: string`、`quote: string`，`profileConfig` 补中文文案（技术名词保留原写法）。
   - `src/lib/content.ts`：新增 `formatTimelineDate(iso: string): string`，输出 `MM / DD`。

2. **WritingTimeline 组件**（新增 `src/app/(site)/_components/home/writing-timeline.tsx`）[x]
   - 按 design.md 契约实现：衬线大日期 + 标题 + 类型徽章 + 箭头滑出，`divide-y` 细线分隔。
   - 箭头 SVG 与 hover 动效从 `entry-list-item.tsx` 迁入。

3. **Hero 重写**（`src/app/(site)/_components/home/hero.tsx`）[x]
   - 居中卷首：徽章排（保留）→ 圆形头像 → 巨标题（斜体词 `text-primary`）→ tagline → quote → CTA 排（黑胶囊 + 描边胶囊 + GitHub 图标）→ 滚动提示。
   - SpatialField 保留，mask 中心调至 `50% 50%`。

4. **SkillList 视觉升级**（`src/app/(site)/_components/home/skill-list.tsx`）[x]
   - 分组标题改 mono 全大写小字；徽章 hover 语言与列表项统一。

5. **SiteStats 改版**（`src/app/(site)/_components/home/site-stats.tsx`）[x]
   - 卡片改一行居中衬线人文表达：N 篇文章 · N 篇笔记 · N 个标签。

6. **page.tsx 重组** [x]
   - 合并文章与笔记、按日期倒序、取前 8 条传入 WritingTimeline。
   - Section 顺序：Hero → 最近写作 → 关于 → 技能 → 统计。
   - 移除原「文章」「笔记」两个 Section 及 EntryListItem 引用。

7. **清理** [x]
   - 删除 `src/app/(site)/_components/home/entry-list-item.tsx`（无引用后）。

## 验证命令

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build        # 确认 SSG 正常
pnpm dev          # 手动目检：1440px / 375px、亮色 / 暗色、reduced-motion
```

## 目检清单（对应验收标准）

- [x] 首屏居中卷首各元素齐全，1440px 与 375px 下不溢出
- [x] 最近写作：倒序 8 条、衬线日期、类型徽章、细线分隔、全部文章 → 链接
- [x] 技能：分组标题 mono 大写小字，徽章 hover 高亮
- [x] 关于在最近写作之后、技能之前
- [x] 统计为一行居中衬线大字，无卡片边框
- [x] 亮色 / 暗色下标题、副标题、金句、日期均可读
- [x] 系统开启减弱动态效果时，滚动提示与箭头动效降级
- [x] 首页说明性文案使用中文，技术名词与品牌名保留原写法

## 风险与回滚点

- 风险：居中 Hero 在小屏上元素堆叠过高 → 巨标题与徽章排间距用响应式 `gap`，头像在小屏缩至 `size-16`。
- 风险：合并时间线后文章与笔记 slug 冲突（同 slug 不同路由）→ key 用 `kind + slug` 组合。
- 回滚点：步骤 1-2 完成后可独立提交；步骤 3-7 为一次整体切换，全部改动集中在首页边界，`git checkout -- src/app/\(site\) src/profile.config.ts src/lib/content.ts` 可回滚。
