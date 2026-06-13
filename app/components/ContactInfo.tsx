"use client"

import { useEffect, useState } from 'react'

const MONO = 'font-[family-name:var(--font-ibm-plex-mono)]'

export default function ContactInfo() {
  const [settings, setSettings] = useState<{ phone?: string; email?: string; business_hours?: string }>({})

  useEffect(() => {
    fetch('/api/public-settings')
      .then(r => r.json())
      .then(d => setSettings(d.settings ?? {}))
  }, [])

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-8 space-y-6">
      <div>
        <p className={`${MONO} text-[10px] tracking-widest text-[#B87333]`}>// PHONE</p>
        <p className="mt-2 text-2xl font-bold text-white">{settings.phone || '(555) 012-3456'}</p>
      </div>
      <div className="border-t border-white/10 pt-6">
        <p className={`${MONO} text-[10px] tracking-widest text-[#B87333]`}>// EMAIL</p>
        <a href={`mailto:${settings.email || 'hello@cafeworks.com'}`} className="mt-2 block text-lg font-semibold text-white hover:text-[#B87333] transition">
          {settings.email || 'hello@cafeworks.com'}
        </a>
      </div>
      <div className="border-t border-white/10 pt-6">
        <p className={`${MONO} text-[10px] tracking-widest text-[#B87333]`}>// HOURS</p>
        <p className="mt-2 text-sm text-[#E8ECF0]/60">{settings.business_hours || 'Mon – Fri · 8:00 AM – 5:00 PM'}</p>
      </div>
    </div>
  )
}
