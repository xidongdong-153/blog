# 状态与数据

## 没有状态库

项目没有 Redux / Zustand / Jotai 等状态库。表单和编辑器使用局部 React 状态；访客实时连接使用既有 Context provider。新增状态优先靠页面与组件边界组织。

## 数据获取模式

公开文章在请求时从数据库读取，笔记仍同步读取本地文件：

1. `src/lib/content.ts` 的异步文章查询通过 posts service 读取公开快照，React cache 只做当前 RSC 请求内去重。
2. RSC 直接 await 读取函数，不自调用 HTTP API。文章相关页面动态 SSR，发布不依赖构建。
3. 浏览器编辑和管理通过 `/api/admin/posts` 写入工作稿；公开快照只有发布操作才更新。

```tsx
// src/app/(site)/blog/page.tsx 的模式
const posts = await getAllBlogPosts()
```

规则：

- 内容业务在 posts service 实现；公开兼容入口在 `src/lib/content.ts`。组件不直接读文件或数据库。
- 页面进程内读 service；浏览器保存、导入、发布走 Hono API，管理页和端点分别鉴权。
- 首页实时活动不参与 MDX 内容读取；Blog 的只读 `/api/presence` 从独立 Mac Presence Service 取公开状态，协议与配置见[活动规范](./presence-guidelines.md)。
- 当前规模保留全量公开文章筛选；不加入跨请求内容缓存，避免撤回和更新失效延迟。
- 需要客户端交互的构建期内容（如站内搜索）由 RSC 通过 props 下发纯数据，client 侧在内存里过滤，同样不建 API route；索引只在浏览器里建一次，参考 `src/app/(site)/_components/blog/blog-search.tsx`。

## 日期数据约定

数据层日期一律存 ISO 字符串（`'2026-06-15'`），不存 `Date` 对象。原因：`Date` 跨 server/client 边界序列化会出问题，ISO 字符串稳定。渲染用 `formatDate()`（`src/lib/content.ts`），组件里不 `new Date()` 再自己格式化。

## 主题机制

主题使用 localStorage 持久化，支持 system / light / dark，存储键为 `theme`。机制由四部分组成，必须保持同步：

1. 根布局 `src/app/layout.tsx` 的内联脚本：进页面前先读 `localStorage.theme`，按 light / dark / system 分别 resolve，给 `<html>` 设置 `data-theme` 属性和根据计算结果加减 `.dark` 类。脚本必须在 body 之前执行，防止闪白。
2. `src/app/(site)/_components/site/theme-toggle.tsx`：位于页脚工具条，支持「明 · 系统 · 暗」直选切换，写回 `localStorage.theme` 与 `html.dataset.theme`，并监听系统色彩偏好变化。
3. `src/app/globals.css` 中的自定义变体（`theme-system`、`theme-light`、`theme-dark`）：三个图标的可见性直接由 CSS 选择器驱动，不走 React state，避免 hydration mismatch 与首帧闪烁。
4. Tailwind 的 `dark:` 变体：实际颜色样式的深浅差异全部由 `html.dark` 驱动。

改存储键或挂载属性时四处要同步。`suppressHydrationWarning` 只能放在 `<html>` 上（内联脚本会改这个元素）。

## 环境差异

本地博文默认使用 SQLite，生产使用 Turso，启动前先应用迁移；构建检查使用隔离数据库，不读取生产内容。笔记仍从 `content/notes/` 读取。评论配置见[组件规范](./component-guidelines.md)，活动上游配置见[活动规范](./presence-guidelines.md)。正式域名在 `src/site.config.ts` 的 `url` 中维护。
