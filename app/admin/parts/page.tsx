"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Part = {
  id: number
  name: string
  part_number: string | null
  cost_price: number
  sell_price: number
  quantity: number
  low_stock_threshold: number
  created_at: string
}

const EMPTY = {
  name: '', part_number: '', cost_price: '', sell_price: '',
  quantity: '0', low_stock_threshold: '1',
}

export default function PartsPage() {
  const router = useRouter()
  const [parts,       setParts]       = useState<Part[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  const [showForm,    setShowForm]    = useState(false)
  const [editingId,   setEditingId]   = useState<number | null>(null)
  const [form,        setForm]        = useState(EMPTY)
  const [saving,      setSaving]      = useState(false)
  const [saveError,   setSaveError]   = useState<string | null>(null)
  const [deletingId,      setDeletingId]      = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [markupPct,       setMarkupPct]       = useState(30)

  useEffect(() => {
    async function load() {
      let partsRes: Response
      try { partsRes = await fetch('/api/admin/parts') }
      catch { setError('Network error'); setLoading(false); return }
      if (partsRes.status === 401) { router.replace('/admin/login'); return }
      const j = await partsRes.json()
      if (partsRes.ok) setParts(j.parts ?? [])
      else setError(j.error ?? 'Failed to load parts')

      fetch('/api/admin/site-settings')
        .then(r => r.ok ? r.json() : null)
        .then(j => { if (j?.settings?.parts_markup_pct) setMarkupPct(Number(j.settings.parts_markup_pct)) })
        .catch(() => {})
        .finally(() => setLoading(false))
    }
    load()
  }, [router])

  const handleCostChange = (v: string) => {
    const cost = parseFloat(v)
    const multiplier = 1 + markupPct / 100
    setForm((f) => ({
      ...f,
      cost_price: v,
      sell_price: isNaN(cost) ? f.sell_price : String(Math.round(cost * multiplier * 100) / 100),
    }))
  }

  const startAdd = () => {
    setEditingId(null)
    setForm(EMPTY)
    setSaveError(null)
    setShowForm(true)
  }

  const startEdit = (p: Part) => {
    setEditingId(p.id)
    setForm({
      name: p.name,
      part_number: p.part_number ?? '',
      cost_price: String(p.cost_price),
      sell_price: String(p.sell_price),
      quantity: String(p.quantity),
      low_stock_threshold: String(p.low_stock_threshold),
    })
    setSaveError(null)
    setShowForm(true)
  }

  const cancelForm = () => { setShowForm(false); setEditingId(null) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setSaveError(null)
    const payload = {
      name:               form.name.trim(),
      part_number:        form.part_number.trim() || null,
      cost_price:         parseFloat(form.cost_price) || 0,
      sell_price:         parseFloat(form.sell_price) || 0,
      quantity:           parseInt(form.quantity, 10) || 0,
      low_stock_threshold: parseInt(form.low_stock_threshold, 10) || 1,
    }

    const url    = editingId ? `/api/admin/parts/${editingId}` : '/api/admin/parts'
    const method = editingId ? 'PATCH' : 'POST'
    const res    = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setSaveError(data.error ?? 'Save failed'); return }

    const updated = data.part as Part
    if (editingId) {
      setParts((prev) => prev.map((p) => (p.id === editingId ? updated : p)))
    } else {
      setParts((prev) => [...prev, updated].sort((a, b) => a.name.localeCompare(b.name)))
    }
    setShowForm(false); setEditingId(null)
  }

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    const res = await fetch(`/api/admin/parts/${id}`, { method: 'DELETE' })
    setDeletingId(null)
    if (res.ok) setParts((prev) => prev.filter((p) => p.id !== id))
    else alert('Failed to delete part.')
  }

  const lowStockCount   = parts.filter((p) => p.quantity <= p.low_stock_threshold).length
  const totalCostValue  = parts.reduce((sum, p) => sum + Number(p.cost_price)  * p.quantity, 0)
  const totalRetailValue = parts.reduce((sum, p) => sum + Number(p.sell_price) * p.quantity, 0)

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <div className="flex items-center gap-3 text-[#7A8898]">
          <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Loading parts…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="py-8 px-4 lg:px-10 max-w-7xl mx-auto w-full space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0D1B2A]">Parts Inventory</h1>
          <p className="mt-0.5 text-sm text-[#7A8898]">
            {parts.length} part{parts.length !== 1 ? 's' : ''}
            {lowStockCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {lowStockCount} low stock
              </span>
            )}
          </p>
        </div>
        <button
          onClick={startAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-[#B87333] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#a0632b] transition self-start sm:self-auto"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Part
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">

        {/* Total Parts */}
        <div className="rounded-2xl border border-[#E8ECF0] border-l-4 border-l-[#0D1B2A] bg-white px-5 py-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#7A8898]">Total Parts</p>
              <p className="mt-2 text-3xl font-bold text-[#0D1B2A] tabular-nums">{parts.length}</p>
              <p className="mt-1 text-xs text-[#7A8898]">unique SKUs</p>
            </div>
            <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-[#0D1B2A]/8">
              <svg className="h-5 w-5 text-[#0D1B2A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Inventory Value */}
        <div className="rounded-2xl border border-[#E8ECF0] border-l-4 border-l-[#7A8898] bg-white px-5 py-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#7A8898]">Inventory Value</p>
              <p className="mt-2 text-3xl font-bold text-[#0D1B2A] tabular-nums">${totalCostValue.toFixed(2)}</p>
              <p className="mt-1 text-xs text-[#7A8898]">cost × qty</p>
            </div>
            <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-[#7A8898]/10">
              <svg className="h-5 w-5 text-[#7A8898]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Retail Value */}
        <div className="rounded-2xl border border-[#E8ECF0] border-l-4 border-l-[#B87333] bg-white px-5 py-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#7A8898]">Retail Value</p>
              <p className="mt-2 text-3xl font-bold text-[#B87333] tabular-nums">${totalRetailValue.toFixed(2)}</p>
              <p className="mt-1 text-xs text-[#7A8898]">sell price × qty</p>
            </div>
            <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-[#B87333]/10">
              <svg className="h-5 w-5 text-[#B87333]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Low Stock */}
        <div className={`rounded-2xl border border-l-4 px-5 py-5 shadow-sm ${
          lowStockCount > 0
            ? 'border-red-200 border-l-red-500 bg-red-50/60'
            : 'border-[#E8ECF0] border-l-red-300 bg-white'
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#7A8898]">Low Stock</p>
              <p className={`mt-2 text-3xl font-bold tabular-nums ${lowStockCount > 0 ? 'text-red-600' : 'text-[#0D1B2A]'}`}>
                {lowStockCount}
              </p>
              <p className="mt-1 text-xs text-[#7A8898]">
                {lowStockCount === 0 ? 'all stocked' : `item${lowStockCount !== 1 ? 's' : ''} need restocking`}
              </p>
            </div>
            <div className={`shrink-0 flex h-10 w-10 items-center justify-center rounded-xl ${
              lowStockCount > 0 ? 'bg-red-100' : 'bg-red-50'
            }`}>
              <svg className={`h-5 w-5 ${lowStockCount > 0 ? 'text-red-600' : 'text-red-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </div>

      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>
      )}

      {/* Add / Edit modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={cancelForm} />

          {/* Sheet / Dialog */}
          <div className="relative z-10 w-full sm:max-w-lg bg-white sm:rounded-2xl shadow-xl flex flex-col max-h-[92dvh] sm:max-h-[90vh] rounded-t-2xl">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8ECF0] shrink-0">
              <h2 className="text-base font-bold text-[#0D1B2A]">
                {editingId ? 'Edit Part' : 'Add New Part'}
              </h2>
              <button
                type="button"
                onClick={cancelForm}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-[#7A8898] hover:bg-[#F4F6F9] hover:text-[#0D1B2A] transition"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-5 py-5">
              <form id="part-form" onSubmit={handleSubmit} className="grid gap-4 grid-cols-2">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-[#0D1B2A] mb-1.5">Part Name *</label>
                  <input
                    required value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="block w-full rounded-xl border border-[#E8ECF0] px-4 py-3 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-[#0D1B2A] mb-1.5">Part Number</label>
                  <input
                    value={form.part_number}
                    onChange={(e) => setForm((f) => ({ ...f, part_number: e.target.value }))}
                    placeholder="e.g. P-001"
                    className="block w-full rounded-xl border border-[#E8ECF0] px-4 py-3 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#0D1B2A] mb-1.5">Cost Price ($)</label>
                  <input
                    type="number" min="0" step="0.01" value={form.cost_price}
                    onChange={(e) => handleCostChange(e.target.value)}
                    inputMode="decimal"
                    className="block w-full rounded-xl border border-[#E8ECF0] px-4 py-3 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#0D1B2A] mb-1.5">
                    Sell Price ($)
                    <span className="ml-1 text-[10px] font-normal text-[#7A8898]">auto = cost × {(1 + markupPct / 100).toFixed(2)}</span>
                  </label>
                  <input
                    type="number" min="0" step="0.01" value={form.sell_price}
                    onChange={(e) => setForm((f) => ({ ...f, sell_price: e.target.value }))}
                    inputMode="decimal"
                    className="block w-full rounded-xl border border-[#E8ECF0] px-4 py-3 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#0D1B2A] mb-1.5">Quantity</label>
                  <input
                    type="number" min="0" value={form.quantity}
                    onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                    inputMode="numeric"
                    className="block w-full rounded-xl border border-[#E8ECF0] px-4 py-3 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#0D1B2A] mb-1.5">Low Stock Threshold</label>
                  <input
                    type="number" min="0" value={form.low_stock_threshold}
                    onChange={(e) => setForm((f) => ({ ...f, low_stock_threshold: e.target.value }))}
                    inputMode="numeric"
                    className="block w-full rounded-xl border border-[#E8ECF0] px-4 py-3 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                  />
                </div>
                {saveError && (
                  <p className="col-span-2 text-sm text-red-600">{saveError}</p>
                )}
              </form>
            </div>

            {/* Footer */}
            <div className="shrink-0 flex gap-3 px-5 py-4 border-t border-[#E8ECF0]">
              <button
                type="submit"
                form="part-form"
                disabled={saving}
                className="flex-1 rounded-xl bg-[#B87333] px-5 py-3 text-sm font-semibold text-white hover:bg-[#a0632b] disabled:opacity-50 transition"
              >
                {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Part'}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="flex-1 rounded-xl border border-[#E8ECF0] px-5 py-3 text-sm font-semibold text-[#0D1B2A] hover:bg-[#F4F6F9] transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Parts table */}
      <div className="rounded-2xl border border-[#E8ECF0] bg-white shadow-sm overflow-hidden">
        {parts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <svg className="h-12 w-12 text-[#E8ECF0] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="text-sm font-semibold text-[#0D1B2A]">No parts yet</p>
            <p className="mt-1 text-xs text-[#7A8898]">Add your first part to start tracking inventory.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-[#E8ECF0]">
                  {['Part', 'Part #', 'Cost', 'Sell Price', 'Qty', 'Threshold', ''].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#0D1B2A]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8ECF0]">
                {parts.map((part) => {
                  const isLow = part.quantity <= part.low_stock_threshold
                  return (
                    <tr key={part.id} className={isLow ? 'bg-red-50' : 'hover:bg-[#F5F7FA] transition-colors'}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          {isLow && (
                            <svg className="h-3.5 w-3.5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          )}
                          <span className="text-sm font-medium text-[#0D1B2A]">{part.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-[#7A8898] font-mono">{part.part_number ?? '—'}</td>
                      <td className="px-5 py-3.5 text-sm text-[#7A8898]">${Number(part.cost_price).toFixed(2)}</td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-[#0D1B2A]">${Number(part.sell_price).toFixed(2)}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-sm font-bold ${isLow ? 'text-red-600' : 'text-[#0D1B2A]'}`}>
                          {part.quantity}
                        </span>
                        {isLow && <span className="ml-1.5 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">Low</span>}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-[#7A8898]">{part.low_stock_threshold}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 justify-end">
                          {confirmDeleteId === part.id ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="text-xs font-medium text-[#0D1B2A] whitespace-nowrap">Are you sure?</span>
                              <button
                                onClick={() => { handleDelete(part.id); setConfirmDeleteId(null) }}
                                disabled={deletingId === part.id}
                                className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition whitespace-nowrap"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="rounded-full border border-[#7A8898] px-3 py-1 text-xs font-semibold text-[#7A8898] hover:bg-[#F4F6F9] transition whitespace-nowrap"
                              >
                                Cancel
                              </button>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2">
                              <button
                                onClick={() => startEdit(part)}
                                className="rounded-full bg-[#B87333] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#a0632b] transition whitespace-nowrap"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(part.id)}
                                disabled={deletingId === part.id}
                                className="rounded-full border border-[#7A8898] px-3 py-1.5 text-xs font-semibold text-[#7A8898] hover:bg-[#F4F6F9] disabled:opacity-50 transition whitespace-nowrap"
                              >
                                Delete
                              </button>
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
