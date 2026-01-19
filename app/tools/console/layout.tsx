import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Screeps 控制台 | Screeps Tools',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}

