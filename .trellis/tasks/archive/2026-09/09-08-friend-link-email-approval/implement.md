# 友链邮件一键审批实施规划 (implement.md)

## 实施清单与执行顺序

### 阶段 1：数据库 Schema 与迁移 (DB Layer)
- [x] 1.1 在 `src/server/infra/db/schema/links.ts` 中创建 `friendLinks` 表定义与 TypeScript 类型。
- [x] 1.2 在 `src/server/infra/db/schema/index.ts` 中聚合导出 `links` schema。
- [x] 1.3 运行 `pnpm db:generate` 生成 SQL 迁移文件至 `src/server/infra/db/migrations/`。
- [x] 1.4 运行 `pnpm db:migrate` 执行迁移并生成/更新本地数据库。
- [x] 1.5 运行 `pnpm db:verify` 验证数据库连通性。

### 阶段 2：邮件服务层样式改造 (Email Layer)
- [x] 2.1 改造 [src/lib/email.ts](file:///Users/wuwanzhu/Code/xdd/blog/src/lib/email.ts)：
  - `FriendApplyPayload` 新增可选参数 `reviewToken`。
  - 重写操作按钮区域：彻底废弃不可靠的 `display: flex; gap: 12px;`，改用嵌套表格与明确内边距/占位单元格，确保在各类客户端中按钮拥有固定水平间距。
  - 增加「通过并展示」（绿色）与「婉拒申请」（灰色）按钮，分别指向落地页 URL。
  - 更新纯文本备用内容，附带对应审批操作文本链接。

### 阶段 3：后端接口与 Hono 路由 (API Layer)
- [x] 3.1 改造 [src/server/routes/links.ts](file:///Users/wuwanzhu/Code/xdd/blog/src/server/routes/links.ts)：
  - `POST /apply`：生成 `reviewToken = crypto.randomUUID()`，将申请数据落库为 `status: 'pending'`，将带 token 的链接传递给邮件模板发送。
  - 新增 `GET /review`：根据 token 查询待审核申请信息，校验有效期并返回。
  - 新增 `POST /review`：接收 `{ token, action }`，安全校验后更新状态，调用 Next.js `revalidatePath('/links')` 刷新静态缓存，并作废 token。

### 阶段 4：确认落地页与前台展示改造 (UI Layer)
- [x] 4.1 新建 `src/app/(site)/links/review/page.tsx` 与相关交互组件：
  - 读取路由参数 `token` 与 `action`。
  - 服务端或客户端获取待审核详情，展示卡片并提供显式确认操作，彻底防范邮件服务商机器人预爬误触。
  - 完成操作后提供清晰的成功提示与跳转按钮。
- [x] 4.2 改造 [src/app/(site)/links/page.tsx](file:///Users/wuwanzhu/Code/xdd/blog/src/app/(site)/links/page.tsx)：
  - 查询数据库中 `status = 'approved'` 的记录。
  - 动态渲染友链卡片；在数据库为空或未配线上库时保持既有优雅占位设计。

### 阶段 5：质量门检查与功能验证 (Quality Gate)
- [x] 5.1 运行质量门三项命令：
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm format:check`
- [x] 5.2 验证构建与本地闭环：
  - `pnpm build`
  - 模拟提交申请 -> 检查落库 -> 模拟访问落地页审批 -> 检查前台展示。

---

## 关键风险与回滚方案

1. **数据库迁移**：
   - 风险：若已有本地 SQLite 结构冲突。
   - 回滚：本次迁移为全新独立表 `site_friend_links`，不影响 `system_health_checks`。若有异常直接删除新生成的 migration 文件即可还原。
2. **邮件客户端兼容性**：
   - 风险：部分老旧邮件客户端依然折行。
   - 预防：使用 `table` + `td align="center"` 结构包裹按钮，并在按钮之间放置带有固定宽度的透明间隔单元格，保证 100% 物理间距。
3. **接口缓存与静态重验证**：
   - 风险：Next.js App Router 缓存未刷新导致前台未及时显示。
   - 方案：在接口审核完成点调用 `revalidatePath('/links')` 明确清除该路由静态缓存。
