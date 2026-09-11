/* eslint-disable test/no-import-node-test */
import assert from 'node:assert/strict'
import test from 'node:test'
import { isValidVisitorUuid, parseArticleSlug } from './visitor'

test('isValidVisitorUuid UUID 校验与清洗', () => {
  const validUuid = '12345678-1234-4234-8234-1234567890ab'
  assert.equal(isValidVisitorUuid(validUuid), true)
  assert.equal(isValidVisitorUuid(`"${validUuid}"`), true)
  assert.equal(isValidVisitorUuid(`  "${validUuid}"  `), true)
  assert.equal(isValidVisitorUuid('not-a-uuid'), false)
  assert.equal(isValidVisitorUuid(''), false)
  assert.equal(isValidVisitorUuid(null), false)
  assert.equal(isValidVisitorUuid(undefined), false)
})

test('parseArticleSlug 路径解析与容错', () => {
  assert.equal(parseArticleSlug('/blog/hello-world'), 'hello-world')
  assert.equal(parseArticleSlug('/blog/hello-world?query=1#hash'), 'hello-world')
  assert.equal(parseArticleSlug('/blog/archives'), null)
  assert.equal(parseArticleSlug('/blog/tags'), null)
  assert.equal(parseArticleSlug('/blog/tags/react'), null)
  assert.equal(parseArticleSlug('/blog'), null)
  assert.equal(parseArticleSlug('/'), null)
  assert.equal(parseArticleSlug('/notes/my-note'), null)
  // 中文与编码正常解码
  assert.equal(parseArticleSlug('/blog/%E6%B5%8B%E8%AF%95'), '测试')
  // 畸形编码安全降级，不抛出异常
  assert.equal(parseArticleSlug('/blog/%E0%A4%A'), '%E0%A4%A')
})
