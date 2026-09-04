import type { ReactNode } from 'react'

export type CalloutType = 'note' | 'tip' | 'warning' | 'important'

interface CalloutProps {
  type?: CalloutType
  title?: string
  children: ReactNode
}

const CALLOUT_CONFIG: Record<
  CalloutType,
  {
    border: string
    bg: string
    titleColor: string
    defaultTitle: string
    icon: ReactNode
  }
> = {
  note: {
    border: 'border-border',
    bg: 'bg-muted/40',
    titleColor: 'text-foreground',
    defaultTitle: '注意',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4 shrink-0"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
    ),
  },
  tip: {
    border: 'border-primary/25',
    bg: 'bg-primary/10',
    titleColor: 'text-primary',
    defaultTitle: '提示',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4 shrink-0 text-primary"
      >
        <path d="M12 2v4" />
        <path d="m4.93 4.93 2.83 2.83" />
        <path d="M2 12h4" />
        <path d="m4.93 19.07 2.83-2.83" />
        <path d="M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />
      </svg>
    ),
  },
  warning: {
    border: 'border-accent/40',
    bg: 'bg-accent/25',
    titleColor: 'text-foreground',
    defaultTitle: '警告',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4 shrink-0 text-foreground"
      >
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </svg>
    ),
  },
  important: {
    border: 'border-destructive/30',
    bg: 'bg-destructive/10',
    titleColor: 'text-destructive',
    defaultTitle: '重要',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4 shrink-0 text-destructive"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" x2="12" y1="8" y2="12" />
        <line x1="12" x2="12.01" y1="16" y2="16" />
      </svg>
    ),
  },
}

/**
 * MDX 语义提示框组件（RSC）。
 * 支持 note / tip / warning / important 四种语义视觉级别。
 */
export function Callout({ type = 'note', title, children }: CalloutProps) {
  const config = CALLOUT_CONFIG[type] ?? CALLOUT_CONFIG.note
  const displayTitle = title ?? config.defaultTitle

  return (
    <aside className={`my-6 rounded-xl border ${config.border} ${config.bg} p-4 text-sm text-foreground`}>
      <div className={`mb-2 flex items-center gap-2 font-medium ${config.titleColor}`}>
        {config.icon}
        <span>{displayTitle}</span>
      </div>
      <div className="prose-sm text-muted-foreground [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">{children}</div>
    </aside>
  )
}
