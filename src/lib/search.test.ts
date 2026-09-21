/* eslint-disable test/no-import-node-test */
import type { BlogPost } from './content'
import assert from 'node:assert/strict'
import test from 'node:test'
import { buildSearchIndex, searchPosts, splitByRanges, stripNonText } from './search'

function makePost(overrides: Partial<BlogPost> = {}): BlogPost {
  return {
    slug: 'sample-post',
    title: '示例文章',
    description: '一段描述',
    category: 'tech',
    date: '2026-01-01',
    updatedDate: '',
    heroImage: '',
    tags: [],
    draft: false,
    disableAiSummary: false,
    content: '正文内容',
    ...overrides,
  }
}

/** 便捷入口：建索引后立刻检索一次 */
function runSearch(query: string, posts: BlogPost[]) {
  return searchPosts(query, buildSearchIndex(posts))
}

test('stripNonText 丢弃围栏代码块，保留块外正文', () => {
  const mdx = '正文开始\n\n```ts\nconst startAppInitialization = 1\n```\n\n正文结束'
  const text = stripNonText(mdx)

  assert.ok(text.includes('正文开始'))
  assert.ok(text.includes('正文结束'))
  assert.ok(!text.includes('startAppInitialization'))
})

test('stripNonText 保留行内代码与链接文字，丢弃公式、图片与链接地址', () => {
  const mdx =
    '使用 `useState` 管理状态，参考 [文档](https://example.com/a)，公式 $E=mc^2$，块公式 $$\\int_0^1 x dx$$，图片 ![配图说明](/images/a.png) 结尾'
  const text = stripNonText(mdx)

  assert.ok(text.includes('useState'))
  assert.ok(text.includes('文档'))
  assert.ok(text.includes('结尾'))
  assert.ok(!text.includes('example.com'))
  assert.ok(!text.includes('E=mc^2'))
  assert.ok(!text.includes('配图说明'))
})

test('stripNonText 丢弃 MDX import 语句与 JSX 标签，保留标签内文字', () => {
  const mdx = 'import { Callout } from \'./callout\'\n\n<Callout type="info">提示文字</Callout>'
  const text = stripNonText(mdx)

  assert.ok(!text.includes('import'))
  assert.ok(!text.includes('Callout'))
  assert.ok(text.includes('提示文字'))
})

test('中文关键词按子串匹配', () => {
  const posts = [
    makePost({ slug: 'closure', title: '深入理解闭包', content: '正文' }),
    makePost({ slug: 'other', title: '无关文章', content: '正文' }),
  ]

  assert.equal(runSearch('闭包', posts).length, 1)
  assert.equal(runSearch('理解闭', posts).length, 1)
  assert.equal(runSearch('不存在的词', posts).length, 0)
})

test('英文关键词大小写不敏感，且能命中词首', () => {
  const posts = [makePost({ slug: 'react', title: 'React Hooks 实践', content: '正文' })]

  assert.equal(runSearch('react', posts).length, 1)
  assert.equal(runSearch('REACT', posts).length, 1)
  assert.equal(runSearch('Hooks', posts).length, 1)
})

test('英文关键词不命中单词中途', () => {
  const posts = [makePost({ slug: 'word', title: 'xenglish 说明', content: '正文' })]

  assert.equal(runSearch('english', posts).length, 0)
})

test('英文连字符按词边界处理', () => {
  const posts = [makePost({ slug: 'hooks', title: 'react-hooks 用法', content: '正文' })]

  assert.equal(runSearch('hooks', posts).length, 1)
})

test('多词查询要求全部命中', () => {
  const posts = [
    makePost({ slug: 'perf', title: 'React 性能优化', content: '正文' }),
    makePost({ slug: 'state', title: 'React 状态管理', content: '正文' }),
  ]

  assert.equal(runSearch('react 优化', posts).length, 1)
  assert.equal(runSearch('react 部署', posts).length, 0)
})

test('单字符查询不触发检索', () => {
  const posts = [makePost({ slug: 'noise', title: '的都测试', content: '的的的的' })]

  assert.equal(runSearch('的', posts).length, 0)
  assert.equal(runSearch('  ', posts).length, 0)
})

test('标题命中排在正文命中之前', () => {
  const posts = [
    makePost({ slug: 'text-only', title: '无关标题', content: '这里提到了闭包' }),
    makePost({ slug: 'title-hit', title: '闭包详解', content: '正文' }),
  ]
  const hits = runSearch('闭包', posts)

  assert.equal(hits.length, 2)
  assert.equal(hits[0].post.slug, 'title-hit')
})

test('标签命中计入得分并可被检索', () => {
  const posts = [makePost({ slug: 'tagged', title: '无关标题', tags: ['typescript'], content: '正文' })]

  assert.equal(runSearch('typescript', posts).length, 1)
})

test('正文命中时生成带省略号的片段，区间落在片段内', () => {
  const content = `${'前'.repeat(60)}关键词${'后'.repeat(200)}`
  const posts = [makePost({ slug: 'snippet', title: '无关标题', content })]
  const hits = runSearch('关键词', posts)

  assert.equal(hits.length, 1)
  const hit = hits[0]

  assert.ok(hit.snippet)
  assert.ok(hit.snippet.startsWith('...'))
  assert.ok(hit.snippet.endsWith('...'))
  assert.equal(hit.snippetRanges.length, 1)

  const range = hit.snippetRanges[0]
  assert.equal(hit.snippet.slice(range.start, range.end), '关键词')
})

test('标题命中时不生成正文片段，保留原描述', () => {
  const posts = [makePost({ slug: 'title', title: '闭包详解', description: '原始描述', content: '闭包正文' })]
  const hit = runSearch('闭包', posts)[0]

  assert.equal(hit.snippet, null)
  assert.ok(hit.titleRanges.length > 0)
  assert.equal(hit.post.description, '原始描述')
})

test('标题命中区间可按原文切片还原关键词', () => {
  const posts = [makePost({ slug: 'range', title: '深入 React 渲染机制', content: '正文' })]
  const hit = runSearch('react', posts)[0]
  const range = hit.titleRanges[0]

  assert.equal(hit.post.title.slice(range.start, range.end), 'React')
})

test('splitByRanges 按区间切分并标记高亮段', () => {
  const parts = splitByRanges('abcdef', [{ start: 1, end: 3 }])

  assert.deepEqual(parts, [
    { text: 'a', hit: false },
    { text: 'bc', hit: true },
    { text: 'def', hit: false },
  ])
})

test('splitByRanges 合并重叠区间并裁剪越界部分', () => {
  const parts = splitByRanges('abcdef', [
    { start: 2, end: 5 },
    { start: 3, end: 99 },
  ])

  assert.deepEqual(parts, [
    { text: 'ab', hit: false },
    { text: 'cdef', hit: true },
  ])
})

test('splitByRanges 无区间时返回整段', () => {
  assert.deepEqual(splitByRanges('abc', []), [{ text: 'abc', hit: false }])
})
