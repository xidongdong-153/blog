# 类型安全

## 基线

- `tsconfig.json`：`strict: true`，不放松任何 strict 选项。
- 路径别名 `@/*` 指向仓库根，import 一律用别名（`@/lib/content`），不用相对路径跳出 `app/` 目录层级（`_components` 内部互相引用可以用相对路径，如 `../../_components/blog/mdx-content`）。
- ESLint 里 `@typescript-eslint/no-explicit-any` 是 `error`，不许写 `any`；非空断言 `!` 允许使用。

## 类型定义位置

类型就近定义，跟着它描述的数据走，不建 `types/` 目录：

- `BlogPost`、`Note`、`NoteStatus`、`Heading`、`NOTE_STATUS_LABELS` 全在 `lib/content.ts`，和数据读取函数放一起。
- 页面 props 用 interface 定义在页面文件里（`BlogPostPageProps`）。
- 配置类型从值推导：`site.config.ts` 用 `as const` + `export type SiteConfig = typeof siteConfig`，改配置不用同步改类型。

## 字面量联合当枚举

不用 TypeScript `enum`，用字面量联合类型：

```ts
export type NoteStatus = 'in-progress' | 'incomplete' | 'ready' | 'archived'
```

状态到显示文案的映射用 `Record<NoteStatus, string>`（`NOTE_STATUS_LABELS`），key 和联合类型对齐，编译期就能查漏。

## 日期

数据层日期是 ISO 字符串（`string` 类型，注释标明格式如 `2026-06-15`），不是 `Date`。frontmatter 里 YAML 裸日期被 gray-matter 解析成 `Date` 的情况在 `lib/content.ts` 的 `readDate` 里统一转字符串。渲染统一走 `formatDate`。

## 运行时校验

frontmatter 是外部输入，读取时逐字段校验，`lib/content.ts` 的模式：

- `requireString`：必填字符串，缺失或空白抛错，错误信息带文件路径。
- `readDate`：接受 `Date` 或字符串，都转 ISO 字符串，非法抛错。
- `readTags`：数组里只留 string，其余丢弃。
- `status` 校验用字面量联合收窄，不在数组里 `includes` 后直接断言。

错误信息格式：`${filePath} 的 frontmatter 缺少必填字段 ${field}`，构建时直接失败，错误能定位到文件。

## 边界上的类型

- `gray-matter` 返回的 `data` 是 `Record<string, unknown>`，只在数据层消费一次并收窄，不把 `unknown` 传出去。
- 组件拿到的都是已收窄的强类型（`BlogPost` / `Note`），不做二次断言。
