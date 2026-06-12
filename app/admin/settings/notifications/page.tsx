'use client'
import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'

type Settings = Record<string, string>

const DEFAULTS: Settings = {
  notify_email:                'tyson@zunacoffee.com',
  notify_new_service_request:  'true',
  notify_new_customer:         'true',
  notify_low_stock:            'true',
  notify_invoice_paid:         'true',
  notify_work_order_completed: 'true',
}

const TOGGLE_ITEMS = [
  { key: 'notify_new_service_request',  label: 'New Service Request',   desc: 'Email when a customer submits a new service request.' },
  { key: 'notify_new_customer',         label: 'New Customer Signup',   desc: 'Email when a new customer creates an account.' },
  { key: 'notify_low_stock',            label: 'Low Stock Alert',       desc: 'Email when a part drops to or below the low stock threshold.' },
  { key: 'notify_invoice_paid',         label: 'Invoice Paid',          desc: 'Email when a customer pays an invoice.' },
  { key: 'notify_work_order_completed', label: 'Work Order Completed',  desc: 'Email the customer automatically when a work order is marked completed.' },
]

export default function NotificationsPage() {
  const [settings, setSettings] = useState<Settings>({ ...DEFAULTS })
  const [loading, setLoading]   = useState(true)
  const [saving,  setSaving]    = useState(false)
  const [msg,     setMsg]       = useState('')
  const [ok,      setOk]        = useState(false)

  useEffect(() => {
    fetch('/api/admin/site-settings', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.settings) setSettings(prev => ({ ...prev, ...d.settings }))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const set = useCallback((key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setMsg('')
  }, [])

  const toggle = useCallback((key: string) => {
    setSettings(prev => ({ ...prev, [key]: prev[key] === 'true' ? 'false' : 'true' }))
    setMsg('')
  }, [])

  async function handleSave() {
    setSaving(true); setMsg('')
    const keys = ['notify_email', ...TOGGLE_ITEMS.map(t => t.key)]
    const payload: Settings = {}
    keys.forEach(k => { payload[k] = settings[k] ?? '' })
    const res  = await fetch('/api/admin/site-settings', {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    setSaving(false)
    if (res.ok) { setOk(true); setMsg('Notification settings saved.'); setTimeout(() => setMsg(''), 3000) }
    else        { setOk(false); setMsg(data.error ?? 'Save failed.') }
  }

  if (loading) {
    return <div className="min-h-screen bg-[#E8ECF0] flex items-center justify-center text-[#7A8898]">Loading…</div>
  }

  return (
    <div className="min-h-screen bg-[#E8ECF0] p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link href="/admin/settings" className="inline-flex items-center gap-1 text-sm font-medium text-[#7A8898] hover:text-[#0D1B2A] transition">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            Back
          </Link>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#7A8898] mt-3">Settings</p>
          <h1 className="text-2xl font-bold text-[#0D1B2A] mt-1">Notification Settings</h1>
          <p className="text-sm text-[#7A8898] mt-1">Configure which events trigger email notifications and where they are sent.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
          {/* Notification email */}
          <div>
            <label className="block text-xs font-semibold text-[#7A8898] uppercase tracking-wide mb-1">Admin Notification Email</label>
            <input
              type="email"
              value={settings.notify_email ?? ''}
              onChange={e => set('notify_email', e.target.value)}
              placeholder="tyson@zunacoffee.com"
              className="w-full border border-[#E8ECF0] rounded-xl px-3 py-2.5 text-sm text-[#0D1B2A] focus:outline-none focus:ring-2 focus:ring-[#B87333]"
            />
            <p className="text-xs text-[#7A8898] mt-1">All admin alert emails are sent to this address.</p>
          </div>

          <div className="border-t border-[#E8ECF0] pt-4">
            <p className="text-sm font-semibold text-[#0D1B2A] mb-3">Email Triggers</p>
            <div className="space-y-1">
              {TOGGLE_ITEMS.map(item => (
                <div key={item.key} className="flex items-center justify-between py-3 border-b border-[#E8ECF0] last:border-0">
                  <div>
                    <p className="text-sm font-medium text-[#0D1B2A]">{item.label}</p>
                    <p className="text-xs text-[#7A8898] mt-0.5">{item.desc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle(item.key)}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ml-4 ${settings[item.key] === 'true' ? 'bg-[#B87333]' : 'bg-[#E8ECF0]'}`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${settings[item.key] === 'true' ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#B87333] hover:opacity-90 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            {msg && <p className={`text-sm ${ok ? 'text-green-700' : 'text-red-600'}`}>{msg}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
