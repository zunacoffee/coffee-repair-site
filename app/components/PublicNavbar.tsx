import Link from 'next/link'

export default function PublicNavbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/95 px-6 py-4 shadow-sm shadow-black/10 backdrop-blur-xl sm:px-10 lg:px-16">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6">
        <Link href="/" className="text-xl font-semibold tracking-tight text-white">
          Cafe Works
        </Link>

        <nav className="flex flex-wrap items-center gap-6 text-sm font-medium text-slate-200">
          <Link href="/" className="transition hover:text-white">
            Home
          </Link>
          <Link href="/#services" className="transition hover:text-white">
            Services
          </Link>
          <Link href="/pricing" className="transition hover:text-white">
            Pricing
          </Link>
        </nav>

        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          Login
        </Link>
      </div>
    </header>
  )
}
