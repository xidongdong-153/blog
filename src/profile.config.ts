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
  avatar: null,
  location: '杭州',
  about: ['专注 TypeScript 技术栈与现代化前端开发。', '追求干净的架构设计与丝滑的用户交互体验。'],
  skills: [
    {
      title: '编程语言',
      items: ['TypeScript', 'JavaScript', 'HTML5', 'CSS3'],
    },
    {
      title: '框架与库',
      items: ['React 19', 'Next.js 16', 'Tailwind CSS 4'],
    },
    {
      title: '工具与生态',
      items: ['Node.js', 'pnpm', 'Vercel', 'Git', 'ESLint', 'Prettier'],
    },
  ],
  experience: [],
  education: [],
  openSource: [],
}
