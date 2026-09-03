# Giscus 评论系统接入技术设计

## 1. 架构与边界

Giscus 评论系统基于 GitHub Discussions，前端以客户端只读/可交互 iframe 形式嵌入文章详情页底端。

```mermaid
flowchart TD
    subgraph Env["环境变量与配置 (.env.local)"]
        Repo["NEXT_PUBLIC_GISCUS_REPO"]
        RepoId["NEXT_PUBLIC_GISCUS_REPO_ID"]
        Category["NEXT_PUBLIC_GISCUS_CATEGORY"]
        CatId["NEXT_PUBLIC_GISCUS_CATEGORY_ID"]
    end

    subgraph BlogPage["文章详情页 (/blog/[slug])"]
        Article["<article> 正文与元信息"]
        GiscusContainer["<GiscusComments />"]
    end

    subgraph Runtime["运行时状态机与主题监听"]
        CheckConfig{"配置是否完整？"}
        GuideCard["渲染配置指引卡片"]
        LoadIframe["动态注入并挂载 Giscus 容器"]
        ThemeObserver["MutationObserver (html.dark / data-theme)"]
        PostMsg["iframe.contentWindow.postMessage (setConfig theme)"]
    end

    subgraph GitHub["GitHub 服务端"]
        GiscusIframe["Giscus App (https://giscus.app)"]
        Discussions["GitHub Discussions API"]
    end

    Repo & RepoId & Category & CatId --> GiscusContainer
    Article --> GiscusContainer
    GiscusContainer --> CheckConfig
    CheckConfig -- 否 --> GuideCard
    CheckConfig -- 是 --> LoadIframe
    LoadIframe --> GiscusIframe
    GiscusIframe <--> Discussions
    ThemeObserver --> PostMsg
    PostMsg --> GiscusIframe
```

## 2. 主题联动数据流

当用户点击页头的 `ThemeToggle` 组件切换主题时，全站根节点 `document.documentElement` 会更新 `data-theme` 属性并切换 `dark` class。评论组件无需销毁并重新初始化 iframe，直接通过 `postMessage` 向 Giscus 发送主题更新指令。

```mermaid
sequenceDiagram
    participant User as 用户
    participant Toggle as ThemeToggle
    participant HTML as document.documentElement
    participant Observer as MutationObserver
    participant Component as GiscusComments
    participant Iframe as Giscus iframe

    User->>Toggle: 点击切换主题 (如 light -> dark)
    Toggle->>HTML: 更新 class 'dark' 与 dataset.theme
    HTML-->>Observer: 触发属性变更回调
    Observer->>Component: 检测到主题变化
    Component->>Component: 计算映射后的 Giscus 主题 (light / dark)
    Component->>Iframe: postMessage({ giscus: { setConfig: { theme } } }, 'https://giscus.app')
    Iframe->>Iframe: 内部样式热替换，无刷新变色
```

## 3. 配置解析与降级

### 3.1 核心字段清单

| 环境变量名 | 作用 | 缺省值 / 示例 | 必填 |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_GISCUS_REPO` | GitHub 仓库路径 | 无（例如 `owner/repo`） | 是 |
| `NEXT_PUBLIC_GISCUS_REPO_ID` | GitHub GraphQL 仓库 ID | 无（从 giscus.app 生成） | 是 |
| `NEXT_PUBLIC_GISCUS_CATEGORY` | Discussion 讨论分类名 | `Announcements` | 是 |
| `NEXT_PUBLIC_GISCUS_CATEGORY_ID` | Discussion 讨论分类 ID | 无（从 giscus.app 生成） | 是 |
| `NEXT_PUBLIC_GISCUS_MAPPING` | 文章与讨论映射规则 | `pathname` | 否 |
| `NEXT_PUBLIC_GISCUS_REACTIONS_ENABLED` | 是否开启表情反馈 | `1` | 否 |
| `NEXT_PUBLIC_GISCUS_INPUT_POSITION` | 输入框置顶或置底 | `top` | 否 |
| `NEXT_PUBLIC_GISCUS_LANG` | 界面语言 | `zh-CN` | 否 |

### 3.2 降级机制

若 `NEXT_PUBLIC_GISCUS_REPO`、`NEXT_PUBLIC_GISCUS_REPO_ID` 或 `NEXT_PUBLIC_GISCUS_CATEGORY_ID` 中任一缺失：
- 渲染配置引导面板（提示用户当前未检测到 Giscus 环境变量，并列出 `.env.example` 对应字段）。
- 面板采用灰色半透明卡片样式，符合 Catppuccin / Tailwind 配色规范。
- 绝不抛出运行时异常，避免页面崩溃。

## 4. 安全性与性能

1. **按需与懒加载**：使用 `loading="lazy"` 属性，并且通过 `IntersectionObserver` 或视口按需初始化，避免在首屏阻塞正文阅读。
2. **通信跨域安全**：`postMessage` 通信时，目标源严格限制为 `'https://giscus.app'`，拒绝使用 `'*'`。
3. **零外部 npm 依赖**：使用原生动态脚本加载或封装为客户端 React 组件，不额外引入外部库，降低构建体积与维护成本。
