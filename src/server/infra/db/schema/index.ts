import * as linksSchema from './links'
import * as systemSchema from './system'

export const schema = {
  ...linksSchema,
  ...systemSchema,
}

export * from './links'
export * from './system'
