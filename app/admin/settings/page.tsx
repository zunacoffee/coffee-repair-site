'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState, useCallback, isValidElement, cloneElement } from 'react'

type Settings = Record<string, string>

const DEFAULTS: Settings = {
  business_name:    'Cafe Works',
  owner_name:       '',
  phone:            '',
  email:            '',
  address:          '',
  business_hours:   'Mon-Fri 8am-5pm',
  emergency_phone:  '',
  labor_rate_weekday: '80',
  labor_rate_weekend: '120',
  parts_markup_pct:   '30',
  parts_low_stock_threshold: '1',
  public_business_name: 'Cafe Works',
  logo_url:             '',
  tax_rate:             '0',
  invoice_due_days:     '30',
  invoice_footer_notes: '',
  service_area:         '',
  online_payments_enabled: 'true',
  booking_advance_days: '30',
}

function ToggleField({ label, description, value, onChange }: {
  label: string; description?: string; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#E8ECF0] last:border-0">
      <div>
        <p className="text-sm font-medium text-[#0D1B2A]">{label}</p>
        {description && <p className="text-xs text-[#7A8898] mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${value ? 'bg-[#B87333]' : 'bg-[#E8ECF0]'}`}
      >
        <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  )
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  const id = 'settings-' + label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-[#7A8898] uppercase tracking-wide mb-1">{label}</label>
      {isValidElement(children) ? cloneElement(children as React.ReactElement<{ id?: string }>, { id }) : children}
      {hint && <p className="text-xs text-[#7A8898] mt-1">{hint}</p>}
    </div>
  )
}

function Input({ value, onChange, type = 'text', placeholder, min, step }: {
  value: string; onChange: (v: string) => void; type?: string; placeholder?: string; min?: string; step?: string
}) {
  return (
    <input
      type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} min={min} step={step}
      className="w-full border border-[#E8ECF0] rounded-xl px-3 py-2.5 text-sm text-[#0D1B2A] focus:outline-none focus:ring-2 focus:ring-[#B87333]"
    />
  )
}

type SaveState = { saving: boolean; msg: string; ok: boolean }
const IDLE: SaveState = { saving: false, msg: '', ok: false }

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({ ...DEFAULTS })
  const [loading, setLoading]   = useState(true)

  const [biz,         setBiz]         = useState<SaveState>(IDLE)
  const [labor,       setLabor]       = useState<SaveState>(IDLE)
  const [parts,       setParts]       = useState<SaveState>(IDLE)
  const [invoice,     setInvoice]     = useState<SaveState>(IDLE)
  const [serviceArea, setServiceArea] = useState<SaveState>(IDLE)
  const [payments,    setPayments]    = useState<SaveState>(IDLE)
  const [scheduling,  setScheduling]  = useState<SaveState>(IDLE)
  const [brand,       setBrand]       = useState<SaveState>(IDLE)

  useEffect(() => {
    fetch('/api/admin/site-settings', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.settings) setSettings((prev) => ({ ...prev, ...d.settings }))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const set = useCallback((key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }, [])

  const toggle = useCallback((key: string) => {
    setSettings(prev => ({ ...prev, [key]: prev[key] === 'true' ? 'false' : 'true' }))
  }, [])

  async function save(keys: string[], setSt: (s: SaveState) => void) {
    setSt({ saving: true, msg: '', ok: false })
    const payload: Settings = {}
    keys.forEach(k => { payload[k] = settings[k] ?? '' })
    const res  = await fetch('/api/admin/site-settings', {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (res.ok) {
      setSt({ saving: false, msg: 'Saved successfully.', ok: true })
      setTimeout(() => setSt(IDLE), 3000)
    } else {
      setSt({ saving: false, msg: data.error ?? 'Save failed.', ok: false })
    }
  }

  const SaveBtn = ({ st, onSave }: { st: SaveState; onSave: () => void }) => (
    <div className="flex items-center gap-3 pt-2">
      <button
        onClick={onSave}
        disabled={st.saving}
        className="bg-[#B87333] hover:opacity-90 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60"
      >
        {st.saving ? 'Saving…' : 'Save Changes'}
      </button>
      {st.msg && <p className={`text-sm ${st.ok ? 'text-green-700' : 'text-red-600'}`}>{st.msg}</p>}
    </div>
  )

  if (loading) {
    return <div className="min-h-screen bg-[#E8ECF0] flex items-center justify-center text-[#7A8898]">Loading…</div>
  }

  return (
    <div className="min-h-screen bg-[#E8ECF0] p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <Link href="/admin" className="inline-flex items-center gap-1 text-sm font-medium text-[#7A8898] hover:text-[#0D1B2A] transition">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              Back
            </Link>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#7A8898] mt-3">Settings</p>
            <h1 className="text-2xl font-bold text-[#0D1B2A] mt-1">General Settings</h1>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Link href="/admin/settings/plans" className="inline-flex items-center gap-1.5 rounded-xl border border-[#E8ECF0] bg-white px-4 py-2 text-sm font-semibold text-[#0D1B2A] hover:border-[#B87333]/40 hover:text-[#B87333] transition shadow-sm">
              Maintenance Plans
            </Link>
            <Link href="/admin/settings/notifications" className="inline-flex items-center gap-1.5 rounded-xl border border-[#E8ECF0] bg-white px-4 py-2 text-sm font-semibold text-[#0D1B2A] hover:border-[#B87333]/40 hover:text-[#B87333] transition shadow-sm">
              Notifications
            </Link>
          </div>
        </div>

        {/* ── Business Info ── */}
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-[#0D1B2A] text-base">Business Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Business Name">
              <Input value={settings.business_name} onChange={v => set('business_name', v)} placeholder="Cafe Works" />
            </Field>
            <Field label="Owner Name">
              <Input value={settings.owner_name} onChange={v => set('owner_name', v)} placeholder="e.g. Tyson" />
            </Field>
            <Field label="Phone Number">
              <Input value={settings.phone} onChange={v => set('phone', v)} placeholder="(555) 000-0000" type="tel" />
            </Field>
            <Field label="Email Address">
              <Input value={settings.email} onChange={v => set('email', v)} placeholder="hello@cafeworks.com" type="email" />
            </Field>
            <Field label="Emergency Phone">
              <Input value={settings.emergency_phone} onChange={v => set('emergency_phone', v)} placeholder="(555) 000-0000" type="tel" />
            </Field>
          </div>
          <Field label="Physical Address">
            <Input value={settings.address} onChange={v => set('address', v)} placeholder="123 Main St, City, State 00000" />
          </Field>
          <Field label="Business Hours">
            <Input value={settings.business_hours} onChange={v => set('business_hours', v)} placeholder="Mon-Fri 8am-5pm" />
          </Field>
          <SaveBtn st={biz} onSave={() => save(['business_name','owner_name','phone','email','address','business_hours','emergency_phone'], setBiz)} />
        </div>

        {/* ── Labor Rates ── */}
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-[#0D1B2A] text-base">Labor Rates</h2>
          <p className="text-xs text-[#7A8898]">These rates are used when calculating work order labor costs.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Weekday Rate ($/hr)">
              <Input value={settings.labor_rate_weekday} onChange={v => set('labor_rate_weekday', v)} type="number" min="0" step="0.01" placeholder="80" />
            </Field>
            <Field label="Weekend / Emergency Rate ($/hr)">
              <Input value={settings.labor_rate_weekend} onChange={v => set('labor_rate_weekend', v)} type="number" min="0" step="0.01" placeholder="120" />
            </Field>
          </div>
          <div className="rounded-xl bg-[#E8ECF0] px-4 py-3 text-xs text-[#7A8898]">
            Weekday: <strong className="text-[#0D1B2A]">${settings.labor_rate_weekday || '80'}/hr</strong>
            {' · '}
            Weekend: <strong className="text-[#0D1B2A]">${settings.labor_rate_weekend || '120'}/hr</strong>
          </div>
          <SaveBtn st={labor} onSave={() => save(['labor_rate_weekday','labor_rate_weekend'], setLabor)} />
        </div>

        {/* ── Parts Settings ── */}
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-[#0D1B2A] text-base">Parts Settings</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Default Markup (%)" hint="Applied when sell price is left blank on a new part.">
              <Input value={settings.parts_markup_pct} onChange={v => set('parts_markup_pct', v)} type="number" min="0" step="1" placeholder="30" />
            </Field>
            <Field label="Low Stock Threshold" hint="Parts at or below this quantity trigger an alert.">
              <Input value={settings.parts_low_stock_threshold} onChange={v => set('parts_low_stock_threshold', v)} type="number" min="0" step="1" placeholder="1" />
            </Field>
          </div>
          <SaveBtn st={parts} onSave={() => save(['parts_markup_pct','parts_low_stock_threshold'], setParts)} />
        </div>

        {/* ── Invoice Settings ── */}
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-[#0D1B2A] text-base">Invoice Settings</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Tax Rate (%)" hint="Applied to all invoices. Set to 0 for no tax.">
              <Input value={settings.tax_rate} onChange={v => set('tax_rate', v)} type="number" min="0" step="0.01" placeholder="0" />
            </Field>
            <Field label="Payment Due (days)" hint="e.g. 30 means payment due 30 days after invoice date.">
              <Input value={settings.invoice_due_days} onChange={v => set('invoice_due_days', v)} type="number" min="0" step="1" placeholder="30" />
            </Field>
          </div>
          <Field label="Invoice Footer Notes" hint="Appears at the bottom of every invoice.">
            <textarea
              value={settings.invoice_footer_notes}
              onChange={e => set('invoice_footer_notes', e.target.value)}
              rows={3}
              placeholder="Thank you for your business!"
              className="w-full border border-[#E8ECF0] rounded-xl px-3 py-2.5 text-sm text-[#0D1B2A] placeholder-[#7A8898] resize-none focus:outline-none focus:ring-2 focus:ring-[#B87333]"
            />
          </Field>
          <SaveBtn st={invoice} onSave={() => save(['tax_rate', 'invoice_due_days', 'invoice_footer_notes'], setInvoice)} />
        </div>

        {/* ── Service Area ── */}
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-[#0D1B2A] text-base">Service Area</h2>
          <Field label="Service Area Description" hint="Shown on the public service request form.">
            <Input value={settings.service_area} onChange={v => set('service_area', v)} placeholder="Shenandoah Valley, VA — within 50 miles of Harrisonburg" />
          </Field>
          <SaveBtn st={serviceArea} onSave={() => save(['service_area'], setServiceArea)} />
        </div>

        {/* ── Payments ── */}
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-[#0D1B2A] text-base">Payments</h2>
          <ToggleField
            label="Enable Online Payments"
            description="Allow customers to pay invoices online via Stripe."
            value={settings.online_payments_enabled === 'true'}
            onChange={() => toggle('online_payments_enabled')}
          />
          <SaveBtn st={payments} onSave={() => save(['online_payments_enabled'], setPayments)} />
        </div>

        {/* ── Scheduling ── */}
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-[#0D1B2A] text-base">Scheduling</h2>
          <Field label="Booking Window (days)" hint="How many days ahead customers can schedule appointments.">
            <Input value={settings.booking_advance_days} onChange={v => set('booking_advance_days', v)} type="number" min="1" step="1" placeholder="30" />
          </Field>
          <SaveBtn st={scheduling} onSave={() => save(['booking_advance_days'], setScheduling)} />
          <p className="text-xs text-[#7A8898]">
            To block specific dates from scheduling, use the{' '}
            <Link href="/admin/calendar" className="text-[#B87333] font-medium hover:underline">Calendar</Link> page.
          </p>
        </div>

        {/* ── Branding ── */}
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-[#0D1B2A] text-base">Branding</h2>
          <Field label="Business Name (Public Site)" hint="Shown in the header and footer of the public-facing website.">
            <Input value={settings.public_business_name} onChange={v => set('public_business_name', v)} placeholder="Cafe Works" />
          </Field>
          <Field label="Logo URL" hint="Direct URL to your logo image (PNG or SVG recommended).">
            <Input value={settings.logo_url} onChange={v => set('logo_url', v)} placeholder="https://example.com/logo.png" />
          </Field>
          {settings.logo_url && (
            <div className="rounded-xl border border-[#E8ECF0] p-4 flex items-center gap-4">
              <Image
                src={settings.logo_url}
                alt="Logo preview"
                width={200}
                height={48}
                unoptimized
                className="h-12 w-auto object-contain"
              />
              <p className="text-xs text-[#7A8898]">Logo preview</p>
            </div>
          )}
          <SaveBtn st={brand} onSave={() => save(['public_business_name','logo_url'], setBrand)} />
        </div>
      </div>
    </div>
  )
}
