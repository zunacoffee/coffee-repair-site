"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Customer = {
  id: number | string
  full_name: string
}

type MaintenancePlan = {
  id: number | string
  customer_id: number | string
  plan_name: string
  status: string
  price: number
  renewal_date: string | null
  is_custom?: boolean
  next_visit_date?: string | null
  next_visit_slot?: string | null
}

type PartRow = {
  key: string
  description: string
  quantity: number
  unit_price: number
}

const STATUS_BADGE: Record<string, string> = {
  active:          'bg-green-100 text-green-800',
  pending_payment: 'bg-amber-100 text-amber-800',
  inactive:        'bg-gray-100 text-gray-500',
  cancelled:       'bg-gray-100 text-gray-500',
}

function fmt(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function MaintenancePlansPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [plans, setPlans] = useState<MaintenancePlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [markingVisitId, setMarkingVisitId] = useState<number | string | null>(null)
  const [visitCompleteMsg, setVisitCompleteMsg] = useState<Record<string | number, string>>({})

  // Modal state
  const [selectedPlan, setSelectedPlan] = useState<MaintenancePlan | null>(null)
  const [visitDate, setVisitDate] = useState(todayISO())
  const [visitNotes, setVisitNotes] = useState('')
  const [parts, setParts] = useState<PartRow[]>([])
  const [saving, setSaving] = useState(false)
  const [savedVisitId, setSavedVisitId] = useState<number | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)
  const [invoiceSaving, setInvoiceSaving] = useState(false)
  const [invoiceSuccess, setInvoiceSuccess] = useState<string | null>(null)

  async function fetchData() {
    const [customersRes, plansRes] = await Promise.all([
      fetch('/api/admin/customers'),
      fetch('/api/admin/maintenance-plans'),
    ])

    if (customersRes.status === 401 || plansRes.status === 401) {
      router.replace('/admin/login')
      return
    }

    const [customersJson, plansJson] = await Promise.all([
      customersRes.json(),
      plansRes.json(),
    ])

    if (!customersRes.ok) { setError(customersJson.error ?? 'Unable to load customers.'); return }
    if (!plansRes.ok) { setError(plansJson.error ?? 'Unable to load plans.'); return }

    setCustomers(customersJson.customers ?? [])
    setPlans(plansJson.plans ?? [])
  }

  useEffect(() => {
    let mounted = true
    fetchData().finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const findCustomerName = (id: number | string) =>
    customers.find((c) => c.id.toString() === id.toString())?.full_name ?? 'Unknown'

  const customCount  = plans.filter((p) => p.is_custom).length
  const activeCount  = plans.filter((p) => p.status === 'active').length
  const pendingCount = plans.filter((p) => p.status === 'pending_payment').length

  function openModal(plan: MaintenancePlan) {
    setSelectedPlan(plan)
    setVisitDate(todayISO())
    setVisitNotes('')
    setParts([])
    setSaving(false)
    setSavedVisitId(null)
    setModalError(null)
    setInvoiceSaving(false)
    setInvoiceSuccess(null)
  }

  function closeModal() {
    setSelectedPlan(null)
  }

  function addPart() {
    setParts((prev) => [...prev, { key: crypto.randomUUID(), description: '', quantity: 1, unit_price: 0 }])
  }

  function updatePart(key: string, field: keyof Omit<PartRow, 'key'>, value: string | number) {
    setParts((prev) => prev.map((p) => p.key === key ? { ...p, [field]: value } : p))
  }

  function removePart(key: string) {
    setParts((prev) => prev.filter((p) => p.key !== key))
  }

  async function handleSaveVisit() {
    if (!selectedPlan) return
    setModalError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/admin/pm-visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id:     Number(selectedPlan.id),
          customer_id: Number(selectedPlan.customer_id),
          visit_date:  visitDate,
          notes:       visitNotes || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setModalError(data.error ?? 'Failed to save visit.'); return }

      const visitId: number = data.visit.id

      // Save parts
      for (const part of parts) {
        if (!part.description || !part.unit_price) continue
        await fetch(`/api/admin/pm-visits/${visitId}/parts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: part.description,
            quantity:    part.quantity,
            unit_price:  part.unit_price,
          }),
        })
      }

      setSavedVisitId(visitId)
      setMessage(`PM visit logged for ${findCustomerName(selectedPlan.customer_id)} on ${fmt(visitDate)}.`)
    } finally {
      setSaving(false)
    }
  }

  async function handleGenerateInvoice() {
    if (!selectedPlan || !savedVisitId) return
    setInvoiceSaving(true)
    setModalError(null)
    try {
      const lineItems = parts
        .filter((p) => p.description && p.unit_price)
        .map((p) => ({
          type:        'part' as const,
          description: p.description,
          quantity:    p.quantity,
          unit_price:  p.unit_price,
          total:       Math.round(p.quantity * p.unit_price * 100) / 100,
        }))

      if (lineItems.length === 0) {
        setModalError('No valid parts to invoice.')
        return
      }

      // Create invoice
      const invRes = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: Number(selectedPlan.customer_id),
          notes:       `PM visit on ${fmt(visitDate)}`,
          line_items:  lineItems,
        }),
      })
      const invData = await invRes.json()
      if (!invRes.ok) { setModalError(invData.error ?? 'Failed to create invoice.'); return }

      const invoiceId: number = invData.invoice.id

      // Send invoice
      const sendRes = await fetch(`/api/admin/invoices/${invoiceId}/send`, { method: 'POST' })
      const sendData = await sendRes.json()
      if (!sendRes.ok) { setModalError(sendData.error ?? 'Failed to send invoice.'); return }

      setInvoiceSuccess('Invoice sent to customer')
    } finally {
      setInvoiceSaving(false)
    }
  }

  async function handleMarkVisitComplete(plan: MaintenancePlan, e: React.MouseEvent) {
    e.stopPropagation()
    setMarkingVisitId(plan.id)
    setVisitCompleteMsg((prev) => ({ ...prev, [plan.id]: '' }))
    const res  = await fetch(`/api/admin/maintenance-plans/${plan.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mark_visit_complete: true }),
    })
    const json = await res.json()
    setMarkingVisitId(null)
    if (!res.ok) {
      setVisitCompleteMsg((prev) => ({ ...prev, [plan.id]: json.error ?? 'Failed to update.' }))
      return
    }
    setPlans((prev) => prev.map((p) =>
      p.id === plan.id
        ? { ...p, next_visit_date: json.plan.next_visit_date, next_visit_slot: null }
        : p
    ))
    if (selectedPlan?.id === plan.id) {
      setSelectedPlan((prev) => prev ? { ...prev, next_visit_date: json.plan.next_visit_date, next_visit_slot: null } : null)
    }
    setVisitCompleteMsg((prev) => ({ ...prev, [plan.id]: `Done! Next visit: ${fmt(json.plan.next_visit_date)}` }))
    setTimeout(() => setVisitCompleteMsg((prev) => { const n = { ...prev }; delete n[plan.id]; return n }), 4000)
  }

  const filteredPlans = plans.filter(p =>
    (statusFilter === '' || p.status === statusFilter) &&
    (search === '' ||
      findCustomerName(p.customer_id).toLowerCase().includes(search.toLowerCase()) ||
      p.plan_name?.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="py-8 px-4 lg:px-10 max-w-7xl mx-auto w-full space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0D1B2A]">Maintenance Plans</h1>
        </div>
      </div>

      {message && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-700">{message}</div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#E8ECF0] border-l-4 border-l-green-500 bg-white px-5 py-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#7A8898]">Active</p>
          <p className="mt-2 text-3xl font-bold text-[#0D1B2A]">{activeCount}</p>
          <p className="mt-1 text-xs text-[#7A8898]">paying customers</p>
        </div>
        <div className="rounded-2xl border border-[#E8ECF0] border-l-4 border-l-amber-400 bg-white px-5 py-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#7A8898]">Pending</p>
          <p className="mt-2 text-3xl font-bold text-[#0D1B2A]">{pendingCount}</p>
          <p className="mt-1 text-xs text-[#7A8898]">awaiting payment</p>
        </div>
        <div className="rounded-2xl border border-[#E8ECF0] border-l-4 border-l-[#B87333] bg-white px-5 py-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#7A8898]">Custom</p>
          <p className="mt-2 text-3xl font-bold text-[#B87333]">{customCount}</p>
          <p className="mt-1 text-xs text-[#7A8898]">bespoke plans</p>
        </div>
        <div className="rounded-2xl border border-[#E8ECF0] border-l-4 border-l-[#0D1B2A] bg-white px-5 py-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#7A8898]">Total</p>
          <p className="mt-2 text-3xl font-bold text-[#0D1B2A]">{plans.length}</p>
          <p className="mt-1 text-xs text-[#7A8898]">all plans</p>
        </div>
      </div>

      <div className="md:hidden bg-white rounded-2xl border border-[#E8ECF0] shadow-sm divide-y divide-[#E8ECF0]">
        {loading ? (
          <p className="px-4 py-8 text-center text-sm text-[#7A8898]">Loading maintenance plans…</p>
        ) : filteredPlans.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-[#7A8898]">No plans found.</p>
        ) : filteredPlans.map((plan) => (
          <div
            key={plan.id}
            onClick={() => openModal(plan)}
            className="px-4 py-4 hover:bg-[#E8ECF0] transition-colors cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#0D1B2A]">{findCustomerName(plan.customer_id)}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-xs text-[#7A8898]">{plan.plan_name}</p>
                  {plan.is_custom && (
                    <span className="inline-flex rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">Custom</span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-[#B87333]">${Number(plan.price).toFixed(2)}<span className="text-xs font-normal text-[#7A8898]">/mo</span></p>
                <span className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_BADGE[plan.status] ?? 'bg-[#E8ECF0] text-[#7A8898]'}`}>
                  {plan.status === 'pending_payment' ? 'Pending' : plan.status}
                </span>
              </div>
            </div>
            <p className="mt-1 text-xs text-[#7A8898]">
              {plan.renewal_date ? `Renews ${fmt(plan.renewal_date)}` : 'No renewal date'}
            </p>
          </div>
        ))}
      </div>

      {/* Plans table */}
      <div className="hidden md:block">
      <div className="rounded-2xl border border-[#E8ECF0] bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-[18px] py-[14px] border-b border-[#E8ECF0] sticky top-0 z-10 bg-white">
          <span className="text-sm font-semibold text-[#0D1B2A]">Plan list</span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-[#E8ECF0] rounded-xl px-3 py-1.5 w-56">
              <svg className="h-4 w-4 text-[#7A8898] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search plans…" className="bg-transparent text-sm text-[#0D1B2A] placeholder-[#7A8898] outline-none w-full" />
            </div>
            {['All', 'Active', 'Pending', 'Cancelled'].map((s) => (
              <button key={s} onClick={() => setStatusFilter(s === 'All' ? '' : s.toLowerCase())}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                  (statusFilter === '' && s === 'All') || statusFilter === s.toLowerCase()
                    ? 'bg-[#0D1B2A] text-white'
                    : 'bg-[#E8ECF0] text-[#7A8898] hover:text-[#0D1B2A]'
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-[#7A8898]">
            Loading maintenance plans…
          </div>
        ) : plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <svg className="h-12 w-12 text-[#E8ECF0] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm font-semibold text-[#0D1B2A]">No maintenance plans yet</p>
            <p className="mt-1 text-xs text-[#7A8898]">
              Create a custom plan from a customer&apos;s profile page, or have customers subscribe from the pricing page.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-[#0D1B2A]">
              <tr>
                {['Customer', 'Plan', 'Status', 'Price', 'Renewal date', ''].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-white">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8ECF0]">
              {filteredPlans.map((plan) => (
                <tr
                  key={plan.id}
                  onClick={() => openModal(plan)}
                  className="hover:bg-[#E8ECF0] transition-colors cursor-pointer"
                >
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <p className="text-sm font-medium text-[#0D1B2A]">{findCustomerName(plan.customer_id)}</p>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-[#0D1B2A]">{plan.plan_name}</span>
                      {plan.is_custom && (
                        <span className="inline-flex items-center rounded-full bg-[#B87333]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#B87333]">
                          Custom
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_BADGE[plan.status] ?? 'bg-[#E8ECF0] text-[#7A8898]'}`}>
                      {plan.status === 'pending_payment' ? 'Pending payment' : plan.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-[#0D1B2A] whitespace-nowrap">
                    ${Number(plan.price).toFixed(2)}<span className="text-xs font-normal text-[#7A8898]">/mo</span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-[#7A8898] whitespace-nowrap">
                    {plan.renewal_date ? fmt(plan.renewal_date) : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2 flex-wrap">
                      {visitCompleteMsg[plan.id] && (
                        <span className={`text-xs font-medium ${visitCompleteMsg[plan.id].startsWith('Done') ? 'text-green-600' : 'text-red-600'}`}>
                          {visitCompleteMsg[plan.id]}
                        </span>
                      )}
                      {plan.next_visit_date && (
                        <button
                          onClick={(e) => handleMarkVisitComplete(plan, e)}
                          disabled={markingVisitId === plan.id}
                          className="inline-flex items-center rounded-full border border-[#B87333] px-3 py-1.5 text-xs font-semibold text-[#B87333] hover:bg-[#B87333] hover:text-white disabled:opacity-50 transition whitespace-nowrap"
                        >
                          {markingVisitId === plan.id ? 'Saving…' : 'Mark Complete'}
                        </button>
                      )}
                      <Link
                        href={`/admin/customers/${plan.customer_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center rounded-full bg-[#B87333] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition whitespace-nowrap"
                      >
                        View customer
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
      </div>

      {/* PM Visit Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]">

            {/* Header */}
            <div className="flex items-start justify-between px-6 py-5 border-b border-[#E8ECF0] shrink-0">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#7A8898]">
                  {selectedPlan.plan_name}
                </p>
                <h2 className="mt-0.5 text-lg font-bold text-[#0D1B2A]">
                  {findCustomerName(selectedPlan.customer_id)}
                </h2>
              </div>
              <button onClick={closeModal} className="text-[#7A8898] hover:text-[#0D1B2A] transition mt-1">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

              {/* Section 1: Upcoming Visit */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#7A8898] mb-2">Upcoming Visit</p>
                {selectedPlan.next_visit_date ? (
                  <div className="rounded-xl border border-[#E8ECF0] bg-[#E8ECF0] px-4 py-3 space-y-1">
                    <p className="text-sm font-semibold text-[#0D1B2A]">{fmt(selectedPlan.next_visit_date)}</p>
                    {selectedPlan.next_visit_slot && (
                      <p className="text-xs text-[#7A8898]">{selectedPlan.next_visit_slot}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-[#7A8898]">No visit scheduled</p>
                )}
              </div>

              {/* Section 2: Log a PM Visit */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#7A8898] mb-3">Log a PM Visit</p>

                {savedVisitId ? (
                  <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    Visit saved successfully.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Date */}
                    <div>
                      <label className="block text-xs font-semibold text-[#0D1B2A] mb-1.5">Visit date</label>
                      <input
                        type="date"
                        value={visitDate}
                        onChange={(e) => setVisitDate(e.target.value)}
                        className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-3 py-2 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                      />
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-xs font-semibold text-[#0D1B2A] mb-1.5">Notes</label>
                      <textarea
                        value={visitNotes}
                        onChange={(e) => setVisitNotes(e.target.value)}
                        rows={3}
                        placeholder="What was done during this visit…"
                        className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-3 py-2.5 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20 resize-none"
                      />
                    </div>

                    {/* Parts */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold text-[#0D1B2A]">Parts used</label>
                        <button
                          type="button"
                          onClick={addPart}
                          className="inline-flex items-center gap-1 rounded-full border border-[#B87333] px-2.5 py-1 text-xs font-semibold text-[#B87333] hover:bg-[#B87333]/5 transition"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                          Add Part
                        </button>
                      </div>

                      {parts.length > 0 && (
                        <div className="space-y-2">
                          {/* Column headers */}
                          <div className="grid grid-cols-[1fr_64px_80px_56px_24px] gap-2 px-1">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#7A8898]">Description</p>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#7A8898] text-center">Qty</p>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#7A8898] text-right">Unit price</p>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#7A8898] text-right">Total</p>
                            <span />
                          </div>

                          {parts.map((part) => {
                            const total = Math.round(part.quantity * part.unit_price * 100) / 100
                            return (
                              <div key={part.key} className="grid grid-cols-[1fr_64px_80px_56px_24px] gap-2 items-center">
                                <input
                                  type="text"
                                  value={part.description}
                                  onChange={(e) => updatePart(part.key, 'description', e.target.value)}
                                  placeholder="Part name"
                                  className="rounded-lg border border-[#E8ECF0] px-2.5 py-1.5 text-xs text-[#0D1B2A] focus:border-[#B87333] focus:outline-none"
                                />
                                <input
                                  type="number"
                                  min={1}
                                  value={part.quantity}
                                  onChange={(e) => updatePart(part.key, 'quantity', Number(e.target.value))}
                                  className="rounded-lg border border-[#E8ECF0] px-2 py-1.5 text-xs text-[#0D1B2A] text-center focus:border-[#B87333] focus:outline-none"
                                />
                                <input
                                  type="number"
                                  min={0}
                                  step={0.01}
                                  value={part.unit_price}
                                  onChange={(e) => updatePart(part.key, 'unit_price', Number(e.target.value))}
                                  className="rounded-lg border border-[#E8ECF0] px-2 py-1.5 text-xs text-[#0D1B2A] text-right focus:border-[#B87333] focus:outline-none"
                                />
                                <p className="text-xs font-semibold text-[#0D1B2A] text-right tabular-nums">
                                  ${total.toFixed(2)}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => removePart(part.key)}
                                  className="flex items-center justify-center text-[#7A8898] hover:text-red-500 transition"
                                >
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            )
                          })}

                          {/* Parts total */}
                          <div className="flex justify-end pt-1 border-t border-[#E8ECF0]">
                            <p className="text-xs font-bold text-[#0D1B2A]">
                              Parts total: ${parts.reduce((s, p) => s + Math.round(p.quantity * p.unit_price * 100) / 100, 0).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {modalError && (
                      <p className="text-sm text-red-600">{modalError}</p>
                    )}
                  </div>
                )}

                {/* Generate invoice — shown after save when parts exist */}
                {savedVisitId && parts.some((p) => p.description && p.unit_price) && (
                  <div className="mt-4 space-y-3">
                    {invoiceSuccess ? (
                      <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                        {invoiceSuccess}
                      </div>
                    ) : (
                      <>
                        {modalError && <p className="text-sm text-red-600">{modalError}</p>}
                        <button
                          type="button"
                          onClick={handleGenerateInvoice}
                          disabled={invoiceSaving}
                          className="w-full rounded-xl border border-[#B87333] py-2.5 text-sm font-semibold text-[#B87333] hover:bg-[#B87333]/5 disabled:opacity-50 transition"
                        >
                          {invoiceSaving ? 'Sending invoice…' : 'Generate & Send Parts Invoice'}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

            </div>

            {/* Footer */}
            {!savedVisitId && (
              <div className="px-6 py-4 border-t border-[#E8ECF0] shrink-0">
                <button
                  type="button"
                  onClick={handleSaveVisit}
                  disabled={saving || !visitDate}
                  className="w-full rounded-xl bg-[#B87333] py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition"
                >
                  {saving ? 'Saving…' : 'Save Visit'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
