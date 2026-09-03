# 状态与数据

## 没有状态库

项目没有客户端状态库、没有 Context provider、没有全局 store，这是有意为之：纯静态内容站，页面间无共享客户端状态。不要引入 Redux / Zustand / Jotai 这类依赖。

## 数据获取模式

数据在构建期从文件系统读取，不走网络：

1. `src/lib/content.ts` 用 `node:fs` 同步读 `content/` 下的 MDX，解析 frontmatter、校验、排序，返回纯数据对象。
2. RSC 页面直接调用这些函数，同步拿到数据渲染。

```tsx
// src/app/(site)/blog/page.tsx 的模式
const posts = getAllBlogPosts().filter((post) => !post.draft)
```

规则：

- 新内容需求在 `src/lib/content.ts` 加函数，不在组件里直接 `fs.readFileSync`。
- 不写 API route 再自己 fetch——没有后端，构建期数据不需要绕网络。
- 每次读全量再过滤是这个规模的正确做法，不做缓存层。

## 日期数据约定

数据层日期一律存 ISO 字符串（`'2026-06-15'`），不存 `Date` 对象。原因：`Date` 跨 server/client 边界序列化会出问题，ISO 字符串稳定。渲染用 `formatDate()`（`src/lib/content.ts`），组件里不 `new Date()` 再自己格式化。

## 主题机制

唯一的持久化客户端状态是主题，实现由三部分组成，约定了存储键 `theme`：

1. 根布局 `src/app/layout.tsx` 的内联脚本：进页面前先读 `localStorage.theme`，没有再跟系统偏好，给 `<html>` 挂 `.dark`。脚本必须在 body 之前执行，防白闪。
2. `src/app/(site)/_components/site/theme-toggle.tsx`：点击切换 `.dark` 类并写回 `localStorage.theme`。
3. Tailwind 的 `dark:` 变体：样式差异全部靠它，没有第二套主题机制。

改存储键或挂载类名时三处要同步。`suppressHydrationWarning` 只能放在 `<html>` 上（内联脚本会改这个元素）。

## 环境差异

本地开发和构建读同一份 `content/`，没有环境变量。`src/site.config.ts` 的 `url` 只在 RSS / sitemap / OG 图生成链接时用（未实现），部署前要换成正式域名。
