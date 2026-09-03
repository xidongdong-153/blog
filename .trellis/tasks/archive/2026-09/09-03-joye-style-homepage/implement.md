# 执行计划

七步，每步做完都能独立跑通和验证。前一步的验证不过就停下，不带着问题往下走。

## Step 1 设计 token 层落地

改 `src/app/globals.css`：

- `:root` 写入 19 个裸 HSL 三元组（参照项目的 21 个去掉 `--term-surface`、`--term-chrome`、`--term-ok`，保留 `--code-bg`、`--code-fg`），`.dark` 写同名覆盖。
- `--radius: 0.5rem` 一并带上，参照项目用它统一圆角基准。
- `@theme inline` 把每个色 token 映射成 `--color-*`。
- 加三个主题变体：`theme-system`、`theme-light`、`theme-dark`。
- 加 pill 交错淡入的 `@keyframes` 和 `@theme` 里的 `--animate-*`。
- 现有的 `--background`、`--foreground` hex 值换成 HSL 三元组，`body` 的 `background-color` / `color` 改成引用新写法。

这一步一行组件都不改。`stone-*` 还在，Tailwind 默认调色板没关，页面照旧渲染。

验证三个待验证项：

```bash
pnpm build
grep -o 'color-mix([^)]*)' .next/static/css/*.css | head -20
grep -o "data-theme='\?dark'\?[^{]*" .next/static/css/*.css | head -5
```

- 产物里搜到 `color-mix` 且参数是自定义 token，说明透明度修饰符可用。
- 搜到 `[data-theme` 相关选择器，说明 `@custom-variant` 基于祖先属性的写法生成了 CSS。
- 两个都没搜到时先在 `globals.css` 里临时加一个用了 `bg-muted/30` 和 `theme-dark:opacity-100` 的类到某个页面元素上再 build，Tailwind 只为用到的类生成 CSS。

任一项不成立就停下报告，不改方案硬做。

## Step 2 字体接入

```bash
cp ~/Code/blog/public/fonts/Satoshi-Variable.ttf /tmp/
woff2_compress /tmp/Satoshi-Variable.ttf
mkdir -p src/app/fonts && mv /tmp/Satoshi-Variable.woff2 src/app/fonts/
ls -la src/app/fonts/
```

新建 `src/app/fonts.ts`，`localFont` 声明 `src: './fonts/Satoshi-Variable.woff2'`、`weight: '300 900'`、`display: 'swap'`、`variable: '--font-satoshi'`。

`src/app/layout.tsx` 把字体类名挂到 `<html>`，`globals.css` 里让 `html` 的 `font-family` 走 `var(--font-satoshi)` 加 sans-serif fallback。

验证：`pnpm build` 过；`pnpm dev` 后在 DevTools 的 Computed 面板确认 `font-family` 命中 Satoshi；逐个试 `font-weight` 300 / 400 / 500 / 700 / 900，字重不变说明 weight 范围声明错了，改成实际范围再验。

## Step 3 组件配色替换

按文件顺序换掉 36 处 `stone-*`，只改颜色类，结构和文案一行不动：

1. `site-footer.tsx`
2. `empty-state.tsx`
3. `toc.tsx`
4. `post-card.tsx`
5. `note-card.tsx`（含四个状态徽章从原色改成 token 组合）
6. `site-header.tsx`（只换颜色，滚动逻辑留到 Step 5）
7. `(site)/page.tsx`（只换颜色，整页重写留到 Step 6）

映射关系：`text-stone-500 dark:text-stone-400` → `text-muted-foreground`；`border-stone-200 dark:border-stone-800` → `border-border`；`text-stone-600 dark:text-stone-400` → `text-muted-foreground`；`hover:text-stone-900 dark:hover:text-stone-200` → `hover:text-primary`。

验证：

```bash
grep -rn 'stone-' src/          # 应无输出
pnpm typecheck && pnpm lint && pnpm format:check && pnpm build
```

再在 `pnpm dev` 里亮暗两色过一遍所有页面，确认没有前景背景撞色。

## Step 4 三态主题切换

`src/app/layout.tsx` 的内联脚本改成：读 `localStorage.theme`，值为 `'light'` / `'dark'` / 其他（含 null）分别 resolve，写 `html.dataset.theme` 和 `html.classList` 的 `dark`。

`theme-toggle.tsx` 重写：

- 三个 SVG 图标（显示器、太阳、月亮）绝对定位叠放在同一个 `relative` 容器里。
- 默认全部 `opacity-0 blur-[4px] scale-[0.6]`，各自用 `theme-system:` / `theme-light:` / `theme-dark:` 变体翻成可见态。
- `transition` 覆盖 opacity、filter、transform，`duration-250 ease-out`，加 `motion-reduce:transition-none`。
- 点击时按 system → light → dark → system 循环，写 `localStorage` 和 `html.dataset.theme`，重算 `html.dark`。
- `useEffect` 里注册 `matchMedia('(prefers-color-scheme: dark)')` 的 change 监听，只在当前是 `system` 时重算，cleanup 里移除。

验证：点三次回到起点；`localStorage.theme` 依次是 light、dark、system；图标是模糊淡入淡出；`system` 态下改系统主题页面跟着变、`light` / `dark` 态下不变；开减弱动态效果后图标切换不动画但状态照常切；刷新后不闪白。

## Step 5 sticky 胶囊页头

`site-header.tsx`：

- 容器加 `data-scrolled`、`data-visible` 两个属性，样式全走 `data-[scrolled=true]:` / `data-[visible=false]:` 变体。
- 滚动监听 `{ passive: true }`，上一次位置存 `useRef`，只在跨阈值时 `setState`。
- 移动端菜单：按钮切 `data-expanded`，`grid-rows-[0fr]` → `grid-rows-[1fr]` 展开；`pointerdown` 监听点击菜单外收起，cleanup 里移除。
- 四层阴影用 `shadow-[...]` arbitrary value，颜色写 `hsl(var(--foreground)/0.08)` 这类，不硬编码 rgba。

`(site)/layout.tsx`：`<main>` 只留居中和 padding，`max-w-3xl` 下移到各页面。

逐页补宽度类：`blog/page.tsx`、`blog/[slug]/page.tsx`、`blog/archives/page.tsx`、`blog/tags/[tag]/page.tsx`、`notes/page.tsx`、`notes/[slug]/page.tsx`、`about`、`contact`、`links`、`projects`、`search` 共 11 个页面加 `max-w-3xl`，首页留给 Step 6 用宽容器。

这一步改动面最大，漏一个页面就会出现内容贴边。改完先 `grep -c 'max-w-3xl' src/app/\(site\)` 数一遍，再逐页目测。

验证：页面顶部页头无边框；滚动过 20px 变胶囊；向下滚过 350px 隐藏、向上滚出现；移动端宽度下菜单能展开收起；开减弱动态效果后页头不做过渡动画但状态照常切；11 个页面内容宽度和改动前一致。

## Step 6 profile 数据和首页重写

新建 `src/profile.config.ts`，按 design 里的类型定义写，首稿只填 `about`、`location`、`skills`，其余留空数组，`avatar` 为 `null`。

新建 6 个 home 组件：`section.tsx`、`hero.tsx`、`entry-list-item.tsx`、`link-card.tsx`、`skill-list.tsx`、`site-stats.tsx`。每个都写中文 JSDoc 说明职责和关键约定，和 `mdx-content.tsx` 的注释风格保持一致。

重写 `(site)/page.tsx`：hero、About、Blog（最新 5 篇）、Notes（最新 5 条）、Skills、Experience（空则不渲染）、Open Source（空则不渲染）、SiteStats。宽度用 `md:w-4/5 lg:w-5/6`。

验证：`profile.experience` 空数组时首页没有 Experience 段，临时填一条示例数据后该段出现，验证完删掉示例数据；列表项 hover 时箭头横线从左展开、标题变 primary；`avatar` 为 `null` 时首字占位块正常显示，填一个真实路径后图片能出来；skills pill 加载时交错淡入，开减弱动态效果后不淡入直接显示。

## Step 7 收尾同步

- `.trellis/spec/frontend/component-guidelines.md` 的 Tailwind 一节：「色系统一用 stone」改成语义 token 约定，列出可用 token 和圆角规则；「不写自定义 CSS 类」保留并补一句 `globals.css` 只放 token、keyframes 和变体定义。
- `.trellis/spec/frontend/state-management.md` 的「主题机制」一节：两态改成三态，补上 `html.dataset.theme` 这个第四处需要同步的位置，以及图标可见性走 CSS 变体不走 React state 的约定。
- `.trellis/spec/frontend/directory-structure.md`：顶层布局清单补 `src/profile.config.ts` 和 `src/app/fonts/`，组件分组表补 `home/` 一行。
- README：目录一节补 `src/profile.config.ts`；把改个人信息的入口从只提 `src/site.config.ts` 改成两个配置文件都提。
- 四条质量门全过：`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`。
- 亮暗两色逐页目测 12 个页面。

写说明性文本前先读 `xdd-plain-docs` 技能。

## 验证命令汇总

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
grep -rn 'stone-' src/                       # 应无输出
grep -o 'color-mix([^)]*)' .next/static/css/*.css | head
pnpm dev                                     # 手查亮暗两色 12 个页面
```

## 风险和回滚点

| 步骤 | 风险 | 回滚 |
| --- | --- | --- |
| Step 1 | 三个待验证项任一不成立，整个方案的样式实现路径要改 | 只改了 `globals.css` 一个文件，直接 `git checkout` 该文件 |
| Step 3 | 36 处替换量大，漏改或映射错色导致对比度不足 | 逐文件提交，出问题只回滚单个文件 |
| Step 5 | 改 `(site)/layout.tsx` 影响全部 12 个页面，漏补宽度类会内容贴边 | 先记下 `<main>` 原始 className，回滚只需还原这一行加删掉页面里新增的宽度类 |
| Step 6 | 首页整页重写，改动最集中 | 旧 `page.tsx` 在 git 里，单文件回滚 |

字体是新增二进制文件，`git revert` 后需要手动删 `src/app/fonts/`。

## 开工前确认

- 参照项目 `~/Code/blog` 只读不写，不改那边任何文件。
- 内容文件 `content/` 一个不动。
- `src/lib/content.ts` 一行不动，站点统计用现有函数。
- 不装新依赖。字体走 `next/font`（Next 内置），动效走 Tailwind 变体，都不需要新包。
