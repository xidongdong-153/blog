import { Hono } from 'hono'
import { getPublicPresenceData } from './presence.service'

export const presenceRoute = new Hono().get('/', async (c) => {
  const presence = await getPublicPresenceData()

  c.header('Cache-Control', 'no-store, max-age=0')
  return c.json(presence)
})
