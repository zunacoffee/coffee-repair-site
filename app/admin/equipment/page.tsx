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

const EMPTY_FORM = { customer_id: '', equipment_type: '', brand: '', model: '', serial_number: '' }

export default function EquipmentPage() {
  const router = useRouter()
  const [equipment,   setEquipment]   = useState<Equipment[]>([])
  const [customers,   setCustomers]   = useState<Customer[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  const [search,      setSearch]      = useState('')
  const [typeFilter,  setTypeFilter]  = useState('')
  const [showForm,    setShowForm]    = useState(false)
  const [form,        setForm]        = useState(EMPTY_FORM)
  const [saving,      setSaving]      = useState(false)
  const [addError,    setAddError]    = useState<string | null>(null)
  const [successMsg,  setSuccessMsg]  = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/equipment'),
      fetch('/api/admin/customers'),
    ]).then(async ([eqRes, custRes]) => {
      if (eqRes.status === 401) { router.replace('/admin/login'); return }
      const [eqJson, custJson] = await Promise.all([eqRes.json(), custRes.json()])
      if (eqRes.ok) setEquipment(eqJson.equipment ?? [])
      else setError(eqJson.error ?? 'Failed to load equipment')
      if (custRes.ok) setCustomers(custJson.customers ?? [])
    })
    .catch(() => setError('Network error'))
    .finally(() => setLoading(false))
  }, [router])

  const equipmentTypes = useMemo(() => {
    const types = Array.from(new Set(equipment.map((e) => e.equipment_type))).sort()
    return types
  }, [equipment])

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
          <p className="mt-0.5 text-sm text-[#7A8898]">
            {filtered.length} of {equipment.length} item{equipment.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap self-start sm:self-auto">
          <button
            onClick={() => { setShowForm((p) => !p); setAddError(null) }}
            className="inline-flex items-center gap-2 rounded-xl bg-[#B87333] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#a0632b] transition"
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
      </div>

      {error      && <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>}
      {successMsg && <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-700">{successMsg}</div>}

      {/* Add form */}
      {showForm && (
        <div className="rounded-2xl border border-[#E8ECF0] bg-white shadow-sm p-6">
          <h2 className="text-base font-bold text-[#0D1B2A] mb-4">New Equipment</h2>
          <form onSubmit={handleAdd} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-sm font-semibold text-[#0D1B2A] mb-1">Customer</label>
              <select value={form.customer_id} onChange={set('customer_id')} className={inputCls}>
                <option value="">Select a customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id.toString()}>{c.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#0D1B2A] mb-1">Equipment type</label>
              <input value={form.equipment_type} onChange={set('equipment_type')} placeholder="e.g. Espresso Machine" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#0D1B2A] mb-1">Brand</label>
              <input value={form.brand} onChange={set('brand')} placeholder="e.g. La Marzocco" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#0D1B2A] mb-1">Model</label>
              <input value={form.model} onChange={set('model')} placeholder="e.g. Linea Mini" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#0D1B2A] mb-1">Serial number <span className="text-[#7A8898] font-normal">(optional)</span></label>
              <input value={form.serial_number} onChange={set('serial_number')} placeholder="e.g. LM-12345" className={inputCls} />
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
                className="inline-flex items-center gap-2 rounded-xl bg-[#B87333] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#a0632b] disabled:opacity-50 transition"
              >
                {saving ? 'Saving…' : 'Save Equipment'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setAddError(null); setForm(EMPTY_FORM) }}
                className="rounded-xl border border-[#E8ECF0] px-5 py-2.5 text-sm font-semibold text-[#0D1B2A] hover:bg-[#F4F6F9] transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <svg className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7A8898]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by brand, model, serial number, or customer…"
            className="block w-full rounded-xl border border-[#E8ECF0] bg-white py-2.5 pl-10 pr-4 text-sm focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A8898] hover:text-[#0D1B2A]" aria-label="Clear search">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="sm:w-56">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-4 py-2.5 text-sm focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20">
            <option value="">All types</option>
            {equipmentTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        {(search || typeFilter) && (
          <button
            onClick={() => { setSearch(''); setTypeFilter('') }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E8ECF0] px-4 py-2.5 text-sm font-semibold text-[#7A8898] hover:text-[#0D1B2A] hover:border-[#0D1B2A] transition whitespace-nowrap"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-[#E8ECF0] bg-white shadow-sm overflow-hidden">
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
            <svg className="h-10 w-10 text-[#E8ECF0] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-sm font-semibold text-[#0D1B2A]">No results</p>
            <p className="mt-1 text-xs text-[#7A8898]">No equipment matches &ldquo;{search || typeFilter}&rdquo;.</p>
            <button onClick={() => { setSearch(''); setTypeFilter('') }} className="mt-3 text-sm font-semibold text-[#B87333] hover:underline">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-[#E8ECF0]">
                  {['Customer', 'Type', 'Brand', 'Model', 'Serial Number', ''].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#7A8898]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8ECF0]">
                {filtered.map((eq) => (
                  <tr key={eq.id} className="hover:bg-[#F9FAFB]">
                    <td className="px-5 py-3.5">
                      {eq.customers ? (
                        <div>
                          <p className="text-sm font-medium text-[#0D1B2A]">{eq.customers.full_name}</p>
                          <p className="text-xs text-[#7A8898]">{eq.customers.email}</p>
                        </div>
                      ) : (
                        <span className="text-sm text-[#7A8898]">Unknown</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center rounded-full bg-[#B87333]/10 px-2.5 py-1 text-xs font-semibold text-[#B87333]">
                        {eq.equipment_type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-medium text-[#0D1B2A] whitespace-nowrap">{eq.brand}</td>
                    <td className="px-5 py-3.5 text-sm text-[#7A8898] whitespace-nowrap">{eq.model}</td>
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs text-[#7A8898]">{eq.serial_number}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {eq.customers && (
                        <Link
                          href={`/admin/customers/${eq.customers.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#E8ECF0] px-3 py-1.5 text-xs font-semibold text-[#0D1B2A] hover:border-[#B87333] hover:text-[#B87333] transition whitespace-nowrap"
                        >
                          View customer
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
