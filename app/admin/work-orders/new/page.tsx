'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import TimePickerSelect from '../../../components/ui/TimePickerSelect'

interface Customer {
  id: number
  full_name: string
  email: string
}
interface Equipment {
  id: number
  equipment_type: string
  brand: string
  model: string
  customer_id: number
}
interface Part {
  id: number
  name: string
  part_number: string
  sell_price: number
  quantity: number
}
interface PartEntry {
  part_id: number
  quantity_used: number
  name: string
  unit_price: number
}

export default function NewWorkOrderPage() {
  const router = useRouter()
  const [customers, setCustomers]   = useState<Customer[]>([])
  const [equipment, setEquipment]   = useState<Equipment[]>([])
  const [parts, setParts]           = useState<Part[]>([])
  const [customerId, setCustomerId] = useState('')
  const [equipmentId, setEquipmentId] = useState('')
  const [problem, setProblem]       = useState('')
  const [laborType, setLaborType]   = useState<'weekday' | 'weekend'>('weekday')
  const [laborHours, setLaborHours] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [selectedParts, setSelectedParts] = useState<PartEntry[]>([])
  const [addPartId, setAddPartId]   = useState('')
  const [addPartQty, setAddPartQty] = useState('1')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')
  const [weekdayRate, setWeekdayRate] = useState(80)
  const [weekendRate, setWeekendRate] = useState(120)
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustForm, setNewCustForm] = useState({ full_name: '', email: '', phone: '', street: '', city: '', state: '', zip: '' })
  const [creatingCust, setCreatingCust] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/customers', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/admin/equipment', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/admin/parts', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/admin/site-settings', { credentials: 'include' }).then(r => r.json()),
    ]).then(([cData, eData, pData, sData]) => {
      setCustomers(cData.customers ?? cData ?? [])
      setEquipment(eData.equipment ?? eData ?? [])
      setParts(pData.parts ?? pData ?? [])
      if (sData.settings) {
        setWeekdayRate(Number(sData.settings.labor_rate_weekday) || 80)
        setWeekendRate(Number(sData.settings.labor_rate_weekend) || 120)
      }
    })
  }, [])

  const filteredEquipment = customerId
    ? equipment.filter(e => String(e.customer_id) === customerId)
    : []

  const RATE = laborType === 'weekend' ? weekendRate : weekdayRate
  const laborTotal  = Math.round(Number(laborHours || 0) * RATE * 100) / 100
  const partsTotal  = selectedParts.reduce((s, p) => s + p.unit_price * p.quantity_used, 0)
  const grandTotal  = Math.round((laborTotal + partsTotal) * 100) / 100

  function addPart() {
    const part = parts.find(p => String(p.id) === addPartId)
    if (!part) return
    const qty = Math.max(1, parseInt(addPartQty) || 1)
    const existing = selectedParts.findIndex(p => p.part_id === part.id)
    if (existing >= 0) {
      setSelectedParts(prev => prev.map((p, i) =>
        i === existing ? { ...p, quantity_used: p.quantity_used + qty } : p
      ))
    } else {
      setSelectedParts(prev => [...prev, {
        part_id: part.id,
        quantity_used: qty,
        name: part.name,
        unit_price: Number(part.sell_price),
      }])
    }
    setAddPartId('')
    setAddPartQty('1')
  }

  function removePart(idx: number) {
    setSelectedParts(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleCreateCustomer() {
    setCreatingCust(true)
    try {
      const res = await fetch('/api/admin/customers', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustForm),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to create customer.'); setCreatingCust(false); return }
      const created: Customer = data.customer
      setCustomers(prev => [...prev, created])
      setCustomerId(String(created.id))
      setEquipmentId('')
      setNewCustForm({ full_name: '', email: '', phone: '', street: '', city: '', state: '', zip: '' })
      setShowNewCustomer(false)
    } catch {
      setError('Network error.')
    }
    setCreatingCust(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!customerId || !problem.trim()) {
      setError('Customer and problem description are required.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/admin/work-orders', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id:         parseInt(customerId),
          equipment_id:        equipmentId ? parseInt(equipmentId) : null,
          problem_description: problem.trim(),
          labor_type:          laborType,
          labor_hours:         parseFloat(laborHours) || 0,
          parts:               selectedParts.map(p => ({ part_id: p.part_id, quantity_used: p.quantity_used })),
          scheduled_date:      scheduledDate || null,
          scheduled_time:      scheduledTime || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to create work order.'); setSubmitting(false); return }
      router.push(`/admin/work-orders/${data.workOrder.id}`)
    } catch {
      setError('Network error.')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#E8ECF0] p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link href="/admin/work-orders" className="inline-flex items-center gap-1 text-sm font-medium text-[#7A8898] hover:text-[#0D1B2A] transition mb-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            Back
          </Link>
          <h1 className="text-2xl font-bold text-[#0D1B2A]">New Work Order</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Customer & Equipment */}
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-[#0D1B2A] text-base">Customer & Equipment</h2>
            <div>
              <label className="block text-xs font-semibold text-[#7A8898] mb-1 uppercase tracking-wide">Customer *</label>
              <select
                value={customerId}
                onChange={e => { setCustomerId(e.target.value); setEquipmentId('') }}
                className="w-full border border-[#E8ECF0] rounded-xl px-3 py-2.5 text-sm text-[#0D1B2A] focus:outline-none focus:ring-2 focus:ring-[#B87333]"
                required
              >
                <option value="">Select customer…</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.full_name} ({c.email})</option>
                ))}
              </select>

              {/* Inline new customer */}
              {!showNewCustomer ? (
                <button
                  type="button"
                  onClick={() => setShowNewCustomer(true)}
                  className="mt-2 text-sm text-[#B87333] hover:opacity-75 transition"
                >
                  + New customer
                </button>
              ) : (
                <div
                  className="mt-3 rounded-xl border border-[#E8ECF0] bg-[#E8ECF0]/40 p-4 space-y-3"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateCustomer() } }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#7A8898]">New Customer</p>
                  <div>
                    <label className="block text-xs font-semibold text-[#7A8898]">Full Name *</label>
                    <input
                      type="text"
                      value={newCustForm.full_name}
                      onChange={e => setNewCustForm(f => ({ ...f, full_name: e.target.value }))}
                      required
                      className="mt-1 w-full rounded-xl border border-[#E8ECF0] bg-white px-3 py-2 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#7A8898]">Email *</label>
                    <input
                      type="email"
                      value={newCustForm.email}
                      onChange={e => setNewCustForm(f => ({ ...f, email: e.target.value }))}
                      required
                      className="mt-1 w-full rounded-xl border border-[#E8ECF0] bg-white px-3 py-2 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#7A8898]">Phone *</label>
                    <input
                      type="tel"
                      value={newCustForm.phone}
                      onChange={e => setNewCustForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="(555) 000-0000"
                      required
                      className="mt-1 w-full rounded-xl border border-[#E8ECF0] bg-white px-3 py-2 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#7A8898]">Street Address *</label>
                    <input
                      type="text"
                      value={newCustForm.street}
                      onChange={e => setNewCustForm(f => ({ ...f, street: e.target.value }))}
                      placeholder="123 Main St"
                      required
                      className="mt-1 w-full rounded-xl border border-[#E8ECF0] bg-white px-3 py-2 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#7A8898]">City *</label>
                    <input
                      type="text"
                      value={newCustForm.city}
                      onChange={e => setNewCustForm(f => ({ ...f, city: e.target.value }))}
                      placeholder="Portland"
                      required
                      className="mt-1 w-full rounded-xl border border-[#E8ECF0] bg-white px-3 py-2 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#7A8898]">State</label>
                      <input
                        type="text"
                        value={newCustForm.state}
                        onChange={e => setNewCustForm(f => ({ ...f, state: e.target.value }))}
                        placeholder="OR"
                        maxLength={2}
                        className="mt-1 w-full rounded-xl border border-[#E8ECF0] bg-white px-3 py-2 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#7A8898]">ZIP Code</label>
                      <input
                        type="text"
                        value={newCustForm.zip}
                        onChange={e => setNewCustForm(f => ({ ...f, zip: e.target.value }))}
                        placeholder="97201"
                        maxLength={10}
                        className="mt-1 w-full rounded-xl border border-[#E8ECF0] bg-white px-3 py-2 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleCreateCustomer}
                      disabled={creatingCust}
                      className="rounded-xl bg-[#B87333] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition"
                    >
                      {creatingCust ? 'Creating…' : 'Create & Select'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowNewCustomer(false); setNewCustForm({ full_name: '', email: '', phone: '', street: '', city: '', state: '', zip: '' }) }}
                      className="text-sm text-[#7A8898] hover:text-[#0D1B2A] transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#7A8898] mb-1 uppercase tracking-wide">Equipment</label>
              <select
                value={equipmentId}
                onChange={e => setEquipmentId(e.target.value)}
                disabled={!customerId}
                className="w-full border border-[#E8ECF0] rounded-xl px-3 py-2.5 text-sm text-[#0D1B2A] focus:outline-none focus:ring-2 focus:ring-[#B87333] disabled:bg-[#E8ECF0] disabled:text-[#7A8898]"
              >
                <option value="">{customerId ? (filteredEquipment.length === 0 ? 'No equipment found' : 'Select equipment…') : 'Select customer first'}</option>
                {filteredEquipment.map(e => (
                  <option key={e.id} value={e.id}>{e.brand} {e.model} ({e.equipment_type})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Problem */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-semibold text-[#0D1B2A] text-base mb-4">Problem Description</h2>
            <textarea
              value={problem}
              onChange={e => setProblem(e.target.value)}
              rows={4}
              placeholder="Describe the issue…"
              className="w-full border border-[#E8ECF0] rounded-xl px-3 py-2.5 text-sm text-[#0D1B2A] resize-none focus:outline-none focus:ring-2 focus:ring-[#B87333]"
              required
            />
          </div>

          {/* Labor */}
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-[#0D1B2A] text-base">Labor</h2>
            <div className="flex flex-col sm:flex-row gap-3">
              {(['weekday', 'weekend'] as const).map(t => (
                <label key={t} className={`flex-1 flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-colors ${laborType === t ? 'border-[#B87333] bg-[#B87333]/5' : 'border-[#E8ECF0]'}`}>
                  <input type="radio" name="laborType" value={t} checked={laborType === t} onChange={() => setLaborType(t)} className="accent-[#B87333]" />
                  <div>
                    <p className="text-sm font-semibold text-[#0D1B2A] capitalize">{t}</p>
                    <p className="text-xs text-[#7A8898]">${t === 'weekend' ? weekendRate : weekdayRate}/hr</p>
                  </div>
                </label>
              ))}
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#7A8898] mb-1 uppercase tracking-wide">Hours</label>
              <input
                type="number"
                value={laborHours}
                onChange={e => setLaborHours(e.target.value)}
                min="0"
                step="0.5"
                placeholder="0"
                className="w-full border border-[#E8ECF0] rounded-xl px-3 py-2.5 text-sm text-[#0D1B2A] focus:outline-none focus:ring-2 focus:ring-[#B87333]"
              />
            </div>
            {Number(laborHours) > 0 && (
              <p className="text-sm text-[#7A8898]">Labor total: <span className="font-semibold text-[#0D1B2A]">${laborTotal.toFixed(2)}</span></p>
            )}
          </div>

          {/* Parts */}
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-[#0D1B2A] text-base">Parts</h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={addPartId}
                onChange={e => setAddPartId(e.target.value)}
                className="flex-1 border border-[#E8ECF0] rounded-xl px-3 py-2.5 text-sm text-[#0D1B2A] focus:outline-none focus:ring-2 focus:ring-[#B87333]"
              >
                <option value="">Select part…</option>
                {parts.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.part_number}) — ${Number(p.sell_price).toFixed(2)} — {p.quantity} in stock</option>
                ))}
              </select>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={addPartQty}
                  onChange={e => setAddPartQty(e.target.value)}
                  min="1"
                  className="w-20 border border-[#E8ECF0] rounded-xl px-3 py-2.5 text-sm text-center text-[#0D1B2A] focus:outline-none focus:ring-2 focus:ring-[#B87333]"
                />
                <button
                  type="button"
                  onClick={addPart}
                  disabled={!addPartId}
                  className="flex-1 sm:flex-none bg-[#E8ECF0] hover:bg-[#0D1B2A] hover:text-white text-[#0D1B2A] font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            </div>
            {selectedParts.length > 0 && (
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[#7A8898] text-xs uppercase">
                    <th className="text-left py-1">Part</th>
                    <th className="text-center py-1">Qty</th>
                    <th className="text-right py-1">Unit</th>
                    <th className="text-right py-1">Total</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {selectedParts.map((p, i) => (
                    <tr key={i} className="border-t border-[#E8ECF0]">
                      <td className="py-2 text-[#0D1B2A]">{p.name}</td>
                      <td className="py-2 text-center text-[#7A8898]">{p.quantity_used}</td>
                      <td className="py-2 text-right text-[#7A8898]">${p.unit_price.toFixed(2)}</td>
                      <td className="py-2 text-right font-semibold text-[#0D1B2A]">${(p.unit_price * p.quantity_used).toFixed(2)}</td>
                      <td className="py-2 text-right">
                        <button type="button" onClick={() => removePart(i)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>

          {/* Schedule */}
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <div>
              <h2 className="font-semibold text-[#0D1B2A] text-base">Schedule <span className="text-sm font-normal text-[#7A8898]">(optional)</span></h2>
              <p className="text-xs text-[#7A8898] mt-0.5">Set a date and time now or schedule later.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#7A8898] mb-1 uppercase tracking-wide">Date</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={e => setScheduledDate(e.target.value)}
                  className="w-full border border-[#E8ECF0] rounded-xl px-3 py-2.5 text-sm text-[#0D1B2A] focus:outline-none focus:ring-2 focus:ring-[#B87333]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#7A8898] mb-1 uppercase tracking-wide">Time</label>
                <TimePickerSelect
                  value={scheduledTime}
                  onChange={e => setScheduledTime(e.target.value)}
                  className="w-full border border-[#E8ECF0] rounded-xl px-3 py-2.5 text-sm text-[#0D1B2A] focus:outline-none focus:ring-2 focus:ring-[#B87333]"
                />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[#7A8898]">Labor</span>
              <span className="text-[#0D1B2A]">${laborTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm mb-3">
              <span className="text-[#7A8898]">Parts</span>
              <span className="text-[#0D1B2A]">${partsTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold border-t border-[#E8ECF0] pt-3">
              <span className="text-[#0D1B2A]">Grand Total</span>
              <span className="text-[#B87333] text-lg">${grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {error && <p className="text-red-600 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#B87333] hover:opacity-90 text-white font-bold py-3 rounded-xl text-base transition-colors disabled:opacity-60"
          >
            {submitting ? 'Creating…' : 'Create Work Order'}
          </button>
        </form>
      </div>
    </div>
  )
}
