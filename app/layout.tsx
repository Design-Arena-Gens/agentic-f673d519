import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI Shorts Maker',
  description: 'Create and upload AI-generated shorts to YouTube automatically',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
