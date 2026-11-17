/* eslint-disable next/no-img-element */
'use client'

import type { ComponentProps } from 'react'
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

/**
 * 正文图片灯箱缩放组件。
 * 点击正文图片平滑唤起和纸柔雾全屏预览，支持 ESC 与点击背景关闭。
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

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  if (!src) return null

  return (
    <>
      <img
        src={src}
        alt={alt}
        onClick={() => setIsOpen(true)}
        className={`h-auto max-w-full cursor-zoom-in rounded-lg border border-hair transition-opacity hover:opacity-92 ${className}`}
        loading="lazy"
        {...props}
      />
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt || '图片大图预览'}
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-[100] flex cursor-zoom-out items-center justify-center bg-background/92 p-4 backdrop-blur-md animate-[modal-fade-in_240ms_cubic-bezier(0.32,0.72,0,1)_both] motion-reduce:animate-none"
        >
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="关闭大图预览"
            className="fixed right-5 top-4 z-10 flex size-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
          >
            <X className="size-4.5" />
          </button>

          <img
            src={src}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] max-w-[90vw] cursor-default rounded-md object-contain shadow-[0_18px_48px_rgba(20,23,22,0.22)] animate-[modal-scale-in_320ms_cubic-bezier(0.32,0.72,0,1)_both] motion-reduce:animate-none"
          />
        </div>
      )}
    </>
  )
}
