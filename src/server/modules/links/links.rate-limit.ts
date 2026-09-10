/**
 * 内存简易频控记录：IP -> [时间戳列表]
 */
const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT_WINDOW = 10 * 60 * 1000 // 10 分钟
const MAX_REQUESTS_PER_WINDOW = 3

/**
 * 检查 IP 频控是否超限。若未超限则记录本次访问时间。
 */
export function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const timestamps = rateLimitMap.get(ip) || []
  const recentTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW)

  if (recentTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return true
  }

  recentTimestamps.push(now)
  rateLimitMap.set(ip, recentTimestamps)

  // 定期清理过期的键，防止内存泄漏
  if (rateLimitMap.size > 2000) {
    for (const [key, list] of rateLimitMap.entries()) {
      if (list.every((t) => now - t >= RATE_LIMIT_WINDOW)) {
        rateLimitMap.delete(key)
      }
    }
  }

  return false
}

/**
 * 重置频控记录（仅用于单元测试）
 */
export function resetRateLimitMap(): void {
  rateLimitMap.clear()
}
