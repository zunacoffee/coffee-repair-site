"use client"

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'
import DateSlotPicker from '../components/DateSlotPicker'

// ─── Types ───────────────────────────────────────────────────────────────────

type Customer = { id: number; full_name: string; email: string; phone: string; address: string }
type Equipment = { id: number; equipment_type: string; brand: string; model: string; serial_number: string }
type RepairJob  = { id: number; equipment_type: string; status: string; description: string; created_at: string; completed_at: string | null }
type WorkOrder  = { id: number; work_order_number: string; status: string; problem_description: string; grand_total: number; created_at: string; completed_at: string | null; equipment_list: { equipment_type: string; brand: string; model: string } | null }
type Plan       = { id: number; plan_name: string; status: string; price: number; renewal_date: string | null; next_visit_date?: string | null; next_visit_slot?: string | null }
type Invoice   = { id: number; amount: number; status: string; due_date: string | null; description: string; created_at: string }
type Tab = 'schedule' | 'repairs' | 'equipment' | 'plan' | 'invoices' | 'profile'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
  { id: 'schedule',  label: 'PM Schedule' },
  { id: 'repairs',   label: 'Repairs'     },
  { id: 'equipment', label: 'Equipment'   },
  { id: 'plan',      label: 'My Plan'     },
  { id: 'invoices',  label: 'Invoices'    },
  { id: 'profile',   label: 'Profile'     },
]

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
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8ECF0] text-[#7A8898]">{icon}</div>
      <p className="text-base font-semibold text-[#0D1B2A]">{title}</p>
      <p className="mt-1 text-sm text-[#7A8898] max-w-xs">{body}</p>
      {cta && <div className="mt-5">{cta}</div>}
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
  const [activeTab,     setActiveTab]     = useState<Tab>('schedule')
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
  const [profileName,    setProfileName]    = useState('')
  const [profilePhone,   setProfilePhone]   = useState('')
  const [profileAddress, setProfileAddress] = useState('')
  const [profileSaving,  setProfileSaving]  = useState(false)
  const [profileMsg,     setProfileMsg]     = useState<string | null>(null)
  const [profileError,   setProfileError]   = useState<string | null>(null)

  const tabBarRef = useRef<HTMLDivElement>(null)

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
        setProfileAddress(json.customer.address ?? '')
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
      body: JSON.stringify({ full_name: profileName, phone: profilePhone, address: profileAddress }),
    })
    const data = await res.json()
    setProfileSaving(false)
    if (!res.ok) { setProfileError(data.error ?? 'Unable to save changes.'); return }
    setCustomer(data.customer)
    setProfileMsg('Profile updated successfully.')
  }

  const switchTab = (tab: Tab) => {
    setActiveTab(tab)
    // Scroll the active tab button into view on mobile
    setTimeout(() => {
      const btn = tabBarRef.current?.querySelector(`[data-tab="${tab}"]`) as HTMLElement | null
      btn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }, 0)
  }

  const openRepairs  = workOrders.filter((wo) => wo.status !== 'completed' && wo.status !== 'cancelled')
  const openInvoices = invoices.filter((i) => i.status !== 'paid')
  const displayName  = customer?.full_name ?? userEmail ?? 'there'

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F6F9]">
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
      <div className="min-h-screen flex items-center justify-center bg-[#F4F6F9] px-4">
        <div className="max-w-md rounded-2xl bg-white p-8 shadow text-center">
          <p className="text-sm font-semibold text-red-600">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 text-sm text-[#B87333] hover:underline">Try again</button>
        </div>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F4F6F9]">

      {/* ── Header ── */}
      <header className="bg-[#0D1B2A]">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            {/* Identity */}
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#B87333]/20">
                <svg className="h-6 w-6 text-[#B87333]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#7A8898]">Customer Portal</p>
                <h1 className="text-lg font-bold text-white leading-tight">
                  Welcome, {displayName.split(' ')[0]}!
                </h1>
                <p className="text-xs text-[#7A8898]">{userEmail}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href="/service-request"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#B87333] px-4 py-2 text-sm font-semibold text-white hover:bg-[#a0632b] transition"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Request Repair
              </Link>
              <button
                onClick={() => switchTab('profile')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                My Profile
              </button>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── No customer record ── */}
      {!customer && (
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <div className="rounded-2xl bg-white border border-[#E8ECF0] p-10 shadow-sm">
            <svg className="mx-auto h-12 w-12 text-[#7A8898]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <h2 className="mt-4 text-xl font-bold text-[#0D1B2A]">Account not linked yet</h2>
            <p className="mt-2 text-sm text-[#7A8898]">
              Your login ({userEmail}) hasn't been linked to a customer record. Contact Cafe Works to complete your setup.
            </p>
            <Link href="/service-request" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#B87333] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#a0632b] transition">
              Submit a service request
            </Link>
          </div>
        </div>
      )}

      {customer && (
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 space-y-6">

          {/* ── Stat cards ── */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">

            {/* My Plan */}
            <div className="rounded-2xl border-l-4 border-l-[#B87333] bg-white px-5 py-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7A8898]">My Plan</p>
              {plan ? (
                <>
                  <p className="mt-2 text-xl font-bold text-[#0D1B2A] leading-tight">{plan.plan_name}</p>
                  <p className="mt-1 text-sm text-[#7A8898]">
                    {plan.price ? `$${plan.price}/mo` : '—'}
                    {' · '}
                    <span className={`font-semibold ${plan.status === 'active' ? 'text-green-600' : 'text-[#7A8898]'}`}>
                      {plan.status}
                    </span>
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-2 text-xl font-bold text-[#0D1B2A]">No plan</p>
                  <p className="mt-1 text-xs text-[#7A8898]">Subscribe to a maintenance plan</p>
                </>
              )}
            </div>

            {/* Next PM Visit */}
            <div className="rounded-2xl border-l-4 border-l-blue-500 bg-white px-5 py-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7A8898]">Next PM Visit</p>
              {plan?.next_visit_date ? (
                <>
                  <p className="mt-2 text-xl font-bold text-[#0D1B2A] leading-tight">
                    {new Date(plan.next_visit_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                  <p className="mt-1 text-sm text-[#7A8898]">
                    {(() => {
                      const d = daysUntil(plan.next_visit_date!)
                      if (d < 0) return 'Past due'
                      if (d === 0) return 'Today'
                      return `in ${d} day${d !== 1 ? 's' : ''}`
                    })()}
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-2 text-xl font-bold text-[#0D1B2A]">—</p>
                  <p className="mt-1 text-xs text-[#7A8898]">
                    {plan ? (
                      <button onClick={() => { switchTab('schedule'); setShowSchedulePicker(true) }} className="text-[#B87333] hover:underline">
                        Schedule visit
                      </button>
                    ) : 'No plan active'}
                  </p>
                </>
              )}
            </div>

            {/* Equipment */}
            <div className="rounded-2xl border-l-4 border-l-emerald-500 bg-white px-5 py-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7A8898]">Equipment</p>
              <p className="mt-2 text-4xl font-bold text-[#0D1B2A]">{equipment.length}</p>
              <p className="mt-1 text-xs text-[#7A8898]">
                {equipment.length === 1 ? 'registered item' : 'registered items'}
              </p>
            </div>

            {/* Open Invoices */}
            <div className="rounded-2xl border-l-4 border-l-orange-400 bg-white px-5 py-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7A8898]">Open Invoices</p>
              <p className="mt-2 text-4xl font-bold text-[#0D1B2A]">{openInvoices.length}</p>
              <p className="mt-1 text-xs text-[#7A8898]">
                {openInvoices.length === 0 ? 'all paid' : `${openInvoices.length} unpaid`}
              </p>
            </div>

          </div>

          {/* ── Tab bar ── */}
          <div className="rounded-2xl bg-white border border-[#E8ECF0] shadow-sm overflow-hidden">
            <div
              ref={tabBarRef}
              className="flex overflow-x-auto border-b border-[#E8ECF0] scrollbar-none"
              style={{ scrollbarWidth: 'none' }}
            >
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  data-tab={tab.id}
                  onClick={() => switchTab(tab.id)}
                  className={`shrink-0 px-5 py-3.5 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-[#B87333] text-[#B87333]'
                      : 'border-transparent text-[#7A8898] hover:text-[#0D1B2A]'
                  }`}
                >
                  {tab.label}
                  {tab.id === 'repairs'   && openRepairs.length  > 0 && (
                    <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#B87333] text-[9px] font-bold text-white">
                      {openRepairs.length}
                    </span>
                  )}
                  {tab.id === 'invoices'  && openInvoices.length > 0 && (
                    <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-orange-400 text-[9px] font-bold text-white">
                      {openInvoices.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Tab panels ── */}
            <div className="p-5 sm:p-7">

              {/* PM Schedule */}
              {activeTab === 'schedule' && (
                <div>
                  <h2 className="text-base font-bold text-[#0D1B2A] mb-4">Preventive Maintenance Schedule</h2>
                  {plan ? (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-[#E8ECF0] bg-[#F9FAFB] p-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-[#7A8898]">Current Plan</p>
                            <p className="mt-1 text-xl font-bold text-[#0D1B2A]">{plan.plan_name}</p>
                            <p className="text-sm text-[#7A8898]">{plan.price ? `$${plan.price} / month` : ''}</p>
                          </div>
                          <span className={`self-start sm:self-auto inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${plan.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {plan.status}
                          </span>
                        </div>

                            {/* Scheduled visit */}
                        {plan.next_visit_date ? (
                          <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3">
                                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500 text-white">
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-blue-900">Next scheduled visit</p>
                                  <p className="text-lg font-bold text-blue-800">{fmt(plan.next_visit_date)}</p>
                                  {plan.next_visit_slot && (
                                    <p className="text-xs text-blue-700 font-semibold mt-0.5">
                                      {plan.next_visit_slot === 'morning' ? 'Morning (8am–12pm)' : 'Afternoon (12pm–5pm)'}
                                    </p>
                                  )}
                                  <p className="text-xs text-blue-600 mt-0.5">
                                    {(() => {
                                      const d = daysUntil(plan.next_visit_date!)
                                      if (d < 0) return `${Math.abs(d)} days overdue`
                                      if (d === 0) return 'Scheduled for today'
                                      return `${d} day${d !== 1 ? 's' : ''} away`
                                    })()}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => { setShowSchedulePicker(true); setPmDate(null); setPmSlot(null); setPmError(null); setPmSuccess(null) }}
                                className="shrink-0 rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-200 transition"
                              >
                                Reschedule
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-6 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/50 p-5 text-center">
                            <p className="text-sm font-semibold text-[#0D1B2A]">No visit scheduled yet</p>
                            <p className="mt-1 text-xs text-[#7A8898]">Pick a date and time slot for your next PM visit.</p>
                            <button
                              onClick={() => { setShowSchedulePicker(true); setPmDate(null); setPmSlot(null); setPmError(null); setPmSuccess(null) }}
                              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#B87333] px-4 py-2 text-xs font-semibold text-white hover:bg-[#a0632b] transition"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Schedule Visit
                            </button>
                          </div>
                        )}

                        {/* Success message */}
                        {pmSuccess && (
                          <div className="mt-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                            {pmSuccess}
                          </div>
                        )}

                        {/* Inline scheduler */}
                        {showSchedulePicker && (
                          <div className="mt-4 rounded-xl border border-[#E8ECF0] bg-[#F9FAFB] p-4">
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-sm font-bold text-[#0D1B2A]">Choose appointment</p>
                              <button onClick={() => setShowSchedulePicker(false)} className="text-[#7A8898] hover:text-[#0D1B2A]">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
                              className="mt-3 w-full rounded-xl bg-[#B87333] py-2.5 text-sm font-semibold text-white hover:bg-[#a0632b] disabled:opacity-50 transition"
                            >
                              {pmSaving ? 'Saving…' : 'Confirm appointment'}
                            </button>
                          </div>
                        )}
                      </div>

                      {equipment.length > 0 && (
                        <div>
                          <p className="mb-3 text-sm font-semibold text-[#0D1B2A]">Equipment covered by this plan</p>
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {equipment.map((eq) => (
                              <div key={eq.id} className="rounded-xl border border-[#E8ECF0] bg-white p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-[#B87333]">{eq.equipment_type}</p>
                                <p className="mt-1 text-sm font-bold text-[#0D1B2A]">{eq.brand} {eq.model}</p>
                                <p className="text-xs text-[#7A8898] mt-0.5">S/N: {eq.serial_number}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <EmptyState
                      icon={<svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                      title="No maintenance plan"
                      body="Subscribe to a plan to see your scheduled preventive maintenance visits here."
                      cta={<Link href="/pricing" className="rounded-xl bg-[#B87333] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#a0632b] transition">View plans</Link>}
                    />
                  )}
                </div>
              )}

              {/* Repairs / Work Orders */}
              {activeTab === 'repairs' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-[#0D1B2A]">Repair History</h2>
                    <Link href="/service-request" className="inline-flex items-center gap-1.5 rounded-xl bg-[#B87333] px-4 py-2 text-xs font-semibold text-white hover:bg-[#a0632b] transition">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                      Request Repair
                    </Link>
                  </div>
                  {workOrders.length > 0 ? (
                    <div className="overflow-x-auto -mx-5 sm:-mx-7">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b border-[#E8ECF0]">
                            <th className="px-5 sm:px-7 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#7A8898]">WO #</th>
                            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#7A8898]">Equipment</th>
                            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#7A8898]">Problem</th>
                            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#7A8898]">Status</th>
                            <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-[#7A8898]">Total</th>
                            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#7A8898]">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E8ECF0]">
                          {workOrders.map((wo) => (
                            <tr key={wo.id} className="hover:bg-[#F9FAFB]">
                              <td className="px-5 sm:px-7 py-3.5 text-sm font-mono font-semibold text-[#B87333] whitespace-nowrap">{wo.work_order_number}</td>
                              <td className="px-4 py-3.5 text-sm text-[#0D1B2A] whitespace-nowrap">
                                {wo.equipment_list ? `${wo.equipment_list.brand} ${wo.equipment_list.model}` : '—'}
                              </td>
                              <td className="px-4 py-3.5 text-sm text-[#7A8898] max-w-[200px]">
                                <span className="block truncate">{wo.problem_description || '—'}</span>
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap"><StatusBadge status={wo.status} map={WO_STATUS} /></td>
                              <td className="px-4 py-3.5 text-sm font-semibold text-[#0D1B2A] text-right whitespace-nowrap">
                                ${Number(wo.grand_total).toFixed(2)}
                              </td>
                              <td className="px-4 py-3.5 text-sm text-[#7A8898] whitespace-nowrap">
                                {wo.created_at ? fmt(wo.created_at) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : repairJobs.length > 0 ? (
                    <div className="overflow-x-auto -mx-5 sm:-mx-7">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b border-[#E8ECF0]">
                            <th className="px-5 sm:px-7 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#7A8898]">Equipment</th>
                            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#7A8898]">Description</th>
                            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#7A8898]">Status</th>
                            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#7A8898]">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E8ECF0]">
                          {repairJobs.map((job) => (
                            <tr key={job.id} className="hover:bg-[#F9FAFB]">
                              <td className="px-5 sm:px-7 py-3.5 text-sm font-medium text-[#0D1B2A] whitespace-nowrap">{job.equipment_type}</td>
                              <td className="px-4 py-3.5 text-sm text-[#7A8898] max-w-[200px]">
                                <span className="block truncate">{job.description || '—'}</span>
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap"><StatusBadge status={job.status} map={JOB_STATUS} /></td>
                              <td className="px-4 py-3.5 text-sm text-[#7A8898] whitespace-nowrap">
                                {job.created_at ? fmt(job.created_at) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyState
                      icon={<svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>}
                      title="No repair history"
                      body="Your completed and in-progress repairs will appear here."
                      cta={<Link href="/service-request" className="rounded-xl bg-[#B87333] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#a0632b] transition">Request a repair</Link>}
                    />
                  )}
                </div>
              )}

              {/* Equipment */}
              {activeTab === 'equipment' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-[#0D1B2A]">Registered Equipment</h2>
                    <button
                      onClick={() => { setShowEqForm((v) => !v); setEqError(null); setEqSuccess(null) }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#B87333] px-3 py-2 text-xs font-semibold text-[#B87333] hover:bg-[#B87333]/5 transition"
                    >
                      {showEqForm ? (
                        <>
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Cancel
                        </>
                      ) : (
                        <>
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                          Add Equipment
                        </>
                      )}
                    </button>
                  </div>

                  {eqSuccess && (
                    <div className="mb-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                      {eqSuccess}
                    </div>
                  )}

                  {showEqForm && (
                    <form onSubmit={handleAddEquipment} className="mb-5 rounded-2xl border border-[#E8ECF0] bg-[#F9FAFB] p-5">
                      <p className="text-sm font-semibold text-[#0D1B2A] mb-4">Add new equipment</p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-semibold text-[#0D1B2A] mb-1.5">Equipment type</label>
                          <select
                            value={eqType}
                            onChange={(e) => setEqType(e.target.value)}
                            required
                            className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-3 py-2.5 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                          >
                            <option value="" disabled>Select type…</option>
                            <option value="Espresso Machine">Espresso Machine</option>
                            <option value="Grinder">Grinder</option>
                            <option value="Brewer">Brewer</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#0D1B2A] mb-1.5">Brand</label>
                          <input
                            type="text"
                            value={eqBrand}
                            onChange={(e) => setEqBrand(e.target.value)}
                            required
                            placeholder="e.g. La Marzocco"
                            className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-3 py-2.5 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#0D1B2A] mb-1.5">Model</label>
                          <input
                            type="text"
                            value={eqModel}
                            onChange={(e) => setEqModel(e.target.value)}
                            required
                            placeholder="e.g. Linea Mini"
                            className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-3 py-2.5 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#0D1B2A] mb-1.5">
                            Serial number <span className="text-[#7A8898] font-normal">(optional)</span>
                          </label>
                          <input
                            type="text"
                            value={eqSerial}
                            onChange={(e) => setEqSerial(e.target.value)}
                            placeholder="e.g. SN123456"
                            className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-3 py-2.5 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                          />
                        </div>
                      </div>
                      {eqError && <p className="mt-3 text-xs text-red-600">{eqError}</p>}
                      <div className="mt-4 flex gap-3">
                        <button
                          type="button"
                          onClick={() => { setShowEqForm(false); setEqError(null) }}
                          className="rounded-xl border border-[#E8ECF0] px-4 py-2 text-sm font-semibold text-[#7A8898] hover:bg-[#F4F6F9] transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={eqSaving}
                          className="rounded-xl bg-[#B87333] px-5 py-2 text-sm font-semibold text-white hover:bg-[#a0632b] disabled:opacity-50 transition"
                        >
                          {eqSaving ? 'Saving…' : 'Save equipment'}
                        </button>
                      </div>
                    </form>
                  )}

                  {equipment.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {equipment.map((eq) => (
                        <div key={eq.id} className="rounded-2xl border border-[#E8ECF0] bg-[#F9FAFB] p-5">
                          <p className="text-xs font-semibold uppercase tracking-wide text-[#B87333]">{eq.equipment_type}</p>
                          <p className="mt-2 text-base font-bold text-[#0D1B2A]">{eq.brand} {eq.model}</p>
                          {eq.serial_number && (
                            <div className="mt-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-[#7A8898]">Serial number</span>
                                <span className="text-xs font-mono font-medium text-[#0D1B2A]">{eq.serial_number}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : !showEqForm ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center px-4 rounded-2xl border-2 border-dashed border-[#E8ECF0]">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8ECF0] text-[#7A8898]">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18" />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-[#0D1B2A]">No equipment yet</p>
                      <p className="mt-1 text-xs text-[#7A8898] max-w-xs">Add your coffee equipment to track service history and maintenance.</p>
                      <button
                        onClick={() => { setShowEqForm(true); setEqError(null) }}
                        className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#B87333] px-4 py-2 text-xs font-semibold text-white hover:bg-[#a0632b] transition"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Add Equipment
                      </button>
                    </div>
                  ) : null}
                </div>
              )}

              {/* My Plan */}
              {activeTab === 'plan' && (
                <div>
                  <h2 className="text-base font-bold text-[#0D1B2A] mb-4">My Maintenance Plan</h2>
                  {plan ? (
                    <div className="space-y-4 max-w-xl">
                      <div className="rounded-2xl border border-[#E8ECF0] bg-[#F9FAFB] p-6 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xl font-bold text-[#0D1B2A]">{plan.plan_name}</p>
                            {plan.price ? <p className="text-2xl font-bold text-[#B87333] mt-1">${plan.price}<span className="text-sm font-normal text-[#7A8898]">/mo</span></p> : null}
                          </div>
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${plan.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {plan.status}
                          </span>
                        </div>
                        <div className="border-t border-[#E8ECF0] pt-4 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-[#7A8898]">Next renewal</span>
                            <span className="font-medium text-[#0D1B2A]">{plan.renewal_date ? fmt(plan.renewal_date) : '—'}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-[#7A8898]">Billing</span>
                            <span className="font-medium text-[#0D1B2A]">Monthly</span>
                          </div>
                        </div>
                      </div>
                      {portalError && <p className="text-sm text-red-600">{portalError}</p>}
                      <button
                        onClick={handleManagePlan}
                        disabled={portalLoading}
                        className="w-full rounded-xl bg-[#B87333] py-3 text-sm font-semibold text-white hover:bg-[#a0632b] disabled:opacity-50 transition"
                      >
                        {portalLoading ? 'Opening billing portal…' : 'Manage plan & billing'}
                      </button>
                      <p className="text-xs text-center text-[#7A8898]">
                        Update payment method, cancel, or change your plan in the Stripe billing portal.
                      </p>
                    </div>
                  ) : (
                    <EmptyState
                      icon={<svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
                      title="No active plan"
                      body="Subscribe to a maintenance plan to keep your equipment in peak condition."
                      cta={<Link href="/pricing" className="rounded-xl bg-[#B87333] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#a0632b] transition">See plans & pricing</Link>}
                    />
                  )}
                </div>
              )}

              {/* Invoices */}
              {activeTab === 'invoices' && (
                <div>
                  <h2 className="text-base font-bold text-[#0D1B2A] mb-4">Invoices</h2>
                  {invoices.length > 0 ? (
                    <div className="overflow-x-auto -mx-5 sm:-mx-7">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b border-[#E8ECF0]">
                            <th className="px-5 sm:px-7 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#7A8898]">Description</th>
                            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#7A8898]">Amount</th>
                            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#7A8898]">Due</th>
                            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#7A8898]">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E8ECF0]">
                          {invoices.map((inv) => (
                            <tr key={inv.id} className="hover:bg-[#F9FAFB]">
                              <td className="px-5 sm:px-7 py-3.5 text-sm font-medium text-[#0D1B2A]">{inv.description}</td>
                              <td className="px-4 py-3.5 text-sm text-[#0D1B2A] font-semibold whitespace-nowrap">${inv.amount.toFixed(2)}</td>
                              <td className="px-4 py-3.5 text-sm text-[#7A8898] whitespace-nowrap">{inv.due_date ? fmt(inv.due_date) : '—'}</td>
                              <td className="px-4 py-3.5 whitespace-nowrap"><StatusBadge status={inv.status} map={INV_STATUS} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyState
                      icon={<svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                      title="No invoices yet"
                      body="Your invoices will appear here when the Cafe Works team issues them."
                    />
                  )}
                </div>
              )}

              {/* Profile */}
              {activeTab === 'profile' && (
                <div className="max-w-lg">
                  <h2 className="text-base font-bold text-[#0D1B2A] mb-4">My Profile</h2>
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-[#0D1B2A] mb-1">Full name</label>
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        required
                        className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-4 py-2.5 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#0D1B2A] mb-1">Email</label>
                      <input
                        type="email"
                        value={userEmail ?? ''}
                        disabled
                        className="block w-full rounded-xl border border-[#E8ECF0] bg-[#F4F6F9] px-4 py-2.5 text-sm text-[#7A8898] cursor-not-allowed"
                      />
                      <p className="mt-1 text-xs text-[#7A8898]">Email address cannot be changed here.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#0D1B2A] mb-1">Phone</label>
                      <input
                        type="tel"
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value)}
                        placeholder="(555) 000-0000"
                        className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-4 py-2.5 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#0D1B2A] mb-1">Address</label>
                      <input
                        type="text"
                        value={profileAddress}
                        onChange={(e) => setProfileAddress(e.target.value)}
                        placeholder="123 Main St, City, State"
                        className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-4 py-2.5 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                      />
                    </div>
                    {profileError && <p className="text-sm text-red-600">{profileError}</p>}
                    {profileMsg   && <p className="text-sm text-green-600">{profileMsg}</p>}
                    <button
                      type="submit"
                      disabled={profileSaving}
                      className="w-full rounded-xl bg-[#B87333] py-3 text-sm font-semibold text-white hover:bg-[#a0632b] disabled:opacity-50 transition"
                    >
                      {profileSaving ? 'Saving…' : 'Save changes'}
                    </button>
                  </form>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  )
}
