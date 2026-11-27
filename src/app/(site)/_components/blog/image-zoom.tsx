/* eslint-disable next/no-img-element */
'use client'

import type { ComponentProps } from 'react'
import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { lockOverlayScroll } from '../site/overlay-scroll-lock'
import { useOverlayMotion } from '../site/use-overlay-motion'

interface ImageZoomProps extends ComponentProps<'img'> {
  'data-caption'?: string
  caption?: string
}

/**
 * 正文图片灯箱缩放组件。
 * 点击正文图片平滑唤起和纸柔雾全屏预览，通过 Portal 挂载避免破坏段落 DOM 结构，支持 ESC 与点击背景关闭。
 * 若图片带有图注（`data-caption` / `caption`），在灯箱底部同步展示。
 */
export function ImageZoom({
  src,
  alt = '',
  className = '',
  onClick,
  onKeyDown,
  caption: captionProp,
  'data-caption': dataCaption,
  ...props
}: ImageZoomProps) {
  const caption = (dataCaption ?? captionProp ?? '').trim()
  const [isOpen, setIsOpen] = useState(false)
  const imageRef = useRef<HTMLElement | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const { present, anchorRef, surfaceRef, backdropRef } = useOverlayMotion({
    open: isOpen,
    triggerRef: imageRef,
    hideTrigger: true,
  })

  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        setIsOpen(false)
      }
    }

    const frame = window.requestAnimationFrame(() => closeRef.current?.focus({ preventScroll: true }))
    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [isOpen])

  useEffect(() => {
    if (!present) return
    return lockOverlayScroll()
  }, [present])

  useEffect(() => {
    if (!isOpen && imageRef.current?.isConnected) imageRef.current.focus({ preventScroll: true })
  }, [isOpen])

  if (!src) return null

  return (
    <>
      <img
        {...props}
        src={src}
        alt={alt}
        role="button"
        tabIndex={props.tabIndex ?? 0}
        aria-label={alt ? `放大图片：${alt}` : '放大图片'}
        onClick={(event) => {
          onClick?.(event)
          if (event.defaultPrevented) return
          imageRef.current = event.currentTarget
          setIsOpen(true)
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event)
          if (!event.defaultPrevented && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault()
            imageRef.current = event.currentTarget
            setIsOpen(true)
          }
        }}
        className={`h-auto max-w-full cursor-zoom-in rounded-lg border border-hair transition-opacity hover:opacity-92 ${className}`}
        loading={props.loading ?? 'lazy'}
      />
      {present &&
        createPortal(
          <div
            role="dialog"
            aria-modal={isOpen ? true : undefined}
            aria-hidden={!isOpen}
            inert={!isOpen}
            aria-label={alt || '图片大图预览'}
            onClick={() => setIsOpen(false)}
            className={`fixed inset-0 z-[100] flex cursor-zoom-out items-center justify-center p-4 ${!isOpen ? 'pointer-events-none' : ''}`}
          >
            <div ref={backdropRef} aria-hidden="true" className="absolute inset-0 bg-background/92 backdrop-blur-md" />
            <button
              ref={closeRef}
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="关闭大图预览"
              className="fixed top-4 right-5 z-10 flex size-10 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              <X className="size-4.5" />
            </button>

            <div ref={anchorRef} className="relative w-fit max-w-[90vw]">
              <div
                ref={surfaceRef}
                className="flex origin-top-left flex-col items-center"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={src}
                  alt={alt}
                  className={`block max-w-full cursor-default rounded-md object-contain shadow-[0_18px_48px_rgba(20,23,22,0.22)] ${
                    caption ? 'max-h-[82dvh]' : 'max-h-[88dvh]'
                  }`}
                />
                {caption && (
                  <p className="mt-3 max-w-[80vw] text-center text-xs leading-relaxed text-muted-foreground">
                    {caption}
                  </p>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
