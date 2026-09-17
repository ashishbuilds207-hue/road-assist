'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  MapPin,
  Shield,
  Siren,
  Truck,
  Wrench,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const SLIDES = [
  {
    src: '/images/marketing/hero-truck-roadside.png',
    eyebrow: 'Commercial trucks only',
    title: 'Roadside help when your truck stops.',
    subtitle:
      'Dispatch mobile RSA for semis, trailers, and heavy commercial vehicles across the USA.',
  },
  {
    src: '/images/marketing/hero-mobile-repair.png',
    eyebrow: 'Live dispatch & repair',
    title: 'From breakdown to rolling again.',
    subtitle:
      'Providers accept jobs in real time. Technicians go en route with live status for fleets and drivers.',
  },
  {
    src: '/images/marketing/hero-fleet-dispatch.png',
    eyebrow: 'Fleet operations',
    title: 'One platform for drivers, fleets & shops.',
    subtitle:
      'Cases, estimates, approvals, invoices, and ratings — connected end to end for truck RSA.',
  },
]

const PORTALS = [
  {
    href: '/register?role=driver',
    label: 'Driver',
    description:
      'Phone OTP → documents → truck → admin approval before RSA requests.',
    icon: Truck,
  },
  {
    href: '/register?role=company',
    label: 'Company / Fleet',
    description: 'Business docs, MC/USDOT — pending approval before fleet ops.',
    icon: Building2,
  },
  {
    href: '/register?role=provider',
    label: 'Service Provider',
    description:
      'Services, radius & docs — only ACTIVE providers appear to drivers.',
    icon: Wrench,
  },
]

export default function MarketingHomePage() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length)
    }, 6500)
    return () => clearInterval(t)
  }, [paused])

  const slide = SLIDES[index]

  return (
    <div className="min-h-screen bg-[#07111c] text-white">
      {/* Top nav */}
      <header className="absolute inset-x-0 top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="grid size-9 place-content-center rounded-lg bg-amber-500 text-[#07111c] shadow-lg shadow-amber-500/30 transition group-hover:scale-105">
              <Truck className="size-5" strokeWidth={2.4} />
            </span>
            <span className="font-gilroy text-lg font-extrabold tracking-tight sm:text-xl">
              RSA <span className="text-amber-400">PLATFORM</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-white/80 md:flex">
            <a href="#how-it-works" className="transition hover:text-white">
              How it works
            </a>
            <a href="#portals" className="transition hover:text-white">
              Portals
            </a>
            <a href="#coverage" className="transition hover:text-white">
              Coverage
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/admin/login">
              <Button
                type="button"
                variant="outline"
                className="hidden !bg-transparent !text-white ring-primary hover:!bg-primary/20 sm:inline-flex"
              >
                Admin
              </Button>
            </Link>
            <Link href="/login">
              <Button
                type="button"
                variant="default"
                className="bg-primary text-white hover:bg-[#2A4DD7]"
              >
                Sign in
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero slider — full bleed */}
      <section
        className="relative flex min-h-[100svh] items-end overflow-hidden pb-16 pt-28 sm:items-center sm:pb-24"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {SLIDES.map((s, i) => (
          <div
            key={s.src}
            className={cn(
              'absolute inset-0 transition-opacity duration-[1200ms] ease-out',
              i === index ? 'opacity-100' : 'opacity-0'
            )}
            aria-hidden={i !== index}
          >
            <Image
              src={s.src}
              alt=""
              fill
              priority={i === 0}
              sizes="100vw"
              className={cn(
                'object-cover transition-transform duration-[7000ms] ease-out',
                i === index ? 'scale-105' : 'scale-100'
              )}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#07111c]/95 via-[#07111c]/70 to-[#07111c]/25" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#07111c] via-transparent to-[#07111c]/40" />
          </div>
        ))}

        {/* animated grid accent */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:56px_56px] animate-rsa-grid" />

        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <Badge className="mb-4 border-0 bg-primary/20 text-blue-200 animate-rsa-fade-up">
              Truck & trailer roadside assistance
            </Badge>
            <p
              key={`eye-${index}`}
              className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-amber-400 animate-rsa-fade-up"
            >
              {slide.eyebrow}
            </p>
            <h1
              key={`title-${index}`}
              className="font-gilroy text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl animate-rsa-fade-up"
            >
              {slide.title}
            </h1>
            <p
              key={`sub-${index}`}
              className="mt-4 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg animate-rsa-fade-up-delay"
            >
              {slide.subtitle}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center animate-rsa-fade-up-delay">
              <Link href="/register?role=driver" className="w-full sm:w-auto">
                <Button
                  type="button"
                  size="extralarge"
                  variant="default"
                  className="w-full bg-primary text-white shadow-lg shadow-primary/40 hover:bg-[#2A4DD7] sm:w-auto"
                >
                  <Siren className="size-5" />
                  I Need Truck Assistance
                </Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <Button
                  type="button"
                  size="extralarge"
                  variant="outline"
                  className="w-full !bg-transparent !text-white ring-2 ring-primary hover:!bg-primary hover:!text-white sm:w-auto"
                >
                  Continue to login
                </Button>
              </Link>
            </div>

            <p className="mt-4 text-xs text-white/50">
              Passenger cars are not supported. This platform is for commercial
              trucks and trailers only.
            </p>
          </div>

          {/* Slide controls */}
          <div className="mt-10 flex items-center gap-3">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Show slide ${i + 1}`}
                onClick={() => setIndex(i)}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-500',
                  i === index
                    ? 'w-10 bg-amber-400'
                    : 'w-4 bg-white/30 hover:bg-white/50'
                )}
              />
            ))}
            <span className="ml-2 text-xs font-semibold text-white/45">
              {String(index + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')}
            </span>
          </div>
        </div>
      </section>

      {/* Portal cards */}
      <section id="portals" className="relative border-t border-white/10 bg-[#0a1624] py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-10 max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
              Sign in by role
            </p>
            <h2 className="mt-2 font-gilroy text-3xl font-bold text-white sm:text-4xl">
              Register or continue
            </h2>
            <p className="mt-3 text-white/65">
              Register with phone OTP from the platform database, submit documents
              and location, then an admin activates your account.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {PORTALS.map((p, i) => {
              const Icon = p.icon
              return (
                <Link
                  key={p.href}
                  href={p.href}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition duration-500 hover:-translate-y-1 hover:border-amber-400/40 hover:bg-white/[0.06]"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="mb-5 inline-flex rounded-xl bg-amber-500/15 p-3 text-amber-400 transition group-hover:scale-110">
                    <Icon className="size-6" />
                  </div>
                  <h3 className="font-gilroy text-xl font-bold text-white">
                    {p.label}
                  </h3>
                  <p className="mt-2 text-sm text-white/60">{p.description}</p>
                  <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-400">
                    Continue
                    <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                  </span>
                </Link>
              )
            })}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/admin/login">
              <Button
                type="button"
                variant="default"
                className="bg-primary text-white hover:bg-[#2A4DD7]"
              >
                <Shield className="size-4" />
                Admin secure login
              </Button>
            </Link>
            <Link href="/login">
              <Button
                type="button"
                variant="outline"
                className="!bg-transparent !text-white ring-white/30 hover:!bg-white/10"
              >
                Existing user sign in
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-white/10 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
            Workflow
          </p>
          <h2 className="mt-2 font-gilroy text-3xl font-bold sm:text-4xl">
            Built for truck roadside reality
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: '01',
                title: 'Driver requests help',
                body: 'Smart emergency flow: problem, safety, location, truck, photos.',
              },
              {
                step: '02',
                title: 'Provider matched',
                body: 'Rule-based matching for truck type, service, and availability.',
              },
              {
                step: '03',
                title: 'Tech en route',
                body: 'Live status for driver, company, and operations — no refresh.',
              },
              {
                step: '04',
                title: 'Repair & invoice',
                body: 'Estimate approval, repair evidence, invoice validation, ratings.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent p-5"
              >
                <p className="font-gilroy text-2xl font-extrabold text-amber-400/80">
                  {item.step}
                </p>
                <h3 className="mt-3 font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-white/60">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Coverage strip */}
      <section
        id="coverage"
        className="relative overflow-hidden border-t border-white/10"
      >
        <div className="absolute inset-0">
          <Image
            src="/images/marketing/hero-fleet-dispatch.png"
            alt=""
            fill
            className="object-cover opacity-30"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[#07111c]/85" />
        </div>
        <div className="relative mx-auto grid max-w-6xl gap-8 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
              USA truck network
            </p>
            <h2 className="mt-2 font-gilroy text-3xl font-bold sm:text-4xl">
              Fleet RSA with dispatch-grade control
            </h2>
            <ul className="mt-6 space-y-3 text-sm text-white/75">
              {[
                'Semi, tractor, box truck, reefer, flatbed, dry van & more',
                'Live operations map for admins',
                'Company authorization rules for estimates',
                'Phone OTP from platform database · admin activation required',
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-amber-400" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <MapPin className="size-5 text-amber-400" />
              <div>
                <h3 className="font-semibold text-white">Ready to demo?</h3>
                <p className="mt-1 text-sm text-white/65">
                  New users register with phone OTP from the database, upload
                  documents, pin location, then wait for admin activation.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link href="/register">
                    <Button
                      type="button"
                      variant="default"
                      className="bg-primary text-white hover:bg-[#2A4DD7]"
                    >
                      Register
                      <ArrowRight className="size-4" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button
                      type="button"
                      variant="outline"
                      className="!bg-transparent !text-white ring-white/40"
                    >
                      Sign in
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#050c14] py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 text-sm text-white/45 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {new Date().getFullYear()} RSA Platform · Commercial truck
            roadside assistance
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/login" className="hover:text-white">
              Login
            </Link>
            <Link href="/admin/login" className="hover:text-white">
              Admin
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
