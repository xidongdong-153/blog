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
        <div key={group.title} className="flex flex-col gap-y-2 md:flex-row md:gap-x-5 md:gap-y-0">
          <h3 className="w-full font-mono text-xs tracking-wider text-muted-foreground md:w-1/5 md:pt-1">
            {group.title}
          </h3>
          <div className="flex flex-1 flex-wrap gap-x-2.5 gap-y-2 md:w-4/5">
            {group.items.map((skill) => {
              const currentIndex = globalIndex++
              return (
                <div
                  key={skill}
                  style={{ animationDelay: `${currentIndex * 28 + 60}ms` }}
                  className="animate-skill-fade-in motion-reduce:animate-none"
                >
                  <span className="inline-flex select-none items-center rounded-md border border-border/60 bg-card/40 px-2.5 py-1 font-mono text-xs text-muted-foreground transition-all hover:border-foreground/30 hover:bg-muted/40 hover:text-foreground">
                    {skill}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
