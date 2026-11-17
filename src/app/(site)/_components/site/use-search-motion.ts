'use client'

import type { RefObject } from 'react'
import { useLayoutEffect, useRef, useState } from 'react'

/** 搜索浮层从触发按钮展开，退场结束后隐藏；反向切换从当前动画位置继续。 */
export function useSearchMotion(isOpen: boolean, mounted: boolean, triggerRef: RefObject<HTMLButtonElement | null>) {
  const [retained, setRetained] = useState(false)
  const anchorRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const animationsRef = useRef<Animation[]>([])
  const visibleRef = useRef(false)
  const generationRef = useRef(0)

  useLayoutEffect(() => {
    if (!mounted || (!isOpen && !visibleRef.current)) return
    const anchor = anchorRef.current
    const dialog = dialogRef.current
    const content = contentRef.current
    const backdrop = backdropRef.current
    const trigger = triggerRef.current
    if (!anchor || !dialog || !content || !backdrop) return

    const generation = ++generationRef.current
    const wasVisible = visibleRef.current
    const dialogStyle = getComputedStyle(dialog)
    const fromTransform = wasVisible ? dialogStyle.transform : undefined
    const fromOpacity = wasVisible ? dialogStyle.opacity : '0'
    const fromContent = wasVisible ? getComputedStyle(content).opacity : '0'
    const fromBackdrop = wasVisible ? getComputedStyle(backdrop).opacity : '0'
    const fromTrigger = trigger ? getComputedStyle(trigger).opacity : '1'
    animationsRef.current.forEach((animation) => animation.cancel())
    animationsRef.current = []
    visibleRef.current = true
    if (isOpen) setRetained(true)

    const getCollapsedTransform = () => {
      const target = trigger?.getBoundingClientRect()
      const origin = anchor.getBoundingClientRect()
      if (!target || !target.width || !target.height || !origin.width || !origin.height) return 'none'
      return `translate(${target.left - origin.left}px, ${target.top - origin.top}px) scale(${target.width / origin.width}, ${target.height / origin.height})`
    }

    const settle = () => {
      if (generationRef.current !== generation) return
      dialog.style.transform = 'none'
      dialog.style.opacity = isOpen ? '1' : '0'
      content.style.opacity = isOpen ? '1' : '0'
      backdrop.style.opacity = isOpen ? '1' : '0'
      if (trigger) trigger.style.opacity = isOpen ? '0' : ''
      animationsRef.current.forEach((animation) => animation.cancel())
      animationsRef.current = []
      if (!isOpen) {
        visibleRef.current = false
        setRetained(false)
      }
    }

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (motion.matches || document.hidden || typeof dialog.animate !== 'function') {
      settle()
      return
    }

    const duration = isOpen ? 420 : 300
    const collapsed = getCollapsedTransform()
    const shape = dialog.animate(
      [{ transform: fromTransform ?? collapsed }, { transform: isOpen ? 'none' : collapsed }],
      {
        duration,
        easing: isOpen ? 'cubic-bezier(.16,1,.3,1)' : 'cubic-bezier(.4,0,.6,1)',
        fill: 'forwards',
      },
    )
    const surface = dialog.animate(
      isOpen
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
      { duration, fill: 'forwards' },
    )
    const ink = content.animate(
      isOpen
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
      { duration, easing: 'ease-out', fill: 'forwards' },
    )
    const shade = backdrop.animate([{ opacity: fromBackdrop }, { opacity: isOpen ? 1 : 0 }], {
      duration: duration * 0.8,
      easing: 'ease-out',
      fill: 'forwards',
    })
    animationsRef.current = [shape, surface, ink, shade]
    if (trigger) {
      animationsRef.current.push(
        trigger.animate(
          isOpen
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
          { duration, fill: 'forwards' },
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
    window.addEventListener('resize', settle)
    window.visualViewport?.addEventListener('resize', settle)
    motion.addEventListener('change', handleMotionChange)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('resize', settle)
      window.visualViewport?.removeEventListener('resize', settle)
      motion.removeEventListener('change', handleMotionChange)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [isOpen, mounted, triggerRef])

  useLayoutEffect(() => {
    const trigger = triggerRef.current
    return () => {
      generationRef.current++
      animationsRef.current.forEach((animation) => animation.cancel())
      animationsRef.current = []
      if (trigger) trigger.style.opacity = ''
    }
  }, [triggerRef])

  return { present: isOpen || retained, anchorRef, dialogRef, contentRef, backdropRef }
}
