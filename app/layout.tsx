import type { Metadata } from 'next'
import { siteConfig } from '@/site.config'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: siteConfig.title,
    template: `%s - ${siteConfig.title}`,
  },
  description: siteConfig.description,
}

/**
 * 根布局。防闪烁脚本必须在 body 之前执行：
 * 先读 localStorage，没有再跟系统偏好，给 <html> 挂 .dark。
 * 内联脚本不走 React 事件，不受 hydration 限制。
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
