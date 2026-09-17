import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#07111c] px-4 text-center text-white">
      <p className="font-gilroy text-5xl font-extrabold text-amber-400">404</p>
      <h1 className="font-gilroy text-2xl font-bold">Page not found</h1>
      <p className="max-w-md text-sm text-white/65">
        That page isn’t part of the RSA Platform. Return home or sign in to a
        portal.
      </p>
      <div className="flex gap-3">
        <Link href="/">
          <Button type="button" className="bg-amber-500 text-[#07111c] hover:bg-amber-400">
            Home
          </Button>
        </Link>
        <Link href="/login">
          <Button
            type="button"
            variant="outline-general"
            className="border-white/20 bg-transparent text-white hover:bg-white/10"
          >
            Login
          </Button>
        </Link>
      </div>
    </div>
  )
}
