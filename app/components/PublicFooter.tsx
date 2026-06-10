import Link from 'next/link'

export default function PublicFooter() {
  return (
    <footer style={{ backgroundColor: '#0D1B2A' }} className="text-[#A8B8C8]">
      <div className="mx-auto max-w-7xl px-6 py-14 sm:px-10 lg:px-16">
        <div className="grid gap-10 sm:grid-cols-3">
          <div>
            <p className="text-xl font-semibold tracking-tight">
              <span className="text-white">Cafe</span>
              <span style={{ color: '#B87333' }}> Works</span>
            </p>
            <p className="mt-3 text-sm leading-6">
              Expert coffee equipment repair and maintenance for cafes that can't afford downtime.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#B87333' }}>
              Quick links
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link href="/pricing" className="transition hover:text-white">Pricing</Link>
              </li>
              <li>
                <Link href="/login" className="transition hover:text-white">Login</Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#B87333' }}>
              Contact
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li>(555) 012-3456</li>
              <li>hello@cafeworks.com</li>
              <li>123 Roast Ave, Seattle, WA</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6 text-xs text-[#7A8898]">
          © Cafe Works 2026. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
