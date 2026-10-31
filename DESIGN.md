---
name: 喜东东小站
description: 个人技术沉淀和成长记录
colors:
  background-light: 'hsl(40 20% 97.5%)'
  foreground-light: 'hsl(30 8% 15%)'
  primary-light: 'hsl(215 85% 45%)'
  muted-light: 'hsl(40 14% 92%)'
  muted-foreground-light: 'hsl(30 6% 42%)'
  border-light: 'hsl(35 10% 86%)'
  background-dark: 'hsl(30 6% 8%)'
  foreground-dark: 'hsl(40 15% 90%)'
  primary-dark: 'hsl(215 75% 72%)'
  muted-dark: 'hsl(30 5% 15%)'
  muted-foreground-dark: 'hsl(35 8% 65%)'
  border-dark: 'hsl(30 5% 20%)'
  page-highlight: '#b4befe'
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
spacing:
  inline: '0.5rem'
  grid: '1rem'
  card: '1.25rem'
  header: '1.5rem'
  section-mobile: '2rem'
  section-desktop: '2.5rem'
---

# 设计规范

## 适用范围

本文件是公开页面视觉规则的主入口。主要约束文章、笔记、项目、友链、关于五个一级页面。组件边界和路径见[组件规范](.trellis/spec/frontend/component-guidelines.md)，功能状态见[功能状态表](.trellis/spec/frontend/feature-status.md)。

保留暖纸色背景、衬线标题、无衬线正文和少量等宽元信息。页面通过字号、留白和细分隔线建立层级。`//` 仅用于页面眉标或有用的内容分类，不在每张卡片重复页面名称，不在同一模块重复标题。

## 颜色

运行时颜色定义在 [globals.css](src/app/globals.css) 的 `:root` 与 `.dark`。上方元数据记录主要颜色；卡片、弹窗、代码块和错误状态使用同一文件中的对应语义 token。修改颜色时同步实际 token 与本文件，不另建色值配置。

- 页面使用 `background`，主要文字使用 `foreground`，说明、日期与标签使用 `muted-foreground`。
- 链接与选中状态使用 `primary`；容器使用 `border` 与 `card`，不增加大块强调色背景。
- 项目、笔记与系列状态允许语义色，并始终显示状态文字：浅色的绿、琥珀使用 700 档，暗色使用 400 档；待补充状态沿用 rose 600/400。普通文字对比度至少 4.5:1，大字至少 3:1。
- 重要操作和说明不叠加低透明度。浅色和暗色都需要核验，不能只看其中一种。
- `AmbientBackdrop` 的淡紫顶光是既有背景例外，不用于文字强调；保留其低透明度与渐隐。

## 字体与层级

字体加载在 [fonts.ts](src/app/fonts.ts)：Satoshi 为本地字体，Newsreader 通过 Next 字体加载器加载。Newsreader 配置为 latin 子集；中文使用系统回退字形，不宣称中文使用 Newsreader 或 Satoshi 字形。

| 用途               | 手机             | 桌面 | 字体与颜色                                              |
| ------------------ | ---------------- | ---- | ------------------------------------------------------- |
| 五页 H1            | 30px             | 36px | `font-serif font-medium tracking-tight text-foreground` |
| 大模块标题         | 24px             | 24px | 衬线、medium                                            |
| 文章与笔记条目标题 | 18px             | 20px | 衬线、medium                                            |
| 项目标题           | 20px             | 20px | 衬线、medium                                            |
| 关于简介、申请说明 | 16px / 28px 行高 | 同左 | 无衬线、正文色                                          |
| 页面说明、条目摘要 | 14px             | 14px | 无衬线、次要文字色                                      |
| 日期、状态、标签   | 12px             | 12px | 等宽                                                    |

连续文字不使用等宽字体。摘要最多两至三行；长标题自然换行，不为齐高截断关键标题。主要文字靠字号和字重区分，不把正文全部降为辅助文字。

## 容器与间距

- 五个一级页面外框统一 `mx-auto w-full max-w-5xl`，最大内容宽度为 1024px。
- `(site)/layout.tsx` 提供两侧 24px 安全留白。页面内不重复添加相同水平 padding。
- 窄阅读区在外框内左对齐，最大 `46rem`（736px），不再次居中。
- 页头品牌、页面 H1、页脚主要内容对齐同一条左边界。页头右侧为独立账号入口预留空间，胶囊背景可向外延伸，不改变内容边界。
- 五页标题使用 `PageHeader`：眉标、H1、说明依次排列，内部间距 8px，底部 24px 与一条细线。
- 标题区到内容、主要模块间隔：手机 32px，sm 起 40px。需要独立分节时使用上分隔线与 32px 内边距。
- 网格间隔 16px，文章双栏间隔 32px。卡片内边距 20px，项目和友链桌面为 24px。

| 页面 | 结构                                                                                         |
| ---- | -------------------------------------------------------------------------------------------- |
| 文章 | lg 起主列与标签侧栏约 3:1，间隔 32px；窄屏单列。搜索前后使用同一列结构，无标签也不扩展主列。 |
| 笔记 | 单列阅读区最大 736px；不添加占位侧栏。                                                       |
| 项目 | sm 起两列，手机单列。                                                                        |
| 友链 | sm 起两列站点；申请说明最大 736px，申请入口位于推荐站点标题旁。                              |
| 关于 | 简介最大 736px；技术栈 sm 起三列，手机单列；联系区域沿外框左对齐。                           |

### 既有页面例外

- 首页保持 `md:w-4/5 lg:w-5/6` 的宽布局。Section 标题在内容上方；Hero 背景可横向延展。首页的编号、对齐与动态背景不由本轮五页规则覆盖。
- 普通文章详情最大 `max-w-5xl`，专栏详情最大 `max-w-7xl`，分别为 TOC 和章节导航保留空间；不在公共 main 上强制 1024px。
- 笔记详情保留最大 `max-w-3xl` 的居中阅读布局。
- 详情页、首页 Hero 的特殊标题尺寸保留；这里的 H1 阶梯仅约束五个一级页面。

## 列表与卡片

- 文章和笔记使用底部分隔线，不给每条内容加卡片背景。标题与摘要组成主要链接，分类与文章标签保持独立链接，禁止嵌套链接。
- 项目卡片有源码和教程等多个目标，只在真实链接上显示交互反馈。未配置目标地址的项目标题保持普通文本，整卡不变色。
- 友链为单一目标，整卡可点击，支持边框与背景反馈。
- 纯展示技术标签使用 `#标签` 文本；文章标签用下划线、侧栏筛选标签用细边框表达可点击，不能让所有标签看起来都是按钮。
- 页面卡片 `rounded-lg`（8px），控件 `rounded-md`（6px），默认无阴影。头像、页头胶囊、弹窗和现有详情提示框是用途明确的例外，不做全站替换。

## 搜索与筛选

搜索和来源选项属于同一工具区，手机堆叠、sm 起同排。分类、排序和归档组成下一组，不为压缩高度隐藏已有功能。

文章分类使用无边框、无底色的等宽文字导航，分类间距 24px。选中项用正文色和名称下方的短下划线标记，数量保持次要文字色；保留至少 44px 点击高度与键盘焦点，不使用方框按钮或胶囊底色。

分类、排序和来源共用 `FilterLabel`：悬停或键盘聚焦时，细线在 220ms 内从左向右展开，未选中为 40% 透明度，选中为完整强调色；离开时收回。按下链接在 150ms 内下沉 1px，松开恢复。选中变化通过 transform 与 opacity 过渡，不改变布局、不添加客户端动画库。减少动态效果时关闭空间和时间过渡，保留静态选中线与焦点。

`BlogSearch` 接收来源、工具栏和侧栏槽位，保留 RSC 提供的内容。搜索只替换主列表，来源和标签侧栏常驻；分类、排序和分页在搜索态隐藏。React 位置和 key 保持稳定，切换来源不清空输入。完整行为见[站内搜索规范](.trellis/spec/frontend/search-guidelines.md)。

## 空态、触控与键盘

- 空态使用 14px 次要文字与 32px 上下留白；说明无内容或筛选无匹配，不重复堆放眉标、标题与同义提示。
- 搜索零结果保留清除和来源切换入口；友链空态保留申请入口。
- 主要控件和移动菜单按钮触控高度至少 44px，图标本身不必放大。
- 范围内交互元素提供可见 focus-visible 轮廓。移动菜单关闭时 inert，Escape 关闭并把焦点还给菜单按钮；路由切换关闭菜单。
- 不依赖 hover 或颜色传达唯一信息。沿用现有减少动画支持，不为五页统一新增动画库或进场动效。

## 验收

五页检查明暗主题与 390、768、1024、1440px，补查 320px 无横向溢出。核对标题位置、正文行宽、真实链接反馈、长标题与长 URL、空态与非空态。文章同时验证来源切换保留输入、搜索前后列宽稳定及分页 URL。共享页头页脚和 PostCard 改动后回归首页、详情、标签、归档和专栏。
