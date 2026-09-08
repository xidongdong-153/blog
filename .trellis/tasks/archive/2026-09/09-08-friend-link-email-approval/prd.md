# 友链邮件一键审批流程 PRD

## 目标与价值

为博客友链提供免后台的邮件一键审批工作流：
1. 访客在友链页提交申请后，数据落入 Turso 数据库并置为待审核状态。
2. 站长收到包含快捷操作按钮的通知邮件，直接在邮件中点击即可确认通过或拒绝。
3. 彻底优化邮件模板在各大邮件客户端（Gmail、Outlook、移动端邮件等）下的按钮排版与间距，消除按钮粘连问题。
4. 建立防预爬机制，防止邮件服务商或客户端的链接安全检测机器人误触发审核通过。
5. 审核通过后即时自动更新 `/links` 前台展示。

## 范围定义

### 包含在内 (In Scope)

- **数据库层**：
  - 在 `src/server/infra/db/schema/links.ts` 新增 `site_friend_links` 表定义。
  - 接入 `schema/index.ts` 并生成 Drizzle 迁移文件。
  - 支持字段：站点名、网址、描述、站长称呼、站长邮箱、头像链接、已添加本站标记、状态 (`pending` / `approved` / `rejected`)、审核令牌 (`reviewToken`)、令牌过期时间 (`tokenExpiresAt`)、排序权重与创建更新时间。
- **接口层 (Hono)**：
  - 改造 `POST /api/links/apply`：写入数据库并生成安全 `reviewToken`，随后触发邮件。
  - 新增 `GET /api/links/review`（查询待审信息供确认页展示）与 `POST /api/links/review`（执行审核状态变更、作废 Token 并触发 Next.js 页面缓存刷新）。
- **邮件服务层 (Resend)**：
  - 调整 [src/lib/email.ts](file:///Users/wuwanzhu/Code/xdd/blog/src/lib/email.ts) 模板：废弃不可靠的 `display: flex; gap: 12px;` 布局，改用跨客户端兼容的表格布局（`table` / `td` 内联间距），确保按钮有固定清晰的横向间距。
  - 邮件操作区提供明确层级：主操作「通过并展示」、辅操作「婉拒」、辅助链接「访问小站 ↗」与「回复邮件」。
- **页面与交互层**：
  - 新增轻量确认页 `src/app/(site)/links/review/page.tsx`：解析 URL 中的 token 与 action，展示待审核内容概览与显式确认操作，阻断机器人静默抓取。
  - 改造前台 `src/app/(site)/links/page.tsx`：由原来写死的空数组改为从数据库读取 `status = 'approved'` 的友链列表，未配置数据库或数据为空时维持优雅降级。

### 不包含在内 (Out of Scope)

- 管理员密码登录后台（本流程专门针对无后台场景）。
- 友链定时巡检与死链探测爬虫（保留表结构字段 `is_broken`，暂不实现自动探测定时任务）。
- 审核结果向访客自动回送邮件（暂只提供一键向访客发送邮件的 mailto 快捷方式，避免申请垃圾邮件耗尽 Resend 额度）。

## 验收标准 (Acceptance Criteria)

- [x] **AC-1 数据持久化**：运行 `pnpm db:generate` 与 `pnpm db:migrate` 成功在数据库中建立 `site_friend_links` 表，本地通过 `verify-db` 验证。
- [x] **AC-2 申请入库与邮件触发**：访客在 `/links` 提交申请后，数据库中产生一条 `status = 'pending'` 且带有有效 `reviewToken` 的记录；站长收到通知邮件。
- [x] **AC-3 邮件模板与按钮间距**：邮件 HTML 源代码中采用 `table` 单元格间距或可靠边距；在常见邮件客户端（及浏览器预览）中，操作按钮之间均具有不少于 12px 的可视间距，无折行拥挤或重叠粘连。
- [x] **AC-4 防机器人误触确认**：邮件点击链接到达 `/links/review` 页面，仅展示审核卡片与确认按钮；只有人工点击确认触发 POST 后，数据库记录才变为 `approved` 且 `reviewToken` 被清空。
- [x] **AC-5 幂等与防重放**：已失效或已审核过的 token 再次被访问时，页面提示“该申请已处理或链接已失效”，不会重复执行或报错。
- [x] **AC-6 页面联动与缓存刷新**：审核通过后，访问 `/links` 页面能立即看到新上线的小站卡片，展示信息（站点名、简介、链接、头像）完整。
- [x] **AC-7 质量门通过**：代码改动完成后依次通过 `pnpm typecheck`、`pnpm lint` 和 `pnpm format:check`。
