import { handle } from 'hono/vercel'
import { app } from '@/server/app'

export const runtime = 'nodejs'

const handler = handle(app)

export { handler as DELETE, handler as GET, handler as OPTIONS, handler as PATCH, handler as POST, handler as PUT }
