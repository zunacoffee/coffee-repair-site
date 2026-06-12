"use client"

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'
import DateSlotPicker from '../components/DateSlotPicker'

const MONO = 'font-[family-name:var(--font-ibm-plex-mono)]'

// ─── Types ───────────────────────────────────────────────────────────────────

type Customer  = { id: number; full_name: string; email: string; phone: string; address: string; street: string | null; city: string | null; state: string | null; zip: string | null }
type Equipment = { id: number; equipment_type: string; brand: string; model: string; serial_number: string }
type RepairJob = { id: number; equipment_type: string; status: string; description: string; created_at: string; completed_at: string | null }
type WorkOrder = { id: number; work_order_number: string; status: string; problem_description: string; grand_total: number; created_at: string; completed_at: string | null; equipment_list: { equipment_type: string; brand: string; model: string } | null }
type Plan      = { id: number; plan_name: string; status: string; price: number; renewal_date: string | null; next_visit_date?: string | null; next_visit_slot?: string | null; is_custom?: boolean; stripe_payment_link?: string | null; description?: string | null; visit_frequency?: number | null; features?: string[] }
type Invoice   = { id: number; amount: number; status: string; due_date: string | null; description: string; created_at: string }
type Section   = 'invoices' | 'equipment' | 'plan' | 'repairs' | 'account' | null
type Nav       = 'home' | 'repairs' | 'schedule' | 'account'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const JOB_STATUS: Record<string, string> = {
  pending:     'bg-gray-100 text-gray-700',
  in_progress: 'bg-amber-100 text-amber-800',
  completed:   'bg-green-100 text-green-700',
}
const WO_STATUS: Record<string, string> = {
  open:        'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-800',
  completed:   'bg-green-100 text-green-700',
  cancelled:   'bg-gray-100 text-gray-500',
}
const INV_STATUS: Record<string, string> = {
  paid:    'bg-green-100 text-green-700',
  unpaid:  'bg-red-100 text-red-700',
  overdue: 'bg-orange-100 text-orange-800',
}

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00')
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

function fmt(dateStr: string) {
  return new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'))
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EmptyState({ icon, title, body, cta }: { icon: React.ReactNode; title: string; body: string; cta?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center px-4">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#E8ECF0] text-[#7A8898]">{icon}</div>
      <p className="text-sm font-semibold text-[#0D1B2A]">{title}</p>
      <p className="mt-1 text-xs text-[#7A8898] max-w-xs">{body}</p>
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  )
}

function StatusBadge({ status, map }: { status: string; map: Record<string, string> }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()

  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState<string | null>(null)
  const [userEmail,     setUserEmail]     = useState<string | null>(null)
  const [customer,      setCustomer]      = useState<Customer | null>(null)
  const [equipment,     setEquipment]     = useState<Equipment[]>([])
  const [repairJobs,    setRepairJobs]    = useState<RepairJob[]>([])
  const [workOrders,    setWorkOrders]    = useState<WorkOrder[]>([])
  const [plan,          setPlan]          = useState<Plan | null>(null)
  const [invoices,      setInvoices]      = useState<Invoice[]>([])
  const [activeSection, setActiveSection] = useState<Section>(null)
  const [activeNav,     setActiveNav]     = useState<Nav>('home')
  const [portalLoading, setPortalLoading] = useState(false)
  const [portalError,   setPortalError]   = useState<string | null>(null)

  // Equipment form state
  const [showEqForm, setShowEqForm] = useState(false)
  const [eqType,     setEqType]     = useState('')
  const [eqBrand,    setEqBrand]    = useState('')
  const [eqModel,    setEqModel]    = useState('')
  const [eqSerial,   setEqSerial]   = useState('')
  const [eqSaving,   setEqSaving]   = useState(false)
  const [eqError,    setEqError]    = useState<string | null>(null)
  const [eqSuccess,  setEqSuccess]  = useState<string | null>(null)

  // PM scheduling state
  const [showSchedulePicker, setShowSchedulePicker] = useState(false)
  const [pmDate,             setPmDate]             = useState<string | null>(null)
  const [pmSlot,             setPmSlot]             = useState<'morning' | 'afternoon' | null>(null)
  const [pmSaving,           setPmSaving]           = useState(false)
  const [pmError,            setPmError]            = useState<string | null>(null)
  const [pmSuccess,          setPmSuccess]          = useState<string | null>(null)

  // Profile form state
  const [profileName,   setProfileName]   = useState('')
  const [profilePhone,  setProfilePhone]  = useState('')
  const [profileStreet, setProfileStreet] = useState('')
  const [profileCity,   setProfileCity]   = useState('')
  const [profileState,  setProfileState]  = useState('')
  const [profileZip,    setProfileZip]    = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg,    setProfileMsg]    = useState<string | null>(null)
  const [profileError,  setProfileError]  = useState<string | null>(null)

  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let mounted = true

    async function load() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/login')
        return
      }

      setUserEmail(session.user.email ?? null)

      const res = await fetch('/api/customer/portal', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (res.status === 401) { router.replace('/login'); return }

      const json = await res.json()
      if (!mounted) return

      if (!res.ok) { setError(json.error ?? 'Failed to load your portal.'); setLoading(false); return }

      setCustomer(json.customer ?? null)
      setEquipment(json.equipment ?? [])
      setRepairJobs(json.repairJobs ?? [])
      setWorkOrders(json.workOrders ?? [])
      setPlan(json.plan ?? null)
      setInvoices(json.invoices ?? [])

      if (json.customer) {
        setProfileName(json.customer.full_name ?? '')
        setProfilePhone(json.customer.phone ?? '')
        setProfileStreet(json.customer.street ?? '')
        setProfileCity(json.customer.city ?? '')
        setProfileState(json.customer.state ?? '')
        setProfileZip(json.customer.zip ?? '')
      }

      setLoading(false)
    }

    load()
    return () => { mounted = false }
  }, [router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleManagePlan = async () => {
    setPortalLoading(true)
    setPortalError(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const res  = await fetch('/api/create-portal-session', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } })
    const data = await res.json()
    setPortalLoading(false)
    if (!res.ok) { setPortalError(data.error || 'Unable to open billing portal.'); return }
    window.location.href = data.url
  }

  const handleAddEquipment = async (e: React.FormEvent) => {
    e.preventDefault()
    setEqError(null)
    setEqSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const res  = await fetch('/api/customer/equipment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ equipment_type: eqType, brand: eqBrand, model: eqModel, serial_number: eqSerial }),
    })
    const data = await res.json()
    setEqSaving(false)
    if (!res.ok) { setEqError(data.error ?? 'Failed to add equipment.'); return }
    setEquipment((prev) => [...prev, data.equipment])
    setShowEqForm(false)
    setEqType(''); setEqBrand(''); setEqModel(''); setEqSerial('')
    setEqSuccess('Equipment added successfully.')
  }

  const handleSchedulePM = async () => {
    if (!pmDate || !pmSlot) { setPmError('Please select a date and time slot.'); return }
    setPmSaving(true); setPmError(null); setPmSuccess(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const res  = await fetch('/api/customer/pm-visit', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ next_visit_date: pmDate, next_visit_slot: pmSlot }),
    })
    const data = await res.json()
    setPmSaving(false)
    if (!res.ok) { setPmError(data.error ?? 'Failed to schedule visit.'); return }
    setPlan((prev) => prev ? { ...prev, next_visit_date: pmDate, next_visit_slot: pmSlot } : prev)
    setShowSchedulePicker(false)
    setPmSuccess('Visit scheduled! A confirmation email has been sent to you.')
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileSaving(true); setProfileMsg(null); setProfileError(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const res  = await fetch('/api/customer/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ full_name: profileName, phone: profilePhone, street: profileStreet, city: profileCity, state: profileState, zip: profileZip }),
    })
    const data = await res.json()
    setProfileSaving(false)
    if (!res.ok) { setProfileError(data.error ?? 'Unable to save changes.'); return }
    setCustomer(data.customer)
    setProfileMsg('Profile updated successfully.')
  }

  const openRepairs  = workOrders.filter((wo) => wo.status !== 'completed' && wo.status !== 'cancelled')
  const openInvoices = invoices.filter((i) => i.status !== 'paid')
  const displayName  = customer?.full_name ?? userEmail ?? 'there'

  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = displayName.split(' ')[0]

  const activityItems = [
    ...workOrders.map((wo) => ({
      key: `wo-${wo.id}`,
      iconColor: wo.status === 'completed' ? 'green' : wo.status === 'in_progress' ? 'amber' : 'blue',
      title: `WO ${wo.work_order_number}`,
      subtitle: wo.problem_description || '',
      status: wo.status,
      statusMap: WO_STATUS,
      date: wo.created_at,
    })),
    ...invoices.map((inv) => ({
      key: `inv-${inv.id}`,
      iconColor: 'copper',
      title: inv.description || 'Invoice',
      subtitle: `$${Number(inv.amount).toFixed(2)}`,
      status: inv.status,
      statusMap: INV_STATUS,
      date: inv.created_at,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5)

  const showSection = (s: Section) => {
    setActiveSection(s)
    setTimeout(() => sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E8ECF0]">
        <div className="flex items-center gap-3 text-[#7A8898]">
          <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Loading your portal…</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E8ECF0] px-4">
        <div className="max-w-md rounded-2xl bg-white p-8 shadow text-center">
          <p className="text-sm font-semibold text-red-600">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 text-sm text-[#B87333] hover:underline">Try again</button>
        </div>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#E8ECF0] pb-32">

      {/* ── Header ── */}
      <header className="bg-[#0D1B2A] px-5 pt-12 pb-14">
        <div className="mx-auto max-w-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className={`${MONO} text-[10px] font-semibold uppercase tracking-widest text-[#7A8898]`}>
                Cafe Works
              </p>
              <h1 className="mt-1 text-2xl font-bold text-white leading-tight">
                {greeting}, {firstName}
              </h1>
              {plan && (
                <span className={`mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  plan.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {plan.plan_name}
                </span>
              )}
            </div>
            <button
              onClick={handleSignOut}
              className="rounded-xl border border-white/20 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 transition"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* ── No customer record ── */}
      {!customer && (
        <div className="mx-auto max-w-lg px-4 -mt-6">
          <div className="rounded-2xl bg-white border border-black/5 shadow-lg p-8 text-center">
            <svg className="mx-auto h-10 w-10 text-[#7A8898]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <h2 className="mt-4 text-lg font-bold text-[#0D1B2A]">Account not linked yet</h2>
            <p className="mt-2 text-sm text-[#7A8898]">
              Your login ({userEmail}) hasn&apos;t been linked to a customer record. Contact Cafe Works to complete your setup.
            </p>
            <Link href="/service-request" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#B87333] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition">
              Submit a service request
            </Link>
          </div>
        </div>
      )}

      {customer && (
        <div className="mx-auto max-w-lg px-4 -mt-6 space-y-4">

          {/* ── Hero card ── */}
          <div className="rounded-2xl bg-white border border-black/5 shadow-lg p-5">
            {plan?.next_visit_date ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`${MONO} text-[10px] font-semibold uppercase tracking-wide text-[#7A8898]`}>
                      Next PM Visit
                    </p>
                    <p className="mt-1 text-2xl font-bold text-[#0D1B2A]">
                      {new Date(plan.next_visit_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                    {plan.next_visit_slot && (
                      <p className="text-xs text-[#7A8898] mt-0.5">
                        {plan.next_visit_slot === 'morning' ? 'Morning (8am–12pm)' : 'Afternoon (12pm–5pm)'}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`${MONO} text-[10px] font-semibold uppercase tracking-wide text-[#7A8898]`}>
                      {(() => {
                        const d = daysUntil(plan.next_visit_date!)
                        if (d < 0) return 'Overdue'
                        if (d === 0) return 'Today'
                        return `In ${d} day${d !== 1 ? 's' : ''}`
                      })()}
                    </p>
                    <button
                      onClick={() => { setShowSchedulePicker(true); setPmDate(null); setPmSlot(null); setPmError(null); setPmSuccess(null) }}
                      className="mt-2 rounded-xl bg-[#B87333] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition"
                    >
                      Reschedule
                    </button>
                  </div>
                </div>

                {plan.renewal_date && (() => {
                  const today   = new Date()
                  const renewal = new Date(plan.renewal_date + 'T00:00:00')
                  const start   = new Date(renewal)
                  start.setMonth(start.getMonth() - 1)
                  const total   = renewal.getTime() - start.getTime()
                  const elapsed = today.getTime() - start.getTime()
                  const pct     = Math.min(100, Math.max(0, (elapsed / total) * 100))
                  return (
                    <div className="mt-4">
                      <div className="flex justify-between mb-1.5">
                        <p className={`${MONO} text-[9px] font-semibold uppercase tracking-wide text-[#7A8898]`}>Plan period</p>
                        <p className={`${MONO} text-[9px] font-semibold uppercase tracking-wide text-[#7A8898]`}>{Math.round(pct)}%</p>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#E8ECF0]">
                        <div className="h-1.5 rounded-full bg-[#B87333] transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-1 text-[10px] text-[#7A8898]">Renews {fmt(plan.renewal_date)}</p>
                    </div>
                  )
                })()}

                {pmSuccess && (
                  <div className="mt-3 rounded-xl bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700">
                    {pmSuccess}
                  </div>
                )}
              </>
            ) : plan ? (
              <>
                <p className={`${MONO} text-[10px] font-semibold uppercase tracking-wide text-[#7A8898]`}>My Plan</p>
                <p className="mt-1 text-xl font-bold text-[#0D1B2A]">{plan.plan_name}</p>
                <p className="mt-1 text-sm text-[#7A8898]">No visit scheduled yet</p>
                <button
                  onClick={() => { setShowSchedulePicker(true); setPmDate(null); setPmSlot(null); setPmError(null); setPmSuccess(null) }}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#B87333] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Schedule visit
                </button>
                {pmSuccess && (
                  <div className="mt-3 rounded-xl bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700">
                    {pmSuccess}
                  </div>
                )}
              </>
            ) : (
              <>
                <p className={`${MONO} text-[10px] font-semibold uppercase tracking-wide text-[#7A8898]`}>No active plan</p>
                <p className="mt-1 text-xl font-bold text-[#0D1B2A]">Get Covered</p>
                <p className="mt-1 text-sm text-[#7A8898]">Subscribe to a maintenance plan for regular PM visits and priority service.</p>
                <Link
                  href="/pricing"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#B87333] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition"
                >
                  View plans
                </Link>
              </>
            )}
          </div>

          {/* ── Quick actions ── */}
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => { setShowSchedulePicker(true); setPmDate(null); setPmSlot(null); setPmError(null); setPmSuccess(null) }}
              className="flex flex-col items-center gap-1.5 rounded-2xl bg-white border border-black/5 shadow-sm py-3.5 px-2 hover:bg-[#E8ECF0] transition"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E8ECF0]">
                <svg className="h-[18px] w-[18px] text-[#0D1B2A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className={`${MONO} text-[8px] font-semibold uppercase tracking-wide text-[#0D1B2A] text-center leading-tight`}>Schedule</p>
            </button>

            <Link
              href="/service-request"
              className="flex flex-col items-center gap-1.5 rounded-2xl bg-white border border-black/5 shadow-sm py-3.5 px-2 hover:bg-[#E8ECF0] transition"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#B87333]/10">
                <svg className="h-[18px] w-[18px] text-[#B87333]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                </svg>
              </div>
              <p className={`${MONO} text-[8px] font-semibold uppercase tracking-wide text-[#0D1B2A] text-center leading-tight`}>Repair</p>
            </Link>

            <button
              onClick={() => { setActiveNav('home'); showSection('equipment') }}
              className="flex flex-col items-center gap-1.5 rounded-2xl bg-white border border-black/5 shadow-sm py-3.5 px-2 hover:bg-[#E8ECF0] transition"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E8ECF0]">
                <svg className="h-[18px] w-[18px] text-[#0D1B2A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18" />
                </svg>
              </div>
              <p className={`${MONO} text-[8px] font-semibold uppercase tracking-wide text-[#0D1B2A] text-center leading-tight`}>Equipment</p>
            </button>

            <button
              onClick={() => { setActiveNav('home'); showSection('invoices') }}
              className="flex flex-col items-center gap-1.5 rounded-2xl bg-white border border-black/5 shadow-sm py-3.5 px-2 hover:bg-[#E8ECF0] transition"
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${openInvoices.length > 0 ? 'bg-orange-100' : 'bg-[#E8ECF0]'}`}>
                <svg className={`h-[18px] w-[18px] ${openInvoices.length > 0 ? 'text-orange-500' : 'text-[#0D1B2A]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className={`${MONO} text-[8px] font-semibold uppercase tracking-wide text-center leading-tight ${openInvoices.length > 0 ? 'text-orange-600' : 'text-[#0D1B2A]'}`}>
                {openInvoices.length > 0 ? `Bills (${openInvoices.length})` : 'Invoices'}
              </p>
            </button>
          </div>

          {/* ── Active section content ── */}
          {activeSection && (
            <div ref={sectionRef} className="rounded-2xl bg-white border border-black/5 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8ECF0]">
                <h2 className="text-base font-bold text-[#0D1B2A]">
                  {activeSection === 'repairs'   ? 'Repair History'   :
                   activeSection === 'equipment' ? 'Equipment'        :
                   activeSection === 'plan'      ? 'My Plan'          :
                   activeSection === 'invoices'  ? 'Invoices'         :
                   activeSection === 'account'   ? 'Account'          : ''}
                </h2>
                <button onClick={() => setActiveSection(null)} className="text-[#7A8898] hover:text-[#0D1B2A] transition">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-5">

                {/* ── Repairs section ── */}
                {activeSection === 'repairs' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-[#7A8898]">{workOrders.length + repairJobs.length} total</p>
                      <Link href="/service-request" className="inline-flex items-center gap-1.5 rounded-xl bg-[#B87333] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                        Request repair
                      </Link>
                    </div>
                    {workOrders.length > 0 ? (
                      <div className="space-y-3">
                        {workOrders.map((wo) => (
                          <div key={wo.id} className="rounded-xl border border-[#E8ECF0] p-4 border-l-2 border-l-[#B87333]">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className={`${MONO} text-[10px] font-semibold text-[#B87333]`}>{wo.work_order_number}</p>
                                <p className="mt-0.5 text-sm font-semibold text-[#0D1B2A] truncate">
                                  {wo.equipment_list ? `${wo.equipment_list.brand} ${wo.equipment_list.model}` : wo.problem_description || '—'}
                                </p>
                                {wo.problem_description && wo.equipment_list && (
                                  <p className="text-xs text-[#7A8898] truncate mt-0.5">{wo.problem_description}</p>
                                )}
                              </div>
                              <StatusBadge status={wo.status} map={WO_STATUS} />
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <p className="text-xs text-[#7A8898]">{wo.created_at ? fmt(wo.created_at) : '—'}</p>
                              <p className="text-sm font-bold text-[#0D1B2A]">${Number(wo.grand_total).toFixed(2)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : repairJobs.length > 0 ? (
                      <div className="space-y-3">
                        {repairJobs.map((job) => (
                          <div key={job.id} className="rounded-xl border border-[#E8ECF0] p-4 border-l-2 border-l-[#B87333]">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-[#0D1B2A]">{job.equipment_type}</p>
                                <p className="text-xs text-[#7A8898] truncate mt-0.5">{job.description || '—'}</p>
                              </div>
                              <StatusBadge status={job.status} map={JOB_STATUS} />
                            </div>
                            <p className="mt-2 text-xs text-[#7A8898]">{job.created_at ? fmt(job.created_at) : '—'}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>}
                        title="No repair history"
                        body="Completed and in-progress repairs will appear here."
                        cta={<Link href="/service-request" className="rounded-xl bg-[#B87333] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition">Request a repair</Link>}
                      />
                    )}
                  </div>
                )}

                {/* ── Equipment section ── */}
                {activeSection === 'equipment' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-[#7A8898]">{equipment.length} registered</p>
                      <button
                        onClick={() => { setShowEqForm((v) => !v); setEqError(null); setEqSuccess(null) }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#B87333] px-3 py-1.5 text-xs font-semibold text-[#B87333] hover:bg-[#B87333]/5 transition"
                      >
                        {showEqForm ? 'Cancel' : 'Add equipment'}
                      </button>
                    </div>

                    {eqSuccess && (
                      <div className="mb-4 rounded-xl bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700">{eqSuccess}</div>
                    )}

                    {showEqForm && (
                      <form onSubmit={handleAddEquipment} className="mb-4 rounded-2xl border border-[#E8ECF0] bg-[#E8ECF0] p-4 space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="block text-xs font-semibold text-[#0D1B2A] mb-1">Type</label>
                            <select value={eqType} onChange={(e) => setEqType(e.target.value)} required
                              className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-3 py-2 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none">
                              <option value="" disabled>Select…</option>
                              <option value="Espresso Machine">Espresso Machine</option>
                              <option value="Grinder">Grinder</option>
                              <option value="Brewer">Brewer</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-[#0D1B2A] mb-1">Brand</label>
                            <input type="text" value={eqBrand} onChange={(e) => setEqBrand(e.target.value)} required placeholder="e.g. La Marzocco"
                              className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-3 py-2 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none" />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-[#0D1B2A] mb-1">Model</label>
                            <input type="text" value={eqModel} onChange={(e) => setEqModel(e.target.value)} required placeholder="e.g. Linea Mini"
                              className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-3 py-2 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none" />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-[#0D1B2A] mb-1">Serial <span className="font-normal text-[#7A8898]">(optional)</span></label>
                            <input type="text" value={eqSerial} onChange={(e) => setEqSerial(e.target.value)} placeholder="SN123456"
                              className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-3 py-2 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none" />
                          </div>
                        </div>
                        {eqError && <p className="text-xs text-red-600">{eqError}</p>}
                        <div className="flex gap-2">
                          <button type="button" onClick={() => { setShowEqForm(false); setEqError(null) }}
                            className="rounded-xl border border-[#E8ECF0] px-4 py-2 text-sm font-semibold text-[#7A8898] hover:bg-[#E8ECF0] transition">
                            Cancel
                          </button>
                          <button type="submit" disabled={eqSaving}
                            className="rounded-xl bg-[#B87333] px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition">
                            {eqSaving ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                      </form>
                    )}

                    {equipment.length > 0 ? (
                      <div className="space-y-3">
                        {equipment.map((eq) => (
                          <div key={eq.id} className="rounded-xl border border-[#E8ECF0] p-4 border-l-2 border-l-emerald-500">
                            <p className={`${MONO} text-[10px] font-semibold text-[#B87333]`}>{eq.equipment_type}</p>
                            <p className="mt-0.5 text-sm font-bold text-[#0D1B2A]">{eq.brand} {eq.model}</p>
                            {eq.serial_number && (
                              <p className="mt-0.5 text-xs font-mono text-[#7A8898]">S/N: {eq.serial_number}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : !showEqForm ? (
                      <EmptyState
                        icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18" /></svg>}
                        title="No equipment yet"
                        body="Add your coffee equipment to track service history."
                        cta={
                          <button onClick={() => { setShowEqForm(true); setEqError(null) }}
                            className="rounded-xl bg-[#B87333] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition">
                            Add Equipment
                          </button>
                        }
                      />
                    ) : null}
                  </div>
                )}

                {/* ── Plan section ── */}
                {activeSection === 'plan' && (
                  <div>
                    {plan ? (
                      <div className="space-y-4">
                        <div className="rounded-2xl border border-[#E8ECF0] bg-[#E8ECF0] p-5 space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-lg font-bold text-[#0D1B2A]">{plan.plan_name}</p>
                                {plan.is_custom && (
                                  <span className="inline-flex rounded-full bg-[#B87333]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#B87333]">Custom</span>
                                )}
                              </div>
                              {plan.price ? <p className="text-2xl font-bold text-[#B87333] mt-1">${plan.price}<span className="text-sm font-normal text-[#7A8898]">/mo</span></p> : null}
                              {plan.description && <p className="mt-1 text-sm text-[#7A8898]">{plan.description}</p>}
                            </div>
                            <span className={`shrink-0 inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                              plan.status === 'active'          ? 'bg-green-100 text-green-700' :
                              plan.status === 'pending_payment' ? 'bg-amber-100 text-amber-700' :
                                                                  'bg-[#E8ECF0] text-[#7A8898]'
                            }`}>
                              {plan.status === 'pending_payment' ? 'Pending' : plan.status}
                            </span>
                          </div>

                          {plan.visit_frequency && (
                            <div className="text-sm flex justify-between border-t border-white/60 pt-3">
                              <span className="text-[#7A8898]">Visits per month</span>
                              <span className="font-medium text-[#0D1B2A]">{plan.visit_frequency}</span>
                            </div>
                          )}

                          {plan.features && plan.features.length > 0 && (
                            <ul className="space-y-1.5 border-t border-white/60 pt-3">
                              {plan.features.map((f, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-[#7A8898]">
                                  <span className="mt-0.5 text-[#B87333] shrink-0">•</span>{f}
                                </li>
                              ))}
                            </ul>
                          )}

                          {plan.status !== 'pending_payment' && (
                            <div className="border-t border-white/60 pt-3 space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-[#7A8898]">Next renewal</span>
                                <span className="font-medium text-[#0D1B2A]">{plan.renewal_date ? fmt(plan.renewal_date) : '—'}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-[#7A8898]">Billing</span>
                                <span className="font-medium text-[#0D1B2A]">Monthly</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {plan.status === 'pending_payment' && plan.stripe_payment_link ? (
                          <>
                            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                              Your plan is ready — complete payment to activate it.
                            </div>
                            <a href={plan.stripe_payment_link}
                              className="flex w-full items-center justify-center rounded-xl bg-[#B87333] py-3 text-sm font-semibold text-white hover:opacity-90 transition">
                              Activate My Plan →
                            </a>
                          </>
                        ) : (
                          <>
                            {portalError && <p className="text-sm text-red-600">{portalError}</p>}
                            <button onClick={handleManagePlan} disabled={portalLoading}
                              className="w-full rounded-xl bg-[#B87333] py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition">
                              {portalLoading ? 'Opening billing portal…' : 'Manage plan & billing'}
                            </button>
                            <p className="text-xs text-center text-[#7A8898]">Update payment, cancel, or change your plan via the Stripe billing portal.</p>
                          </>
                        )}
                      </div>
                    ) : (
                      <EmptyState
                        icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
                        title="No active plan"
                        body="Subscribe to a maintenance plan to keep your equipment in peak condition."
                        cta={<Link href="/pricing" className="rounded-xl bg-[#B87333] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition">See plans & pricing</Link>}
                      />
                    )}
                  </div>
                )}

                {/* ── Invoices section ── */}
                {activeSection === 'invoices' && (
                  <div>
                    {invoices.length > 0 ? (
                      <div className="space-y-3">
                        {invoices.map((inv) => (
                          <div key={inv.id} className={`rounded-xl border p-4 border-l-2 ${inv.status === 'paid' ? 'border-[#E8ECF0] border-l-green-400' : inv.status === 'overdue' ? 'border-orange-100 border-l-orange-400' : 'border-[#E8ECF0] border-l-red-400'}`}>
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-semibold text-[#0D1B2A]">{inv.description}</p>
                              <StatusBadge status={inv.status} map={INV_STATUS} />
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <p className="text-xs text-[#7A8898]">{inv.due_date ? `Due ${fmt(inv.due_date)}` : '—'}</p>
                              <p className="text-sm font-bold text-[#0D1B2A]">${Number(inv.amount).toFixed(2)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                        title="No invoices yet"
                        body="Your invoices will appear here when Cafe Works issues them."
                      />
                    )}
                  </div>
                )}

                {/* ── Account section ── */}
                {activeSection === 'account' && (
                  <div>
                    <form onSubmit={handleSaveProfile} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#0D1B2A] mb-1.5">Full name</label>
                        <input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)} required
                          className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-4 py-2.5 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#0D1B2A] mb-1.5">Email</label>
                        <input type="email" value={userEmail ?? ''} disabled
                          className="block w-full rounded-xl border border-[#E8ECF0] bg-[#E8ECF0] px-4 py-2.5 text-sm text-[#7A8898] cursor-not-allowed" />
                        <p className="mt-1 text-xs text-[#7A8898]">Email cannot be changed here.</p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#0D1B2A] mb-1.5">Phone</label>
                        <input type="tel" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} placeholder="(555) 000-0000"
                          className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-4 py-2.5 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#0D1B2A] mb-1.5">Street Address</label>
                        <input type="text" value={profileStreet} onChange={(e) => setProfileStreet(e.target.value)} placeholder="123 Main St"
                          className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-4 py-2.5 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#0D1B2A] mb-1.5">City</label>
                        <input type="text" value={profileCity} onChange={(e) => setProfileCity(e.target.value)} placeholder="Portland"
                          className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-4 py-2.5 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-[#0D1B2A] mb-1.5">State</label>
                          <input type="text" value={profileState} onChange={(e) => setProfileState(e.target.value)} placeholder="OR" maxLength={2}
                            className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-4 py-2.5 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#0D1B2A] mb-1.5">ZIP</label>
                          <input type="text" value={profileZip} onChange={(e) => setProfileZip(e.target.value)} placeholder="97201" maxLength={10}
                            className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-4 py-2.5 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20" />
                        </div>
                      </div>
                      {profileError && <p className="text-sm text-red-600">{profileError}</p>}
                      {profileMsg   && <p className="text-sm text-green-600">{profileMsg}</p>}
                      <button type="submit" disabled={profileSaving}
                        className="w-full rounded-xl bg-[#B87333] py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition">
                        {profileSaving ? 'Saving…' : 'Save changes'}
                      </button>
                    </form>
                    <button
                      onClick={handleSignOut}
                      className="mt-4 w-full rounded-xl border border-[#E8ECF0] py-3 text-sm font-semibold text-[#7A8898] hover:bg-[#E8ECF0] transition"
                    >
                      Sign out
                    </button>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* ── Recent activity ── */}
          {activityItems.length > 0 && (
            <div className="rounded-2xl bg-white border border-black/5 shadow-sm p-5">
              <p className={`${MONO} text-[10px] font-semibold uppercase tracking-wide text-[#7A8898] mb-4`}>Recent Activity</p>
              <div className="space-y-4">
                {activityItems.map((item) => (
                  <div key={item.key} className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                      item.iconColor === 'green'  ? 'bg-green-100 text-green-600'     :
                      item.iconColor === 'amber'  ? 'bg-amber-100 text-amber-600'     :
                      item.iconColor === 'copper' ? 'bg-[#B87333]/10 text-[#B87333]'  :
                                                    'bg-blue-100 text-blue-600'
                    }`}>
                      {item.iconColor === 'copper' ? (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#0D1B2A] truncate">{item.title}</p>
                      <p className="text-xs text-[#7A8898] truncate">{item.subtitle}</p>
                    </div>
                    <StatusBadge status={item.status} map={item.statusMap} />
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ── Bottom nav ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-[#E8ECF0] pb-safe">
        <div className="mx-auto max-w-lg grid grid-cols-4 pb-2">
          <button
            onClick={() => { setActiveNav('home'); setActiveSection(null) }}
            className={`flex flex-col items-center gap-1 pt-3 pb-1 transition ${activeNav === 'home' ? 'text-[#B87333]' : 'text-[#7A8898]'}`}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <p className={`${MONO} text-[8px] font-semibold uppercase tracking-wide`}>Home</p>
          </button>

          <button
            onClick={() => { setActiveNav('repairs'); showSection('repairs') }}
            className={`relative flex flex-col items-center gap-1 pt-3 pb-1 transition ${activeNav === 'repairs' ? 'text-[#B87333]' : 'text-[#7A8898]'}`}
          >
            {openRepairs.length > 0 && (
              <span className="absolute top-2 right-5 flex h-4 w-4 items-center justify-center rounded-full bg-[#B87333] text-[8px] font-bold text-white">
                {openRepairs.length}
              </span>
            )}
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
            </svg>
            <p className={`${MONO} text-[8px] font-semibold uppercase tracking-wide`}>Repairs</p>
          </button>

          <button
            onClick={() => { setActiveNav('schedule'); setShowSchedulePicker(true); setPmDate(null); setPmSlot(null); setPmError(null); setPmSuccess(null) }}
            className={`flex flex-col items-center gap-1 pt-3 pb-1 transition ${activeNav === 'schedule' ? 'text-[#B87333]' : 'text-[#7A8898]'}`}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className={`${MONO} text-[8px] font-semibold uppercase tracking-wide`}>Schedule</p>
          </button>

          <button
            onClick={() => { setActiveNav('account'); showSection('account') }}
            className={`flex flex-col items-center gap-1 pt-3 pb-1 transition ${activeNav === 'account' ? 'text-[#B87333]' : 'text-[#7A8898]'}`}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <p className={`${MONO} text-[8px] font-semibold uppercase tracking-wide`}>Account</p>
          </button>
        </div>
      </nav>

      {/* ── DateSlotPicker bottom sheet ── */}
      {showSchedulePicker && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowSchedulePicker(false); setActiveNav('home') }} />
          <div className="relative rounded-t-2xl bg-white px-5 pt-5 pb-10 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <p className="text-base font-bold text-[#0D1B2A]">Schedule PM Visit</p>
              <button onClick={() => { setShowSchedulePicker(false); setActiveNav('home') }} className="text-[#7A8898] hover:text-[#0D1B2A] transition">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <DateSlotPicker
              selectedDate={pmDate}
              selectedSlot={pmSlot}
              onDateChange={(d) => { setPmDate(d); setPmSlot(null) }}
              onSlotChange={setPmSlot}
            />
            {pmError && <p className="mt-2 text-xs text-red-600">{pmError}</p>}
            <button
              onClick={handleSchedulePM}
              disabled={pmSaving || !pmDate || !pmSlot}
              className="mt-4 w-full rounded-xl bg-[#B87333] py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition"
            >
              {pmSaving ? 'Saving…' : 'Confirm appointment'}
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
