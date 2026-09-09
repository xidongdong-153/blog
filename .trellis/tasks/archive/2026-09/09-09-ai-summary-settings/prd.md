# 实现 AI 摘要模型配置

## Goal

提供一个只有站长账号能访问的精简 AI 设置页，用于配置博客摘要使用的协议、中转地址、模型和 API key，并在配置通过真实模型测试后允许摘要同步使用。

## Background

- 评论任务会接入 Better Auth，并用服务端 `ADMIN_EMAIL` 识别站长。
- 用户的自有中转服务支持 OpenAI Chat Completions、OpenAI Responses 和 Anthropic Messages。
- starter 提供了 AES-256-GCM 凭据加密、凭据掩码和配置变更后重新测试的参考实现，但本博客不需要其多 Provider、目录、白名单和调用审计系统。

## Requirements

1. 新增仅站长可访问的 AI 设置页和 Hono 管理接口；前端隐藏入口不代替服务端权限校验。
2. 首版只维护一条当前摘要模型配置，不支持多 Provider 列表或模型目录。
3. 配置字段包含协议、Base URL、模型 ID 和 API key；协议固定为 `openai-completions`、`openai-responses`、`anthropic-messages`。
4. API key 使用 AES-256-GCM 加密后存入数据库，每次保存使用随机 12 字节 IV；主密钥来自 `AI_CREDENTIAL_ENCRYPTION_KEY`，不得入库。
5. 读取接口只返回是否已配置和掩码，不返回密文、IV、认证 tag 或明文 key。
6. API key 留空表示保留现有凭据；显式清除需要二次确认，清除后配置不可启用。
7. 新建或修改协议、地址、模型或凭据后，配置状态变为待测试并停用。
8. 连接测试使用当前保存配置发起短文本生成；测试成功且配置版本未变化时才能启用。
9. Base URL 只接受没有用户名、密码、query 和 fragment 的 HTTP(S) URL；生产环境拒绝 loopback、私网、link-local 和云 metadata 地址。
10. 不在客户端响应、日志或测试错误中输出 API key、完整上游响应或摘要测试 prompt。
11. 页面提供加载、保存中、测试中、成功、失败、缺少加密主密钥和凭据已配置状态。

## Acceptance Criteria

- [x] 未登录和非站长账号无法读取页面内容或调用任何 AI 配置接口。
- [x] 站长能保存三种协议中的任一种、Base URL、模型 ID 和 API key。
- [x] 数据库不出现明文 API key；读取响应和浏览器状态只包含掩码。
- [x] 配置变更后不能直接用于摘要同步，测试成功后才可启用。
- [x] 三种协议均通过本地真实 HTTP 请求格式的集成测试，不只检查枚举值。
- [x] 认证失败、超时、上游错误和配置版本冲突返回安全且可区分的错误。
- [x] 页面在移动端和桌面端均可完成保存、测试和启用流程。

## Out of Scope

- 多 Provider、多模型目录、模型白名单、用户偏好和调用用量审计。
- OAuth 模型 provider、流式聊天和 Agent 配置。
- 在页面回显或导出 API key 明文。

## Dependencies

- 必须先完成 `09-09-social-comments` 中的 Better Auth 与站长身份校验。
