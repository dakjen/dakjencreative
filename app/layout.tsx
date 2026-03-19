import type { Metadata } from 'next'
import './globals.css'
import Providers from '@/components/Providers'

export const metadata: Metadata = {
  title: 'DakJen Creative — Dashboard',
  description: 'DakJen Creative Business Command Center',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
