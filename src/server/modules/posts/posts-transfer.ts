import type { PostExportVersion, PostInput } from '@/lib/posts'
import type { AppDatabase } from '@/server/infra/db/client'
import { randomUUID } from 'node:crypto'
import { strFromU8, strToU8, Unzip, UnzipInflate, zipSync } from 'fflate'
import matter from 'gray-matter'
import { JSON_SCHEMA, load } from 'js-yaml'
import { MAX_IMPORT_BYTES, MAX_IMPORT_POSTS, postInputSchema } from '@/lib/posts'
import { db as defaultDb } from '@/server/infra/db/client'
import { posts } from '@/server/infra/db/schema/posts'
import { validatePostMdx } from './posts-mdx'
import { getManagedPost, listManagedPosts, PostServiceError } from './posts.service'

export interface ImportCandidate {
  filename: string
  input?: PostInput
  errors: string[]
  warnings: string[]
}

function readArchive(data: Uint8Array): Record<string, Uint8Array> {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  let end = -1
  for (let offset = data.length - 22; offset >= Math.max(0, data.length - 65557); offset--) {
    if (
      view.getUint32(offset, true) === 0x06054b50 &&
      offset + 22 + view.getUint16(offset + 20, true) === data.length
    ) {
      end = offset
      break
    }
  }
  if (end < 0 || view.getUint16(end + 4, true) || view.getUint16(end + 6, true))
    throw new PostServiceError(400, '不支持此 ZIP 格式')
  const count = view.getUint16(end + 10, true)
  let offset = view.getUint32(end + 16, true)
  if (count > MAX_IMPORT_POSTS * 3 + 1) throw new PostServiceError(413, '一次最多导入 100 篇文章')
  const names = new Set<string>()
  let declaredSize = 0
  for (let index = 0; index < count; index++) {
    if (offset + 46 > end || view.getUint32(offset, true) !== 0x02014b50)
      throw new PostServiceError(400, 'ZIP 目录无效')
    const length = view.getUint16(offset + 28, true)
    const extra = view.getUint16(offset + 30, true)
    const comment = view.getUint16(offset + 32, true)
    if (offset + 46 + length + extra + comment > end) throw new PostServiceError(400, 'ZIP 目录不完整')
    const name = strFromU8(data.subarray(offset + 46, offset + 46 + length))
    const mode = (view.getUint32(offset + 38, true) >>> 16) & 0xf000
    if (
      name.startsWith('/') ||
      /^[a-z]:/i.test(name) ||
      [...name].some((char) => char.charCodeAt(0) < 32 || char === '\\') ||
      name.split('/').some((part) => part === '..' || part === '.') ||
      names.has(name) ||
      ![0, 0x8000, 0x4000].includes(mode)
    ) {
      throw new PostServiceError(400, 'ZIP 包含无效路径、重复文件或链接')
    }
    if (!name.endsWith('/') && name !== 'manifest.json' && !/\.mdx?$/i.test(name))
      throw new PostServiceError(400, 'ZIP 只支持 Markdown、MDX 和 manifest.json，不包含媒体文件')
    declaredSize += view.getUint32(offset + 24, true)
    if (declaredSize > MAX_IMPORT_BYTES) throw new PostServiceError(413, 'ZIP 解压后不能超过 20 MiB')
    names.add(name)
    offset += 46 + length + extra + comment
  }
  const files: Record<string, Uint8Array> = Object.create(null)
  let total = 0
  const startedNames = new Set<string>()
  const archive = new Unzip((file) => {
    if (!names.has(file.name) || startedNames.has(file.name))
      throw new PostServiceError(400, 'ZIP 文件与目录不一致或包含重复文件')
    startedNames.add(file.name)
    if (file.name.endsWith('/')) return
    const chunks: Uint8Array[] = []
    let length = 0
    file.ondata = (error, chunk, final) => {
      if (error) throw new PostServiceError(400, 'ZIP 解压失败')
      total += chunk.length
      length += chunk.length
      if (total > MAX_IMPORT_BYTES) {
        file.terminate()
        throw new PostServiceError(413, 'ZIP 解压后不能超过 20 MiB')
      }
      chunks.push(chunk)
      if (final) {
        const result = new Uint8Array(length)
        let at = 0
        for (const item of chunks) {
          result.set(item, at)
          at += item.length
        }
        files[file.name] = result
      }
    }
    file.start()
  })
  archive.register(UnzipInflate)
  for (let start = 0; start < data.length; start += 4096)
    archive.push(data.subarray(start, start + 4096), start + 4096 >= data.length)
  if (Object.keys(files).length !== [...names].filter((name) => !name.endsWith('/')).length)
    throw new PostServiceError(400, 'ZIP 文件不完整')
  return files
}

export async function preflightImport(
  filename: string,
  data: Uint8Array,
  database: AppDatabase = defaultDb,
): Promise<ImportCandidate[]> {
  if (data.length > MAX_IMPORT_BYTES) throw new PostServiceError(413, '导入文件不能超过 20 MiB')
  let files: Record<string, Uint8Array>
  try {
    if (/\.zip$/i.test(filename)) files = readArchive(data)
    else if (/\.mdx?$/i.test(filename)) files = { [filename]: data }
    else throw new PostServiceError(400, '请选择 .md、.mdx 或 .zip 文件')
  } catch (error) {
    if (error instanceof PostServiceError) throw error
    throw new PostServiceError(400, '无法读取导入文件')
  }
  if (files['manifest.json']) {
    try {
      const manifest: unknown = JSON.parse(strFromU8(files['manifest.json']))
      if (!manifest || typeof manifest !== 'object' || !('version' in manifest) || manifest.version !== 1)
        throw new Error('不支持此格式版本')
    } catch {
      throw new PostServiceError(400, '导出包版本不受支持')
    }
    delete files['manifest.json']
  }
  const entries = Object.entries(files)
  if (!entries.length || entries.length > MAX_IMPORT_POSTS) throw new PostServiceError(400, '请选择 1 至 100 篇文章')
  const existing = new Set((await listManagedPosts(database)).map((post) => post.slug))
  const seen = new Set<string>()
  const results: ImportCandidate[] = []
  for (const [name, bytes] of entries) {
    const candidate: ImportCandidate = { filename: name, errors: [], warnings: [] }
    results.push(candidate)
    try {
      if (bytes.length > 1024 * 1024 + 65536) throw new Error('单篇文件过大')
      const source = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
      const { data: meta, content } = matter(source, {
        engines: {
          yaml: (text: string) => load(text, { schema: JSON_SCHEMA }) as object,
          js: () => {
            throw new Error('仅支持 YAML frontmatter')
          },
          json: () => {
            throw new Error('仅支持 YAML frontmatter')
          },
        },
      })
      const parts = name.replace(/\\/g, '/').split('/')
      const fallback =
        parts.at(-1)?.replace(/\.mdx?$/i, '') === 'post' && parts.length > 1
          ? parts.at(-2)
          : parts.at(-1)?.replace(/\.mdx?$/i, '')
      const {
        slug,
        draft: _draft,
        status: _status,
        formatVersion: _version,
        ...fields
      } = meta as Record<string, unknown>
      if (_version !== undefined && _version !== 1) throw new Error('导出文件版本不受支持')
      for (const field of ['date', 'updatedDate']) {
        if (fields[field] instanceof Date) fields[field] = fields[field].toISOString().slice(0, 10)
      }
      const parsed = postInputSchema.safeParse({ slug: slug ?? fallback, document: { ...fields, content } })
      if (!parsed.success)
        throw new Error(parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('；'))
      candidate.input = parsed.data
      if (existing.has(parsed.data.slug) || seen.has(parsed.data.slug))
        candidate.errors.push('文章地址重复，请修改地址后重新校验')
      seen.add(parsed.data.slug)
      await validatePostMdx(content)
      if (/!?\[[^\]]*\]\((?!https?:|mailto:|\/|#)[^)]+\)/.test(content))
        candidate.warnings.push('正文含相对资源路径，请改用公共资源路径或外部 URL')
    } catch (error) {
      candidate.errors.push(error instanceof Error ? error.message : '文件校验失败')
    }
  }
  return results
}

export async function importPosts(inputs: unknown[], database: AppDatabase = defaultDb): Promise<number> {
  if (!inputs.length || inputs.length > MAX_IMPORT_POSTS) throw new PostServiceError(400, '一次导入 1 至 100 篇文章')
  const data: PostInput[] = []
  let totalBytes = 0
  for (const input of inputs) {
    const parsed = postInputSchema.safeParse(input)
    if (!parsed.success) throw new PostServiceError(400, '导入内容无效，请重新校验文件')
    totalBytes += strToU8(parsed.data.document.content).length
    if (totalBytes > MAX_IMPORT_BYTES) throw new PostServiceError(413, '批量正文不能超过 20 MiB')
    try {
      await validatePostMdx(parsed.data.document.content)
    } catch {
      throw new PostServiceError(400, '正文校验失败，请重新检查导入文件')
    }
    data.push(parsed.data)
  }
  const now = new Date().toISOString()
  try {
    await database.transaction(async (tx) => {
      for (const item of data)
        await tx.insert(posts).values({ id: randomUUID(), ...item, createdAt: now, updatedAt: now })
    })
  } catch (error) {
    if (
      error instanceof Error &&
      /unique constraint|SQLITE_CONSTRAINT_UNIQUE/i.test(error.message + String(error.cause))
    ) {
      throw new PostServiceError(409, '文章地址重复，未导入任何文章')
    }
    throw error
  }
  return data.length
}

export async function exportPosts(
  version: PostExportVersion,
  id?: string,
  database: AppDatabase = defaultDb,
): Promise<{ filename: string; data: Uint8Array; contentType: string }> {
  const selected = id ? [await getManagedPost(id, database)] : await listManagedPosts(database)
  const files: Record<string, Uint8Array> = Object.create(null)
  for (const post of selected) {
    const doc = version === 'published' ? post.published : post.document
    if (!doc) {
      if (id) throw new PostServiceError(400, '此文章没有公开版本')
      continue
    }
    const { content, ...meta } = doc
    const header = matter.stringify('', { formatVersion: 1, slug: post.slug, ...meta }).replace(/\n+$/, '\n')
    files[`${post.slug}/post.mdx`] = strToU8(header + content)
  }
  if (!Object.keys(files).length) throw new PostServiceError(400, '没有可导出的文章')
  if (id) {
    const filename = `${selected[0].slug}.mdx`
    return { filename, data: files[`${selected[0].slug}/post.mdx`], contentType: 'text/markdown; charset=utf-8' }
  }
  files['manifest.json'] = strToU8(
    JSON.stringify({ version: 1, source: version, exportedAt: new Date().toISOString() }),
  )
  return { filename: `posts-${version}.zip`, data: zipSync(files), contentType: 'application/zip' }
}
