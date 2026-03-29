import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { Toaster } from '@/components/ui/toaster'
import { CSPostHogProvider } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Redmine Time Tracker',
  description: 'Redmine Time Tracker',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider afterSignOutUrl="/">
      <html lang="en">
        <body className={inter.className}>
          <CSPostHogProvider>
            <Toaster />
            <main>{children}</main>
          </CSPostHogProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
