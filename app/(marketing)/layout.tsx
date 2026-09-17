import type { ReactNode } from 'react'

/** Public marketing shell — no admin sidebar/header */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
