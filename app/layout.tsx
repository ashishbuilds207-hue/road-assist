import type { Metadata } from 'next'
import '@/app/globals.css'
import { Toaster } from '@/components/ui/toaster'
import { ToastSonner } from '@/components/ui/sonner'
import { AppProviders } from '@/lib/providers/app-providers'

export const metadata: Metadata = {
  title: 'RSA Platform | Truck Roadside Assistance',
  description:
    'Commercial truck roadside assistance platform for drivers, fleets, providers, and operations.',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="scroll-smooth">
            <body className="bg-[#07111c] font-plus-jakarta text-sm/[22px] font-normal text-gray antialiased">
        <AppProviders>
          {children}
          <Toaster />
          <ToastSonner />
        </AppProviders>
      </body>
    </html>
  )
}
