import type { Metadata } from 'next'
import { siteConfig } from '@/site.config'
import { cormorantGaramond, newsreader, satoshi } from './fonts'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: `%s - ${siteConfig.title}`,
  },
  description: siteConfig.description,
  alternates: {
    canonical: './',
    types: {
      'application/rss+xml': '/rss.xml',
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
}

/**
 * 根布局。防闪烁脚本必须在 body 之前执行：
 * 先读 localStorage，没有再跟系统偏好，给 <html> 挂 .dark。
 * 内联脚本不走 React 事件，不受 hydration 限制。
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="zh-CN"
      className={`${satoshi.variable} ${cormorantGaramond.variable} ${newsreader.variable} [scrollbar-gutter:stable]`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fontsapi.zeoseven.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fontsapi.zeoseven.com/256/main/result.css" />
        <link rel="stylesheet" href="https://fontsapi.zeoseven.com/442/main/result.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/cn-fontsource-lxgw-wen-kai-screen/font.css" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var r=document.documentElement;function get(k){try{return localStorage.getItem(k)}catch(e){return null}}var t=get('theme');var theme=t==='light'||t==='dark'?t:'system';r.dataset.theme=theme;var isDark=false;try{isDark=theme==='dark'||(theme==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches)}catch(e){isDark=theme==='dark'}r.classList.toggle('dark',isDark);r.dataset.backdropFx=get('site-backdrop-fx')==='off'?'off':'on'})()`,
          }}
        />
      </head>
      <body className="min-h-screen antialiased data-[scroll-locked]:mr-0! data-[scroll-locked]:[--removed-body-scroll-bar-size:0px]!">
        {children}
      </body>
    </html>
  )
}
