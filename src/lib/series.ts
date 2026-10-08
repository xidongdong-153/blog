/**
 * 博客专栏与系列文章定义模块。
 * 在代码层集中管理专栏注册表，避免在每篇 MDX 中重复声明全局元信息。
 */

export type SeriesStatus = 'in-progress' | 'completed'

/**
 * 专栏静态定义。
 */
export interface SeriesDefinition {
  /** 专栏唯一标识（用于路由，如 pi-agent-desktop） */
  id: string
  /** 专栏全称 */
  title: string
  /** 专栏简介与定位说明 */
  description: string
  /** 连载状态 */
  status: SeriesStatus
  /** 配套开源项目代码仓库地址 */
  repositoryUrl?: string
  /** 专栏技术标签 */
  tags: string[]
  /** 专栏主题氛围高光色 */
  heroColor?: string
}

/**
 * 专栏连载状态中文标签。
 */
export const SERIES_STATUS_LABELS: Record<SeriesStatus, string> = {
  'in-progress': '连载中',
  completed: '已完结',
}

/**
 * 全站注册专栏列表。
 */
export const REGISTERED_SERIES: Record<string, SeriesDefinition> = {
  'pi-agent-desktop': {
    id: 'pi-agent-desktop',
    title: '从零使用 Pi SDK 构建个人 Agent Desktop',
    description:
      '深入剖析 Pi Agent Harness 架构，从 Headless SDK 核心、会话生命周期到跨平台桌面端集成，从零打造可扩展的个人专属 AI 工作台。',
    status: 'in-progress',
    repositoryUrl: 'https://github.com/xidongdong-153/blog',
    tags: ['Pi SDK', 'AI Agent', 'TypeScript', 'Desktop'],
    heroColor: '#659EB9',
  },
}
