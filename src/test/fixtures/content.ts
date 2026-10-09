import fs from 'node:fs'
import path from 'node:path'

/**
 * 创建测试用博客文章，并返回只删除该文章及本次创建空目录的清理函数。
 */
export function createBlogPostFixture(slug: string): () => void {
  if (!slug || slug === '.' || slug === '..' || /[\\/]/.test(slug) || path.basename(slug) !== slug) {
    throw new Error(`无效的测试文章 slug: ${slug}`)
  }

  const contentDir = path.join(process.cwd(), 'content')
  const blogDir = path.join(contentDir, 'blog')
  const postDir = path.join(blogDir, slug)
  const postPath = path.join(postDir, 'post.mdx')
  if (fs.existsSync(postPath)) {
    throw new Error(`测试文章已存在，拒绝覆盖: ${postPath}`)
  }

  const createdDirectories: string[] = []
  try {
    for (const directory of [contentDir, blogDir, postDir]) {
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory)
        createdDirectories.push(directory)
      }
    }

    fs.writeFileSync(
      postPath,
      `---\ntitle: 测试文章\ndate: 2026-10-09\ncategory: tech\ndescription: 测试用文章\n---\n\n测试正文。\n`,
      { flag: 'wx' },
    )
  } catch (error) {
    for (const directory of [...createdDirectories].reverse()) {
      try {
        fs.rmdirSync(directory)
      } catch (cleanupError) {
        if (
          (cleanupError as NodeJS.ErrnoException).code !== 'ENOENT' &&
          (cleanupError as NodeJS.ErrnoException).code !== 'ENOTEMPTY'
        ) {
          throw cleanupError
        }
      }
    }
    throw error
  }

  return () => {
    fs.unlinkSync(postPath)
    for (const directory of [...createdDirectories].reverse()) {
      try {
        fs.rmdirSync(directory)
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code
        if (code !== 'ENOENT' && code !== 'ENOTEMPTY') {
          throw error
        }
      }
    }
  }
}
