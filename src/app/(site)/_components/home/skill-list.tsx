import type { SkillGroup } from '@/profile.config'

interface SkillListProps {
  skills: SkillGroup[]
}

/**
 * 首页与关于页技能栈展示组件。
 * 去边框轻纸片标签，按序号交错入场，悬停时温和提亮文字与底色。
 */
export function SkillList({ skills }: SkillListProps) {
  let globalIndex = 0

  return (
    <div className="flex flex-col gap-y-3.5">
      {skills.map((group) => (
        <div key={group.title} className="flex flex-col gap-y-1.5">
          <h3 className="font-mono text-[11px] tracking-wider text-muted-foreground/80">{group.title}</h3>
          <div className="flex flex-wrap gap-1.5">
            {group.items.map((skill) => {
              const currentIndex = globalIndex++
              const name = typeof skill === 'string' ? skill : skill.name
              const href = typeof skill === 'string' ? undefined : skill.href

              return (
                <div
                  key={name}
                  style={{ animationDelay: `${currentIndex * 24 + 40}ms` }}
                  className="animate-skill-fade-in motion-reduce:animate-none"
                >
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group/item inline-flex select-none items-center rounded-md border border-hair bg-card/70 px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                    >
                      <span>{name}</span>
                      <span aria-hidden="true" className="ml-0.5 text-[10px] opacity-60 group-hover/item:opacity-100">
                        ↗
                      </span>
                    </a>
                  ) : (
                    <span className="inline-flex select-none items-center rounded-md border border-hair bg-card/60 px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
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
