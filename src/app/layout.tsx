import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'

export const metadata: Metadata = {
  title: 'Junta - Group Restaurant Sharing for Travelers',
  description: 'Discover and share amazing restaurants with your travel group',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-slate-900 text-white min-h-screen">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
