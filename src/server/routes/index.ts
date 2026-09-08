import { Hono } from 'hono'
import { systemRoute } from './system'

export const apiRoutes = new Hono().route('/system', systemRoute)
