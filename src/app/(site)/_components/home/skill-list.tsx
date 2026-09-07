import type { SkillGroup } from '@/profile.config'

interface SkillListProps {
  skills: SkillGroup[]
}

/**
 * 首页技能栈展示组件。
 * 分组展示技术标签，按序号交错淡入，悬停时带有微放大与位移动效。
 */
export function SkillList({ skills }: SkillListProps) {
  let globalIndex = 0

  return (
    <div className="flex flex-col gap-y-4">
      {skills.map((group) => (
        <div key={group.title} className="flex flex-col gap-y-2 md:flex-row md:gap-x-6 md:gap-y-0">
          <h3 className="w-full font-mono text-xs tracking-wider text-muted-foreground/75 md:w-28 md:shrink-0 md:pt-1">
            {group.title}
          </h3>
          <div className="flex flex-1 flex-wrap gap-x-2 gap-y-2">
            {group.items.map((skill) => {
              const currentIndex = globalIndex++
              const name = typeof skill === 'string' ? skill : skill.name
              const href = typeof skill === 'string' ? undefined : skill.href

              return (
                <div
                  key={name}
                  style={{ animationDelay: `${currentIndex * 28 + 60}ms` }}
                  className="animate-skill-fade-in motion-reduce:animate-none"
                >
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group/item inline-flex select-none items-center rounded-md bg-muted/40 px-2.5 py-1 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
                    >
                      <span>{name}</span>
                      <span
                        aria-hidden="true"
                        className="ml-0.5 text-xs text-muted-foreground/60 transition-colors group-hover/item:text-foreground"
                      >
                        ↗
                      </span>
                    </a>
                  ) : (
                    <span className="inline-flex select-none items-center rounded-md bg-muted/40 px-2.5 py-1 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground">
                      {name}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
