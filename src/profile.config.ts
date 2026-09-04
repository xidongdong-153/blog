export interface SkillGroup {
  /** 分组名，如 Frontend */
  title: string
  items: string[]
}

export interface ExperienceItem {
  /** 公司或组织名 */
  heading: string
  /** 职位 */
  subheading: string
  /** 外链，没有就传 null */
  href: string | null
  /** 一到两条职责描述 */
  points: string[]
}

export interface EducationItem {
  heading: string
  subheading: string
  /** 起止时间，自由格式，如 2024 年 2 月 - 2027 年 6 月 */
  period: string
}

export interface OpenSourceItem {
  name: string
  description: string
  href: string
}

export interface Profile {
  /** hero 头像路径，放 public/ 下；为 null 时渲染首字占位块 */
  avatar: string | null
  /** 所在城市 */
  location: string
  /** 一段自我介绍，渲染在 About 段 */
  about: string[]
  skills: SkillGroup[]
  experience: ExperienceItem[]
  education: EducationItem[]
  openSource: OpenSourceItem[]
}

export const profileConfig: Profile = {
  avatar: '/avatar.jpg',
  location: '上海',
  about: ['专注 TypeScript 全栈开发与 Web 应用构建。', '探索 AI Agent 协作与自动化工作流，打磨轻快可靠的产品体验。'],
  skills: [
    {
      title: 'Web / 前端',
      items: ['TypeScript', 'React 19', 'Next.js 16', 'Tailwind CSS 4', 'Vite', 'Ant Design'],
    },
    {
      title: '后端 / 数据',
      items: ['Hono', 'Node.js', 'Drizzle ORM', 'SQLite', 'Better Auth', 'Zod'],
    },
    {
      title: 'Agent / 工程',
      items: ['AI Agent', 'Turborepo', 'pnpm workspace', 'Vitest', 'Git', 'ESLint'],
    },
  ],
  experience: [],
  education: [],
  openSource: [],
}
