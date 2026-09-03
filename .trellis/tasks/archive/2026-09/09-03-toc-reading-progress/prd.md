# 复刻 Joye 博客 TOC 阅读进度

## Goal

将 XDD 博客的 TOC 组件从当前的基础 IntersectionObserver 高亮升级为 Joye 博客的完整 TOC 体验：阅读进度条、章节进度指示、移动端抽屉面板、滚动联动平滑跳转和点击互斥保护。

## Background

当前 XDD 博客 TOC 状态：
- 桌面端右侧粘性侧栏（`sticky top-20 basis-64`）
- IntersectionObserver 实现滚动高亮（当前章节 `text-primary`）
- 左侧边框线（`border-l border-border`）
- 移动端隐藏（`hidden lg:block`）

Joye 博客 TOC 的完整能力（本次要对齐的）：
- 每个目录项左侧 2px 阅读进度指示条，高度按进度 0-90% 动态变化
- 章节在视口内时高亮链接文字和半透明背景
- 离开视口且进度 100% 时指示条变为半透明已读状态
- `requestAnimationFrame` 驱动的滚动联动，不依赖 IntersectionObserver
- 侧栏自动跟随：高亮项超出侧栏可视区 56px 时平滑滚入
- 点击目录项平滑跳转 + 互斥保护（防止跳转中 TOC 再次联动）
- 折叠/展开（`<details>` + chevron 旋转动画）
- 移动端：右下角浮动按钮唤出右侧滑入抽屉面板 + 遮罩层

## Requirements

### R1: 阅读进度指示条

- 每个目录项左侧渲染 2px 宽的进度条
- 进度条高度按当前章节的阅读进度动态变化（0% ~ 90%）
- 进度计算方式：`(windowHeight - sectionTop) / (sectionBottom - sectionTop)`
- 章节范围：从当前标题的 offsetTop 到下一个标题的 offsetTop（最后一个章节到文章底部）
- 章节在视口内时进度条颜色为 `primary`
- 章节已读离开视口时进度条颜色变为 `primary / 0.3`（半透明）

### R2: 章节高亮

- 章节在视口内时，对应的目录链接文字变为 `primary` 色
- 同时给链接添加半透明背景色（`primary / 0.06`）+ 圆角 + padding

### R3: 滚动联动

- 使用 `requestAnimationFrame` 驱动，`scroll` 和 `resize` 事件触发更新
- 不再使用 IntersectionObserver（替换当前实现）
- 侧栏自动跟随：高亮项偏离侧栏可视区域上下 56px 时，侧栏平滑滚到让高亮项可见

### R4: 点击跳转与互斥保护

- 点击目录链接时 `scrollIntoView({ behavior: 'smooth', block: 'start' })`
- 点击时设置 `suppressFollow = true`，避免跳转过程中侧栏联动
- 释放条件：到达目标标题（距离 <= 150px）或用户主动交互（wheel / touchstart / keydown）

### R5: 折叠/展开

- 目录标题区域可折叠/展开（可用 `<details>` 或自定义状态）
- 折叠时 chevron 图标旋转 -90 度

### R6: 移动端 TOC 抽屉

- 移动端（< lg 断点）TOC 默认隐藏
- 页面右下角浮动按钮，点击后 TOC 从右侧滑入
- 遮罩层覆盖页面内容，点击遮罩关闭 TOC
- 打开/关闭带 slide 动画（300ms / 200ms）

## Out of Scope

- Hero 图模糊背景层和主色氛围渐变（已有独立任务或后续处理）
- 代码块高亮（独立任务）
- 阅读时间估算（独立任务）

## Acceptance Criteria

- [ ] 桌面端 TOC 侧栏展示阅读进度指示条，滚动时进度条高度实时变化
- [ ] 当前章节高亮为 primary 色并带半透明背景
- [ ] 已读完章节的进度条变为半透明
- [ ] 点击目录项平滑跳转到对应标题，跳转中 TOC 不产生闪跳
- [ ] TOC 可折叠/展开，带 chevron 旋转动画
- [ ] 移动端浮动按钮可打开 TOC 抽屉，遮罩点击可关闭
- [ ] `pnpm typecheck`、`pnpm lint`、`pnpm format:check` 全部通过
- [ ] `prefers-reduced-motion: reduce` 时关闭动画
