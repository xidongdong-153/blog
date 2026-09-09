import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

function tryExtensions(filePath) {
  if (fs.existsSync(filePath)) {
    if (fs.statSync(filePath).isDirectory()) {
      if (fs.existsSync(path.join(filePath, 'index.ts'))) return path.join(filePath, 'index.ts')
      if (fs.existsSync(path.join(filePath, 'index.tsx'))) return path.join(filePath, 'index.tsx')
      if (fs.existsSync(path.join(filePath, 'index.js'))) return path.join(filePath, 'index.js')
    } else {
      return filePath
    }
  }
  for (const ext of ['.ts', '.tsx', '.mts', '.js', '.mjs', '/index.ts', '/index.tsx', '/index.js']) {
    if (fs.existsSync(filePath + ext)) {
      return filePath + ext
    }
  }
  return null
}

export async function resolve(specifier, context, nextResolve) {
  // Mock Next.js 专有模块，供裸 Node 测试环境运行
  if (specifier === 'next/cache') {
    return {
      format: 'module',
      shortCircuit: true,
      url: 'data:text/javascript,export function revalidatePath(){}; export function revalidateTag(){};',
    }
  }

  let targetPath = null
  if (specifier.startsWith('@/')) {
    targetPath = path.resolve(process.cwd(), 'src', specifier.slice(2))
  } else if (specifier.startsWith('./') || specifier.startsWith('../')) {
    if (context.parentURL && context.parentURL.startsWith('file://')) {
      const parentDir = path.dirname(fileURLToPath(context.parentURL))
      targetPath = path.resolve(parentDir, specifier)
    }
  }

  if (targetPath) {
    const matched = tryExtensions(targetPath)
    if (matched) {
      return nextResolve(pathToFileURL(matched).href, context)
    }
  }

  return nextResolve(specifier, context)
}
