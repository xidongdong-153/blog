'use client'

import type { Ref, RefObject } from 'react'
import * as React from 'react'
import './overlay-motion.css'

interface MotionContext {
  trigger: React.RefObject<HTMLElement | null>
  explicit?: RefObject<HTMLElement | null>
  originRect?: RefObject<DOMRect | null>
}
const Context = React.createContext<MotionContext | null>(null)

/** 为浮层提供动效来源与可选的矩形快照。 */
export function OverlayMotionRoot({
  children,
  triggerRef,
  originRectRef,
}: {
  children: React.ReactNode
  triggerRef?: RefObject<HTMLElement | null>
  originRectRef?: RefObject<DOMRect | null>
}) {
  const trigger = React.useRef<HTMLElement | null>(null)
  const value = React.useMemo(
    () => ({ trigger, explicit: triggerRef, originRect: originRectRef }),
    [triggerRef, originRectRef],
  )
  return <Context.Provider value={value}>{children}</Context.Provider>
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') ref(value)
  else if (ref) ref.current = value
}

/** 同步保存触发元素并保留调用方的 ref。 */
export function useOverlayTrigger<T extends HTMLElement>(ref?: Ref<T>) {
  const context = React.useContext(Context)
  return React.useCallback(
    (node: T | null) => {
      if (context) context.trigger.current = node
      assignRef(ref, node)
    },
    [context, ref],
  )
}

/** 关闭时优先执行调用方的焦点处理，否则返回仍可见的触发元素。 */
export function useOverlayReturnFocus(onCloseAutoFocus?: (event: Event) => void) {
  const context = React.useContext(Context)
  return React.useCallback(
    (event: Event) => {
      onCloseAutoFocus?.(event)
      if (event.defaultPrevented) return
      const target = context?.explicit?.current
      if (target?.isConnected && target.getClientRects().length && !target.matches(':disabled')) {
        event.preventDefault()
        target.focus({ preventScroll: true })
      }
    },
    [context, onCloseAutoFocus],
  )
}

/** 等待浮层定位后，从来源展开并在关闭时收回。 */
export function useOverlayContent<T extends HTMLElement>(ref?: Ref<T>) {
  const context = React.useContext(Context)
  const cleanup = React.useRef<(() => void) | null>(null)
  return React.useCallback(
    (node: T | null) => {
      cleanup.current?.()
      cleanup.current = null
      assignRef(ref, node)
      if (!node) return
      let animation: Animation | undefined
      let frame = 0
      let active = true
      let lastState = ''
      let started = false
      let lastTarget: DOMRect | undefined
      const media = window.matchMedia('(prefers-reduced-motion: reduce)')

      const apply = (open: boolean, initial: boolean) => {
        if (!active) return
        started = true
        const snapshot = context?.originRect?.current
        const target = context?.explicit?.current ?? context?.trigger.current
        if (snapshot?.width && snapshot.height) {
          lastTarget = snapshot
        } else if (target?.isConnected) {
          const rect = target.getBoundingClientRect()
          if (rect.width && rect.height) lastTarget = rect
        }
        const originalTransform = getComputedStyle(node).transform
        const originalOpacity = getComputedStyle(node).opacity
        animation?.cancel()
        node.style.transform = 'none'
        node.style.opacity = '1'
        const box = node.getBoundingClientRect()
        const collapsed =
          lastTarget && box.width && box.height
            ? `translate(${lastTarget.left - box.left}px, ${lastTarget.top - box.top}px) scale(${lastTarget.width / box.width}, ${lastTarget.height / box.height})`
            : 'none'
        node.style.transformOrigin = '0 0'
        const from = initial ? collapsed : originalTransform
        const opacity = initial ? '0' : originalOpacity
        const to = open ? 'none' : collapsed
        node.style.transform = to
        node.style.opacity = open ? '1' : '0'
        node.style.visibility = ''
        if (media.matches || document.hidden || typeof node.animate !== 'function') return
        animation = node.animate(
          [
            { transform: from, opacity },
            { transform: to, opacity: open ? '1' : '0' },
          ],
          {
            duration: open ? 300 : 220,
            easing: open ? 'cubic-bezier(.16,1,.3,1)' : 'cubic-bezier(.4,0,.6,1)',
            fill: 'forwards',
          },
        )
        animation.finished.catch(() => {})
      }
      node.style.visibility = 'hidden'
      const state = () => node.dataset.state !== 'closed'
      const isPositioned = () => {
        const wrapper = node.closest<HTMLElement>('[data-radix-popper-content-wrapper]')
        return !wrapper || (node.style.animation !== 'none' && !wrapper.style.transform.includes('-200%'))
      }
      const beginOpen = (deadline: number) => {
        if (!active || !state()) return
        if (isPositioned()) {
          apply(true, true)
        } else if (performance.now() < deadline) {
          frame = requestAnimationFrame(() => beginOpen(deadline))
        } else {
          started = true
          node.style.transform = 'none'
          node.style.opacity = '1'
          node.style.visibility = ''
        }
      }
      const change = () => {
        const current = state() ? 'open' : 'closed'
        if (current === lastState) return
        cancelAnimationFrame(frame)
        const initial = !started
        lastState = current
        if (initial && current === 'open') {
          frame = requestAnimationFrame(() => beginOpen(performance.now() + 500))
        } else if (!isPositioned()) {
          started = true
          node.style.transform = 'none'
          node.style.opacity = current === 'open' ? '1' : '0'
          node.style.visibility = ''
        } else {
          apply(current === 'open', initial)
        }
      }
      const observer = new MutationObserver(change)
      observer.observe(node, { attributes: true, attributeFilter: ['data-state'] })
      change()
      const settle = () => {
        cancelAnimationFrame(frame)
        animation?.cancel()
        node.style.transform = 'none'
        node.style.opacity = state() ? '1' : '0'
        node.style.visibility = ''
      }
      const finishMotion = () => {
        if (media.matches || document.hidden) settle()
      }
      media.addEventListener('change', finishMotion)
      document.addEventListener('visibilitychange', finishMotion)
      window.addEventListener('resize', settle)
      window.visualViewport?.addEventListener('resize', settle)
      cleanup.current = () => {
        active = false
        cancelAnimationFrame(frame)
        observer.disconnect()
        animation?.cancel()
        media.removeEventListener('change', finishMotion)
        document.removeEventListener('visibilitychange', finishMotion)
        window.removeEventListener('resize', settle)
        window.visualViewport?.removeEventListener('resize', settle)
      }
    },
    [context, ref],
  )
}
