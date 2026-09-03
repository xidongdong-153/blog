# TOC 阅读进度与交互技术方案

## 架构与组件划分

目录功能由三个组件协同完成：

1. `TableOfContents`（客户端组件）：挂载在文章详情页，包含滚动帧监听、进度计算、互斥锁、侧栏定位和抽屉展示。
2. `TableOfContentsItem`：递归渲染目录项，包含左侧阅读进度条容器与动态高度节点。
3. `FloatingActionGroup`（客户端组件）：页面右下角浮动按钮组，包含移动端目录唤出按钮和返回顶部按钮。

```mermaid
flowchart TD
    subgraph Page["文章详情页 (/blog/[slug])"]
        Article["article#content 正文区"]
        DesktopAside["aside.desktop 桌面侧边栏 (sticky)"]
        MobileDrawer["TOCDrawer 移动端抽屉 (fixed)"]
        FloatingBtn["FloatingActionGroup 浮动操作组"]
    end

    DesktopAside --> TOC["TableOfContents 组件"]
    MobileDrawer --> TOC
    FloatingBtn -->|"触发切换"| MobileDrawer
    TOC -->|"读取标题位置与滚动偏移"| Article
```

## 数据流与事件驱动

使用 `requestAnimationFrame` 驱动滚动监听，避免原生 `scroll` 事件高频阻塞主线程。

```mermaid
sequenceDiagram
    participant User as 用户
    participant Window as 浏览器视口
    participant TOC as TOC 控制逻辑
    participant DOM as 侧栏与进度条节点

    User->>Window: 页面滚动 (scroll)
    Window->>TOC: scheduleUpdate (RAF 防抖)
    TOC->>TOC: 计算各标题区间相对视口进度 (0% - 90%)
    TOC->>DOM: 更新进度条高度、高亮样式与已读标记
    opt 标题超出侧栏上下各 56px 且未加锁
        TOC->>DOM: 侧边栏容器 smooth scrollTo
    end
```

## 点击平滑跳转与互斥保护状态机

用户点击目录项时，通过互斥锁 `suppressFollow` 抑制滚动中间状态对 TOC 侧栏的干扰。

```mermaid
stateDiagram-v2
    [*] --> Idle: 正常阅读跟随状态
    Idle --> Clicking: 点击目录项链接
    Clicking --> MutexLocked: 立即高亮目标项并设置 suppressFollow = true
    MutexLocked --> MutexLocked: 页面平滑滚动中（不触发中间项跟随）
    MutexLocked --> Idle: 目标标题到达顶部 (差值 <= 150px)
    MutexLocked --> Idle: 用户主动滚轮/触屏/按键打断
```

## 阅读进度计算公式

对于标题序列中下标为 $i$ 的标题 $H_i$，其下一个标题为 $H_{i+1}$（若为最后章节，则取文章底部偏移）：

1. 基准偏移：`pageOffset = window.scrollY - contentElement.offsetTop`
2. 章节顶部相对视口：`sectionTop = H_i.offsetTop - pageOffset`
3. 章节底部相对视口：`sectionBottom = H_{i+1}.offsetTop - pageOffset - H_i.offsetHeight`
4. 进度比例：`progress = (windowHeight - sectionTop) / (sectionBottom - sectionTop)`，截取区间 $[0, 1]$
5. 可视判定：`inView = sectionTop < windowHeight && sectionBottom > 0`
6. 进度条高度：`height = progress * 90%`
7. 已读判定：`!inView && progress === 1`
