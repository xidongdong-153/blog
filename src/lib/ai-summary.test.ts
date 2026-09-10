/* eslint-disable test/no-import-node-test */
import assert from 'node:assert/strict'
import test from 'node:test'
import { computeArticleContentHash } from './ai-summary'

test('computeArticleContentHash 能够计算稳定的 SHA-256 十六进制字符串', () => {
  const content = '这是测试文章正文内容。\n\n包含换行与标点。'
  const hash1 = computeArticleContentHash(content)
  const hash2 = computeArticleContentHash(content)

  assert.equal(typeof hash1, 'string')
  assert.equal(hash1.length, 64)
  assert.equal(hash1, hash2)
})

test('正文微小字符变化会产生不同哈希', () => {
  const content1 = '这是第一版正文。'
  const content2 = '这是第一版正文！'

  const hash1 = computeArticleContentHash(content1)
  const hash2 = computeArticleContentHash(content2)

  assert.notEqual(hash1, hash2)
})

test('frontmatter 变动不影响正文哈希计算（正文入参独立性）', () => {
  const postA = {
    title: '文章标题 A',
    tags: ['tech'],
    content: '相同正文',
  }
  const postB = {
    title: '修改后的标题 B',
    tags: ['tinkering', 'web'],
    content: '相同正文',
  }

  const hashA = computeArticleContentHash(postA.content)
  const hashB = computeArticleContentHash(postB.content)

  assert.equal(hashA, hashB)
})
