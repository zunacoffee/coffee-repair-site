'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const FALLBACK = {
  public_business_name: 'Cafe Works',
  phone: '',
  email: '',
  address: '',
}

export default function PublicFooter() {
  const [info, setInfo] = useState(FALLBACK)

  useEffect(() => {
    fetch('/api/public-settings')
      .then(r => r.json())
      .then(d => { if (d.settings) setInfo(s => ({ ...s, ...d.settings })) })
      .catch(() => {})
  }, [])

  const name = info.public_business_name || 'Cafe Works'

  return (
    <footer style={{ backgroundColor: '#0D1B2A' }} className="text-[#7A8898]">
      <div className="mx-auto max-w-7xl px-6 py-14 sm:px-10 lg:px-16">
        <div className="grid gap-10 sm:grid-cols-3">
          <div>
            <p className="text-xl font-semibold tracking-tight">
              <span className="text-white">{name.split(' ')[0]}</span>
              <span style={{ color: '#B87333' }}>{name.includes(' ') ? ' ' + name.split(' ').slice(1).join(' ') : ''}</span>
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
                <Link href="/service-request" className="transition hover:text-white">Request Service</Link>
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
              {info.phone && <li>{info.phone}</li>}
              {info.email && <li>{info.email}</li>}
              {info.address && <li>{info.address}</li>}
              {!info.phone && !info.email && !info.address && (
                <li className="text-[#7A8898]">Contact info coming soon</li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6 text-xs text-[#7A8898]">
          © {name} 2026. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
