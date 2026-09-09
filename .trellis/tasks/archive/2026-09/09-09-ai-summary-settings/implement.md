# AI 摘要模型配置实施计划

## 实施清单

- [x] 1. 安装 `ai`、`@ai-sdk/openai`、`@ai-sdk/anthropic` 和 `zod`，锁定相互兼容版本。
- [x] 2. 新增 AI 配置 schema 与 migration，字段覆盖单配置、AES-GCM 密文、掩码、状态和 revision。
- [x] 3. 实现加密模块：32 字节 base64 主密钥校验、随机 IV、加解密、掩码与错误类型。
- [x] 4. 实现 Base URL 校验和受限 fetch，覆盖私网地址、重定向、超时和响应大小。
- [x] 5. 实现三协议 model factory 与统一 `generateText` 结果、超时和错误分类。
- [x] 6. 实现 AI 配置 service：读取、安全 DTO、保存保留旧 key、清除、revision 和测试后启用。
- [x] 7. 实现 Hono 管理 API，复用 Better Auth 站长校验。
- [x] 8. 实现 `/settings/ai` 服务端权限边界和设置表单，加入站长专属入口。
- [x] 9. 更新 `.env.example`，只新增 `AI_CREDENTIAL_ENCRYPTION_KEY`；中转地址、模型和 API key 由页面配置。
- [x] 10. 更新后端 API、数据库、服务调用规范和功能状态表。

## 自动化验证

```bash
node --test src/server/infra/ai/credential-crypto.test.ts
node --test src/server/infra/ai/summary-model.test.ts
node --test src/server/services/ai-summary-config.test.ts
node --test src/server/routes/ai.test.ts
pnpm typecheck
pnpm lint
pnpm format:check
pnpm db:generate
pnpm db:check
pnpm db:migrate
pnpm db:verify
pnpm build
```

三协议测试必须启动本地 HTTP server 并断言实际 path、认证 header、请求 body、文本结果与 finish reason。加密测试必须断言随机 IV、密文不含明文、错误 key 解密失败和接口 DTO 无密文字段。

## 浏览器验收

- 未登录和普通登录用户访问 `/settings/ai` 得到 404，管理 API 分别返回 401/403。
- 站长能保存三种协议配置，刷新后只看到掩码。
- 保存后状态为待测试；测试成功自动启用；测试失败仍不可用于摘要同步。
- 桌面与移动端检查协议选择、长 Base URL、长模型 ID、错误、loading、disabled 和确认 dialog。
- 完成 UI 后运行 Impeccable detector，并用浏览器截图检查亮色、暗色和窄屏。

## 风险与回滚点

- 凭据 schema 和加密格式合并后不再重写；发现问题时停止读取并要求重新录入，不打印密文排错。
- URL guard 未通过安全测试前不允许连接测试接口访问用户配置地址。
- 设置页可独立回滚，配置表和密文保留。
