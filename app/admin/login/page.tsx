'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AtSign, Loader2, Lock, Shield, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { AuthService } from '@/services/AuthService'

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0B1220] text-white">
          Loading…
        </div>
      }
    >
      <AdminLoginInner />
    </Suspense>
  )
}

function AdminLoginInner() {
  const router = useRouter()
  const search = useSearchParams()
  const redirect = search.get('redirect') || '/admin/approvals'

  const [email, setEmail] = useState('admin@gmail.com')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Invalid email or password')
        setLoading(false)
        return
      }

      await AuthService.activateRegisteredSession({
        id: data.admin.id || 'admin-fixed-1',
        phone: '+15555550001',
        email: data.admin.email,
        full_name: data.admin.full_name || 'Platform Admin',
        role: 'ADMIN',
      })

      router.replace(redirect)
    } catch {
      setError('Login failed. Try again.')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B1220] p-4">
      <Card className="w-full max-w-md space-y-5 border-white/10 bg-[#121a2b] p-6 text-white shadow-xl">
        <CardHeader className="space-y-2 p-0">
          <Badge className="w-fit border-0 bg-primary/20 text-blue-200">
            Admin access
          </Badge>
          <h1 className="flex items-center gap-2 font-gilroy text-xl font-bold">
            <Shield className="size-5 text-primary" />
            Admin login
          </h1>
          <p className="text-sm text-white/60">
            Email and password login for administrators only. Separate from
            driver / company phone OTP.
          </p>
        </CardHeader>

        <CardContent className="p-0">
          <form className="space-y-4" onSubmit={submit}>
            {error && (
              <div className="flex gap-2 rounded-lg bg-red-500/15 px-3 py-2 text-xs text-red-300">
                <TriangleAlert className="size-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/80">
                Email
              </label>
              <Input
                type="email"
                variant="input-form"
                className="bg-white text-black"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@gmail.com"
                iconRight={<AtSign className="size-4" />}
                autoComplete="username"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/80">
                Password
              </label>
              <Input
                type="password"
                variant="input-form"
                className="bg-white text-black"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                iconRight={<Lock className="size-4" />}
                autoComplete="current-password"
                required
              />
            </div>

            <Button
              type="submit"
              variant="default"
              size="large"
              className="w-full"
              disabled={loading}
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              Sign in to admin panel
            </Button>
          </form>

          <Link
            href="/"
            className="mt-4 block text-center text-xs text-white/50 hover:text-white"
          >
            ← Back to website
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
