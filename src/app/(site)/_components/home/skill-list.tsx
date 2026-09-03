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
          <h3 className="w-full text-sm font-medium text-muted-foreground md:w-1/5 md:pt-1">{group.title}</h3>
          <div className="flex flex-1 flex-wrap gap-x-2.5 gap-y-2 md:w-4/5">
            {group.items.map((skill) => {
              const currentIndex = globalIndex++
              return (
                <div
                  key={skill}
                  style={{ animationDelay: `${currentIndex * 28 + 60}ms` }}
                  className="animate-skill-fade-in motion-reduce:animate-none"
                >
                  <span className="inline-flex select-none items-center rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-medium text-foreground transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.04] hover:shadow-[0_4px_12px_hsl(var(--foreground)/0.1)] motion-reduce:hover:transform-none">
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
