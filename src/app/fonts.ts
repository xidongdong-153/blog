import { Newsreader } from 'next/font/google'
import localFont from 'next/font/local'

export const satoshi = localFont({
  src: './fonts/Satoshi-Variable.woff2',
  weight: '300 900',
  display: 'swap',
  variable: '--font-satoshi',
})

export const newsreader = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-serif',
})
