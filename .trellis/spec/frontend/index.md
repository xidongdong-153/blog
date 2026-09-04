# 前端开发规范

> 本目录记录 blog 项目当前的真实约定。写代码前先读相关文件，规范描述的是现状，不是理想状态。

## 技术栈

Next.js 16（App Router）+ React 19 + TypeScript strict + Tailwind CSS 4 + MDX。无数据库、无后端、无状态库、无测试框架，部署在自有服务器上，由 GitHub Actions 完成检查和发布；`xdd-blog.service` 监听 `127.0.0.1:4400`。

## 规范索引

| 文件 | 内容 |
| ---- | ---- |
| [目录结构](./directory-structure.md) | 路由、组件分组、数据层、内容文件的位置规则 |
| [组件规范](./component-guidelines.md) | RSC / client 划分、props、Tailwind 用法、占位页约定 |
| [状态与数据](./state-management.md) | 主题机制、内容读取模式、为什么没有状态库 |
| [类型安全](./type-safety.md) | 类型定义位置、日期存 ISO 字符串、禁 any |
| [质量规范](./quality-guidelines.md) | 检查命令、lint / format 关键规则、功能状态表维护 |
| [部署规范](./deployment-guidelines.md) | GitHub Actions、SSH、服务器和 systemd 的发布契约 |

本项目没有自定义 hook，无 hook 规范文件；唯一的 client 组件是 `src/app/(site)/_components/site/theme-toggle.tsx`。

## 开发前检查清单

- [ ] 改的是公开页面 → 只在 `src/app/(site)/` 下动，页面私有组件放同级 `_components/` 对应分组
- [ ] 涉及内容读取 → 全部走 `src/lib/content.ts`，不在组件里直接读文件
- [ ] 实现未开始的功能 → 先查 README「功能状态」表，实现后把状态改成「已实现」并删占位代码
- [ ] 涉及流程或数据流的改动（设计文档、spec）→ 用 Mermaid 暗色主题出图，先读 mermaid-skill 技能

## 质量检查

```bash
pnpm typecheck     # next typegen && tsc --noEmit
pnpm lint          # eslint .
pnpm format:check  # prettier --check .
pnpm build         # 改动页面或数据层后跑
```

三条检查全过才算完成，顺序：类型 → lint → format。
