---
name: 喜东东小站
description: 松烟墨青配色、柔和岩石细纹与清晰的技术手记排版
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
    fontFamily: 'Cormorant Garamond, Huiwen-mincho, Georgia, serif'
    fontSize: '2.25rem'
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: '-0.025em'
  heading:
    fontFamily: 'Cormorant Garamond, Huiwen-mincho, Georgia, serif'
    fontSize: '1.5rem'
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: '0.01em'
  entry:
    fontFamily: 'Cormorant Garamond, Huiwen-mincho, Georgia, serif'
    fontSize: '1.25rem'
    fontWeight: 500
    lineHeight: 1.4
  body:
    fontFamily: 'Satoshi Variable, LXGW WenKai Screen, sans-serif'
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.85
  note:
    fontFamily: 'Newsreader, LXGW WenKai Screen, serif'
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.85
  summary:
    fontFamily: 'Satoshi Variable, LXGW WenKai Screen, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: 'Maple Mono NF CN, monospace'
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

站点围绕「**松烟墨青 × 暖宣石 / 青玄炭**」确立视觉基调，以柔和的岩石细纹承托内容，配合现代技术出版物的清晰排版：

- **浅色（暖宣石）**：以微暖米白为底，叠加可辨认但低对比的灰褐色细纹，搭配深松烟墨青强调色。纹理在留白处自然显露，文字与分隔线保持清楚。
- **深色（青玄炭）**：以低饱和墨炭为底，叠加更含蓄的岩石细纹，衬以浅青主色与冷青微光。保持低起伏、低反光的表面质感，适合夜间阅读。
- **出版物排版秩序**：衬线大标题、现代无衬线正文与等宽技术眉标各司其职；以字号、留白和 `1px` 发丝线分隔信息，不在同一模块重复标题或堆砌无意义的装饰文案。

## 颜色体系

运行时颜色全部定义于 [globals.css](src/app/globals.css) 的 `:root` 与 `.dark`（并配合 `@theme inline` 映射为 Tailwind 语义 token）。上方 YAML 记录核心明暗色板；修改色值时必须同步实际 token 与本文件，不另建独立色表。

- **基础语义**：页面背景使用 `background`，正文使用 `foreground`，日期、眉标与辅助说明使用 `muted-foreground`；链接、激活刻度与焦点反馈使用 `primary`。
- **发丝线与容器**：分隔线与轻量边框统一使用 `--surface-hairline`（`border-hair`）与 `border`，卡片衬底使用 `card` / `popover`，避免大面积高饱和强调色底块。
- **语义状态色**：项目与笔记状态必须伴随文字说明，浅色采用绿 / 琥珀 `700` 档、深色采用 `400` 档；待补充状态沿用 rose `600` / `400`。普通正文对比度不低于 `4.5:1`，大标题不低于 `3:1`。
- **双主题核验**：重要交互与说明不叠加低透明度，所有色彩调整必须同时核对浅色与深色模式。

## 岩石细纹与光影层次

全站背景采用透明岩石细纹叠加 Bokashi 顶光，保留暖白与墨青底色。自然分叉的长纹与两端收细的短纹错落分布，辅以轻微矿物颗粒和表面起伏；文字与内容始终是视觉重点。

- **纹路存在感**：细纹应在留白处可辨认，阅读时保持安静。控制线宽与对比度，不表现宽裂口、厚重阴影或明显凹陷。
- **明暗适配**：浅色细纹的对比度高于暗色，避免米白底上几乎不可见；暗色保留细微纹路和弱亮边，不形成发光线。
- **随机与稳定**：刷新或重新进入站点时生成新纹路与随机生长节奏（整场在约 0.75 至 3.6 秒间落定，24 条主干、分支、末梢与短纹各自随机起裂次序、速率快慢与断裂曲线，短纹两翼附带轻微速率差），裂纹按主干到分支、短纹由中向两端从 0 到 1 裂开延展，裂尖同步散出微雾与细微粉尘颗粒并缓慢向下飘落消隐，全部落定后定格为静态背景，没有持续循环动画；同次访问中的站内跳转、主题切换和窗口尺寸变化沿用同一种子与已定格画面，关闭后重新开启特效会按同一种子重新裂开，开启减弱动效时直接显示最终纹路。

参数沿用用户确认的第 7 版可视化：24 条主次纹路、25% 起伏与 30% 细纹强度。亮色暗线基础不透明度系数为 0.6175，暗色为 0.4，绘制时再乘细纹强度并柔化阅读区域；具体实现见 [rock-texture.ts](src/app/%28site%29/_components/site/rock-texture.ts)。

| 层级           | 组件与定位                       | 职责与实现要点                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **顶光氛围层** | `AmbientBackdrop`（`-z-20`）     | 顶部轻柔 Bokashi 洗墨底光叠加四层域扭曲 fBm 不规则雾岚（见 [mist-texture.ts](src/app/%28site%29/_components/site/mist-texture.ts)），无椭圆或规则轮廓，错落分布于左上、右中、中上与下缘并以互质周期（13–23 秒）缓慢呼吸漂移；默认取 `--page-highlight`（松烟浅青 `#6fa996` / `#3a8570`），支持单篇文章 `heroColor` 动态覆写，并通过 `@property <color>` 与 `sanitizeCssColor` 防止非法色值导致样式失效。 |
| **岩石细纹层** | `PaperCanvas`（`-z-10`）         | 由 `rock-texture.ts` 绘制明暗双画布，叠加低起伏矿物颗粒与自然收细的分支纹路。两种主题共用几何，透明底保留氛围光；首次挂载随机生成，站内导航和开关操作保持稳定。绘制调度、像素上限与降级行为见[组件约定](docs/components.md)。                                                                                                                                                                            |
| **浮层表面**   | `PaperSurface`（卡片内 `-z-10`） | 舍弃边缘畸变毛边，改用 `1px border-hair`、柔和偏移投影（`--surface-shadow`）与极轻内高光；默认半透底色 `bg-card/88` 透出底层细微岩纹，非浮层卡片顶部附 `3.2%` 主色微光呼应顶光。                                                                                                                                                                                                                         |

- **用户控制与阅读降噪**：页脚 `FxToggle`（存储键 `site-backdrop-fx`）联合根布局防闪烁脚本控制 `html[data-backdrop-fx]`，支持跨标签页及 `localStorage.clear()` 实时同步一键关/开；文章页进入「专注阅读（`data-reader-focus="true"`）」时自动将顶光与纹理透明度收敛至 `0.16` / `0.55` 并定格雾岚呼吸动画，同时右侧文章目录平滑折叠，切换为顶部横向分形青脉进度条（带 H2 矿晶刻度）与无框文字操作栏（`75%` 降噪态，悬停或聚焦恢复），关闭开关时仍以 `!important` 保持完全隐去并暂停动画；开启 `prefers-reduced-motion: reduce` 时定格为静态不规则雾岚与静态青脉。

## 字体与层级

为保证 macOS、Windows 等不同设备排版气质一致，全站采用「**温润手记 + 旧铅字雕版明朝**」中西文协同体系。西文字体定义在 [fonts.ts](src/app/fonts.ts)，中文字体与等宽字体在 [layout.tsx](src/app/layout.tsx) 通过 Unicode-Range 分片 CSS 按需加载，字族变量统一映射于 [globals.css](src/app/globals.css)：

- **标题衬线（`--font-serif`）**：`Cormorant Garamond`（`next/font/google` 400–700 normal/italic 自托管）+ `Huiwen-mincho`（汇文明朝体，ZeoSeven 分片）。对 `.font-serif` 与正文标题设置 `font-synthesis-weight: none`，避免单字重汇文明朝在 `font-medium`/`font-semibold` 下触发浏览器伪加粗发糊；衬线统计数字使用 `lining-nums tabular-nums` 保持齐平。
- **全局正文与界面（`--font-sans`）**：`Satoshi`（本地 42KB 可变字体）+ `LXGW WenKai Screen`（霞鹜文楷屏幕阅读版，jsDelivr 分片），系统黑体作为最终兜底。
- **笔记正文（`--font-note`）**：`Newsreader`（`next/font/google` 自托管）+ `LXGW WenKai Screen`，用于 `.field-note-prose`；文章与笔记正文统一采用 `1.85` 行高、`0.012em` 微字距，并启用 `hanging-punctuation: allow-end` 与 `text-autospace: normal`。
- **等宽与眉标（`--font-mono`）**：`Maple Mono NF CN`（ZeoSeven 分片，中英文 2:1 等宽）+ `LXGW WenKai Screen` 回退，默认开启 `tabular-nums`，代码块内开启 `font-variant-ligatures: contextual`，行内代码设为 `0.85em` 以与文楷正文视觉齐平。

| 用途               | 手机             | 桌面 | 字体与颜色                                                          |
| ------------------ | ---------------- | ---- | ------------------------------------------------------------------- |
| 一级页面 H1        | 30px             | 36px | `font-serif font-medium tracking-tight text-foreground`（汇文明朝） |
| 大模块标题         | 24px             | 24px | 衬线、medium（`Cormorant Garamond` + 汇文明朝）                     |
| 文章与笔记条目标题 | 18px             | 20px | 衬线、medium                                                        |
| 项目标题           | 20px             | 20px | 衬线、medium                                                        |
| 文章正文、笔记正文 | 16px / 1.85 行高 | 同左 | 霞鹜文楷 Screen（西文 `Satoshi` / 笔记西文 `Newsreader`）           |
| 页面说明、条目摘要 | 14px             | 14px | 全局正文体（`Satoshi` + 霞鹜文楷 Screen）、次要文字色               |
| 眉标、日期、标签   | 12px             | 12px | 等宽（`font-mono`，`Maple Mono NF CN`）                             |

- 连续阅读段落不使用等宽字体；摘要保留两至三行，长标题自然换行，不为对齐高度强行截断。
- 信息主次靠字号、字重与行距建立，不把整段正文整体降为低对比辅助色。

## 容器与间距

- **公共框架**：公开页外框统一使用 `mx-auto w-full max-w-5xl`（`1024px`），由 `(site)/layout.tsx` 提供两侧 `24px` 安全留白；页面内部不重复叠放相同水平 padding。
- **对齐与页眉**：页头品牌、页面 H1 与页脚左边界严格对齐；狭幅阅读块（如关于简介、友链申请说明）在外框内左对齐，最大宽度 `46rem`（`736px`），不二次居中。
- **一级页面标题**：统一由 `PageHeader` 输出衬线 H1、说明与底部分隔线，内部间距 `8px`，底部留白 `24px`，不堆叠冗余英文眉标。
- **节奏间距**：标题区到正文及主模块间隔为手机 `32px`、sm 起 `40px`；独立分节使用上发丝线与 `32px` 顶内边距。网格常规间隔 `16px`～`48px`。

| 页面 | 结构约定                                                                                                                                                      |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 首页 | 采用 `max-w-5xl` 统一外框，无卡片 Hero（左工位状态、主标题、简介与极简图标通道 / 右发丝线分隔的作者署名与内容计数），下方单列最近更新台账与无框年度创作脉络。 |
| 文章 | 有标签时 `lg` 起主列与无框发丝线标签侧栏约 `3:1`（间距 `lg:gap-x-10` 即 `40px`）；无标签时单列占满外框。                                                      |
| 笔记 | 单列无框档案索引流，外框内左对齐，不设占位侧栏；详情页直接落于细纹背景阅读。                                                                                  |
| 项目 | `sm` 起两列无边框网格，手机单列。                                                                                                                             |
| 友链 | 按加入时间先后排序并注明无优先级之分；默认展示与全站岩纹同源的横向分形石脉图（悬停矿晶节点渗墨并在下方原位预览，点击直达，下方配紧凑站点索引），支持一键切换为单列搜索列表与随机访问；申请说明限宽 `46rem`，申请入口为无框排版触发器。 |
| 关于 | 简介限宽 `46rem`；技术体系 `sm` 起三列无框分栏，手机单列；社交通道为无框文字链。                                                                              |

### 详情页宽度例外

- 文章详情保留 `max-w-5xl`（为右侧目录留出空间）；
- 笔记详情保留最大 `max-w-3xl` 居中单列阅读；不在共享 `<main>` 上强行锁死宽度。

## 列表、卡片与控件

- **去卡片、去按钮化（Admin 除外）**：公开页面不将普通内容区、列表项、页脚或标签包进带阴影的卡片盒，也不使用 B 端实色按钮或描边按钮框；主结构以留白、`1px` 发丝线（`border-hair`）与字体层级区隔，`PaperSurface` 仅保留给弹窗、顶栏悬停预览与菜单等真正悬浮在内容之上的浮层（`bg-popover`）。
- **列表行**：首页「最近更新」、文章列表、归档、笔记、友链与评论列表统一以 `1px` 发丝线分隔条目；标题与摘要组成主链接，分类与可点击标签保持独立链接，禁止嵌套链接。
- **项目条目交互**：项目条目不假设整条可点击，仅对真实源码/演示链接提供悬停反馈；未配目标地址的标题保持普通文本。
- **标签区分**：纯展示的项目技术栈使用 `#标签` 纯文本；可点击标签不套方块边框，统一使用排版文字与悬停墨线提示。
- **无框触发器**：顶栏搜索、`专注阅读`、友链申请、复制链接与表单提交等操作统一采用无框文字与线性图标排版，不使用高饱和胶囊或无依据的循环脉冲光点（如 `HeroLiveBadge` 复用实时 `presence` 快照展示真实工位状态）。
- **文章目录导轨**：桌面端右侧粘性目录（`w-56`）采用与全站岩石细纹同源的「青脉裂隙 · 墨沁石缝」画布导轨——按文章目录生成确定性微折主脉与 H3 收尖分叉支脉，松烟墨青随真实章节进度沿石缝渗染，当前章节区段与 H2 菱形矿晶高亮，入场裂开及跨章时轻散微尘、静置停机；隐藏原生滚动条并在溢出端施加 `18px` 渐隐遮罩。底部以 `1px` 发丝线连接无框文字操作栏（`专注 · 复制 · 评论` 与滚过 4% 淡入的 `↑ 顶部`）；专注阅读模式或无标题文章折叠目录后，切换为「横脉微纹 · 墨沁石脊」横向分形青脉与连续邻域 H2 矿晶热点，悬停或聚焦矿晶时在锁定高度的刊头原位叠化预览章名并支持点击直达。

## 搜索、筛选与动效

- **站内搜索**：文章列表搜索（`BlogSearch`）与全局 `⌘K` 命令检索（`CommandSearchModal`）均由服务端下发索引在内存完成过滤，输入即响应，切换来源不清空搜索词；详细行为见[站内搜索](docs/search.md)。
- **悬停墨迹微动效**：
  - 文本链与无框触发器（`.ink-link` / `.ink-line`）悬停或键盘聚焦时，底部 `1.5px` 主题色墨线从左向右生长展开（`280ms var(--ease-spring)`），箭头按方向轻柔位移（`→` / `↗` / `←`）。
  - 无框列表行（`.ink-row`）悬停或聚焦时，左侧 `2px` 竖向墨线展开并驱动内容轻柔右移着色，不使用灰色圆角悬浮底块。
  - `FilterLabel` 在悬停或键盘聚焦时从左向右展开底部细线（未选中 `45%` 透明，选中为完整主题色）；全站不使用第三方客户端动画库。
- **入场与视图过渡**：
  - 共享工具类 `entrance` 执行 `520ms` `var(--ease-spring)` 淡入与 `10px` 上移，仅在挂载时触发且结束后不残留 `transform`；键盘聚焦立即可见；
  - 路由视图过渡与常驻组件隔离规则见[组件约定](docs/components.md#页面切换视图过渡-view-transitions)。

## 空态、触控与无障碍

- 空态采用 `14px` 次要文字与 `32px` 上下留白，客观交代空原因并保留清除、来源切换或申请入口，不堆砌同义提示。
- **移动菜单与触控热区**：主要交互控件与移动菜单按钮通过自身尺寸（如 `size-11`）或 `.hit-expand` 透明热区扩展保障不低于 `44px` 的点击/触控面积，同时保持排印紧凑；全站交互元素具备清晰 `focus-visible` 轮廓。
- 移动菜单关闭态挂 `inert`，支持 `Escape` 关闭并将焦点交还触发按钮，路由切换自动收起。
- 全站尊重 `@media (prefers-reduced-motion: reduce)`，通过 `ink-glide` 与视图过渡媒体规则将位移与缩放收敛为即时或柔和的明暗/透明度反馈，保持静态轮廓与选中线。

## 验收基线

视觉与交互变更需覆盖浅色 / 深色双主题，核验 `320px`（零横向溢出）、`390px`、`768px`、`1024px`、`1440px` 视口，排查长标题与长 URL 换行、卡片与背景对比度、`FxToggle` 持久化及跨标签同步、`专注阅读` 降噪组合与 SPA 切换后 `--page-highlight` 恢复情况。
