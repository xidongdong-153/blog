import * as authSchema from './auth'
import * as commentsSchema from './comments'
import * as linksSchema from './links'
import * as systemSchema from './system'

export const schema = {
  ...authSchema,
  ...commentsSchema,
  ...linksSchema,
  ...systemSchema,
}

export * from './auth'
export * from './comments'
export * from './links'
export * from './system'
