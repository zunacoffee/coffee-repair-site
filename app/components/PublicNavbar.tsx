import Link from 'next/link'

export default function PublicNavbar() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4 sm:px-10 lg:px-16">
        <Link href="/" className="text-xl font-semibold tracking-tight">
          <span style={{ color: '#0D1B2A' }}>Cafe</span>
          <span style={{ color: '#B87333' }}> Works</span>
        </Link>

        <nav className="hidden sm:flex items-center gap-7 text-sm font-medium" style={{ color: '#0D1B2A' }}>
          <Link href="/" className="transition hover:opacity-70">
            Home
          </Link>
          <Link href="/#services" className="transition hover:opacity-70">
            Services
          </Link>
          <Link href="/pricing" className="transition hover:opacity-70">
            Pricing
          </Link>
        </nav>

        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          style={{ backgroundColor: '#B87333' }}
        >
          Login
        </Link>
      </div>
    </header>
  )
}
