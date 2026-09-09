import { Hono } from 'hono'
import { aiRoute } from './ai'
import { authRoute } from './auth'
import { commentsRoute } from './comments'
import { configRoute } from './config'
import { linksRoute } from './links'
import { presenceRoute } from './presence'
import { systemRoute } from './system'

export const apiRoutes = new Hono()
  .route('/system', systemRoute)
  .route('/presence', presenceRoute)
  .route('/links', linksRoute)
  .route('/config', configRoute)
  .route('/comments', commentsRoute)
  .route('/auth', authRoute)
  .route('/ai', aiRoute)
