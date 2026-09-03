import type { ComponentProps } from 'react'

interface VideoProps extends ComponentProps<'video'> {
  /** 视频下方的说明文案 */
  caption?: string
}

/**
 * MDX 视频播放组件（RSC）。
 * 提供优雅的圆角边框、控制条与可选说明标题，全端响应式自适应。
 */
export function Video({ src, caption, className = '', ...props }: VideoProps) {
  if (!src) return null

  return (
    <figure className="my-6 flex w-full max-w-full flex-col items-center">
      <video
        src={src}
        controls
        playsInline
        preload="metadata"
        className={`w-full max-w-full rounded-xl border border-border bg-black/5 shadow-xs ${className}`}
        {...props}
      />
      {caption && (
        <figcaption className="mt-2 text-center font-mono text-xs text-muted-foreground">{caption}</figcaption>
      )}
    </figure>
  )
}
