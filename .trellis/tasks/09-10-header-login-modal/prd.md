# 顶栏登录入口图标按钮与弹窗

## 目标

在全站顶部导航栏（SiteHeader）添加登录入口图标按钮与登录弹窗。站长在任何公开页面均可直接唤起登录，无需进入文章详情页评论区，登录后可快速进入管理设置与退出登录。

## 背景与现状

当前博客接入了 Better Auth 社交登录（GitHub / Google），但前端仅在文章详情页底部的评论卡片（`CommentAuthCard`）中提供了登录界面。站长在访问首页、博客列表、笔记或其他页面时，无法直接登录或访问站长配置（如 `/settings/ai`）。参考 `https://innei.in/` 的交互，顶栏常驻登录/用户图标按钮，未登录时点击弹窗登录，登录后展示身份与管理操作。

## 需求说明

### 1. 顶栏图标按钮（SiteHeader Action）
- 位置：位于 `SiteHeader` 右侧导航区，桌面端位于导航链接右侧，移动端位于汉堡菜单按钮左侧，保持全端常驻。
- 未登录状态：展示轻量用户/钥匙图标按钮，带明确的 `aria-label="登录"` 与悬浮提示。
- 已登录状态：展示用户头像（若有头像则显示图片，无图片则显示首字母或徽标）。点击展示用户菜单/浮层（包含当前用户名、邮箱、站长专属标识、管理快捷入口及退出登录操作）。

### 2. 快捷登录弹窗（Login Modal）
- 唤起方式：未登录状态下点击顶栏图标按钮触发。
- 弹窗结构：
  - 采用 Portal 挂载到根节点，具备遮罩背景与居中卡片。
  - 支持快捷键 ESC 退出与点击遮罩空白区域退出。
  - 具备 `role="dialog"`、`aria-modal="true"` 等无障碍属性。
- 登录选项：
  - 调用现有 `/api/config/auth` 接口动态获取已启用的 OAuth 提供商（GitHub / Google）。
  - 点击登录按钮后调用 Better Auth 的 `signIn.social`，回调地址（callbackURL）使用当前页面 URL（`window.location.href`）。
  - 显示正在连接中的加载态与异常错误信息。

### 3. 用户与站长操作菜单（User / Admin Popover or Modal）
- 唤起方式：已登录状态下点击顶栏头像/图标按钮。
- 内容展示：
  - 当前用户昵称与邮箱。
  - 若为站长（邮箱匹配 `ADMIN_EMAIL` 或接口返回 `isOwner: true`），展示「作者/站长」徽章及站长专属入口（如 AI 摘要配置 `/settings/ai`）。
  - 退出登录按钮，点击后调用 `signOut()` 清理会话，顶栏恢复未登录图标状态。

## 约束条件

1. 代码边界：
   - 顶部导航逻辑在 `src/app/(site)/_components/site/site-header.tsx`。
   - 新建组件置于 `src/app/(site)/_components/site/`（如 `auth-modal.tsx`、`header-auth.tsx` 等），不引入重复的第三方重型 UI 库，使用原生 React Portal + Tailwind CSS。
2. 样式规范：
   - 使用项目已有的语义 token（`bg-background`、`border-border`、`text-foreground` 等），适配深色与浅色模式。
   - 动效与现有的模态框保持一致（淡入与微缩入场，尊重 `motion-reduce`）。
3. 文案与规范：
   - 无 emoji，符合 `xdd-plain-docs` 规范。
   - 日期与文本遵守全站一致规范。

## 验收标准

- [x] 全站各页面（首页、博客列表、文章详情、笔记、关于等）顶栏右侧均展示登录图标按钮。
- [x] 未登录点击按钮，平滑弹出登录弹窗。
- [x] 弹窗内展示当前开启的登录提供商（GitHub / Google），点击可跳转登录。
- [x] 登录成功返回当前页面后，顶栏按钮自动更新为登录用户头像/标识。
- [x] 已登录点击头像，可展开用户菜单，展示用户信息、站长入口（若为站长）与退出登录。
- [x] 点击退出登录后会话正常清除，顶栏恢复未登录图标。
- [x] 键盘 ESC 与点击遮罩可正常关闭弹窗和浮层菜单。
- [x] 依次通过 `pnpm typecheck`、`pnpm lint`、`pnpm format:check` 质量检查。
