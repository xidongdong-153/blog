/* eslint-disable next/no-img-element */
'use client'

import type { ComponentProps } from 'react'
import { useEffect, useState } from 'react'

/**
 * 正文图片灯箱缩放组件（客户端叶子组件）。
 * 点击正文图片平滑唤起居中全屏大图预览，支持 ESC 键与点击背景关闭。
 */
export function ImageZoom({ src, alt = '', className = '', ...props }: ComponentProps<'img'>) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  if (!src) return null

  return (
    <>
      <img
        src={src}
        alt={alt}
        onClick={() => setIsOpen(true)}
        className={`h-auto max-w-full cursor-zoom-in rounded-lg transition-opacity hover:opacity-90 ${className}`}
        loading="lazy"
        {...props}
      />
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-background/80 p-4 backdrop-blur-md"
        >
          <img src={src} alt={alt} className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl" />
        </div>
      )}
    </>
  )
}
