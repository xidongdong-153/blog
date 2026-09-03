'use client'

/**
 * 主题切换按钮。切换时改 <html> 的 .dark 类并写入 localStorage，
 * 与根布局里的防闪烁脚本约定同一个存储键 theme。
 */
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement
    const isDark = root.classList.toggle('dark')
    try {
      localStorage.setItem('theme', isDark ? 'dark' : 'light')
    } catch {
      // localStorage 被禁用时只切换显示，不报错
    }
  }

  return (
    <button
      type="button"
      aria-label="切换主题"
      onClick={toggle}
      className="rounded-md px-2 py-1 text-sm text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200"
    >
      <span className="dark:hidden">暗</span>
      <span className="hidden dark:inline">亮</span>
    </button>
  )
}
