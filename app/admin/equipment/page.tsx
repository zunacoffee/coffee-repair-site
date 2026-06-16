"use client"

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type Customer = { id: number; full_name: string; email: string }

type Equipment = {
  id: number
  equipment_type: string
  brand: string
  model: string
  serial_number: string
  created_at: string
  customers: { id: number; full_name: string; email: string } | null
}

type RepairJob = {
  id: number | string
  equipment_type: string
  status: string
  description: string
  notes: string | null
  created_at: string | null
  completed_at: string | null
  customer_id: number | string
}

const EMPTY_FORM = { customer_id: '', equipment_type: '', brand: '', model: '', serial_number: '' }

const JOB_STATUS_BADGE: Record<string, string> = {
  completed:   'bg-green-100 text-green-800',
  in_progress: 'bg-violet-100 text-violet-800',
  pending:     'bg-amber-100 text-amber-800',
}

export default function EquipmentPage() {
  const router = useRouter()
  const [equipment,  setEquipment]  = useState<Equipment[]>([])
  const [customers,  setCustomers]  = useState<Customer[]>([])
  const [allJobs,    setAllJobs]    = useState<RepairJob[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [search,     setSearch]     = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showForm,   setShowForm]   = useState(false)
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [saving,     setSaving]     = useState(false)
  const [addError,   setAddError]   = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [selectedEq, setSelectedEq] = useState<Equipment | null>(null)

  useEffect(() => {
    async function load() {
      let eqRes: Response
      try {
        eqRes = await fetch('/api/admin/equipment')
      } catch {
        setError('Network error — could not reach server.')
        setLoading(false)
        return
      }

      if (eqRes.status === 401) { router.replace('/admin/login'); return }

      const eqJson = await eqRes.json().catch(() => ({}))
      if (!eqRes.ok) {
        setError(eqJson.error ?? 'Failed to load equipment.')
        setLoading(false)
        return
      }
      setEquipment(eqJson.equipment ?? [])

      // Supplemental data — failures are non-fatal
      await Promise.allSettled([
        fetch('/api/admin/customers')
          .then(r => r.ok ? r.json() : null)
          .then(j => { if (j) setCustomers(j.customers ?? []) })
          .catch(() => {}),
        fetch('/api/admin-data')
          .then(r => r.ok ? r.json() : null)
          .then(j => { if (j) setAllJobs(j.repairJobs ?? []) })
          .catch(() => {}),
      ])

      setLoading(false)
    }

    load()
  }, [router])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return equipment.filter((eq) => {
      const matchesType   = !typeFilter || eq.equipment_type === typeFilter
      const matchesSearch =
        !q ||
        eq.equipment_type.toLowerCase().includes(q) ||
        eq.brand.toLowerCase().includes(q) ||
        eq.model.toLowerCase().includes(q) ||
        eq.serial_number.toLowerCase().includes(q) ||
        (eq.customers?.full_name?.toLowerCase().includes(q) ?? false)
      return matchesType && matchesSearch
    })
  }, [equipment, search, typeFilter])

  const set = (field: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault()
    setAddError(null)
    const { customer_id, equipment_type, brand, model, serial_number } = form
    if (!customer_id || !equipment_type || !brand || !model) {
      setAddError('Customer, equipment type, brand, and model are required.')
      return
    }
    setSaving(true)
    const res  = await fetch(`/api/admin/customers/${customer_id}/equipment`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ equipment_type, brand, model, serial_number }),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { setAddError(json.error ?? 'Failed to add equipment.'); return }
    const customer = customers.find((c) => c.id.toString() === customer_id) ?? null
    const newEq: Equipment = { ...json.equipment, created_at: new Date().toISOString(), customers: customer }
    setEquipment((prev) => [newEq, ...prev])
    setForm(EMPTY_FORM)
    setShowForm(false)
    setSuccessMsg(`${brand} ${model} added for ${customer?.full_name ?? 'customer'}.`)
    setTimeout(() => setSuccessMsg(null), 4000)
  }

  const eqJobs = selectedEq
    ? allJobs.filter(
        (j) =>
          j.customer_id?.toString() === selectedEq.customers?.id?.toString() &&
          j.equipment_type === selectedEq.equipment_type,
      )
    : []

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <div className="flex items-center gap-3 text-[#7A8898]">
          <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Loading equipment…</span>
        </div>
      </div>
    )
  }

  const inputCls = 'block w-full rounded-xl border border-[#E8ECF0] bg-white px-4 py-2.5 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20'

  return (
    <div className="py-8 px-4 lg:px-10 max-w-7xl mx-auto w-full space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0D1B2A]">Equipment</h1>
          <p className="text-sm text-[#7A8898] mt-0.5">All equipment across every customer account.</p>
        </div>
        <button
          onClick={() => { setShowForm((p) => !p); setAddError(null) }}
          className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl bg-[#B87333] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition"
        >
          {showForm ? (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Equipment
            </>
          )}
        </button>
      </div>

      {error      && <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>}
      {successMsg && <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-700">{successMsg}</div>}

      {/* Add form */}
      {showForm && (
        <div className="rounded-2xl border border-[#E8ECF0] bg-white shadow-sm p-6">
          <h2 className="text-base font-bold text-[#0D1B2A] mb-4">New Equipment</h2>
          <form onSubmit={handleAdd} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-3">
              <label htmlFor="equip-customer" className="block text-sm font-semibold text-[#0D1B2A] mb-1">Customer</label>
              <select id="equip-customer" value={form.customer_id} onChange={set('customer_id')} className={inputCls}>
                <option value="">Select a customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id.toString()}>{c.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="equip-type" className="block text-sm font-semibold text-[#0D1B2A] mb-1">Equipment type</label>
              <input id="equip-type" value={form.equipment_type} onChange={set('equipment_type')} placeholder="e.g. Espresso Machine" className={inputCls} />
            </div>
            <div>
              <label htmlFor="equip-brand" className="block text-sm font-semibold text-[#0D1B2A] mb-1">Brand</label>
              <input id="equip-brand" value={form.brand} onChange={set('brand')} placeholder="e.g. La Marzocco" className={inputCls} />
            </div>
            <div>
              <label htmlFor="equip-model" className="block text-sm font-semibold text-[#0D1B2A] mb-1">Model</label>
              <input id="equip-model" value={form.model} onChange={set('model')} placeholder="e.g. Linea Mini" className={inputCls} />
            </div>
            <div>
              <label htmlFor="equip-serial" className="block text-sm font-semibold text-[#0D1B2A] mb-1">
                Serial number <span className="text-[#7A8898] font-normal">(optional)</span>
              </label>
              <input id="equip-serial" value={form.serial_number} onChange={set('serial_number')} placeholder="e.g. LM-12345" className={inputCls} />
            </div>
            {addError && (
              <div className="sm:col-span-2 lg:col-span-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                {addError}
              </div>
            )}
            <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-[#B87333] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition"
              >
                {saving ? 'Saving…' : 'Save Equipment'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setAddError(null); setForm(EMPTY_FORM) }}
                className="rounded-xl border border-[#E8ECF0] px-5 py-2.5 text-sm font-semibold text-[#0D1B2A] hover:bg-[#E8ECF0] transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="md:hidden bg-white rounded-2xl border border-[#E8ECF0] shadow-sm divide-y divide-[#E8ECF0]">
        {equipment.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-[#7A8898]">No equipment registered yet.</p>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-[#7A8898]">No results. <button onClick={() => { setSearch(''); setTypeFilter('') }} className="font-semibold text-[#B87333]">Clear filters</button></p>
        ) : filtered.map((eq) => (
          <div
            key={eq.id}
            onClick={() => setSelectedEq(eq)}
            className="flex items-start gap-3 px-4 py-4 hover:bg-[#E8ECF0] transition-colors cursor-pointer"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#0D1B2A] truncate">{eq.customers?.full_name ?? 'Unknown'}</p>
                  <p className="text-xs text-[#7A8898] mt-0.5">{eq.brand} {eq.model}</p>
                </div>
                <span className="shrink-0 inline-flex items-center rounded-full bg-[#B87333]/10 px-2.5 py-0.5 text-xs font-semibold text-[#B87333]">
                  {eq.equipment_type}
                </span>
              </div>
              {eq.serial_number && (
                <p className="mt-1 font-mono text-[10px] text-[#7A8898]">{eq.serial_number}</p>
              )}
            </div>
            <svg className="h-4 w-4 shrink-0 text-[#7A8898] mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="hidden md:block">
      <div className="rounded-2xl border border-[#E8ECF0] bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-[18px] py-[14px] border-b border-[#E8ECF0] sticky top-0 z-10 bg-white">
          <span className="text-sm font-semibold text-[#0D1B2A]">Equipment list</span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-[#E8ECF0] border border-[#E8ECF0] rounded-xl px-3 py-1.5 w-64">
              <svg className="h-4 w-4 text-[#7A8898] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search equipment…" className="bg-transparent text-sm text-[#0D1B2A] placeholder-[#7A8898] outline-none w-full" />
            </div>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="bg-[#E8ECF0] border border-[#E8ECF0] rounded-xl px-3 py-1.5 text-sm text-[#0D1B2A] outline-none">
              <option value="">All types</option>
              <option value="Espresso Machine">Espresso Machine</option>
              <option value="Grinder">Grinder</option>
              <option value="Brewer">Brewer</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        {equipment.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <svg className="h-12 w-12 text-[#E8ECF0] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18" />
            </svg>
            <p className="text-sm font-semibold text-[#0D1B2A]">No equipment registered</p>
            <p className="mt-1 text-xs text-[#7A8898]">Use the Add Equipment button above to get started.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <p className="text-sm font-semibold text-[#0D1B2A]">No results</p>
            <p className="mt-1 text-xs text-[#7A8898]">No equipment matches &ldquo;{search || typeFilter}&rdquo;.</p>
            <button onClick={() => { setSearch(''); setTypeFilter('') }} className="mt-3 text-sm font-semibold text-[#B87333] hover:underline">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-[#0D1B2A]">
              <tr>
                {['Customer', 'Type', 'Brand', 'Model', 'Serial Number', ''].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-white">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8ECF0]">
              {filtered.map((eq) => (
                <tr
                  key={eq.id}
                  onClick={() => setSelectedEq(eq)}
                  className="hover:bg-[#E8ECF0] cursor-pointer transition-colors"
                >
                  <td className="whitespace-nowrap px-5 py-3.5">
                    {eq.customers ? (
                      <div>
                        <p className="text-sm font-medium text-[#0D1B2A]">{eq.customers.full_name}</p>
                        <p className="text-xs text-[#7A8898]">{eq.customers.email}</p>
                      </div>
                    ) : (
                      <span className="text-sm text-[#7A8898]">Unknown</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <span className="inline-flex items-center rounded-full bg-[#B87333]/10 px-2.5 py-1 text-xs font-semibold text-[#B87333]">
                      {eq.equipment_type}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm font-medium text-[#0D1B2A] whitespace-nowrap">{eq.brand}</td>
                  <td className="px-5 py-3.5 text-sm text-[#7A8898] whitespace-nowrap">{eq.model}</td>
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <span className="font-mono text-xs text-[#7A8898]">{eq.serial_number || '—'}</span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-right">
                    <svg className="h-4 w-4 text-[#7A8898] ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
      </div>

      {/* Equipment detail modal */}
      {selectedEq && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setSelectedEq(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-[#E8ECF0] shrink-0">
              <div>
                <h2 className="text-base font-bold text-[#0D1B2A]">{selectedEq.brand} {selectedEq.model}</h2>
                <p className="mt-0.5 text-xs text-[#7A8898]">{selectedEq.equipment_type}</p>
              </div>
              <button
                onClick={() => setSelectedEq(null)}
                className="rounded-lg p-1.5 text-[#7A8898] hover:bg-[#E8ECF0] transition shrink-0"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
              {/* Details */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7A8898]">Customer</p>
                  {selectedEq.customers ? (
                    <div className="mt-1">
                      <p className="text-sm font-medium text-[#0D1B2A]">{selectedEq.customers.full_name}</p>
                      <p className="text-xs text-[#7A8898]">{selectedEq.customers.email}</p>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-[#7A8898]">Unknown</p>
                  )}
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7A8898]">Type</p>
                  <span className="mt-1 inline-flex rounded-full bg-[#B87333]/10 px-2.5 py-0.5 text-xs font-semibold text-[#B87333]">
                    {selectedEq.equipment_type}
                  </span>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7A8898]">Brand</p>
                  <p className="mt-1 text-sm font-medium text-[#0D1B2A]">{selectedEq.brand}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7A8898]">Model</p>
                  <p className="mt-1 text-sm text-[#0D1B2A]">{selectedEq.model}</p>
                </div>
                {selectedEq.serial_number && (
                  <div className="col-span-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7A8898]">Serial Number</p>
                    <p className="mt-1 font-mono text-sm text-[#0D1B2A]">{selectedEq.serial_number}</p>
                  </div>
                )}
              </div>

              {/* Repair history */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7A8898] mb-3">
                  Repair History ({eqJobs.length})
                </p>
                {eqJobs.length > 0 ? (
                  <ul className="space-y-2">
                    {eqJobs.map((job) => (
                      <li key={job.id} className="rounded-xl border border-[#E8ECF0] px-4 py-3">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${JOB_STATUS_BADGE[job.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {job.status.replace('_', ' ')}
                          </span>
                          <span className="text-[11px] text-[#7A8898]">
                            {job.created_at ? new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                          </span>
                        </div>
                        <p className="text-sm text-[#0D1B2A] line-clamp-2">{job.description}</p>
                        {job.notes && <p className="mt-1 text-xs text-[#7A8898] line-clamp-1">{job.notes}</p>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-[#7A8898]">No repair history for this equipment.</p>
                )}
              </div>
            </div>

            {/* Modal footer */}
            <div className="shrink-0 border-t border-[#E8ECF0] px-6 py-4 flex items-center justify-between gap-3">
              <button
                onClick={() => setSelectedEq(null)}
                className="text-sm font-semibold text-[#7A8898] hover:text-[#0D1B2A] transition"
              >
                Close
              </button>
              {selectedEq.customers && (
                <Link
                  href={`/admin/customers/${selectedEq.customers.id}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0D1B2A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#152436] transition"
                >
                  Customer profile
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
