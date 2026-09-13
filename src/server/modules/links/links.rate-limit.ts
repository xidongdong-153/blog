/**
 * 内存简易频控记录：IP -> [时间戳列表]
 */
const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT_WINDOW = 10 * 60 * 1000 // 10 分钟
const MAX_REQUESTS_PER_WINDOW = 3
const MAX_MAP_SIZE = 5000

// 全局申请频率保护：10 分钟内全站最多接受 50 次友链申请
const globalApplyTimestamps: number[] = []
const GLOBAL_MAX_APPLIES = 50

/**
 * 检查 IP 频控是否超限。若未超限则记录本次访问时间。
 */
export function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const cleanIp = (ip || 'unknown').trim().slice(0, 64)

  // 全局频率保护
  while (globalApplyTimestamps.length > 0 && now - globalApplyTimestamps[0] >= RATE_LIMIT_WINDOW) {
    globalApplyTimestamps.shift()
  }
  if (globalApplyTimestamps.length >= GLOBAL_MAX_APPLIES) {
    return true
  }

  const timestamps = rateLimitMap.get(cleanIp) || []
  const recentTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW)

  if (recentTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return true
  }

  // 内存硬上限保护 (5000 条)
  if (rateLimitMap.size >= MAX_MAP_SIZE && !rateLimitMap.has(cleanIp)) {
    for (const [key, list] of rateLimitMap.entries()) {
      if (list.every((t) => now - t >= RATE_LIMIT_WINDOW)) {
        rateLimitMap.delete(key)
      }
    }
    // 清理后若仍达上限，为防内存耗尽直接拒绝新 IP 申请
    if (rateLimitMap.size >= MAX_MAP_SIZE) {
      return true
    }
  }

  recentTimestamps.push(now)
  rateLimitMap.set(cleanIp, recentTimestamps)
  globalApplyTimestamps.push(now)

  return false
}

/**
 * 重置频控记录（仅用于单元测试）
 */
export function resetRateLimitMap(): void {
  rateLimitMap.clear()
  globalApplyTimestamps.length = 0
}
