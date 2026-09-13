/**
 * 评论发表频控：针对用户 ID 和客户端 IP 施加滑动窗口限流
 */
const userRateLimitMap = new Map<string, number[]>()
const ipRateLimitMap = new Map<string, number[]>()

const RATE_LIMIT_WINDOW = 60 * 1000 // 1 分钟
const MAX_PER_USER_PER_WINDOW = 5
const MAX_PER_IP_PER_WINDOW = 10
const MAX_MAP_SIZE = 3000

export function isCommentRateLimited(userId: string, clientIp: string): boolean {
  const now = Date.now()

  // 1. 用户 ID 频控
  if (userId) {
    const userTimestamps = userRateLimitMap.get(userId) || []
    const recentUser = userTimestamps.filter((t) => now - t < RATE_LIMIT_WINDOW)
    if (recentUser.length >= MAX_PER_USER_PER_WINDOW) {
      return true
    }
    recentUser.push(now)
    userRateLimitMap.set(userId, recentUser)
  }

  // 2. 客户端 IP 频控
  const cleanIp = (clientIp || '127.0.0.1').trim().slice(0, 64)
  const ipTimestamps = ipRateLimitMap.get(cleanIp) || []
  const recentIp = ipTimestamps.filter((t) => now - t < RATE_LIMIT_WINDOW)
  if (recentIp.length >= MAX_PER_IP_PER_WINDOW) {
    return true
  }
  recentIp.push(now)
  ipRateLimitMap.set(cleanIp, recentIp)

  // 3. 内存清理与硬上限保护
  if (userRateLimitMap.size > MAX_MAP_SIZE) {
    for (const [k, list] of userRateLimitMap.entries()) {
      if (list.every((t) => now - t >= RATE_LIMIT_WINDOW)) {
        userRateLimitMap.delete(k)
      }
    }
  }
  if (ipRateLimitMap.size > MAX_MAP_SIZE) {
    for (const [k, list] of ipRateLimitMap.entries()) {
      if (list.every((t) => now - t >= RATE_LIMIT_WINDOW)) {
        ipRateLimitMap.delete(k)
      }
    }
  }

  return false
}

export function resetCommentRateLimit(): void {
  userRateLimitMap.clear()
  ipRateLimitMap.clear()
}
