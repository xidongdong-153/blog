import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/server/infra/db/schema/index.ts',
  out: './src/server/infra/db/migrations',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL || 'file:local.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
})
