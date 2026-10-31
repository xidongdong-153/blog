import type { ReactNode } from 'react'

/** 文字筛选项的细线反馈；父链接使用 group/filter，并保留自身焦点样式。 */
export function FilterLabel({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <span className="relative">
      {children}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -bottom-2 left-0 h-px w-full origin-left bg-primary transition-[scale,opacity] duration-[220ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${active ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0 group-hover/filter:scale-x-100 group-hover/filter:opacity-40 group-focus-visible/filter:scale-x-100 group-focus-visible/filter:opacity-40'}`}
      />
    </span>
  )
}
