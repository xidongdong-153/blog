/** 将 ISO 日期格式化为站点统一的中文日期。遇到无效日期时安全回退原始字符串，避免运行时异常。 */
export function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return iso
  }
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'UTC',
  }).format(date)
}

/** 将 ISO 日期格式化为相对时间（如“10 分钟前”），超过 7 天或异常日期则回退为标准日期。 */
export function formatRelativeTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return formatDate(iso)
  }

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  if (diffMs < 0) {
    return formatDate(iso)
  }

  const diffMinutes = Math.floor(diffMs / (60 * 1000))
  if (diffMinutes < 1) return '刚刚'
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} 小时前`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays} 天前`

  return formatDate(iso)
}
