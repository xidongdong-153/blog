import * as aiSchema from './ai'
import * as authSchema from './auth'
import * as commentsSchema from './comments'
import * as linksSchema from './links'
import * as postsSchema from './posts'
import * as presenceSchema from './presence'
import * as systemSchema from './system'
import * as visitorsSchema from './visitors'

export const schema = {
  ...aiSchema,
  ...authSchema,
  ...commentsSchema,
  ...linksSchema,
  ...postsSchema,
  ...presenceSchema,
  ...systemSchema,
  ...visitorsSchema,
}

export * from './ai'
export * from './auth'
export * from './comments'
export * from './links'
export * from './posts'
export * from './presence'
export * from './system'
export * from './visitors'
