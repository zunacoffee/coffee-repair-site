"use client"

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'
import { RepairScheduler } from './components/RepairScheduler'
import { PMScheduler } from './components/PMScheduler'
import { DashboardSections } from './components/DashboardSections'

const MONO = 'font-[family-name:var(--font-ibm-plex-mono)]'

// ─── Types ───────────────────────────────────────────────────────────────────

type Customer  = { id: number; full_name: string; email: string; phone: string; address: string; street: string | null; city: string | null; state: string | null; zip: string | null }
type Equipment = { id: number; equipment_type: string; brand: string; model: string; serial_number: string }
type WorkOrder ={ id: number; work_order_number: string; status: string; problem_description: string; grand_total: number; created_at: string; completed_at: string | null; equipment_list: { equipment_type: string; brand: string; model: string } | null }
type Plan      = { id: number; plan_name: string; status: string; price: number; renewal_date: string | null; next_visit_date?: string | null; next_visit_slot?: string | null; is_custom?: boolean; stripe_payment_link?: string | null; description?: string | null; visit_frequency?: number | null; features?: string[] }
type Invoice   = { id: number; total: number; status: string; due_date: string | null; description: string; created_at: string; invoice_number?: string | null; stripe_payment_link?: string | null }
type Section   = 'invoices' | 'equipment' | 'plan' | 'repairs' | 'account' | 'contact' | null
type Nav       = 'home' | 'repairs' | 'contact' | 'account'
type DesktopNav = 'home' | 'repairs' | 'plan' | 'invoices' | 'equipment' | 'contact' | 'profile'

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
  sent:    'bg-amber-100 text-amber-700',
}

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00')
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

function fmt(dateStr: string | null | undefined) {
  if (!dateStr) return '—'
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
  const [workOrders,    setWorkOrders]    = useState<WorkOrder[]>([])
  const [plan,          setPlan]          = useState<Plan | null>(null)
  const [invoices,      setInvoices]      = useState<Invoice[]>([])
  const [activeSection, setActiveSection] = useState<Section>(null)
  const [activeNav,     setActiveNav]     = useState<Nav>('home')
  const [portalLoading, setPortalLoading] = useState(false)
  const [portalError,   setPortalError]   = useState<string | null>(null)
  const [siteSettings,  setSiteSettings]  = useState<{ phone?: string; email?: string; business_hours?: string }>({})

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

  const sectionRef        = useRef<HTMLDivElement>(null)
  const desktopSectionRef = useRef<HTMLDivElement>(null)
  const [selectedFeedItem,    setSelectedFeedItem]    = useState<string | null>(null)
  const [desktopNav,          setDesktopNav]          = useState<DesktopNav>('home')
  const [desktopExpandedItem, setDesktopExpandedItem] = useState<string | null>(null)
  const [selectedWO,          setSelectedWO]          = useState<any>(null)
  const [selectedInvoice,     setSelectedInvoice]     = useState<any>(null)
  const [showPlanModal,       setShowPlanModal]       = useState(false)
  const [selectedEquipment,   setSelectedEquipment]   = useState<any>(null)

  // Repair modal state
  const [showRepairModal, setShowRepairModal] = useState(false)
  const [successToast,    setSuccessToast]    = useState<string | null>(null)

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
      setWorkOrders(json.workOrders ?? [])
      setPlan(json.plan ?? null)
      setInvoices(json.invoices ?? [])

      const settingsRes  = await fetch('/api/public-settings')
      const settingsJson = await settingsRes.json()
      setSiteSettings(settingsJson.settings ?? {})

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

  const handleSchedulePM = async (date: string, slot: string) => {
    setPmSaving(true); setPmError(null); setPmSuccess(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const res  = await fetch('/api/customer/pm-visit', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ next_visit_date: date, next_visit_slot: slot }),
    })
    const data = await res.json()
    setPmSaving(false)
    if (!res.ok) { setPmError(data.error ?? 'Failed to schedule visit.'); return }
    setPlan((prev) => prev ? { ...prev, next_visit_date: date, next_visit_slot: slot } : prev)
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

  const openRepairModal = () => setShowRepairModal(true)

  const openRepairs  = workOrders.filter((wo) => wo.status !== 'completed' && wo.status !== 'cancelled')
  const openInvoices = invoices.filter((i) => i.status !== 'paid')
  const displayName  = customer?.full_name ?? userEmail ?? 'there'

  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = displayName.split(' ')[0]

  const activityItems = [
    ...workOrders.map((wo) => ({
      key: `wo-${wo.id}`,
      type: 'workorder' as const,
      iconColor: wo.status === 'completed' ? 'green' : wo.status === 'in_progress' ? 'amber' : 'blue',
      title: wo.work_order_number,
      subtitle: [
        wo.equipment_list ? `${wo.equipment_list.brand} ${wo.equipment_list.model}` : null,
        wo.problem_description || null,
      ].filter(Boolean).join(' · '),
      status: wo.status,
      statusMap: WO_STATUS,
      date: wo.created_at,
      woNumber: wo.work_order_number,
      equipment: wo.equipment_list ? `${wo.equipment_list.brand} ${wo.equipment_list.model}` : null,
      problem: wo.problem_description || null,
      total: wo.grand_total,
    })),
    ...invoices.map((inv) => ({
      key: `inv-${inv.id}`,
      type: 'invoice' as const,
      iconColor: 'copper',
      title: inv.description || 'Invoice',
      subtitle: `$${Number(inv.total).toFixed(2)}`,
      status: inv.status,
      statusMap: INV_STATUS,
      date: inv.created_at,
      description: inv.description,
      total: inv.total,
      dueDate: inv.due_date,
      invoice_number: inv.invoice_number ?? null,
      stripe_payment_link: inv.stripe_payment_link ?? null,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5)

  const showSection = (s: Section) => {
    setActiveSection(s)
    setTimeout(() => {
      if (typeof window !== 'undefined' && window.innerWidth >= 640) {
        desktopSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else {
        sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 50)
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
    <div className="min-h-screen bg-[#E8ECF0]">

      {/* ── Header ── */}
      <header className="sm:hidden bg-[#0D1B2A] px-5 pt-12 pb-14">
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
                <span className={`${MONO} mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  plan.status === 'active' ? 'bg-[#B87333]/25 text-[#B87333]' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {plan.plan_name}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── No customer record ── */}
      {!customer && (
        <div className="sm:hidden mx-auto max-w-lg px-4 -mt-6">
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
        <div className="sm:hidden mx-auto max-w-lg px-4 -mt-6 space-y-4">

          {/* ── Hero + Quick actions ── */}
          <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-[1fr_300px] sm:gap-6 sm:items-stretch">

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
                        {plan.next_visit_slot}
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
                      onClick={() => { setShowSchedulePicker(true); setPmError(null); setPmSuccess(null) }}
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
                  onClick={() => { setShowSchedulePicker(true); setPmError(null); setPmSuccess(null) }}
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
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-2 sm:rounded-2xl sm:bg-white sm:border sm:border-black/5 sm:shadow-lg sm:p-5 sm:gap-4 sm:content-start">
            <button
              onClick={openRepairModal}
              className="flex flex-col items-center gap-1.5 rounded-2xl bg-white border border-black/5 shadow-sm py-3.5 px-2 hover:bg-[#E8ECF0] transition"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#B87333]/10">
                <svg className="h-[18px] w-[18px] text-[#B87333]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                </svg>
              </div>
              <p className={`${MONO} text-[10px] font-semibold uppercase tracking-wide text-[#0D1B2A] text-center leading-tight`}>Repair</p>
            </button>

            <button
              onClick={() => { setActiveNav('home'); showSection('invoices') }}
              className="flex flex-col items-center gap-1.5 rounded-2xl bg-white border border-black/5 shadow-sm py-3.5 px-2 hover:bg-[#E8ECF0] transition"
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${openInvoices.length > 0 ? 'bg-orange-100' : 'bg-[#B87333]/10'}`}>
                <svg className={`h-[18px] w-[18px] ${openInvoices.length > 0 ? 'text-orange-500' : 'text-[#B87333]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className={`${MONO} text-[10px] font-semibold uppercase tracking-wide text-center leading-tight ${openInvoices.length > 0 ? 'text-orange-600' : 'text-[#0D1B2A]'}`}>
                {openInvoices.length > 0 ? `Bills (${openInvoices.length})` : 'Invoices'}
              </p>
            </button>

            <button
              onClick={() => { setActiveNav('home'); showSection('equipment') }}
              className="flex flex-col items-center gap-1.5 rounded-2xl bg-white border border-black/5 shadow-sm py-3.5 px-2 hover:bg-[#E8ECF0] transition"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#B87333]/10">
                <svg className="h-[18px] w-[18px] text-[#B87333]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18" />
                </svg>
              </div>
              <p className={`${MONO} text-[10px] font-semibold uppercase tracking-wide text-[#0D1B2A] text-center leading-tight`}>Equipment</p>
            </button>

            <button
              onClick={() => { setActiveNav('home'); showSection('plan') }}
              className="flex flex-col items-center gap-1.5 rounded-2xl bg-white border border-black/5 shadow-sm py-3.5 px-2 hover:bg-[#E8ECF0] transition"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#B87333]/10">
                <svg className="h-[18px] w-[18px] text-[#B87333]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <p className={`${MONO} text-[10px] font-semibold uppercase tracking-wide text-[#0D1B2A] text-center leading-tight`}>My Plan</p>
            </button>
          </div>

          </div> {/* /Hero + Quick actions */}

          {/* ── Content row: Activity left + Sections right on desktop ── */}
          <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 sm:items-start">

          {/* ── Active section content ── */}
          {activeSection && (
            <DashboardSections
              activeSection={activeSection}
              setActiveSection={setActiveSection}
              sectionRef={sectionRef}
              workOrders={workOrders}
              equipment={equipment}
              showEqForm={showEqForm}
              setShowEqForm={setShowEqForm}
              eqType={eqType} setEqType={setEqType}
              eqBrand={eqBrand} setEqBrand={setEqBrand}
              eqModel={eqModel} setEqModel={setEqModel}
              eqSerial={eqSerial} setEqSerial={setEqSerial}
              eqSaving={eqSaving}
              eqError={eqError} setEqError={setEqError}
              eqSuccess={eqSuccess} setEqSuccess={setEqSuccess}
              handleAddEquipment={handleAddEquipment}
              setSelectedEquipment={setSelectedEquipment}
              plan={plan}
              portalLoading={portalLoading} portalError={portalError}
              handleManagePlan={handleManagePlan}
              setShowPlanModal={setShowPlanModal}
              invoices={invoices}
              setSelectedInvoice={setSelectedInvoice}
              userEmail={userEmail}
              profileName={profileName} setProfileName={setProfileName}
              profilePhone={profilePhone} setProfilePhone={setProfilePhone}
              profileStreet={profileStreet} setProfileStreet={setProfileStreet}
              profileCity={profileCity} setProfileCity={setProfileCity}
              profileState={profileState} setProfileState={setProfileState}
              profileZip={profileZip} setProfileZip={setProfileZip}
              profileSaving={profileSaving} profileMsg={profileMsg} profileError={profileError}
              handleSaveProfile={handleSaveProfile}
              handleSignOut={handleSignOut}
              siteSettings={siteSettings}
            />
          )}

          {/* ── Recent activity ── */}
          {activityItems.length > 0 && (
            <div className="sm:order-1 rounded-2xl bg-white border border-black/5 shadow-sm p-5">
              <p className={`${MONO} text-[10px] font-semibold uppercase tracking-wide text-[#7A8898] mb-4`}>Recent Activity</p>
              <div>
                {activityItems.map((item) => (
                  <div key={item.key} onClick={() => item.type === 'workorder' ? setSelectedWO(item) : setSelectedInvoice(item)} className="flex items-center gap-3 py-3 border-b border-[#E8ECF0] last:border-0 cursor-pointer hover:bg-[#E8ECF0]/50 rounded-lg px-2 -mx-2 transition">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      item.iconColor === 'green'  ? 'bg-green-50 text-green-500'     :
                      item.iconColor === 'amber'  ? 'bg-amber-50 text-amber-400'     :
                      item.iconColor === 'copper' ? 'bg-[#B87333]/10 text-[#B87333]' :
                                                    'bg-blue-50 text-blue-400'
                    }`}>
                      {item.iconColor === 'copper' ? (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`${MONO} text-xs font-semibold text-[#B87333]`}>
                        {item.type === 'workorder' ? `WO ${item.woNumber}` : 'INVOICE'}
                      </p>
                      <p className="text-sm font-bold text-[#0D1B2A] truncate">
                        {item.type === 'workorder'
                          ? [item.equipment, item.problem].filter(Boolean).join(' · ') || item.title
                          : item.description || item.title}
                      </p>
                      <p className="text-xs text-[#7A8898]">
                        {fmt(item.date)}{item.total != null && Number(item.total) > 0 ? ` · $${Number(item.total).toFixed(2)}` : ''}
                      </p>
                    </div>
                    <StatusBadge status={item.status} map={item.statusMap} />
                  </div>
                ))}
              </div>
            </div>
          )}

          </div> {/* /Content row */}

        </div>
      )}

      {/* ── Bottom nav (mobile only) ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 bg-[#E8ECF0] border-t border-[#E8ECF0] pb-safe sm:hidden">
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
            onClick={() => { setActiveNav('contact'); showSection('contact') }}
            className={`flex flex-col items-center gap-1 pt-3 pb-1 transition ${activeNav === 'contact' ? 'text-[#B87333]' : 'text-[#7A8898]'}`}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <p className={`${MONO} text-[8px] font-semibold uppercase tracking-wide`}>Contact</p>
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

      {/* ── DESKTOP LAYOUT ── */}
      <div className="hidden sm:flex min-h-screen bg-[#E8ECF0]">

        {/* ─── Sidebar ─── */}
        <aside className="w-56 shrink-0 flex flex-col bg-[#0D1B2A] sticky top-0 h-screen z-20">
          <div className="px-5 pt-8 pb-6 border-b border-white/[0.06]">
            <p className={`${MONO} text-[9px] font-semibold uppercase tracking-widest text-[#7A8898] mb-1.5`}>Customer Portal</p>
            <span className={`${MONO} text-sm font-bold tracking-wider text-white`}>Cafe<span className="text-[#B87333]">Works</span></span>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            {([
              { id: 'home',      label: 'Home',      path: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
              { id: 'repairs',   label: 'My Repairs', path: 'M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z' },
              { id: 'plan',      label: 'My Plan',   path: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
              { id: 'invoices',  label: 'Invoices',  path: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
              { id: 'equipment', label: 'Equipment', path: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' },
              { id: 'contact',   label: 'Contact',   path: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' },
              { id: 'profile',   label: 'Profile',   path: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
            ] as { id: DesktopNav; label: string; path: string }[]).map(({ id, label, path }) => (
              <button key={id} onClick={() => setDesktopNav(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-left ${
                  desktopNav === id
                    ? 'bg-[#B87333]/15 text-[#B87333] border-l-2 border-[#B87333]'
                    : 'text-[#7A8898] hover:text-white hover:bg-white/[0.05]'
                }`}>
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={path} />
                </svg>
                <span className="flex-1">{label}</span>
                {id === 'repairs' && openRepairs.length > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#B87333] text-[9px] font-bold text-white">{openRepairs.length}</span>
                )}
                {id === 'invoices' && openInvoices.length > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-orange-400 text-[9px] font-bold text-white">{openInvoices.length}</span>
                )}
              </button>
            ))}
          </nav>
          <div className="px-3 pb-6 pt-3 border-t border-white/[0.06]">
            <button onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-[#7A8898] hover:text-white hover:bg-white/[0.05] transition">
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          </div>
        </aside>

        {/* ─── Main area ─── */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-screen">

          {/* Top bar */}
          <header className="shrink-0 sticky top-0 z-10 bg-white border-b border-black/[0.07] px-8 py-4 flex items-center justify-between">
            <div>
              <p className="text-base font-bold text-[#0D1B2A]">{greeting}, {firstName}</p>
              <p className="text-sm text-[#7A8898]">
                {customer?.full_name ?? ''}
                {plan ? ` · ${plan.plan_name}` : ''}
              </p>
            </div>
            <button onClick={openRepairModal}
              className="inline-flex items-center gap-2 rounded-full bg-[#B87333] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition shadow-sm">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Request Repair
            </button>
          </header>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">

            {!customer && (
              <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center max-w-sm px-6">
                  <svg className="mx-auto h-10 w-10 text-[#7A8898]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <h2 className="mt-4 text-lg font-bold text-[#0D1B2A]">Account not linked yet</h2>
                  <p className="mt-2 text-sm text-[#7A8898]">Your login ({userEmail}) hasn&apos;t been linked to a customer record. Contact Cafe Works to get set up.</p>
                  <Link href="/service-request" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#B87333] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition">Submit a service request</Link>
                </div>
              </div>
            )}

            {customer && (
              <div className="p-8 space-y-5">

                {/* ── Stat cards ── */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl border border-black/[0.07] border-l-4 border-l-[#B87333] px-5 py-4">
                    <p className={`${MONO} text-[10px] font-semibold uppercase tracking-wide text-[#7A8898]`}>Next PM Visit</p>
                    {plan?.next_visit_date ? (
                      <>
                        <p className="mt-1 text-lg font-bold text-[#0D1B2A]">{fmt(plan.next_visit_date)}</p>
                        {plan.next_visit_slot && (
                          <p className="mt-0.5 text-xs text-[#7A8898]">
                            {plan.next_visit_slot}
                          </p>
                        )}
                        <div className="mt-1.5 flex items-center gap-1">
                          <span className="text-xs font-medium text-[#B87333]">{daysUntil(plan.next_visit_date)} days away</span>
                          <span className="text-[#7A8898] text-xs">·</span>
                          <button onClick={() => setShowSchedulePicker(true)} className="text-xs font-medium text-[#B87333] hover:underline">Reschedule →</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="mt-1 text-lg font-bold text-[#0D1B2A]">—</p>
                        <button onClick={() => setShowSchedulePicker(true)} className="mt-1 text-xs font-medium text-[#B87333] hover:underline">Schedule visit →</button>
                      </>
                    )}
                  </div>
                  <div className="bg-white rounded-xl border border-black/[0.07] border-l-4 border-l-blue-500 px-5 py-4">
                    <p className={`${MONO} text-[10px] font-semibold uppercase tracking-wide text-[#7A8898]`}>Open Repairs</p>
                    <p className="mt-1 text-lg font-bold text-[#0D1B2A]">{openRepairs.length}</p>
                    <p className="mt-0.5 text-xs text-[#7A8898]">
                      {workOrders.filter((w) => w.status === 'in_progress').length} in progress, {workOrders.filter((w) => w.status === 'open').length} open
                    </p>
                    {openRepairs.length > 0 && (
                      <button onClick={() => setDesktopNav('repairs')} className="mt-1 text-xs font-medium text-[#B87333] hover:underline">View all repairs →</button>
                    )}
                  </div>
                  <div className="bg-white rounded-xl border border-black/[0.07] border-l-4 border-l-amber-500 px-5 py-4">
                    <p className={`${MONO} text-[10px] font-semibold uppercase tracking-wide text-[#7A8898]`}>Outstanding</p>
                    <p className="mt-1 text-lg font-bold text-[#0D1B2A]">
                      ${invoices.filter((i) => i.status !== 'paid').reduce((s, i) => s + Number(i.total), 0).toFixed(2)}
                    </p>
                    <p className="mt-0.5 text-xs text-[#7A8898]">{openInvoices.length} unpaid {openInvoices.length === 1 ? 'invoice' : 'invoices'}</p>
                    {openInvoices.length > 0 && (
                      <button onClick={() => setDesktopNav('invoices')} className="mt-1 text-xs font-medium text-[#B87333] hover:underline">View invoices →</button>
                    )}
                  </div>
                </div>

                {/* ── Home: 2×2 grid + contact ── */}
                {desktopNav === 'home' && (
                  <>
                    <div className="grid grid-cols-2 gap-[14px]">

                      {/* Card 1: Recent Activity */}
                      <div className="bg-white rounded-xl border border-black/[0.07] overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.05]">
                          <p className="text-sm font-bold text-[#0D1B2A]">Recent Activity</p>
                          <button onClick={() => setDesktopNav('repairs')} className="text-xs font-semibold text-[#B87333] hover:underline">See all →</button>
                        </div>
                        <div>
                          {activityItems.length > 0 ? activityItems.map((item) => (
                            <div key={item.key} onClick={() => item.type === 'workorder' ? setSelectedWO(item) : setSelectedInvoice(item)} className="flex items-center gap-3 px-[18px] py-[11px] border-b border-[#E8ECF0] last:border-0 hover:bg-gray-50 cursor-pointer">
                              <div className={`w-[30px] h-[30px] rounded-lg flex items-center justify-center shrink-0 ${
                                item.iconColor === 'amber'  ? 'bg-amber-50'       :
                                item.iconColor === 'green'  ? 'bg-green-50'       :
                                item.iconColor === 'copper' ? 'bg-[#B87333]/10'   : 'bg-blue-50'
                              }`}>
                                <svg className={`w-[14px] h-[14px] ${
                                  item.iconColor === 'amber'  ? 'stroke-amber-500'  :
                                  item.iconColor === 'green'  ? 'stroke-green-500'  :
                                  item.iconColor === 'copper' ? 'stroke-[#B87333]'  : 'stroke-blue-500'
                                }`} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                                  {item.type === 'invoice'
                                    ? <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    : item.iconColor === 'green'
                                      ? <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      : <path d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                                  }
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-[family-name:var(--font-ibm-plex-mono)] text-[10px] text-[#B87333] font-medium">{item.type === 'invoice' ? 'INVOICE' : item.woNumber}</p>
                                <p className="text-xs font-semibold text-[#0D1B2A] truncate mt-[1px]">{item.type === 'workorder' ? `${item.equipment || ''} · ${item.problem || item.subtitle}` : item.title}</p>
                                <p className="text-[11px] text-[#7A8898] mt-[1px]">{fmt(item.date)}{(item.total && Number(item.total) > 0) ? ` · $${Number(item.total).toFixed(2)}` : ''}</p>
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <p className="text-[10px] text-[#7A8898]">{(() => { const d = new Date(item.date); const t = new Date(); return d.toDateString() === t.toDateString() ? 'Today' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) })()}</p>
                                <StatusBadge status={item.status} map={item.statusMap} />
                              </div>
                              <span className="text-[#ccc] text-sm ml-1">›</span>
                            </div>
                          )) : (
                            <p className="text-xs text-[#7A8898] text-center py-8">No recent activity.</p>
                          )}
                        </div>
                      </div>

                      {/* Card 2: Invoices */}
                      <div className="bg-white rounded-xl border border-black/[0.07] overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.05]">
                          <p className="text-sm font-bold text-[#0D1B2A]">Invoices</p>
                          <button onClick={() => setDesktopNav('invoices')} className="text-xs font-semibold text-[#B87333] hover:underline">See all →</button>
                        </div>
                        <div>
                          {invoices.length > 0 ? invoices
                            .slice()
                            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                            .slice(0, 5)
                            .map((inv) => (
                              <div key={inv.id} onClick={() => setSelectedInvoice(inv)} className="flex items-center justify-between px-[18px] py-[11px] border-b border-[#E8ECF0] last:border-0 hover:bg-gray-50 cursor-pointer">
                                <div>
                                  <p className="text-xs font-semibold text-[#0D1B2A]">{inv.description}</p>
                                  <p className="text-[11px] text-[#7A8898] mt-[2px]">{inv.status === 'paid' ? `Paid ${inv.due_date ? fmt(inv.due_date) : ''}` : inv.due_date ? `Due ${fmt(inv.due_date)}` : '—'}</p>
                                </div>
                                <div className="flex items-center gap-[10px]">
                                  <p className="text-[13px] font-semibold text-[#0D1B2A]">${Number(inv.total).toFixed(2)}</p>
                                  <StatusBadge status={inv.status} map={INV_STATUS} />
                                  <span className="text-[#ccc] text-[13px]">›</span>
                                </div>
                              </div>
                            )) : (
                            <p className="text-xs text-[#7A8898] text-center py-8">No invoices yet.</p>
                          )}
                        </div>
                      </div>

                      {/* Card 3: Maintenance Plan */}
                      <div className="bg-white rounded-xl border border-black/[0.07] overflow-hidden cursor-pointer hover:shadow-sm transition" onClick={() => setShowPlanModal(true)}>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.05]">
                          <p className="text-sm font-bold text-[#0D1B2A]">Maintenance Plan</p>
                          {plan && (
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${plan.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                              {plan.status === 'pending_payment' ? 'Pending' : plan.status}
                            </span>
                          )}
                        </div>
                        {plan ? (
                          <div className="p-[18px]">
                            <div className="flex items-start justify-between mb-3">
                              <p className="text-[15px] font-semibold text-[#0D1B2A]">{plan.plan_name}</p>
                            </div>
                            <p className="text-2xl font-light text-[#B87333] tracking-tight mb-3">${plan.price}<span className="text-xs font-normal text-[#7A8898]">/mo</span></p>
                            <div className="flex justify-between text-xs text-[#7A8898] py-[6px] border-t border-[#E8ECF0]">
                              <span>Next renewal</span><strong className="text-[#0D1B2A] font-medium">{plan.renewal_date ? fmt(plan.renewal_date) : '—'}</strong>
                            </div>
                            <div className="flex justify-between text-xs text-[#7A8898] py-[6px] border-t border-[#E8ECF0]">
                              <span>Next PM visit</span><strong className="text-[#0D1B2A] font-medium">{plan.next_visit_date ? `${new Date(plan.next_visit_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${plan.next_visit_slot ? ` · ${plan.next_visit_slot}` : ''}` : '—'}</strong>
                            </div>
                            <div className="flex justify-between text-xs text-[#7A8898] py-[6px] border-t border-[#E8ECF0]">
                              <span>Billing</span><strong className="text-[#0D1B2A] font-medium">Monthly</strong>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); handleManagePlan() }} disabled={portalLoading} className="w-full mt-[14px] border border-[#B87333] text-[#B87333] rounded-full py-2 text-xs font-semibold hover:bg-[#B87333]/5 transition">
                              {portalLoading ? 'Opening…' : 'Manage plan & billing →'}
                            </button>
                          </div>
                        ) : (
                          <div className="p-[18px] text-center">
                            <p className="text-sm text-[#7A8898] mb-3">No active maintenance plan.</p>
                            <Link href="/pricing" className="inline-flex rounded-xl bg-[#B87333] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition">View plans</Link>
                          </div>
                        )}
                      </div>

                      {/* Card 4: Equipment */}
                      <div className="bg-white rounded-xl border border-black/[0.07] overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.05]">
                          <p className="text-sm font-bold text-[#0D1B2A]">Equipment</p>
                          <button onClick={() => { setShowEqForm((v) => !v); setEqError(null); setEqSuccess(null) }}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#B87333] px-2.5 py-1 text-xs font-semibold text-[#B87333] hover:bg-[#B87333]/5 transition">
                            {showEqForm ? 'Cancel' : '+ Add'}
                          </button>
                        </div>
                        {eqSuccess && <p className="px-5 py-2 text-xs text-green-700 bg-green-50 border-b border-green-100">{eqSuccess}</p>}
                        {showEqForm && (
                          <form onSubmit={handleAddEquipment} className="px-5 py-4 border-b border-black/[0.05] bg-[#E8ECF0]/40 grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-[#0D1B2A] mb-1">Type</label>
                              <select value={eqType} onChange={(e) => setEqType(e.target.value)} required className="block w-full rounded-lg border border-black/[0.07] bg-white px-3 py-2 text-sm focus:border-[#B87333] focus:outline-none">
                                <option value="" disabled>Select…</option>
                                <option>Espresso Machine</option><option>Grinder</option><option>Brewer</option><option>Other</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-[#0D1B2A] mb-1">Brand</label>
                              <input type="text" value={eqBrand} onChange={(e) => setEqBrand(e.target.value)} required placeholder="e.g. La Marzocco" className="block w-full rounded-lg border border-black/[0.07] bg-white px-3 py-2 text-sm focus:border-[#B87333] focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-[#0D1B2A] mb-1">Model</label>
                              <input type="text" value={eqModel} onChange={(e) => setEqModel(e.target.value)} required placeholder="e.g. Linea Mini" className="block w-full rounded-lg border border-black/[0.07] bg-white px-3 py-2 text-sm focus:border-[#B87333] focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-[#0D1B2A] mb-1">Serial <span className="font-normal">(optional)</span></label>
                              <input type="text" value={eqSerial} onChange={(e) => setEqSerial(e.target.value)} placeholder="SN…" className="block w-full rounded-lg border border-black/[0.07] bg-white px-3 py-2 text-sm focus:border-[#B87333] focus:outline-none" />
                            </div>
                            <div className="col-span-2">
                              {eqError && <p className="text-xs text-red-600 mb-2">{eqError}</p>}
                              <div className="flex gap-2">
                                <button type="button" onClick={() => { setShowEqForm(false); setEqError(null) }} className="rounded-lg border border-black/[0.07] px-3 py-1.5 text-xs font-semibold text-[#7A8898] hover:bg-[#E8ECF0] transition">Cancel</button>
                                <button type="submit" disabled={eqSaving} className="rounded-lg bg-[#B87333] px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50 transition">{eqSaving ? 'Saving…' : 'Save'}</button>
                              </div>
                            </div>
                          </form>
                        )}
                        {equipment.length > 0 ? (
                          <div>
                            {equipment.map((eq) => (
                              <div key={eq.id} onClick={() => setSelectedEquipment(eq)} className="flex items-center justify-between px-[18px] py-[11px] border-b border-[#E8ECF0] last:border-0 hover:bg-gray-50 cursor-pointer">
                                <div>
                                  <p className="font-[family-name:var(--font-ibm-plex-mono)] text-[9px] text-[#B87333] uppercase tracking-[0.1em] mb-[2px]">{eq.equipment_type}</p>
                                  <p className="text-xs font-semibold text-[#0D1B2A]">{eq.brand} {eq.model}</p>
                                  {eq.serial_number && <p className="font-[family-name:var(--font-ibm-plex-mono)] text-[11px] text-[#7A8898]">S/N: {eq.serial_number}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : !showEqForm && (
                          <div className="px-5 py-8 text-center">
                            <p className="text-xs font-semibold text-[#7A8898] border border-dashed border-[#E8ECF0] rounded-lg py-3 px-4 inline-block">No equipment registered</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Contact — full width */}
                    <div className="bg-white rounded-xl border border-black/[0.07] overflow-hidden">
                      <div className="flex items-center px-5 py-4 border-b border-black/[0.05]">
                        <p className="text-sm font-bold text-[#0D1B2A]">Contact</p>
                      </div>
                      <div className="grid grid-cols-3 gap-[10px] p-[16px]">
                        {([
                          { label: 'Call or Text', value: siteSettings.phone || '(555) 012-3456', href: `tel:${siteSettings.phone || '5550123456'}`, icon: 'phone' },
                          { label: 'Email', value: siteSettings.email || 'hello@cafeworks.com', href: `mailto:${siteSettings.email || 'hello@cafeworks.com'}`, icon: 'email' },
                          { label: 'Hours', value: siteSettings.business_hours || 'Mon–Sat, 7am–6pm', href: null, icon: 'clock' },
                        ] as { label: string; value: string; href: string | null; icon: string }[]).map((item) => {
                          const card = (
                            <div className="flex items-center gap-3 bg-[#E8ECF0] rounded-[10px] p-[10px]">
                              <div className="w-[30px] h-[30px] rounded-lg bg-[#B87333]/[0.12] flex items-center justify-center shrink-0">
                                {item.icon === 'phone' && <svg className="h-4 w-4 text-[#B87333]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>}
                                {item.icon === 'email' && <svg className="h-4 w-4 text-[#B87333]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
                                {item.icon === 'clock' && <svg className="h-4 w-4 text-[#B87333]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                              </div>
                              <div>
                                <p className="font-[family-name:var(--font-ibm-plex-mono)] text-[8px] text-[#7A8898] uppercase tracking-[0.1em] mb-[2px]">{item.label}</p>
                                <p className="text-xs font-semibold text-[#0D1B2A]">{item.value}</p>
                              </div>
                            </div>
                          )
                          return item.href
                            ? <a key={item.label} href={item.href} className="block hover:opacity-90 transition">{card}</a>
                            : <div key={item.label}>{card}</div>
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* ── Section views ── */}
                {desktopNav !== 'home' && (
                  <div ref={desktopSectionRef} className="bg-white rounded-xl border border-black/[0.07] overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.05]">
                      <h2 className="text-base font-bold text-[#0D1B2A]">
                        {desktopNav === 'repairs' ? 'My Repairs' : desktopNav === 'plan' ? 'Maintenance Plan' : desktopNav === 'invoices' ? 'Invoices' : desktopNav === 'equipment' ? 'Equipment' : desktopNav === 'contact' ? 'Contact Us' : 'Profile'}
                      </h2>
                      <button onClick={() => setDesktopNav('home')} className="text-[#7A8898] hover:text-[#0D1B2A] transition">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                    <div className="p-6">

                      {/* ── Repairs ── */}
                      {desktopNav === 'repairs' && (
                        <div>
                          <div className="flex justify-end mb-4">
                            <button onClick={openRepairModal} className="inline-flex items-center gap-1.5 rounded-xl bg-[#B87333] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition">
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                              Request repair
                            </button>
                          </div>
                          {workOrders.length > 0 ? (
                            <div className="rounded-xl border border-black/[0.07] overflow-hidden">
                              {workOrders.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((wo) => (
                                <div key={wo.id} onClick={() => setSelectedWO({ key: `wo-${wo.id}`, type: 'workorder', woNumber: wo.work_order_number, equipment: wo.equipment_list ? `${wo.equipment_list.brand} ${wo.equipment_list.model}` : null, problem: wo.problem_description, total: wo.grand_total, status: wo.status, statusMap: WO_STATUS, date: wo.created_at, iconColor: wo.status === 'completed' ? 'green' : wo.status === 'in_progress' ? 'amber' : 'blue' })} className="flex items-center gap-3 px-[18px] py-[11px] border-b border-[#E8ECF0] last:border-0 hover:bg-gray-50 cursor-pointer">
                                  <div className={`w-[30px] h-[30px] rounded-lg flex items-center justify-center shrink-0 ${wo.status === 'completed' ? 'bg-green-50' : wo.status === 'in_progress' ? 'bg-amber-50' : 'bg-blue-50'}`}>
                                    <svg className={`w-[14px] h-[14px] ${wo.status === 'completed' ? 'stroke-green-500' : wo.status === 'in_progress' ? 'stroke-amber-500' : 'stroke-blue-500'}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                                      {wo.status === 'completed' ? <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /> : <path d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />}
                                    </svg>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-[family-name:var(--font-ibm-plex-mono)] text-[10px] text-[#B87333] font-medium">{wo.work_order_number}</p>
                                    <p className="text-xs font-semibold text-[#0D1B2A] truncate mt-[1px]">{[wo.equipment_list ? `${wo.equipment_list.brand} ${wo.equipment_list.model}` : null, wo.problem_description].filter(Boolean).join(' · ')}</p>
                                    <p className="text-[11px] text-[#7A8898] mt-[1px]">{fmt(wo.created_at)}{Number(wo.grand_total) > 0 ? ` · $${Number(wo.grand_total).toFixed(2)}` : ''}</p>
                                  </div>
                                  <StatusBadge status={wo.status} map={WO_STATUS} />
                                  <span className="text-[#ccc] text-sm ml-1">›</span>
                                </div>
                              ))}
                            </div>
                          ) : <p className="text-sm text-center text-[#7A8898] py-8">No repair history yet.</p>}
                        </div>
                      )}

                      {/* ── Plan ── */}
                      {desktopNav === 'plan' && (
                        <div className="max-w-lg">
                          {plan ? (
                            <div className="p-[18px]">
                              <div className="flex items-start justify-between mb-3">
                                <p className="text-[15px] font-semibold text-[#0D1B2A]">{plan.plan_name}</p>
                                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase ${plan.status === 'active' ? 'bg-green-100 text-green-700' : plan.status === 'pending_payment' ? 'bg-amber-100 text-amber-700' : 'bg-[#E8ECF0] text-[#7A8898]'}`}>{plan.status === 'pending_payment' ? 'Pending' : plan.status}</span>
                              </div>
                              <p className="text-2xl font-light text-[#B87333] tracking-tight mb-3">${plan.price}<span className="text-xs font-normal text-[#7A8898]">/mo</span></p>
                              {plan.description && <p className="text-sm text-[#7A8898] mb-3">{plan.description}</p>}
                              <div className="flex justify-between text-xs text-[#7A8898] py-[6px] border-t border-[#E8ECF0]"><span>Next renewal</span><strong className="text-[#0D1B2A] font-medium">{plan.renewal_date ? fmt(plan.renewal_date) : '—'}</strong></div>
                              <div className="flex justify-between text-xs text-[#7A8898] py-[6px] border-t border-[#E8ECF0]"><span>Next PM visit</span><strong className="text-[#0D1B2A] font-medium">{plan.next_visit_date ? `${new Date(plan.next_visit_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${plan.next_visit_slot ? ` · ${plan.next_visit_slot}` : ''}` : '—'}</strong></div>
                              <div className="flex justify-between text-xs text-[#7A8898] py-[6px] border-t border-[#E8ECF0]"><span>Billing</span><strong className="text-[#0D1B2A] font-medium">Monthly</strong></div>
                              {plan.features && plan.features.length > 0 && <ul className="mt-3 space-y-1">{plan.features.map((f, i) => <li key={i} className="flex items-start gap-2 text-xs text-[#7A8898]"><span className="text-[#B87333]">•</span>{f}</li>)}</ul>}
                              {plan.status === 'pending_payment' && plan.stripe_payment_link ? (
                                <a href={plan.stripe_payment_link} className="flex w-full items-center justify-center mt-4 border border-[#B87333] text-[#B87333] rounded-full py-2 text-xs font-semibold hover:bg-[#B87333]/5 transition">Activate My Plan →</a>
                              ) : (
                                <button onClick={handleManagePlan} disabled={portalLoading} className="w-full mt-4 border border-[#B87333] text-[#B87333] rounded-full py-2 text-xs font-semibold hover:bg-[#B87333]/5 transition disabled:opacity-50">
                                  {portalLoading ? 'Opening…' : 'Manage plan & billing →'}
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <p className="text-[#7A8898] mb-4">No active maintenance plan.</p>
                              <Link href="/pricing" className="rounded-xl bg-[#B87333] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition">View plans</Link>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── Invoices ── */}
                      {desktopNav === 'invoices' && (
                        <div>
                          {invoices.length > 0 ? (
                            <div className="rounded-xl border border-black/[0.07] overflow-hidden">
                              {invoices.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((inv) => (
                                <div key={inv.id} onClick={() => setSelectedInvoice(inv)} className="flex items-center justify-between px-[18px] py-[11px] border-b border-[#E8ECF0] last:border-0 hover:bg-gray-50 cursor-pointer">
                                  <div>
                                    <p className="text-xs font-semibold text-[#0D1B2A]">{inv.description}</p>
                                    <p className="text-[11px] text-[#7A8898] mt-[2px]">{inv.status === 'paid' ? `Paid ${fmt(inv.due_date)}` : inv.due_date ? `Due ${fmt(inv.due_date)}` : '—'}</p>
                                  </div>
                                  <div className="flex items-center gap-[10px]">
                                    <p className="text-[13px] font-semibold text-[#0D1B2A]">${Number(inv.total).toFixed(2)}</p>
                                    <StatusBadge status={inv.status} map={INV_STATUS} />
                                    <span className="text-[#ccc] text-[13px]">›</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : <p className="text-sm text-center text-[#7A8898] py-8">No invoices yet.</p>}
                        </div>
                      )}

                      {/* ── Equipment ── */}
                      {desktopNav === 'equipment' && (
                        <div>
                          <div className="flex justify-end mb-4">
                            <button onClick={() => { setShowEqForm((v) => !v); setEqError(null); setEqSuccess(null) }}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#B87333] px-2.5 py-1.5 text-xs font-semibold text-[#B87333] hover:bg-[#B87333]/5 transition">
                              {showEqForm ? 'Cancel' : '+ Add equipment'}
                            </button>
                          </div>
                          {eqSuccess && <div className="mb-4 rounded-xl bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700">{eqSuccess}</div>}
                          {showEqForm && (
                            <form onSubmit={handleAddEquipment} className="mb-5 rounded-2xl border border-[#E8ECF0] bg-[#E8ECF0] p-4 grid grid-cols-2 gap-3">
                              <div><label className="block text-xs font-semibold text-[#0D1B2A] mb-1">Type</label><select value={eqType} onChange={(e) => setEqType(e.target.value)} required className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-3 py-2 text-sm focus:border-[#B87333] focus:outline-none"><option value="" disabled>Select…</option><option>Espresso Machine</option><option>Grinder</option><option>Brewer</option><option>Other</option></select></div>
                              <div><label className="block text-xs font-semibold text-[#0D1B2A] mb-1">Brand</label><input type="text" value={eqBrand} onChange={(e) => setEqBrand(e.target.value)} required placeholder="e.g. La Marzocco" className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-3 py-2 text-sm focus:border-[#B87333] focus:outline-none" /></div>
                              <div><label className="block text-xs font-semibold text-[#0D1B2A] mb-1">Model</label><input type="text" value={eqModel} onChange={(e) => setEqModel(e.target.value)} required placeholder="e.g. Linea Mini" className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-3 py-2 text-sm focus:border-[#B87333] focus:outline-none" /></div>
                              <div><label className="block text-xs font-semibold text-[#0D1B2A] mb-1">Serial <span className="font-normal">(optional)</span></label><input type="text" value={eqSerial} onChange={(e) => setEqSerial(e.target.value)} placeholder="SN…" className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-3 py-2 text-sm focus:border-[#B87333] focus:outline-none" /></div>
                              <div className="col-span-2">{eqError && <p className="text-xs text-red-600 mb-2">{eqError}</p>}<div className="flex gap-2"><button type="button" onClick={() => { setShowEqForm(false); setEqError(null) }} className="rounded-xl border border-[#E8ECF0] px-4 py-2 text-sm font-semibold text-[#7A8898] hover:bg-[#E8ECF0] transition">Cancel</button><button type="submit" disabled={eqSaving} className="rounded-xl bg-[#B87333] px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition">{eqSaving ? 'Saving…' : 'Save'}</button></div></div>
                            </form>
                          )}
                          {equipment.length > 0 ? (
                            <div className="rounded-xl border border-black/[0.07] overflow-hidden">
                              {equipment.map((eq) => (
                                <div key={eq.id} onClick={() => setSelectedEquipment(eq)} className="flex items-center justify-between px-[18px] py-[11px] border-b border-[#E8ECF0] last:border-0 hover:bg-gray-50 cursor-pointer">
                                  <div>
                                    <p className="font-[family-name:var(--font-ibm-plex-mono)] text-[9px] text-[#B87333] uppercase tracking-[0.1em] mb-[2px]">{eq.equipment_type}</p>
                                    <p className="text-xs font-semibold text-[#0D1B2A]">{eq.brand} {eq.model}</p>
                                    {eq.serial_number && <p className="font-[family-name:var(--font-ibm-plex-mono)] text-[11px] text-[#7A8898]">S/N: {eq.serial_number}</p>}
                                  </div>
                                  <span className="text-[#ccc] text-sm">›</span>
                                </div>
                              ))}
                            </div>
                          ) : !showEqForm && <p className="text-sm text-center text-[#7A8898] py-8">No equipment registered yet.</p>}
                        </div>
                      )}

                      {/* ── Contact ── */}
                      {desktopNav === 'contact' && (
                        <div className="grid grid-cols-3 gap-[10px] p-[16px]">
                          <a href={`tel:${(siteSettings.phone || '').replace(/\D/g,'')}`} className="flex items-center gap-3 bg-[#E8ECF0] rounded-[10px] p-[10px] hover:bg-[#E0E4E8] transition">
                            <div className="w-[30px] h-[30px] rounded-lg bg-[#B87333]/10 flex items-center justify-center shrink-0">
                              <svg className="w-[13px] h-[13px] stroke-[#B87333]" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                            </div>
                            <div>
                              <p className="font-[family-name:var(--font-ibm-plex-mono)] text-[8px] text-[#7A8898] uppercase tracking-[0.1em] mb-[2px]">Call or Text</p>
                              <p className="text-xs font-semibold text-[#0D1B2A]">{siteSettings.phone || '(555) 012-3456'}</p>
                            </div>
                          </a>
                          <a href={`mailto:${siteSettings.email || 'hello@cafeworks.com'}`} className="flex items-center gap-3 bg-[#E8ECF0] rounded-[10px] p-[10px] hover:bg-[#E0E4E8] transition">
                            <div className="w-[30px] h-[30px] rounded-lg bg-[#B87333]/10 flex items-center justify-center shrink-0">
                              <svg className="w-[13px] h-[13px] stroke-[#B87333]" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                            </div>
                            <div>
                              <p className="font-[family-name:var(--font-ibm-plex-mono)] text-[8px] text-[#7A8898] uppercase tracking-[0.1em] mb-[2px]">Email</p>
                              <p className="text-xs font-semibold text-[#0D1B2A]">{siteSettings.email || 'hello@cafeworks.com'}</p>
                            </div>
                          </a>
                          <div className="flex items-center gap-3 bg-[#E8ECF0] rounded-[10px] p-[10px]">
                            <div className="w-[30px] h-[30px] rounded-lg bg-[#B87333]/10 flex items-center justify-center shrink-0">
                              <svg className="w-[13px] h-[13px] stroke-[#B87333]" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            </div>
                            <div>
                              <p className="font-[family-name:var(--font-ibm-plex-mono)] text-[8px] text-[#7A8898] uppercase tracking-[0.1em] mb-[2px]">Hours</p>
                              <p className="text-xs font-semibold text-[#0D1B2A]">{siteSettings.business_hours || 'Mon–Sat, 7am–6pm'}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ── Profile ── */}
                      {desktopNav === 'profile' && (
                        <div className="max-w-lg">
                          <form onSubmit={handleSaveProfile} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div><label className="block text-xs font-semibold text-[#0D1B2A] mb-1.5">Full name</label><input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)} required className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-4 py-2.5 text-sm focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20" /></div>
                              <div><label className="block text-xs font-semibold text-[#0D1B2A] mb-1.5">Phone</label><input type="tel" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} placeholder="(555) 000-0000" className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-4 py-2.5 text-sm focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20" /></div>
                            </div>
                            <div><label className="block text-xs font-semibold text-[#0D1B2A] mb-1.5">Email</label><input type="email" value={userEmail ?? ''} disabled className="block w-full rounded-xl border border-[#E8ECF0] bg-[#E8ECF0] px-4 py-2.5 text-sm text-[#7A8898] cursor-not-allowed" /><p className="mt-1 text-xs text-[#7A8898]">Email cannot be changed here.</p></div>
                            <div><label className="block text-xs font-semibold text-[#0D1B2A] mb-1.5">Street Address</label><input type="text" value={profileStreet} onChange={(e) => setProfileStreet(e.target.value)} placeholder="123 Main St" className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-4 py-2.5 text-sm focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20" /></div>
                            <div className="grid grid-cols-3 gap-3">
                              <div><label className="block text-xs font-semibold text-[#0D1B2A] mb-1.5">City</label><input type="text" value={profileCity} onChange={(e) => setProfileCity(e.target.value)} placeholder="Portland" className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-4 py-2.5 text-sm focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20" /></div>
                              <div><label className="block text-xs font-semibold text-[#0D1B2A] mb-1.5">State</label><input type="text" value={profileState} onChange={(e) => setProfileState(e.target.value)} placeholder="OR" maxLength={2} className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-4 py-2.5 text-sm focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20" /></div>
                              <div><label className="block text-xs font-semibold text-[#0D1B2A] mb-1.5">ZIP</label><input type="text" value={profileZip} onChange={(e) => setProfileZip(e.target.value)} placeholder="97201" maxLength={10} className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-4 py-2.5 text-sm focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20" /></div>
                            </div>
                            {profileError && <p className="text-sm text-red-600">{profileError}</p>}
                            {profileMsg && <p className="text-sm text-green-600">{profileMsg}</p>}
                            <div className="flex gap-3">
                              <button type="submit" disabled={profileSaving} className="rounded-xl bg-[#B87333] px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition">{profileSaving ? 'Saving…' : 'Save changes'}</button>
                              <button type="button" onClick={handleSignOut} className="rounded-xl border border-[#E8ECF0] px-6 py-2.5 text-sm font-semibold text-[#7A8898] hover:bg-[#E8ECF0] transition">Sign out</button>
                            </div>
                          </form>
                        </div>
                      )}

                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      </div>
      {/* /DESKTOP LAYOUT */}

      {/* ── Success toast ── */}
      {successToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] max-w-sm w-[calc(100%-2rem)] rounded-2xl bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-lg text-center">
          {successToast}
        </div>
      )}

      {showRepairModal && (
        <RepairScheduler
          onClose={() => setShowRepairModal(false)}
          onSuccess={() => {
            setSuccessToast("Repair request submitted! We'll confirm shortly.")
            setTimeout(() => setSuccessToast(null), 3000)
          }}
          equipment={equipment}
          customer={customer}
          userEmail={userEmail}
        />
      )}

      {showSchedulePicker && (
        <PMScheduler
          onClose={() => { setShowSchedulePicker(false); setActiveNav('home') }}
          onSave={handleSchedulePM}
          saving={pmSaving}
          error={pmError}
        />
      )}

      {/* Work Order Modal */}
      {selectedWO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelectedWO(null)}>
          <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedWO(null)} className="absolute top-4 right-4 text-[#7A8898] hover:text-[#0D1B2A] transition">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <p className={`${MONO} text-[10px] font-semibold text-[#B87333] uppercase tracking-wide`}>Work Order</p>
            <p className="mt-1 text-xl font-bold text-[#0D1B2A]">WO {selectedWO.woNumber}</p>
            {selectedWO.equipment && <p className="mt-3 text-sm text-[#7A8898]">{selectedWO.equipment}</p>}
            {selectedWO.problem && <p className="mt-1 text-sm text-[#0D1B2A]">{selectedWO.problem}</p>}
            <div className="mt-4 space-y-2 border-t border-[#E8ECF0] pt-4">
              <div className="flex justify-between text-sm items-center">
                <span className="text-[#7A8898]">Status</span>
                <StatusBadge status={selectedWO.status} map={WO_STATUS} />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#7A8898]">Date</span>
                <span className="font-medium text-[#0D1B2A]">{fmt(selectedWO.date)}</span>
              </div>
              {selectedWO.total != null && Number(selectedWO.total) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#7A8898]">Total</span>
                  <span className="font-bold text-[#0D1B2A]">${Number(selectedWO.total).toFixed(2)}</span>
                </div>
              )}
            </div>
            <Link href="/service-request" onClick={() => setSelectedWO(null)}
              className="mt-5 flex w-full items-center justify-center rounded-xl bg-[#B87333] py-2.5 text-sm font-semibold text-white hover:opacity-90 transition">
              Request Follow-up
            </Link>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelectedInvoice(null)}>
          <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedInvoice(null)} className="absolute top-4 right-4 text-[#7A8898] hover:text-[#0D1B2A] transition">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <p className={`${MONO} text-[10px] font-semibold text-[#B87333] uppercase tracking-wide`}>Invoice</p>
            {selectedInvoice.invoice_number && (
              <p className="mt-1 text-xl font-bold text-[#0D1B2A]">{selectedInvoice.invoice_number}</p>
            )}
            {selectedInvoice.description && (
              <p className="mt-1 text-sm text-[#7A8898]">{selectedInvoice.description}</p>
            )}
            <div className="mt-4 space-y-2 border-t border-[#E8ECF0] pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-[#7A8898]">Amount</span>
                <span className="font-bold text-[#0D1B2A]">${Number(selectedInvoice.total).toFixed(2)}</span>
              </div>
              {(selectedInvoice.due_date ?? selectedInvoice.dueDate) && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#7A8898]">Due date</span>
                  <span className="font-medium text-[#0D1B2A]">{fmt(selectedInvoice.due_date ?? selectedInvoice.dueDate)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm items-center">
                <span className="text-[#7A8898]">Status</span>
                <StatusBadge status={selectedInvoice.status} map={INV_STATUS} />
              </div>
            </div>
            {(selectedInvoice.status === 'unpaid' || selectedInvoice.status === 'sent' || selectedInvoice.status === 'overdue') && selectedInvoice.stripe_payment_link && (
              <a href={selectedInvoice.stripe_payment_link} target="_blank" rel="noopener noreferrer"
                className="mt-5 flex w-full items-center justify-center rounded-xl bg-[#B87333] py-2.5 text-sm font-semibold text-white hover:opacity-90 transition">
                Pay Now →
              </a>
            )}
          </div>
        </div>
      )}

      {/* Plan Modal */}
      {showPlanModal && plan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowPlanModal(false)}>
          <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowPlanModal(false)} className="absolute top-4 right-4 text-[#7A8898] hover:text-[#0D1B2A] transition">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <p className={`${MONO} text-[10px] font-semibold text-[#B87333] uppercase tracking-wide`}>Maintenance Plan</p>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <p className="text-xl font-bold text-[#0D1B2A]">{plan.plan_name}</p>
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                plan.status === 'active'          ? 'bg-green-100 text-green-700' :
                plan.status === 'pending_payment' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-gray-100 text-gray-500'
              }`}>{plan.status === 'pending_payment' ? 'Pending' : plan.status}</span>
            </div>
            {plan.price ? <p className="mt-1 text-2xl font-bold text-[#B87333]">${plan.price}<span className="text-sm font-normal text-[#7A8898]">/mo</span></p> : null}
            {plan.description && <p className="mt-2 text-sm text-[#7A8898]">{plan.description}</p>}
            <div className="mt-4 space-y-2 border-t border-[#E8ECF0] pt-4">
              {plan.visit_frequency && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#7A8898]">Visits per month</span>
                  <span className="font-medium text-[#0D1B2A]">{plan.visit_frequency}</span>
                </div>
              )}
              {plan.renewal_date && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#7A8898]">Next renewal</span>
                  <span className="font-medium text-[#0D1B2A]">{fmt(plan.renewal_date)}</span>
                </div>
              )}
              {plan.next_visit_date && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#7A8898]">Next PM visit</span>
                  <span className="font-medium text-[#0D1B2A]">{fmt(plan.next_visit_date)}{plan.next_visit_slot ? ` · ${plan.next_visit_slot}` : ''}</span>
                </div>
              )}
            </div>
            {plan.features && plan.features.length > 0 && (
              <ul className="mt-4 space-y-1.5 border-t border-[#E8ECF0] pt-4">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#7A8898]">
                    <span className="mt-0.5 text-[#B87333] shrink-0">•</span>{f}
                  </li>
                ))}
              </ul>
            )}
            <button onClick={() => { setShowPlanModal(false); handleManagePlan() }} disabled={portalLoading}
              className="mt-5 w-full rounded-xl bg-[#B87333] py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition">
              {portalLoading ? 'Opening billing portal…' : 'Manage plan'}
            </button>
          </div>
        </div>
      )}

      {/* Equipment Modal */}
      {selectedEquipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelectedEquipment(null)}>
          <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedEquipment(null)} className="absolute top-4 right-4 text-[#7A8898] hover:text-[#0D1B2A] transition">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <p className={`${MONO} text-[10px] font-semibold text-[#B87333] uppercase tracking-wide`}>{selectedEquipment.equipment_type}</p>
            <p className="mt-1 text-xl font-bold text-[#0D1B2A]">{selectedEquipment.brand} {selectedEquipment.model}</p>
            {selectedEquipment.serial_number && (
              <p className="mt-1 text-sm font-mono text-[#7A8898]">S/N: {selectedEquipment.serial_number}</p>
            )}
            <button
              onClick={() => { setSelectedEquipment(null); openRepairModal() }}
              className="mt-5 w-full rounded-xl bg-[#B87333] py-2.5 text-sm font-semibold text-white hover:opacity-90 transition"
            >
              Request Repair
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
