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
  /** 全大写英文站点定位，渲染在首页 Hero 巨标题下方 */
  tagline: string
  /** 中文金句，渲染在首页 Hero 副标题下方，组件会自动加「」引号 */
  quote: string
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
  tagline: '写代码，也写句子。把想法变成可以运行的东西。',
  quote: '好的工具不解释自己，用过的人会再回来。',
  about: [
    '白天写 TypeScript，晚上和 AI 智能体对话，试着让它们替我干更多的活。',
    '喜欢把模糊的需求拆成清晰的接口，再用尽量少的代码把事情做完。偶尔写点东西记录弯路和发现。',
  ],
  skills: [
    {
      title: '网页 / 前端',
      items: ['TypeScript', 'React 19', 'Next.js 16', 'Tailwind CSS 4', 'Vite', 'Ant Design'],
    },
    {
      title: '后端 / 数据',
      items: ['Hono', 'Node.js', 'Drizzle ORM', 'SQLite', 'Better Auth', 'Zod'],
    },
    {
      title: '智能体 / 工程',
      items: ['AI 智能体', 'Turborepo', 'pnpm workspace', 'Vitest', 'Git', 'ESLint'],
    },
  ],
  experience: [],
  education: [],
  openSource: [],
}
