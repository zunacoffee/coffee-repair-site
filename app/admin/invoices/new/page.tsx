"use client"

import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

type Customer  = { id: number; full_name: string; email: string }
type Part      = { id: number; name: string; part_number: string | null; sell_price: number; quantity: number }
type RepairJob = { id: number; customer_id: number; equipment_type: string; status: string }

type LineItem = {
  localId: string
  type: 'labor' | 'part'
  description: string
  quantity: number
  unit_price: number
  total: number
  // labor
  rate_type?: 'weekday' | 'weekend'
  // part
  part_id?: number | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function newLocalId() {
  return Math.random().toString(36).slice(2)
}

function calcTotal(qty: number, price: number) {
  return Math.round(qty * price * 100) / 100
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function LaborRow({
  item, parts: _parts, onChange, onRemove, weekdayRate, weekendRate,
}: {
  item: LineItem
  parts: Part[]
  onChange: (localId: string, patch: Partial<LineItem>) => void
  onRemove: (localId: string) => void
  weekdayRate: number
  weekendRate: number
}) {
  const handleRateChange = (rateType: 'weekday' | 'weekend') => {
    const rate = rateType === 'weekday' ? weekdayRate : weekendRate
    const desc = `Labor (${rateType === 'weekday' ? 'Weekday' : 'Weekend'})`
    onChange(item.localId, {
      rate_type:  rateType,
      unit_price: rate,
      total:      calcTotal(item.quantity, rate),
      description: item.description === 'Labor (Weekday)' || item.description === 'Labor (Weekend)' ? desc : item.description,
    })
  }

  const handleHoursChange = (v: string) => {
    const hrs = parseFloat(v) || 0
    onChange(item.localId, { quantity: hrs, total: calcTotal(hrs, item.unit_price) })
  }

  return (
    <div className="rounded-xl border border-[#E8ECF0] bg-[#E8ECF0] p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="inline-flex items-center gap-1 rounded-full bg-[#0D1B2A]/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#0D1B2A]">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Labor
        </span>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm font-bold text-[#B87333]">${item.total.toFixed(2)}</span>
          <button
            type="button"
            onClick={() => onRemove(item.localId)}
            className="rounded-lg p-1 text-[#7A8898] hover:bg-red-50 hover:text-red-500 transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor={`labor-rate-type-${item.localId}`} className="block text-[11px] font-semibold uppercase tracking-wide text-[#7A8898] mb-1">Rate Type</label>
          <select
            id={`labor-rate-type-${item.localId}`}
            value={item.rate_type ?? 'weekday'}
            onChange={(e) => handleRateChange(e.target.value as 'weekday' | 'weekend')}
            className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-3 py-2 text-sm focus:border-[#B87333] focus:outline-none"
          >
            <option value="weekday">Weekday — ${weekdayRate}/hr</option>
            <option value="weekend">Weekend — ${weekendRate}/hr</option>
          </select>
        </div>
        <div>
          <label htmlFor={`labor-hours-${item.localId}`} className="block text-[11px] font-semibold uppercase tracking-wide text-[#7A8898] mb-1">Hours</label>
          <input
            id={`labor-hours-${item.localId}`}
            type="number" min="0" step="0.25"
            value={item.quantity || ''}
            placeholder="0.0"
            onChange={(e) => handleHoursChange(e.target.value)}
            className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-3 py-2 text-sm focus:border-[#B87333] focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor={`labor-description-${item.localId}`} className="block text-[11px] font-semibold uppercase tracking-wide text-[#7A8898] mb-1">Description</label>
          <input
            id={`labor-description-${item.localId}`}
            type="text"
            value={item.description}
            placeholder="e.g. Group head rebuild"
            onChange={(e) => onChange(item.localId, { description: e.target.value })}
            className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-3 py-2 text-sm focus:border-[#B87333] focus:outline-none"
          />
        </div>
      </div>
      <p className="mt-2 text-right text-xs text-[#7A8898]">
        {item.quantity} hr{item.quantity !== 1 ? 's' : ''} × ${item.unit_price}/hr = <strong className="text-[#0D1B2A]">${item.total.toFixed(2)}</strong>
      </p>
    </div>
  )
}

function PartRow({
  item, parts, onChange, onRemove,
}: {
  item: LineItem
  parts: Part[]
  onChange: (localId: string, patch: Partial<LineItem>) => void
  onRemove: (localId: string) => void
}) {
  const selectedPart = parts.find((p) => p.id === item.part_id)

  const handlePartSelect = (partId: string) => {
    if (!partId) {
      onChange(item.localId, { part_id: null, description: '', unit_price: 0, total: 0 })
      return
    }
    const part = parts.find((p) => p.id === Number(partId))
    if (!part) return
    onChange(item.localId, {
      part_id:    part.id,
      description: part.name,
      unit_price: Number(part.sell_price),
      total:      calcTotal(item.quantity, Number(part.sell_price)),
    })
  }

  const handleQtyChange = (v: string) => {
    const qty = parseFloat(v) || 0
    onChange(item.localId, { quantity: qty, total: calcTotal(qty, item.unit_price) })
  }

  const insufficientStock = selectedPart && item.quantity > selectedPart.quantity

  return (
    <div className="rounded-xl border border-[#E8ECF0] bg-[#E8ECF0] p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="inline-flex items-center gap-1 rounded-full bg-[#B87333]/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#B87333]">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          Part
        </span>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm font-bold text-[#B87333]">${item.total.toFixed(2)}</span>
          <button
            type="button"
            onClick={() => onRemove(item.localId)}
            className="rounded-lg p-1 text-[#7A8898] hover:bg-red-50 hover:text-red-500 transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label htmlFor={`part-select-${item.localId}`} className="block text-[11px] font-semibold uppercase tracking-wide text-[#7A8898] mb-1">Part</label>
          <select
            id={`part-select-${item.localId}`}
            value={item.part_id ?? ''}
            onChange={(e) => handlePartSelect(e.target.value)}
            className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-3 py-2 text-sm focus:border-[#B87333] focus:outline-none"
          >
            <option value="">Select a part…</option>
            {parts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}{p.part_number ? ` (${p.part_number})` : ''} — In stock: {p.quantity}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`part-qty-${item.localId}`} className="block text-[11px] font-semibold uppercase tracking-wide text-[#7A8898] mb-1">Quantity</label>
          <input
            id={`part-qty-${item.localId}`}
            type="number" min="1" step="1"
            value={item.quantity || ''}
            placeholder="1"
            onChange={(e) => handleQtyChange(e.target.value)}
            className={`block w-full rounded-xl border px-3 py-2 text-sm focus:outline-none ${
              insufficientStock ? 'border-orange-400 focus:border-orange-500' : 'border-[#E8ECF0] focus:border-[#B87333]'
            } bg-white`}
          />
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        {insufficientStock ? (
          <p className="text-xs text-orange-600 font-semibold">
            ⚠ Only {selectedPart.quantity} in stock
          </p>
        ) : <span />}
        {item.unit_price > 0 && (
          <p className="text-right text-xs text-[#7A8898]">
            {item.quantity} × ${Number(item.unit_price).toFixed(2)} = <strong className="text-[#0D1B2A]">${item.total.toFixed(2)}</strong>
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NewInvoicePage() {
  const router = useRouter()

  const [customers,   setCustomers]   = useState<Customer[]>([])
  const [parts,       setParts]       = useState<Part[]>([])
  const [repairJobs,  setRepairJobs]  = useState<RepairJob[]>([])
  const [loading,     setLoading]     = useState(true)
  const [loadError,   setLoadError]   = useState<string | null>(null)
  const [weekdayRate, setWeekdayRate] = useState(80)
  const [weekendRate, setWeekendRate] = useState(120)
  const [taxRate,     setTaxRate]     = useState(0)

  const [customerId,  setCustomerId]  = useState<number | null>(null)
  const [repairJobId, setRepairJobId] = useState<number | null>(null)
  const [lineItems,   setLineItems]   = useState<LineItem[]>([])
  const [notes,       setNotes]       = useState('')
  const [saving,      setSaving]      = useState(false)
  const [saveError,   setSaveError]   = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/customers', { credentials: 'include' }),
      fetch('/api/admin/parts', { credentials: 'include' }),
      fetch('/api/admin/repair-jobs', { credentials: 'include' }),
      fetch('/api/admin/site-settings', { credentials: 'include' }),
    ])
      .then(async ([cRes, pRes, rRes, sRes]) => {
        if (cRes.status === 401) { router.replace('/admin/login'); return }
        const [cData, pData, rData, sData] = await Promise.all([cRes.json(), pRes.json(), rRes.json(), sRes.json()])
        setCustomers(cData.customers ?? [])
        setParts(pData.parts ?? [])
        setRepairJobs(rData.repairJobs ?? [])
        if (sData.settings) {
          setWeekdayRate(Number(sData.settings.labor_rate_weekday) || 80)
          setWeekendRate(Number(sData.settings.labor_rate_weekend) || 120)
          setTaxRate(Number(sData.settings.tax_rate) || 0)
        }
      })
      .catch(() => setLoadError('Failed to load form data'))
      .finally(() => setLoading(false))
  }, [router])

  const updateItem = useCallback((localId: string, patch: Partial<LineItem>) => {
    setLineItems((prev) => prev.map((item) => item.localId === localId ? { ...item, ...patch } : item))
  }, [])

  const removeItem = useCallback((localId: string) => {
    setLineItems((prev) => prev.filter((item) => item.localId !== localId))
  }, [])

  const addLaborLine = () => {
    setLineItems((prev) => [...prev, {
      localId:    newLocalId(),
      type:       'labor',
      description: 'Labor (Weekday)',
      quantity:   1,
      unit_price: weekdayRate,
      total:      weekdayRate,
      rate_type:  'weekday',
    }])
  }

  const addPartLine = () => {
    setLineItems((prev) => [...prev, {
      localId:    newLocalId(),
      type:       'part',
      description: '',
      quantity:   1,
      unit_price: 0,
      total:      0,
      part_id:    null,
    }])
  }

  const subtotal  = lineItems.reduce((s, i) => s + i.total, 0)
  const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100
  const total     = Math.round((subtotal + taxAmount) * 100) / 100

  const customerRepairJobs = customerId
    ? repairJobs.filter((j) => j.customer_id === customerId)
    : []

  const handleSave = async (andSend: boolean) => {
    if (!customerId) { setSaveError('Please select a customer'); return }
    if (lineItems.length === 0) { setSaveError('Add at least one line item'); return }

    setSaving(true); setSaveError(null)

    // Create invoice (draft)
    const createRes = await fetch('/api/admin/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id:    customerId,
        repair_job_id:  repairJobId,
        notes:          notes.trim() || null,
        line_items:     lineItems.map((item) => ({
          type:        item.type,
          description: item.description || (item.type === 'labor' ? 'Labor' : 'Part'),
          quantity:    item.quantity,
          unit_price:  item.unit_price,
          total:       item.total,
          part_id:     item.part_id ?? null,
        })),
      }),
    })

    const createData = await createRes.json()
    if (!createRes.ok) {
      setSaving(false)
      setSaveError(createData.error ?? 'Failed to save invoice')
      return
    }

    const invoiceId = createData.invoice.id

    if (andSend) {
      const sendRes = await fetch(`/api/admin/invoices/${invoiceId}/send`, { method: 'POST' })
      const sendData = await sendRes.json()
      if (!sendRes.ok) {
        setSaving(false)
        setSaveError(sendData.error ?? 'Invoice saved but failed to send. Visit the invoices page to retry.')
        return
      }
    }

    setSaving(false)
    router.push('/admin/invoices')
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <div className="flex items-center gap-3 text-[#7A8898]">
          <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="py-8 px-4 lg:px-10 max-w-4xl mx-auto w-full space-y-6">

      {/* Header */}
      <div>
        <Link href="/admin/invoices" className="inline-flex items-center gap-1 text-sm font-medium text-[#7A8898] hover:text-[#0D1B2A] transition">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-[#0D1B2A]">New Invoice</h1>
      </div>

      {loadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{loadError}</div>
      )}

      {/* Customer + Repair Job */}
      <div className="rounded-2xl border border-[#E8ECF0] bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-[#0D1B2A] uppercase tracking-wide">Invoice Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="invoice-customer" className="block text-sm font-semibold text-[#0D1B2A] mb-1">
              Customer <span className="text-red-500">*</span>
            </label>
            <select
              id="invoice-customer"
              value={customerId ?? ''}
              onChange={(e) => {
                setCustomerId(e.target.value ? Number(e.target.value) : null)
                setRepairJobId(null)
              }}
              className="block w-full rounded-xl border border-[#E8ECF0] px-4 py-2.5 text-sm focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
            >
              <option value="">Select a customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.full_name} — {c.email}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="invoice-repair-job" className="block text-sm font-semibold text-[#0D1B2A] mb-1">
              Linked Repair Job <span className="text-[#7A8898] font-normal text-xs">(optional)</span>
            </label>
            <select
              id="invoice-repair-job"
              value={repairJobId ?? ''}
              onChange={(e) => setRepairJobId(e.target.value ? Number(e.target.value) : null)}
              disabled={!customerId}
              className="block w-full rounded-xl border border-[#E8ECF0] px-4 py-2.5 text-sm focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">No repair job</option>
              {customerRepairJobs.map((j) => (
                <option key={j.id} value={j.id}>
                  #{j.id} — {j.equipment_type} ({j.status})
                </option>
              ))}
            </select>
            {customerId && customerRepairJobs.length === 0 && (
              <p className="mt-1 text-xs text-[#7A8898]">No repair jobs for this customer.</p>
            )}
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="rounded-2xl border border-[#E8ECF0] bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-[#E8ECF0]">
          <h2 className="text-sm font-bold text-[#0D1B2A] uppercase tracking-wide">Line Items</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={addLaborLine}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E8ECF0] px-3 py-2 text-xs font-semibold text-[#0D1B2A] hover:border-[#0D1B2A] transition"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Labor
            </button>
            <button
              type="button"
              onClick={addPartLine}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E8ECF0] px-3 py-2 text-xs font-semibold text-[#0D1B2A] hover:border-[#B87333] hover:text-[#B87333] transition"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Part
            </button>
          </div>
        </div>

        <div className="p-5 space-y-3">
          {lineItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-sm text-[#7A8898]">No line items yet.</p>
              <p className="text-xs text-[#7A8898] mt-1">Use the buttons above to add labor hours or parts.</p>
            </div>
          ) : (
            lineItems.map((item) =>
              item.type === 'labor' ? (
                <LaborRow key={item.localId} item={item} parts={parts} onChange={updateItem} onRemove={removeItem} weekdayRate={weekdayRate} weekendRate={weekendRate} />
              ) : (
                <PartRow key={item.localId} item={item} parts={parts} onChange={updateItem} onRemove={removeItem} />
              )
            )
          )}
        </div>

        {/* Totals */}
        {lineItems.length > 0 && (
          <div className="border-t border-[#E8ECF0] px-6 py-4 bg-[#E8ECF0]">
            <div className="flex justify-end">
              <table className="text-sm">
                <tbody>
                  <tr>
                    <td className="pr-8 py-0.5 text-[#7A8898]">Subtotal</td>
                    <td className="text-right font-semibold text-[#0D1B2A]">${subtotal.toFixed(2)}</td>
                  </tr>
                  {taxAmount > 0 && (
                    <tr>
                      <td className="pr-8 py-0.5 text-[#7A8898]">Tax ({taxRate}%)</td>
                      <td className="text-right font-semibold text-[#0D1B2A]">${taxAmount.toFixed(2)}</td>
                    </tr>
                  )}
                  <tr className="border-t border-[#E8ECF0]">
                    <td className="pr-8 pt-2 text-base font-bold text-[#0D1B2A]">Total</td>
                    <td className="text-right pt-2 text-xl font-bold text-[#B87333]">${total.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="rounded-2xl border border-[#E8ECF0] bg-white p-6 shadow-sm">
        <label htmlFor="invoice-notes" className="block text-sm font-bold text-[#0D1B2A] uppercase tracking-wide mb-2">
          Notes <span className="text-[#7A8898] text-xs font-normal normal-case">(included in the invoice email)</span>
        </label>
        <textarea
          id="invoice-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Any additional notes for the customer…"
          className="block w-full rounded-xl border border-[#E8ECF0] px-4 py-3 text-sm focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20 resize-none"
        />
      </div>

      {/* Actions */}
      {saveError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{saveError}</div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Link
          href="/admin/invoices"
          className="rounded-xl border border-[#E8ECF0] px-5 py-2.5 text-sm font-semibold text-[#0D1B2A] hover:bg-[#E8ECF0] transition text-center"
        >
          Cancel
        </Link>
        <button
          type="button"
          onClick={() => handleSave(false)}
          disabled={saving}
          className="rounded-xl border border-[#0D1B2A] px-5 py-2.5 text-sm font-semibold text-[#0D1B2A] hover:bg-[#0D1B2A] hover:text-white disabled:opacity-50 transition"
        >
          {saving ? 'Saving…' : 'Save Draft'}
        </button>
        <button
          type="button"
          onClick={() => handleSave(true)}
          disabled={saving}
          className="rounded-xl bg-[#B87333] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition inline-flex items-center gap-2"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          {saving ? 'Sending…' : 'Send to Customer'}
        </button>
      </div>
    </div>
  )
}
