import type { ReactNode } from 'react'

/** 文字筛选项的弹簧细线反馈；父链接使用 group/filter，并保留自身焦点样式。 */
export function FilterLabel({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <span className="relative">
      {children}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -bottom-1.5 left-0 h-[1.5px] w-full origin-left rounded-full bg-primary transition-[transform,opacity] duration-[280ms] ease-[var(--ease-spring)] motion-reduce:transition-none ${active ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0 group-hover/filter:scale-x-100 group-hover/filter:opacity-45 group-focus-visible/filter:scale-x-100 group-focus-visible/filter:opacity-45'}`}
      />
    </span>
  )
}
