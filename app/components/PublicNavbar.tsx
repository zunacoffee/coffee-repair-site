"use client"

import { useState } from 'react'
import Link from 'next/link'

export default function PublicNavbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  const close = () => setMenuOpen(false)

  return (
    <header className="sticky top-0 z-50 bg-[#0D1B2A] border-b border-white/[0.07]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 sm:px-10 lg:px-16">
        <Link href="/" className="text-xl font-semibold tracking-tight shrink-0" onClick={close}>
          <span className="text-white">Cafe</span>
          <span style={{ color: '#B87333' }}> Works</span>
        </Link>

        <nav className="hidden sm:flex items-center gap-7 text-sm font-medium">
          <Link href="/" className="text-[#E8ECF0]/60 hover:text-white transition">Home</Link>
          <Link href="/#services" className="text-[#E8ECF0]/60 hover:text-white transition">Services</Link>
          <Link href="/pricing" className="text-[#E8ECF0]/60 hover:text-white transition">Pricing</Link>
          <Link href="/service-request" className="text-[#E8ECF0]/60 hover:text-white transition">Request a Repair</Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden sm:inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: '#B87333' }}
          >
            Login
          </Link>

          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="sm:hidden p-2.5 rounded-md text-[#E8ECF0]/60 hover:bg-white/10 transition"
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="sm:hidden border-t border-white/10 bg-[#0D1B2A] px-6 pb-5 pt-3 flex flex-col gap-1">
          <Link href="/" onClick={close} className="block rounded-lg px-3 py-3 text-sm font-medium text-[#E8ECF0]/60 hover:text-white hover:bg-white/5 transition">
            Home
          </Link>
          <Link href="/#services" onClick={close} className="block rounded-lg px-3 py-3 text-sm font-medium text-[#E8ECF0]/60 hover:text-white hover:bg-white/5 transition">
            Services
          </Link>
          <Link href="/pricing" onClick={close} className="block rounded-lg px-3 py-3 text-sm font-medium text-[#E8ECF0]/60 hover:text-white hover:bg-white/5 transition">
            Pricing
          </Link>
          <Link href="/service-request" onClick={close} className="block rounded-lg px-3 py-3 text-sm font-medium text-[#E8ECF0]/60 hover:text-white hover:bg-white/5 transition">
            Request a Repair
          </Link>
          <div className="mt-2 pt-3 border-t border-white/10">
            <Link
              href="/login"
              onClick={close}
              className="flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: '#B87333' }}
            >
              Login
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
