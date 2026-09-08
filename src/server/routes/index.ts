import { Hono } from 'hono'
import { linksRoute } from './links'
import { presenceRoute } from './presence'
import { systemRoute } from './system'

export const apiRoutes = new Hono()
  .route('/system', systemRoute)
  .route('/presence', presenceRoute)
  .route('/links', linksRoute)
