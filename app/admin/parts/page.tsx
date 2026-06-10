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
  const [deletingId,  setDeletingId]  = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/admin/parts')
      .then(async (r) => {
        if (r.status === 401) { router.replace('/admin/login'); return }
        const j = await r.json()
        if (r.ok) setParts(j.parts ?? [])
        else setError(j.error ?? 'Failed to load parts')
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false))
  }, [router])

  const handleCostChange = (v: string) => {
    const cost = parseFloat(v)
    setForm((f) => ({
      ...f,
      cost_price: v,
      sell_price: isNaN(cost) ? f.sell_price : String(Math.round(cost * 1.3 * 100) / 100),
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
    if (!confirm('Delete this part? This cannot be undone.')) return
    setDeletingId(id)
    const res = await fetch(`/api/admin/parts/${id}`, { method: 'DELETE' })
    setDeletingId(null)
    if (res.ok) setParts((prev) => prev.filter((p) => p.id !== id))
    else alert('Failed to delete part.')
  }

  const lowStockCount = parts.filter((p) => p.quantity <= p.low_stock_threshold).length

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

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>
      )}

      {/* Add / Edit form */}
      {showForm && (
        <div className="rounded-2xl border border-[#E8ECF0] bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-[#0D1B2A]">
            {editingId ? 'Edit Part' : 'Add New Part'}
          </h2>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-sm font-semibold text-[#0D1B2A] mb-1">Part Name *</label>
              <input
                required value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="block w-full rounded-xl border border-[#E8ECF0] px-4 py-2.5 text-sm focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#0D1B2A] mb-1">Part Number</label>
              <input
                value={form.part_number}
                onChange={(e) => setForm((f) => ({ ...f, part_number: e.target.value }))}
                placeholder="e.g. P-001"
                className="block w-full rounded-xl border border-[#E8ECF0] px-4 py-2.5 text-sm focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#0D1B2A] mb-1">Cost Price ($)</label>
              <input
                type="number" min="0" step="0.01" value={form.cost_price}
                onChange={(e) => handleCostChange(e.target.value)}
                className="block w-full rounded-xl border border-[#E8ECF0] px-4 py-2.5 text-sm focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#0D1B2A] mb-1">
                Sell Price ($)
                <span className="ml-1 text-[10px] font-normal text-[#7A8898]">auto = cost × 1.30</span>
              </label>
              <input
                type="number" min="0" step="0.01" value={form.sell_price}
                onChange={(e) => setForm((f) => ({ ...f, sell_price: e.target.value }))}
                className="block w-full rounded-xl border border-[#E8ECF0] px-4 py-2.5 text-sm focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#0D1B2A] mb-1">Quantity</label>
              <input
                type="number" min="0" value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                className="block w-full rounded-xl border border-[#E8ECF0] px-4 py-2.5 text-sm focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#0D1B2A] mb-1">Low Stock Threshold</label>
              <input
                type="number" min="0" value={form.low_stock_threshold}
                onChange={(e) => setForm((f) => ({ ...f, low_stock_threshold: e.target.value }))}
                className="block w-full rounded-xl border border-[#E8ECF0] px-4 py-2.5 text-sm focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
              />
            </div>
            {saveError && (
              <p className="sm:col-span-2 lg:col-span-3 text-sm text-red-600">{saveError}</p>
            )}
            <div className="sm:col-span-2 lg:col-span-3 flex gap-3">
              <button
                type="submit" disabled={saving}
                className="rounded-xl bg-[#B87333] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#a0632b] disabled:opacity-50 transition"
              >
                {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Part'}
              </button>
              <button
                type="button" onClick={cancelForm}
                className="rounded-xl border border-[#E8ECF0] px-5 py-2.5 text-sm font-semibold text-[#0D1B2A] hover:bg-[#F4F6F9] transition"
              >
                Cancel
              </button>
            </div>
          </form>
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
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#7A8898]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8ECF0]">
                {parts.map((part) => {
                  const isLow = part.quantity <= part.low_stock_threshold
                  return (
                    <tr key={part.id} className={isLow ? 'bg-red-50' : 'hover:bg-[#F9FAFB]'}>
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
                          <button
                            onClick={() => startEdit(part)}
                            className="rounded-lg p-1.5 text-[#7A8898] hover:bg-[#E8ECF0] hover:text-[#0D1B2A] transition"
                            title="Edit"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(part.id)}
                            disabled={deletingId === part.id}
                            className="rounded-lg p-1.5 text-[#7A8898] hover:bg-red-50 hover:text-red-600 transition disabled:opacity-50"
                            title="Delete"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
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
