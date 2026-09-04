# Impeccable 设计系统配置

## Goal

在 blog 项目完成 Impeccable 的落地配置，使其成为日常 UI 开发的设计质量工具。前置工作已完成：安装（`npx impeccable install`）和 init（`PRODUCT.md`）。本任务处理剩余的配置和第一次实际使用。

## Background

- Impeccable 已安装到 `.agent/skills/impeccable/` 和 `.agents/skills/impeccable/`
- `PRODUCT.md` 已通过 init 面谈创建
- `DESIGN.md` 不存在，项目的设计系统（颜色 token、字体、组件模式）仅存在于代码中
- detector 扫描发现 1 个反模式：`callout.tsx:L122` 的 `border-l-4`（side-tab AI slop）
- `.gitignore` 未包含 `.impeccable/` 目录

## Requirements

### R1: 生成 DESIGN.md

运行 `/impeccable document`，从现有代码中提取设计系统并生成 [DESIGN.md](file:///Users/wuwanzhu/Code/xdd/blog/DESIGN.md)（Google Stitch 格式）。内容来源：

- 颜色 token：[globals.css](file:///Users/wuwanzhu/Code/xdd/blog/src/app/globals.css) 中的 `:root` 和 `.dark` CSS 变量
- 字体：Satoshi（[fonts.ts](file:///Users/wuwanzhu/Code/xdd/blog/src/app/fonts.ts)）
- 组件模式：Section、EntryListItem、LinkCard、Hero、SkillList、SiteStats
- 间距和圆角规则

### R2: 修复 detector 反模式

修复 [callout.tsx:L122](file:///Users/wuwanzhu/Code/xdd/blog/src/app/(site)/_components/blog/callout.tsx#L122) 的 `border-l-4` side-tab 反模式。方案：将 Callout 改造为全包围边框（`rounded-xl border ${config.border} ${config.bg}`），彻底消除单侧粗边框 AI slop 反模式，同时保持与全站卡片规范高度统一。

### R3: 配置 .gitignore

将 `.impeccable/` 加入 `.gitignore`，该目录包含 Impeccable 的本地配置和运行时文件。

### R4: 配置 .prettierignore

将 `PRODUCT.md` 和 `DESIGN.md` 加入 `.prettierignore`。这两个文件由 Impeccable 生成和管理，格式有自己的约定。

## Acceptance Criteria

- [x] `DESIGN.md` 存在于项目根目录，记录了现有的颜色 token、字体、组件模式
- [x] `callout.tsx` 不再使用 `border-l-4`，detector 扫描零 warning
- [x] `.gitignore` 包含 `.impeccable/`
- [x] `pnpm typecheck` 通过
- [x] `pnpm lint` 通过
- [x] `pnpm format:check` 通过
- [x] `node .agent/skills/impeccable/scripts/detect.mjs --json src/` 退出码为 0

## Out of Scope

- 对首页或其他页面做 polish 或 critique 改造（后续单独任务）
- 配置 Impeccable design hooks（自动检测钩子）
- 配置 live mode
- 修改 PRODUCT.md 内容
