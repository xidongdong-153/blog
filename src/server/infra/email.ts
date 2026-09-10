import { siteConfig } from '@/site.config'

/**
 * 友链申请提交数据载荷
 */
export interface FriendApplyPayload {
  nickname: string
  siteName: string
  siteUrl: string
  email: string
  avatarUrl?: string
  description: string
  hasAddedUs: boolean
  reviewToken?: string
}

/**
 * 邮件投递结果
 */
export interface EmailSendResult {
  success: boolean
  mocked?: boolean
  error?: string
}

/**
 * HTML 转义，防止在邮件模板中注入恶意脚本
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * 格式化邮件展示的当前时间（UTC+8）
 */
function formatEmailTime(): string {
  const now = new Date()
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }
  return new Intl.DateTimeFormat('zh-CN', options).format(now)
}

/**
 * 渲染全站出版物风格的内联 HTML 邮件模板
 */
export function renderFriendApplyEmail(payload: FriendApplyPayload): string {
  const safeNickname = escapeHtml(payload.nickname.trim())
  const safeSiteName = escapeHtml(payload.siteName.trim())
  const safeSiteUrl = escapeHtml(payload.siteUrl.trim())
  const safeEmail = escapeHtml(payload.email.trim())
  const safeAvatarUrl = payload.avatarUrl ? escapeHtml(payload.avatarUrl.trim()) : ''
  const safeDescription = escapeHtml(payload.description.trim())
  const safeTime = formatEmailTime()

  const approveUrl = payload.reviewToken
    ? `${siteConfig.url}/links/review?token=${encodeURIComponent(payload.reviewToken)}&action=approve`
    : ''
  const rejectUrl = payload.reviewToken
    ? `${siteConfig.url}/links/review?token=${encodeURIComponent(payload.reviewToken)}&action=reject`
    : ''

  const addedStatusHtml = payload.hasAddedUs
    ? '<span style="color: #15803d; font-weight: 500;">已在对方站点添加本站</span>'
    : '<span style="color: #71717a;">未确认或暂未添加</span>'

  const avatarPreviewHtml = safeAvatarUrl
    ? `<div style="display: flex; align-items: center; gap: 8px;">
         <img src="${safeAvatarUrl}" alt="${safeSiteName}" width="28" height="28" style="width: 28px; height: 28px; border-radius: 4px; border: 1px solid #e5e5e0; object-fit: cover; display: inline-block; vertical-align: middle;" />
         <a href="${safeAvatarUrl}" target="_blank" rel="noopener noreferrer" style="font-family: ui-monospace, Menlo, monospace; font-size: 11px; color: #71717a; text-decoration: none; word-break: break-all;">${safeAvatarUrl}</a>
       </div>`
    : '<span style="color: #a1a1aa; font-family: ui-monospace, Menlo, monospace; font-size: 12px;">(未提供)</span>'

  const reviewActionsHtml = payload.reviewToken
    ? `<!-- 第一行：一键审批操作 -->
       <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
         <tr>
           <td style="border-radius: 6px; background-color: #16a34a; text-align: center;">
             <a href="${approveUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 10px 18px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px; letter-spacing: 0.02em;">
               通过并展示
             </a>
           </td>
           <td style="width: 14px; min-width: 14px;"></td>
           <td style="border-radius: 6px; background-color: #f4f4f5; border: 1px solid #e4e4e7; text-align: center;">
             <a href="${rejectUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 10px 18px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 500; color: #52525b; text-decoration: none; border-radius: 6px;">
               婉拒申请
             </a>
           </td>
         </tr>
       </table>`
    : ''

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>来自 ${safeSiteName} 的友链申请</title>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #f7f7f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #18181b; line-height: 1.5; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e5e0; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);">
    <!-- 顶部眉标与标题 -->
    <tr>
      <td style="padding: 28px 28px 20px 28px; border-bottom: 1px solid #f0f0ed;">
        <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 11px; letter-spacing: 0.06em; color: #71717a; text-transform: uppercase; margin-bottom: 6px;">
          // 友链申请 · NEW_FRIEND_LINK_REQUEST
        </div>
        <h1 style="font-family: 'Newsreader', Georgia, 'Times New Roman', serif; font-size: 24px; font-weight: 500; color: #18181b; margin: 0 0 6px 0; line-height: 1.3;">
          来自「${safeSiteName}」的互换申请
        </h1>
        <p style="margin: 0; font-size: 13px; color: #71717a; line-height: 1.5;">
          访客已在 ${siteConfig.title} 的友链页面提交了互换信息，详情如下：
        </p>
      </td>
    </tr>

    <!-- 字段明细表格 -->
    <tr>
      <td style="padding: 24px 28px 16px 28px;">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="font-size: 13px;">
          <tr>
            <td style="padding: 8px 0; color: #71717a; font-family: ui-monospace, Menlo, monospace; font-size: 11px; text-transform: uppercase; width: 90px; vertical-align: top;">
              // 称呼
            </td>
            <td style="padding: 8px 0; color: #18181b; font-weight: 500;">
              ${safeNickname}
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #71717a; font-family: ui-monospace, Menlo, monospace; font-size: 11px; text-transform: uppercase; vertical-align: top;">
              // 站点名
            </td>
            <td style="padding: 8px 0; color: #18181b; font-weight: 500;">
              ${safeSiteName}
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #71717a; font-family: ui-monospace, Menlo, monospace; font-size: 11px; text-transform: uppercase; vertical-align: top;">
              // 网址
            </td>
            <td style="padding: 8px 0;">
              <a href="${safeSiteUrl}" target="_blank" rel="noopener noreferrer" style="color: #09090b; text-decoration: underline; font-family: ui-monospace, Menlo, monospace; font-size: 12px; word-break: break-all;">
                ${safeSiteUrl}
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #71717a; font-family: ui-monospace, Menlo, monospace; font-size: 11px; text-transform: uppercase; vertical-align: top;">
              // 邮箱
            </td>
            <td style="padding: 8px 0;">
              <a href="mailto:${safeEmail}" style="color: #09090b; text-decoration: underline; font-family: ui-monospace, Menlo, monospace; font-size: 12px;">
                ${safeEmail}
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #71717a; font-family: ui-monospace, Menlo, monospace; font-size: 11px; text-transform: uppercase; vertical-align: top;">
              // 头像
            </td>
            <td style="padding: 8px 0;">
              ${avatarPreviewHtml}
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #71717a; font-family: ui-monospace, Menlo, monospace; font-size: 11px; text-transform: uppercase; vertical-align: top;">
              // 互换状态
            </td>
            <td style="padding: 8px 0; font-size: 12px;">
              ${addedStatusHtml}
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #71717a; font-family: ui-monospace, Menlo, monospace; font-size: 11px; text-transform: uppercase; vertical-align: top;">
              // 提交时间
            </td>
            <td style="padding: 8px 0; color: #71717a; font-family: ui-monospace, Menlo, monospace; font-size: 12px;">
              ${safeTime}
            </td>
          </tr>
        </table>

        <!-- 站点简介引用框 -->
        <div style="margin-top: 16px; padding: 14px 16px; background-color: #fafafa; border: 1px solid #ededeb; border-radius: 6px;">
          <div style="font-family: ui-monospace, Menlo, monospace; font-size: 11px; text-transform: uppercase; color: #71717a; margin-bottom: 6px;">
            // 站点简介
          </div>
          <div style="font-size: 13px; color: #27272a; line-height: 1.6; white-space: pre-wrap;">
            ${safeDescription}
          </div>
        </div>

        <!-- 快捷审批与操作栏：使用独立表格与固定物理间距单元格，杜绝按钮粘连 -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #f0f0ed; width: 100%;">
          <tr>
            <td>
              <div style="font-family: ui-monospace, Menlo, monospace; font-size: 11px; text-transform: uppercase; color: #71717a; margin-bottom: 12px;">
                // 快捷处理
              </div>
              ${reviewActionsHtml}
              <!-- 辅助操作 -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius: 6px; background-color: #18181b; text-align: center;">
                    <a href="${safeSiteUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 8px 15px; font-family: ui-monospace, Menlo, monospace; font-size: 12px; font-weight: 500; color: #fafafa; text-decoration: none; border-radius: 6px;">
                      访问该小站 ↗
                    </a>
                  </td>
                  <td style="width: 14px; min-width: 14px;"></td>
                  <td style="border-radius: 6px; background-color: #ffffff; border: 1px solid #e4e4e7; text-align: center;">
                    <a href="mailto:${safeEmail}?subject=${encodeURIComponent(`关于「${payload.siteName}」与「${siteConfig.title}」的友链交换`)}" style="display: inline-block; padding: 8px 15px; font-family: ui-monospace, Menlo, monospace; font-size: 12px; font-weight: 500; color: #18181b; text-decoration: none; border-radius: 6px;">
                      回复邮件 ✉
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- 页脚说明 -->
    <tr>
      <td style="padding: 16px 28px; background-color: #fafafa; border-top: 1px solid #f0f0ed; font-family: ui-monospace, Menlo, monospace; font-size: 11px; color: #a1a1aa; text-align: center;">
        ${siteConfig.title} 友链通知系统 · <a href="${siteConfig.url}" style="color: #71717a; text-decoration: none;">${siteConfig.url}</a>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/**
 * 渲染纯文本版本的友链申请内容（用于邮件客户端降级与反垃圾过滤器评分）
 */
export function renderFriendApplyText(payload: FriendApplyPayload): string {
  const approveUrl = payload.reviewToken
    ? `${siteConfig.url}/links/review?token=${encodeURIComponent(payload.reviewToken)}&action=approve`
    : ''
  const rejectUrl = payload.reviewToken
    ? `${siteConfig.url}/links/review?token=${encodeURIComponent(payload.reviewToken)}&action=reject`
    : ''

  const lines = [
    `// 友链申请 · 来自「${payload.siteName}」的互换申请`,
    '',
    `称呼：${payload.nickname}`,
    `站点名：${payload.siteName}`,
    `网址：${payload.siteUrl}`,
    `邮箱：${payload.email}`,
    payload.avatarUrl ? `头像：${payload.avatarUrl}` : '',
    `互换状态：${payload.hasAddedUs ? '已在对方站点添加本站' : '未确认或暂未添加'}`,
    `提交时间：${formatEmailTime()}`,
    '',
    '// 站点简介：',
    payload.description,
    '',
    payload.reviewToken ? `// 一键审批操作：\n通过上线：${approveUrl}\n婉拒申请：${rejectUrl}\n` : '',
    `---\n此邮件由 ${siteConfig.title} 自动发出 · ${siteConfig.url}`,
  ]
  return lines.filter(Boolean).join('\n')
}

/**
 * 发送友链申请通知邮件
 * 优先调用 Resend REST API，若未配置凭证则优雅降级在控制台输出
 */
export async function sendFriendApplyEmail(payload: FriendApplyPayload): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const notifyEmail = process.env.FRIEND_APPLY_NOTIFY_EMAIL?.trim()
  const html = renderFriendApplyEmail(payload)
  const text = renderFriendApplyText(payload)

  // 未配置 API Key 时，打印到控制台，供本地开发或无凭证环境调试
  if (!apiKey || !notifyEmail) {
    console.info('[FriendApply Email Mock] 未检测到 RESEND_API_KEY 或 FRIEND_APPLY_NOTIFY_EMAIL，模拟发送：')
    console.info(`[FriendApply Email Mock] 申请站点: ${payload.siteName} (${payload.siteUrl})`)
    console.info(`[FriendApply Email Mock] 申请人: ${payload.nickname} <${payload.email}>`)
    console.info(`[FriendApply Email Mock] 简介: ${payload.description}`)
    return { success: true, mocked: true }
  }

  try {
    const fromAddress = process.env.RESEND_FROM_EMAIL?.trim() || '喜东东小站 <onboarding@resend.dev>'
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [notifyEmail],
        reply_to: payload.email.trim(),
        subject: `[友链交换] 来自「${payload.siteName}」的申请`,
        html,
        text,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[FriendApply Email] Resend API 请求失败:', response.status, errorText)
      return { success: false, error: `邮件服务响应异常 (${response.status})` }
    }

    return { success: true }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : '未知网络错误'
    console.error('[FriendApply Email] 投递失败:', errorMsg)
    return { success: false, error: errorMsg }
  }
}

/**
 * 评论通知数据载荷
 */
export interface CommentNotifyPayload {
  articleTitle: string
  articleSlug: string
  authorName: string
  authorEmail?: string
  content: string
  createdAt: Date | string
  isReply: boolean
  replyToAuthorName?: string
  deleteToken: string
}

/**
 * 渲染新评论通知 HTML 模板
 */
export function renderCommentNotifyEmail(payload: CommentNotifyPayload): string {
  const safeArticleTitle = escapeHtml(payload.articleTitle.trim())
  const safeArticleSlug = escapeHtml(payload.articleSlug.trim())
  const safeAuthorName = escapeHtml(payload.authorName.trim())
  const safeContent = escapeHtml(payload.content.trim())
  const safeTime = formatEmailTime()

  const articleUrl = `${siteConfig.url}/blog/${safeArticleSlug}`
  const deleteUrl = `${siteConfig.url}/comments/delete?token=${encodeURIComponent(payload.deleteToken)}`

  const replyDetailHtml = payload.isReply
    ? `<div style="font-family: ui-monospace, Menlo, monospace; font-size: 11px; color: #71717a; margin-bottom: 6px;">
         // 回复对象: @${escapeHtml(payload.replyToAuthorName || '用户')}
       </div>`
    : ''

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>文章《${safeArticleTitle}》收到新评论</title>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #f7f7f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #18181b; line-height: 1.5; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e5e0; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);">
    <!-- 顶部眉标与标题 -->
    <tr>
      <td style="padding: 28px 28px 20px 28px; border-bottom: 1px solid #f0f0ed;">
        <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 11px; letter-spacing: 0.06em; color: #71717a; text-transform: uppercase; margin-bottom: 6px;">
          // 新评论通知 · NEW_COMMENT_NOTIFICATION
        </div>
        <h1 style="font-family: 'Newsreader', Georgia, 'Times New Roman', serif; font-size: 22px; font-weight: 500; color: #18181b; margin: 0 0 6px 0; line-height: 1.3;">
          《${safeArticleTitle}》有新的${payload.isReply ? '回复' : '评论'}
        </h1>
        <p style="margin: 0; font-size: 13px; color: #71717a; line-height: 1.5;">
          用户「${safeAuthorName}」在您的文章下发表了${payload.isReply ? '回复' : '讨论'}。
        </p>
      </td>
    </tr>

    <!-- 正文卡片与操作 -->
    <tr>
      <td style="padding: 24px 28px 16px 28px;">
        <!-- 评论内容引用框 -->
        <div style="padding: 14px 16px; background-color: #fafafa; border: 1px solid #ededeb; border-radius: 6px; margin-bottom: 20px;">
          ${replyDetailHtml}
          <div style="font-size: 13px; color: #27272a; line-height: 1.6; white-space: pre-wrap;">
            ${safeContent}
          </div>
          <div style="margin-top: 10px; font-family: ui-monospace, Menlo, monospace; font-size: 11px; color: #a1a1aa;">
            ${safeTime}
          </div>
        </div>

        <!-- 快捷操作栏 -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%;">
          <tr>
            <td>
              <div style="font-family: ui-monospace, Menlo, monospace; font-size: 11px; text-transform: uppercase; color: #71717a; margin-bottom: 12px;">
                // 快捷处理
              </div>
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius: 6px; background-color: #18181b; text-align: center;">
                    <a href="${articleUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 9px 16px; font-family: ui-monospace, Menlo, monospace; font-size: 12px; font-weight: 500; color: #fafafa; text-decoration: none; border-radius: 6px;">
                      查看文章 ↗
                    </a>
                  </td>
                  <td style="width: 14px; min-width: 14px;"></td>
                  <td style="border-radius: 6px; background-color: #fee2e2; border: 1px solid #fecaca; text-align: center;">
                    <a href="${deleteUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 9px 16px; font-family: ui-monospace, Menlo, monospace; font-size: 12px; font-weight: 500; color: #dc2626; text-decoration: none; border-radius: 6px;">
                      删除该评论 ✕
                    </a>
                  </td>
                </tr>
              </table>
              <div style="margin-top: 10px; font-family: ui-monospace, Menlo, monospace; font-size: 11px; color: #a1a1aa;">
                提示：删除链接为一次性确认凭据，点击后进入确认页，点击确认后生效。
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- 页脚说明 -->
    <tr>
      <td style="padding: 16px 28px; background-color: #fafafa; border-top: 1px solid #f0f0ed; font-family: ui-monospace, Menlo, monospace; font-size: 11px; color: #a1a1aa; text-align: center;">
        ${siteConfig.title} 评论通知系统 · <a href="${siteConfig.url}" style="color: #71717a; text-decoration: none;">${siteConfig.url}</a>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/**
 * 渲染纯文本版本的新评论通知
 */
export function renderCommentNotifyText(payload: CommentNotifyPayload): string {
  const articleUrl = `${siteConfig.url}/blog/${payload.articleSlug}`
  const deleteUrl = `${siteConfig.url}/comments/delete?token=${encodeURIComponent(payload.deleteToken)}`

  const lines = [
    `// 新评论通知 · 《${payload.articleTitle}》`,
    '',
    `用户：${payload.authorName}`,
    payload.isReply ? `类型：回复 (@${payload.replyToAuthorName || '用户'})` : '类型：顶级评论',
    `时间：${formatEmailTime()}`,
    '',
    '// 评论正文：',
    payload.content,
    '',
    '// 操作选项：',
    `查看文章：${articleUrl}`,
    `删除凭证确认链接：${deleteUrl}`,
    '',
    '---\n此邮件由博客系统自动发出，删除链接为一次性有效凭证。',
  ]
  return lines.join('\n')
}

/**
 * 发送新评论提醒邮件给站长
 */
export async function sendCommentNotifyEmail(payload: CommentNotifyPayload): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const notifyEmail = process.env.ADMIN_EMAIL?.trim()
  const html = renderCommentNotifyEmail(payload)
  const text = renderCommentNotifyText(payload)

  if (!apiKey || !notifyEmail) {
    console.info(
      '[CommentNotify Email Mock] 未配置 RESEND_API_KEY 或 ADMIN_EMAIL，模拟触发新评论通知（已隐藏正文与删除凭证）',
    )
    console.info(
      `[CommentNotify Email Mock] 目标文章: ${payload.articleTitle} (${payload.articleSlug})，作者: ${payload.authorName}，类型: ${payload.isReply ? '回复' : '顶级评论'}`,
    )
    return { success: true, mocked: true }
  }

  try {
    const fromAddress = process.env.RESEND_FROM_EMAIL?.trim() || '喜东东小站 <onboarding@resend.dev>'
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [notifyEmail],
        subject: `[新评论] 《${payload.articleTitle}》有新的${payload.isReply ? '回复' : '讨论'}`,
        html,
        text,
      }),
    })

    if (!response.ok) {
      console.error('[CommentNotify Email] Resend API 请求失败:', response.status)
      return { success: false, error: `邮件服务响应异常 (${response.status})` }
    }

    return { success: true }
  } catch (err) {
    console.error('[CommentNotify Email] 投递失败:', err instanceof Error ? err.name : 'UnknownError')
    return { success: false, error: '邮件服务请求失败' }
  }
}
