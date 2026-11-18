'use client'

import type { RefObject } from 'react'
import { useLayoutEffect, useRef, useState } from 'react'

interface OverlayMotionOptions {
  open: boolean
  ready?: boolean
  triggerRef?: RefObject<HTMLElement | null>
  hideTrigger?: boolean
  duration?: number
  exitDuration?: number
  prepareLayout?: (anchor: HTMLDivElement) => void
}

/** 浮层从真实触发位置展开并收回，保留退出节点，支持动画中途反向和减少动态效果。 */
export function useOverlayMotion({
  open,
  ready = true,
  triggerRef,
  hideTrigger = false,
  duration = 420,
  exitDuration = 300,
  prepareLayout,
}: OverlayMotionOptions) {
  const [retained, setRetained] = useState(false)
  const anchorRef = useRef<HTMLDivElement>(null)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const animationsRef = useRef<Animation[]>([])
  const visibleRef = useRef(false)
  const sourceRef = useRef<HTMLElement | null>(null)
  const sourceRectRef = useRef<DOMRect | null>(null)
  const sourceOpacityRef = useRef('')
  const generationRef = useRef(0)

  useLayoutEffect(() => {
    if (!ready || (!open && !visibleRef.current)) return
    const anchor = anchorRef.current
    const surface = surfaceRef.current
    const content = contentRef.current
    const backdrop = backdropRef.current
    if (!anchor || !surface) return

    const generation = ++generationRef.current
    const wasVisible = visibleRef.current
    if (!wasVisible) {
      sourceRef.current =
        triggerRef?.current ??
        (document.activeElement instanceof HTMLElement && document.activeElement !== document.body
          ? document.activeElement
          : null)
      sourceOpacityRef.current = sourceRef.current?.style.opacity ?? ''
    }
    const trigger = sourceRef.current
    const surfaceStyle = getComputedStyle(surface)
    const fromTransform = wasVisible ? surfaceStyle.transform : undefined
    const fromOpacity = wasVisible ? surfaceStyle.opacity : '0'
    const fromContent = wasVisible && content ? getComputedStyle(content).opacity : '0'
    const fromBackdrop = wasVisible && backdrop ? getComputedStyle(backdrop).opacity : '0'
    const fromTrigger = trigger ? getComputedStyle(trigger).opacity : '1'
    animationsRef.current.forEach((animation) => animation.cancel())
    animationsRef.current = []
    visibleRef.current = true
    if (open) setRetained(true)

    prepareLayout?.(anchor)
    const origin = anchor.getBoundingClientRect()
    const currentSource = triggerRef?.current?.isConnected ? triggerRef.current : trigger
    const currentTarget = currentSource?.isConnected ? currentSource.getBoundingClientRect() : null
    if (currentTarget?.width && currentTarget.height) sourceRectRef.current = currentTarget
    const target = sourceRectRef.current
    const collapsed =
      target && origin.width && origin.height
        ? `translate(${target.left - origin.left}px, ${target.top - origin.top}px) scale(${target.width / origin.width}, ${target.height / origin.height})`
        : `translate(${origin.width / 2}px, ${origin.height / 2}px) scale(0.02)`

    let removeListeners = () => {}
    const settle = () => {
      if (generationRef.current !== generation) return
      removeListeners()
      surface.style.transform = 'none'
      surface.style.opacity = open ? '1' : '0'
      if (content) content.style.opacity = open ? '1' : '0'
      if (backdrop) backdrop.style.opacity = open ? '1' : '0'
      if (trigger && hideTrigger) trigger.style.opacity = open ? '0' : sourceOpacityRef.current
      animationsRef.current.forEach((animation) => animation.cancel())
      animationsRef.current = []
      if (!open) {
        visibleRef.current = false
        sourceRectRef.current = null
        setRetained(false)
      }
    }

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (motion.matches || document.hidden || typeof surface.animate !== 'function') {
      settle()
      return
    }

    const time = open ? duration : exitDuration
    const shape = surface.animate(
      [{ transform: fromTransform ?? collapsed }, { transform: open ? 'none' : collapsed }],
      {
        duration: time,
        easing: open ? 'cubic-bezier(.16,1,.3,1)' : 'cubic-bezier(.4,0,.6,1)',
        fill: 'forwards',
      },
    )
    const paint = surface.animate(
      open
        ? [
            { opacity: fromOpacity, offset: 0 },
            { opacity: 1, offset: 0.12 },
            { opacity: 1, offset: 1 },
          ]
        : [
            { opacity: fromOpacity, offset: 0 },
            { opacity: fromOpacity, offset: 0.8 },
            { opacity: 0, offset: 1 },
          ],
      { duration: time, fill: 'forwards' },
    )
    animationsRef.current = [shape, paint]
    if (content) {
      animationsRef.current.push(
        content.animate(
          open
            ? [
                { opacity: fromContent, offset: 0 },
                { opacity: fromContent, offset: 0.2 },
                { opacity: 1, offset: 1 },
              ]
            : [
                { opacity: fromContent, offset: 0 },
                { opacity: 0, offset: 0.35 },
                { opacity: 0, offset: 1 },
              ],
          { duration: time, easing: 'ease-out', fill: 'forwards' },
        ),
      )
    }
    if (backdrop) {
      animationsRef.current.push(
        backdrop.animate([{ opacity: fromBackdrop }, { opacity: open ? 1 : 0 }], {
          duration: time * 0.8,
          easing: 'ease-out',
          fill: 'forwards',
        }),
      )
    }
    if (trigger && hideTrigger) {
      animationsRef.current.push(
        trigger.animate(
          open
            ? [
                { opacity: fromTrigger, offset: 0 },
                { opacity: 0, offset: 0.12 },
                { opacity: 0, offset: 1 },
              ]
            : [
                { opacity: fromTrigger, offset: 0 },
                { opacity: fromTrigger, offset: 0.8 },
                { opacity: 1, offset: 1 },
              ],
          { duration: time, fill: 'forwards' },
        ),
      )
    }
    void shape.finished.then(settle).catch(() => {})

    const handleMotionChange = () => {
      if (motion.matches) settle()
    }
    const handleVisibility = () => {
      if (document.hidden) settle()
    }
    removeListeners = () => {
      window.removeEventListener('resize', settle)
      window.visualViewport?.removeEventListener('resize', settle)
      motion.removeEventListener('change', handleMotionChange)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
    window.addEventListener('resize', settle)
    window.visualViewport?.addEventListener('resize', settle)
    motion.addEventListener('change', handleMotionChange)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => removeListeners()
  }, [open, ready, triggerRef, hideTrigger, duration, exitDuration, prepareLayout])

  useLayoutEffect(() => {
    return () => {
      generationRef.current++
      animationsRef.current.forEach((animation) => animation.cancel())
      animationsRef.current = []
      if (hideTrigger && sourceRef.current) sourceRef.current.style.opacity = sourceOpacityRef.current
    }
  }, [hideTrigger])

  return { present: open || retained, anchorRef, surfaceRef, contentRef, backdropRef }
}
