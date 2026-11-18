'use client'

interface ScrollLock {
  count: number
  overflow: string
  priority: string
}

const locks = new WeakMap<HTMLElement, ScrollLock>()

/** 共用背景滚动锁，最后一个浮层退场后才恢复原样式，避免交叉开关覆盖彼此的锁。 */
export function lockOverlayScroll() {
  const body = document.body
  let lock = locks.get(body)
  if (!lock) {
    lock = {
      count: 0,
      overflow: body.style.getPropertyValue('overflow'),
      priority: body.style.getPropertyPriority('overflow'),
    }
    locks.set(body, lock)
    body.style.setProperty('overflow', 'hidden')
  }
  lock.count++
  let released = false
  return () => {
    if (released) return
    released = true
    lock.count--
    if (lock.count > 0) return
    if (lock.overflow) body.style.setProperty('overflow', lock.overflow, lock.priority)
    else body.style.removeProperty('overflow')
    locks.delete(body)
  }
}
