export const siteConfig = {
  /** 站点标题，浏览器标签页和页头都用这个值 */
  title: '喜东东的博客',
  /** 站点简介，进首页 hero 和 SEO meta description */
  description: '写代码的记录：文章、笔记、项目和链接。',
  /** 站点作者 */
  author: '喜东东',
  /** 部署后的正式域名，RSS、sitemap、OG 图生成链接时要用；本地开发不读它 */
  url: 'https://blog.xdd.ink',
  /** 页头导航，name 是显示文本，href 是路由路径 */
  nav: [
    { name: '首页', href: '/' },
    { name: '文章', href: '/blog' },
    { name: '笔记', href: '/notes' },
    { name: '项目', href: '/projects' },
    { name: '友链', href: '/links' },
    { name: '关于', href: '/about' },
  ],
  /** 页脚社交链接，name 是显示文本 */
  social: [{ name: 'GitHub', href: 'https://github.com/xidongdong-153/blog' }],
} as const

export type SiteConfig = typeof siteConfig
