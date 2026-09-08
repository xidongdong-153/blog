import { Hono } from 'hono'
import { apiRoutes } from './routes'

export function createApp() {
  const app = new Hono().basePath('/api')

  app.route('/', apiRoutes)

  return app
}

export const app = createApp()
export type AppType = typeof apiRoutes
