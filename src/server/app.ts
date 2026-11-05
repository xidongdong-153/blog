import { Hono } from 'hono'
import { agentsRoute } from './modules/ai/agents.route'
import { summaryConfigRoute } from './modules/ai/summary-config.route'
import { authConfigRoute } from './modules/auth/auth-config.route'
import { authRoute } from './modules/auth/auth.route'
import { commentsRoute } from './modules/comments/comments.route'
import { linksRoute } from './modules/links/links.route'
import { postsRoute } from './modules/posts/posts.route'
import { presenceRoute } from './modules/presence/presence.route'
import { systemRoute } from './modules/system/system.route'
import { visitorsRoute } from './modules/visitors/visitors.route'

export function createApp() {
  return new Hono()
    .basePath('/api')
    .route('/system', systemRoute)
    .route('/admin/posts', postsRoute)
    .route('/presence', presenceRoute)
    .route('/links', linksRoute)
    .route('/visitors', visitorsRoute)
    .route('/config', authConfigRoute)
    .route('/comments', commentsRoute)
    .route('/auth', authRoute)
    .route('/ai', summaryConfigRoute)
    .route('/ai', agentsRoute)
}

export const app = createApp()
export type AppType = typeof app
