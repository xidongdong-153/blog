# 首页文案与内容编排优化：执行计划

## 实施清单

1. **更新个人配置**
   - [x] 修改 `src/profile.config.ts` 的 `tagline` 与 `about`。
   - [x] 从 `Profile` 和 `profileConfig` 删除只供 Hero 使用的 `quote`。
   - [x] 搜索并确认无 `profile.quote` 或 `profileConfig.quote` 残留引用。

2. **重做 Hero 顶部信息与文案**
   - [x] 修改 `src/app/(site)/_components/home/hero.tsx`。
   - [x] 删除绿色状态点、定位图标、胶囊底色和 `pulse` / `ping` 动画。
   - [x] 实现「上海 / 独立开发者 / 联系我 ↗」署名式元数据行。
   - [x] 更新主标题、tagline 和主 CTA；删除 quote 行。
   - [x] 保留头像、`SpatialField`、GitHub、关于入口和滚动提示。

3. **调整 Section 组件**
   - [x] 修改 `src/app/(site)/_components/home/section.tsx`。
   - [x] 增加必填 `index` 属性。
   - [x] 移除桌面端左右分栏，改为固定的 Label 在上、内容在下。
   - [x] 保持 `h2` 语义，并让 Label 的序号、分隔符和标题结构稳定。

4. **更新首页调用方**
   - [x] 修改 `src/app/(site)/page.tsx`。
   - [x] 依次传入 `01 / 最近写的`、`02 / 关于我`、`03 / 常用工具`。
   - [x] 不改时间线数据构造、内容顺序和统计组件。

5. **机械检查与视觉检查**
   - [x] 搜索绿色状态点及 quote 引用，确认删除完整。
   - [x] 运行 Impeccable detector，只扫描本次修改的 UI 文件（结果为空）。
   - [x] 依次运行项目质量门（typecheck / lint / format / build 全过）。
   - [x] 在 1440px 和 375px 下检查亮色、暗色、减弱动态效果（无溢出，Section 均为 Label 在上）。

## 验证命令

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
node .pi/skills/impeccable/scripts/detect.mjs --json 'src/app/(site)/page.tsx' 'src/app/(site)/_components/home/hero.tsx' 'src/app/(site)/_components/home/section.tsx'
```

浏览器验证使用 `http://localhost:4400/`。确认以下结果：

- Hero 只保留一条无底色元数据行，无绿色点和循环状态动画。
- 主标题、tagline 与关于段落不重复。
- 三个 Section 的 Label 在桌面端和移动端都位于内容上方。
- 时间线标题、技能项和 CTA 在 375px 下不溢出。
- 亮色与暗色主题下辅助文字仍可读。

## 风险与回滚点

- Hero 元数据在窄屏可能换行不自然：优先缩短间距和两侧短线，不缩小到难以阅读。
- 主标题中文断行可能因视口变化出现孤字：使用显式语义分段和响应式布局控制，不按视口宽度缩放字体。
- `Section` 是首页三个模块的共用组件，一次改动会同时影响三处；先完成组件与调用方，再统一做浏览器检查。
- 本次不改数据层。若视觉方案不成立，可单独恢复 `hero.tsx` 与 `section.tsx`，不会影响内容数据。
