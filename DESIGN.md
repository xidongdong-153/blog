---
name: 喜东东小站
description: 个人技术沉淀和成长记录
colors:
  background-light: 'hsl(48 33% 97.1%)'
  foreground-light: 'hsl(140 5% 12%)'
  card-light: 'hsl(60 33% 98.8%)'
  primary-light: 'hsl(166 60% 26%)'
  muted-light: 'hsl(51 19% 92.7%)'
  muted-foreground-light: 'hsl(137 4% 33.9%)'
  border-light: 'hsl(53 13% 86.5%)'
  surface-hairline-light: 'rgba(29, 32, 30, 0.09)'
  background-dark: 'hsl(160 7% 8.4%)'
  foreground-dark: 'hsl(140 10% 93.9%)'
  card-dark: 'hsl(150 7% 11.4%)'
  primary-dark: 'hsl(164 47% 56.5%)'
  muted-dark: 'hsl(156 7% 13.9%)'
  muted-foreground-dark: 'hsl(147 5.5% 67.6%)'
  border-dark: 'hsl(150 6.4% 18.4%)'
  surface-hairline-dark: 'rgba(238, 241, 239, 0.1)'
  page-highlight: '#6fa996'
  page-highlight-secondary: '#b9ccc0'
  page-highlight-dark: '#3a8570'
  page-highlight-secondary-dark: '#2c4a46'
typography:
  display:
    fontFamily: 'Newsreader, Georgia, serif'
    fontSize: '2.25rem'
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: '-0.025em'
  heading:
    fontFamily: 'Newsreader, Georgia, serif'
    fontSize: '1.5rem'
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: '-0.025em'
  entry:
    fontFamily: 'Newsreader, Georgia, serif'
    fontSize: '1.25rem'
    fontWeight: 500
    lineHeight: 1.4
  body:
    fontFamily: 'Satoshi Variable, sans-serif'
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.75
  summary:
    fontFamily: 'Satoshi Variable, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: 'monospace'
    fontSize: '0.75rem'
    fontWeight: 400
    lineHeight: 1.5
rounded:
  control: '0.375rem'
  card: '0.5rem'
  surface: '0.75rem'
spacing:
  inline: '0.5rem'
  grid: '1rem'
  card: '1.25rem'
  header: '1.5rem'
  section-mobile: '2rem'
  section-desktop: '2.5rem'
---

# 设计规范

## 设计气质与适用范围

本文件是公开页面视觉体系的主入口，约束首页、文章、笔记、项目、友链、关于等公开界面。组件边界见[组件约定](docs/components.md)，功能现状见[功能状态](docs/features.md)。

站点围绕「**松烟墨青 × 暖宣石 / 青玄炭**」确立视觉基调，兼顾东方纸本的温润质感与现代技术出版物的清晰秩序：

- **浅色（暖宣石）**：以接近天然宣纸的微暖米白为底，搭配深松烟墨青强调色，阅读区域通透明亮，墨字与发丝线保持锐利。
- **深色（青玄炭）**：以低饱和墨炭为底，衬以柔润浅青主色与冷青微光，夜间长读不刺眼，同时保留层次与颗粒呼吸感。
- **出版物排版秩序**：衬线大标题、现代无衬线正文与等宽技术眉标各司其职；以字号、留白和 `1px` 发丝线分隔信息，不在同一模块重复标题或堆砌无意义的装饰文案。

## 颜色体系

运行时颜色全部定义于 [globals.css](src/app/globals.css) 的 `:root` 与 `.dark`（并配合 `@theme inline` 映射为 Tailwind 语义 token）。上方 YAML 记录核心明暗色板；修改色值时必须同步实际 token 与本文件，不另建独立色表。

- **基础语义**：页面背景使用 `background`，正文使用 `foreground`，日期、眉标与辅助说明使用 `muted-foreground`；链接、激活刻度与焦点反馈使用 `primary`。
- **发丝线与容器**：分隔线与轻量边框统一使用 `--surface-hairline`（`border-hair`）与 `border`，卡片衬底使用 `card` / `popover`，避免大面积高饱和强调色底块。
- **语义状态色**：项目、笔记与系列状态必须伴随文字说明，浅色采用绿 / 琥珀 `700` 档、深色采用 `400` 档；待补充状态沿用 rose `600` / `400`。普通正文对比度不低于 `4.5:1`，大标题不低于 `3:1`。
- **双主题核验**：重要交互与说明不叠加低透明度，所有色彩调整必须同时核对浅色与深色模式。

## 纸面材质与光影层次

全站背景采用「底层氛围光 → 中景纸纤维与微颗粒 → 前景清晰纸卡」的三层空气感底座，在提升纸质触感的同时严格守住文字边缘锐度与低功耗底线（无持续动画循环）：

| 层级             | 组件与定位                       | 职责与实现要点                                                                                                                                                                                                                                                                                             |
| ---------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **顶光氛围层**   | `AmbientBackdrop`（`-z-20`）     | 顶部 Bokashi 洗墨渐变 + 左上/右中错落双椭圆径向光晕，底部经遮罩平滑消隐；默认取 `--page-highlight`（松烟浅青 `#6fa996` / `#3a8570`），支持单篇文章 `heroColor` 动态覆写，并通过 `@property <color>` 与 `sanitizeCssColor` 防止非法色值导致整条渐变失效。                                                   |
| **和纸与颗粒层** | `PaperCanvas`（`-z-10`）         | 叠放于氛围光之上，使天光本身自带纸面质感。纤维层由明/暗双全视口静态 `<canvas>` 在挂载与防抖 Resize 时各绘制一次，呈现无平铺接缝的和纸长纤维与矿物纸屑（深色附微冷青雾斑，浅色保持宣纸亮透不发灰）；颗粒层采用 `211×211` 互质尺寸的 DPR 感知双极性微噪点（三角分布，兼顾 SVG `feComponentTransfer` 兜底）。 |
| **发丝线纸卡层** | `PaperSurface`（卡片内 `-z-10`） | 舍弃边缘畸变毛边，改用 `1px border-hair`、柔和偏移投影（`--surface-shadow`）与极轻内高光；默认半透底色 `bg-card/88` 透出底层细微纸纹，非浮层卡片顶部附 `3.2%` 主色微光呼应顶光。                                                                                                                           |

- **用户控制与阅读降噪**：页脚 `FxToggle`（存储键 `site-backdrop-fx`）联合根布局防闪烁脚本控制 `html[data-backdrop-fx]`，支持跨标签页及 `localStorage.clear()` 实时同步一键关/开；文章页进入「专注阅读（`data-reader-focus="true"`）」时自动将顶光与纹理透明度收敛至 `0.16` / `0.55`，关闭开关时仍以 `!important` 保持完全隐去。

## 字体与层级

字体加载定义在 [fonts.ts](src/app/fonts.ts)：Satoshi 为本地可变无衬线字体，Newsreader 通过 Next 字体加载器提供 Latin 子集；中文正文与标题由系统回退字形承接（`PingFang SC` / `Noto Serif SC` 等），不虚构中文使用西文字形。

| 用途               | 手机             | 桌面 | 字体与颜色                                              |
| ------------------ | ---------------- | ---- | ------------------------------------------------------- |
| 一级页面 H1        | 30px             | 36px | `font-serif font-medium tracking-tight text-foreground` |
| 大模块标题         | 24px             | 24px | 衬线、medium                                            |
| 文章与笔记条目标题 | 18px             | 20px | 衬线、medium                                            |
| 项目标题           | 20px             | 20px | 衬线、medium                                            |
| 关于简介、申请说明 | 16px / 28px 行高 | 同左 | 无衬线、正文色                                          |
| 页面说明、条目摘要 | 14px             | 14px | 无衬线、次要文字色                                      |
| 眉标、日期、标签   | 12px             | 12px | 等宽（`font-mono`）                                     |

- 连续阅读段落不使用等宽字体；摘要保留两至三行，长标题自然换行，不为对齐高度强行截断。
- 信息主次靠字号、字重与行距建立，不把整段正文整体降为低对比辅助色。

## 容器与间距

- **公共框架**：公开页外框统一使用 `mx-auto w-full max-w-5xl`（`1024px`），由 `(site)/layout.tsx` 提供两侧 `24px` 安全留白；页面内部不重复叠放相同水平 padding。
- **对齐与页眉**：页头品牌、页面 H1 与页脚左边界严格对齐；狭幅阅读块（如关于简介、友链申请说明）在外框内左对齐，最大宽度 `46rem`（`736px`），不二次居中。
- **一级页面标题**：统一由 `PageHeader` 输出等宽眉标、衬线 H1、说明与底部分隔线，内部间距 `8px`，底部留白 `24px`。
- **节奏间距**：标题区到正文及主模块间隔为手机 `32px`、sm 起 `40px`；独立分节使用上发丝线与 `32px` 顶内边距。网格常规间隔 `16px`，卡片内边距 `20px`（桌面侧重阅读的卡片为 `24px`）。

| 页面 | 结构约定                                                                                                                                                                    |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 首页 | 采用 `max-w-5xl` 统一外框，非对称双栏造物室 Hero（左宣言与动作流 / 右站点索引卡），下方双栏最近更新与随记栈，接年度双轨季度脉络与快速收尾条。                               |
| 文章 | 有标签时 `lg` 起主列与侧栏约 `3:1`（当前源码间距为 `lg:gap-x-10` 即 `40px`，与原 `32px` 约定差异见[搜索文档](docs/search.md#已确认约定与现状差异)）；无标签时单列占满外框。 |
| 笔记 | 单列档案卡片流，外框内限宽 `46rem` 左对齐，不设占位侧栏。                                                                                                                   |
| 项目 | `sm` 起两列无边框网格，手机单列。                                                                                                                                           |
| 友链 | 上方交互式友邻星图，下方 `sm` 起两列站点卡片；申请说明限宽 `46rem`，申请入口紧邻「推荐站点」标题。                                                                          |
| 关于 | 简介限宽 `46rem`；技术栈 `sm` 起三列，手机单列；社交通道沿外框左对齐。                                                                                                      |

### 详情页宽度例外

- 普通文章详情保留 `max-w-5xl`（为右侧目录留出空间），专栏文章详情保留 `max-w-7xl`（左侧章节导航 + 正文 + 右侧 TOC）；
- 笔记详情保留最大 `max-w-3xl` 居中单张纸面布局；不在共享 `<main>` 上强行锁死宽度。

## 列表、卡片与控件

- **列表行**：首页「最近更新」与文章/项目列表以 `1px` 发丝分隔线分隔条目，不给每条列表套厚重卡片底色；标题与摘要组成主链接，分类与可点击标签保持独立链接，禁止嵌套链接。
- **卡片形态**：
  - 项目卡不假设整卡可点击，仅对真实源码/专栏/演示链接提供悬停反馈；未配目标地址的标题保持普通文本。
  - 友链卡片整卡作为单一外链，悬停轻微上移并点亮 `border-primary/40`。
  - 圆角与表面分层：常规控件 `rounded-md`（`6px`），轻量筛选/友链卡片 `rounded-lg`（`8px`），承载 `PaperSurface` 的索引卡、笔记档案卡与页脚卡片采用 `rounded-xl`（`12px`）配合 `--surface-shadow` 与微发丝线；头像、页头导航底线、弹窗与提示框按各自功能保留特定形态。
- **标签区分**：纯展示技术栈使用 `#标签` 文本；文章内标签用下划线，侧栏筛选标签用细边框表达可点击性，避免把所有标签做成统一方块按钮。
- **书签化交互**：主按钮采用实色圆角书签（`rounded-md`），次级动作采用下划线文本链与线性图标，不使用高饱和胶囊或无依据的循环脉冲光点（如 `HeroLiveBadge` 复用实时 `presence` 快照展示真实工位状态）。

## 搜索、筛选与动效

- **站内搜索**：文章列表搜索（`BlogSearch`）与全局 `⌘K` 命令检索（`CommandSearchModal`）均由服务端下发索引在内存完成过滤，输入即响应，切换来源不清空搜索词；详细行为见[站内搜索](docs/search.md)。
- **筛选微动效**：`FilterLabel` 在悬停或键盘聚焦时用 `220ms` 从左向右展开底部细线（未选中 `40%` 透明，选中为完整主题色），按下在 `150ms` 内下沉 `1px`；全站不使用第三方客户端动画库。
- **入场与视图过渡**：
  - 共享工具类 `entrance` 执行 `520ms` `var(--ease-spring)` 淡入与 `10px` 上移，仅在挂载时触发且结束后不残留 `transform`；键盘聚焦立即可见；
  - 路由视图过渡与常驻组件隔离规则见[组件约定](docs/components.md#页面切换视图过渡-view-transitions)。

## 空态、触控与无障碍

- 空态采用 `14px` 次要文字与 `32px` 上下留白，客观交代空原因并保留清除、来源切换或申请入口，不堆砌同义提示。
- 主要交互控件与移动菜单按钮保留不低于 `44px` 的点击/触控热区，全站交互元素具备清晰 `focus-visible` 轮廓。
- 移动菜单关闭态挂 `inert`，支持 `Escape` 关闭并将焦点交还触发按钮，路由切换自动收起。
- 全站尊重 `@media (prefers-reduced-motion: reduce)`，减弱动态效果时回退为即时显隐并保持静态轮廓与选中线。

## 验收基线

视觉与交互变更需覆盖浅色 / 深色双主题，核验 `320px`（零横向溢出）、`390px`、`768px`、`1024px`、`1440px` 视口，排查长标题与长 URL 换行、卡片与背景对比度、`FxToggle` 持久化及跨标签同步、`专注阅读` 降噪组合与 SPA 切换后 `--page-highlight` 恢复情况。
