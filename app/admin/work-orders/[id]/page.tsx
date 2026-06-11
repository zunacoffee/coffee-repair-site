'use client'
import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import TimePickerSelect from '../../../components/ui/TimePickerSelect'

interface WOPart {
  id: number
  part_id: number
  quantity_used: number
  unit_price: number
  total: number
  parts_inventory: { id: number; name: string; part_number: string } | null
}
interface WorkOrder {
  id: number
  work_order_number: string
  status: 'open' | 'in_progress' | 'completed' | 'cancelled'
  problem_description: string
  technician_notes: string | null
  labor_hours: number
  labor_type: 'weekday' | 'weekend'
  labor_total: number
  parts_total: number
  grand_total: number
  created_at: string
  completed_at: string | null
  scheduled_date: string | null
  scheduled_time: string | null
  customers: { id: number; full_name: string; email: string; phone: string } | null
  equipment_list: { id: number; equipment_type: string; brand: string; model: string; serial_number: string } | null
}

interface InventoryPart {
  id: number
  name: string
  part_number: string
  sell_price: number
  quantity: number
}

const STATUS_BADGE: Record<WorkOrder['status'], string> = {
  open:        'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed:   'bg-green-100 text-green-700',
  cancelled:   'bg-[#E8ECF0] text-[#7A8898]',
}
const STATUS_LABEL: Record<WorkOrder['status'], string> = {
  open: 'Open', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled',
}

export default function WorkOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [wo, setWo]     = useState<WorkOrder | null>(null)
  const [parts, setParts] = useState<WOPart[]>([])
  const [invParts, setInvParts] = useState<InventoryPart[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState('')
  const [err, setErr]         = useState('')

  // Editable state
  const [status, setStatus]         = useState<WorkOrder['status']>('open')
  const [problem, setProblem]       = useState('')
  const [notes, setNotes]           = useState('')
  const [laborType, setLaborType]         = useState<'weekday' | 'weekend'>('weekday')
  const [laborHours, setLaborHours]       = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')

  // Add part
  const [addPartId, setAddPartId]   = useState('')
  const [addPartQty, setAddPartQty] = useState('1')
  const [addingPart, setAddingPart] = useState(false)
  const [partErr, setPartErr]       = useState('')

  // Actions
  const [invoiceMsg, setInvoiceMsg] = useState('')
  const [emailMsg, setEmailMsg]     = useState('')
  const [weekdayRate, setWeekdayRate] = useState(80)
  const [weekendRate, setWeekendRate] = useState(120)

  async function load() {
    const [woRes, invRes, sRes] = await Promise.all([
      fetch(`/api/admin/work-orders/${id}`, { credentials: 'include' }).then(r => r.json()),
      fetch('/api/admin/parts', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/admin/site-settings', { credentials: 'include' }).then(r => r.json()),
    ])
    if (woRes.workOrder) {
      setWo(woRes.workOrder)
      setParts(woRes.parts ?? [])
      setStatus(woRes.workOrder.status)
      setProblem(woRes.workOrder.problem_description)
      setNotes(woRes.workOrder.technician_notes ?? '')
      setLaborType(woRes.workOrder.labor_type)
      setLaborHours(String(woRes.workOrder.labor_hours ?? ''))
      setScheduledDate(woRes.workOrder.scheduled_date ?? '')
      setScheduledTime(woRes.workOrder.scheduled_time ?? '')
    }
    setInvParts(invRes.parts ?? invRes ?? [])
    if (sRes.settings) {
      setWeekdayRate(Number(sRes.settings.labor_rate_weekday) || 80)
      setWeekendRate(Number(sRes.settings.labor_rate_weekend) || 120)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    setSaving(true); setMsg(''); setErr('')
    const res = await fetch(`/api/admin/work-orders/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        problem_description: problem.trim(),
        technician_notes:    notes.trim() || null,
        labor_type:          laborType,
        labor_hours:         parseFloat(laborHours) || 0,
        scheduled_date:      scheduledDate || null,
        scheduled_time:      scheduledTime || null,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setErr(data.error ?? 'Save failed.'); setSaving(false); return }
    setWo(prev => prev ? { ...prev, ...data.workOrder } : null)
    setMsg('Saved successfully.')
    setSaving(false)
  }

  async function handleAddPart() {
    setAddingPart(true); setPartErr('')
    const res = await fetch(`/api/admin/work-orders/${id}/parts`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ part_id: parseInt(addPartId), quantity_used: parseInt(addPartQty) || 1 }),
    })
    const data = await res.json()
    if (!res.ok) { setPartErr(data.error ?? 'Failed to add part.'); setAddingPart(false); return }
    setAddPartId(''); setAddPartQty('1')
    await load()
    setAddingPart(false)
  }

  async function handleRemovePart(partId: number) {
    await fetch(`/api/admin/work-orders/${id}/parts/${partId}`, {
      method: 'DELETE', credentials: 'include',
    })
    await load()
  }

  async function handleGenerateInvoice() {
    setInvoiceMsg('')
    const res = await fetch(`/api/admin/work-orders/${id}/generate-invoice`, {
      method: 'POST', credentials: 'include',
    })
    const data = await res.json()
    if (!res.ok) { setInvoiceMsg(`Error: ${data.error}`); return }
    setInvoiceMsg(`Invoice ${data.invoice.invoice_number ?? '#' + data.invoice.id} created (draft).`)
  }

  async function handleEmail() {
    setEmailMsg('')
    const res = await fetch(`/api/admin/work-orders/${id}/email`, {
      method: 'POST', credentials: 'include',
    })
    const data = await res.json()
    setEmailMsg(res.ok ? 'Email sent successfully.' : `Error: ${data.error}`)
  }

  if (loading) return <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center text-[#7A8898]">Loading…</div>
  if (!wo)     return <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center text-red-500">Work order not found.</div>

  const RATE = laborType === 'weekend' ? weekendRate : weekdayRate
  const previewLaborTotal = Math.round(Number(laborHours || 0) * RATE * 100) / 100
  const previewGrand      = Math.round((previewLaborTotal + Number(wo.parts_total)) * 100) / 100

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; }
        }
        .print-only { display: none; }
      `}</style>

      <div className="min-h-screen bg-[#F4F6F9] p-6 no-print">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <Link href="/admin/work-orders" className="text-[#7A8898] text-sm hover:text-[#0D1B2A]">← Work Orders</Link>
              <div className="flex items-center gap-3 mt-1">
                <h1 className="text-2xl font-bold text-[#0D1B2A] font-mono">{wo.work_order_number}</h1>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[wo.status]}`}>
                  {STATUS_LABEL[wo.status]}
                </span>
              </div>
              <p className="text-xs text-[#7A8898] mt-0.5">Created {new Date(wo.created_at).toLocaleDateString()}</p>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              <button
                onClick={() => window.print()}
                className="text-sm border border-[#E8ECF0] bg-white text-[#0D1B2A] px-4 py-2 rounded-xl hover:bg-[#F4F6F9] transition-colors font-medium"
              >
                Print
              </button>
              <button
                onClick={handleEmail}
                className="text-sm border border-[#E8ECF0] bg-white text-[#0D1B2A] px-4 py-2 rounded-xl hover:bg-[#F4F6F9] transition-colors font-medium"
              >
                Email Customer
              </button>
              <button
                onClick={handleGenerateInvoice}
                className="text-sm bg-[#0D1B2A] text-white px-4 py-2 rounded-xl hover:bg-[#1a2e45] transition-colors font-medium"
              >
                Generate Invoice
              </button>
            </div>
          </div>
          {invoiceMsg && <p className={`text-sm mb-4 ${invoiceMsg.startsWith('Error') ? 'text-red-600' : 'text-green-700'}`}>{invoiceMsg}</p>}
          {emailMsg    && <p className={`text-sm mb-4 ${emailMsg.startsWith('Error') ? 'text-red-600' : 'text-green-700'}`}>{emailMsg}</p>}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Left — Info & Edit */}
            <div className="md:col-span-2 space-y-5">
              {/* Customer & Equipment */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="font-semibold text-[#0D1B2A] mb-4">Customer & Equipment</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[#7A8898] text-xs uppercase font-semibold mb-1">Customer</p>
                    <p className="text-[#0D1B2A] font-medium">{wo.customers?.full_name ?? '—'}</p>
                    <p className="text-[#7A8898]">{wo.customers?.email}</p>
                    <p className="text-[#7A8898]">{wo.customers?.phone}</p>
                    {wo.customers?.id && (
                      <Link href={`/admin/customers/${wo.customers.id}`} className="text-[#B87333] text-xs hover:underline mt-1 inline-block">View Profile →</Link>
                    )}
                  </div>
                  <div>
                    <p className="text-[#7A8898] text-xs uppercase font-semibold mb-1">Equipment</p>
                    {wo.equipment_list ? (
                      <>
                        <p className="text-[#0D1B2A] font-medium">{wo.equipment_list.brand} {wo.equipment_list.model}</p>
                        <p className="text-[#7A8898]">{wo.equipment_list.equipment_type}</p>
                        {wo.equipment_list.serial_number && <p className="text-[#7A8898] text-xs">S/N: {wo.equipment_list.serial_number}</p>}
                      </>
                    ) : <p className="text-[#7A8898]">—</p>}
                  </div>
                </div>
              </div>

              {/* Edit fields */}
              <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                <h2 className="font-semibold text-[#0D1B2A]">Work Order Details</h2>

                <div>
                  <label className="block text-xs font-semibold text-[#7A8898] mb-1 uppercase tracking-wide">Status</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as WorkOrder['status'])}
                    className="w-full border border-[#E8ECF0] rounded-xl px-3 py-2.5 text-sm text-[#0D1B2A] focus:outline-none focus:ring-2 focus:ring-[#B87333]"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#7A8898] mb-1 uppercase tracking-wide">Problem Description</label>
                  <textarea
                    value={problem}
                    onChange={e => setProblem(e.target.value)}
                    rows={3}
                    className="w-full border border-[#E8ECF0] rounded-xl px-3 py-2.5 text-sm text-[#0D1B2A] resize-none focus:outline-none focus:ring-2 focus:ring-[#B87333]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#7A8898] mb-1 uppercase tracking-wide">Technician Notes</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Internal notes…"
                    className="w-full border border-[#E8ECF0] rounded-xl px-3 py-2.5 text-sm text-[#0D1B2A] resize-none focus:outline-none focus:ring-2 focus:ring-[#B87333]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#7A8898] mb-1 uppercase tracking-wide">Scheduled Date</label>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={e => setScheduledDate(e.target.value)}
                      className="w-full border border-[#E8ECF0] rounded-xl px-3 py-2.5 text-sm text-[#0D1B2A] focus:outline-none focus:ring-2 focus:ring-[#B87333]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#7A8898] mb-1 uppercase tracking-wide">Scheduled Time</label>
                    <TimePickerSelect
                      value={scheduledTime}
                      onChange={e => setScheduledTime(e.target.value)}
                      className="w-full border border-[#E8ECF0] rounded-xl px-3 py-2.5 text-sm text-[#0D1B2A] focus:outline-none focus:ring-2 focus:ring-[#B87333]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#7A8898] mb-1 uppercase tracking-wide">Labor Type</label>
                    <select
                      value={laborType}
                      onChange={e => setLaborType(e.target.value as 'weekday' | 'weekend')}
                      className="w-full border border-[#E8ECF0] rounded-xl px-3 py-2.5 text-sm text-[#0D1B2A] focus:outline-none focus:ring-2 focus:ring-[#B87333]"
                    >
                      <option value="weekday">Weekday (${weekdayRate}/hr)</option>
                      <option value="weekend">Weekend (${weekendRate}/hr)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#7A8898] mb-1 uppercase tracking-wide">Labor Hours</label>
                    <input
                      type="number"
                      value={laborHours}
                      onChange={e => setLaborHours(e.target.value)}
                      min="0" step="0.5"
                      className="w-full border border-[#E8ECF0] rounded-xl px-3 py-2.5 text-sm text-[#0D1B2A] focus:outline-none focus:ring-2 focus:ring-[#B87333]"
                    />
                  </div>
                </div>

                {err && <p className="text-red-600 text-sm">{err}</p>}
                {msg && <p className="text-green-700 text-sm">{msg}</p>}

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-[#B87333] hover:bg-[#a0632b] text-white font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>

              {/* Parts */}
              <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                <h2 className="font-semibold text-[#0D1B2A]">Parts Used</h2>

                {parts.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-[#7A8898] uppercase">
                        <th className="text-left py-1">Part</th>
                        <th className="text-center py-1">Qty</th>
                        <th className="text-right py-1">Unit</th>
                        <th className="text-right py-1">Total</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {parts.map(p => (
                        <tr key={p.id} className="border-t border-[#E8ECF0]">
                          <td className="py-2 text-[#0D1B2A]">
                            {p.parts_inventory?.name ?? `Part #${p.part_id}`}
                            <span className="text-[#7A8898] text-xs ml-2">{p.parts_inventory?.part_number}</span>
                          </td>
                          <td className="py-2 text-center text-[#7A8898]">{p.quantity_used}</td>
                          <td className="py-2 text-right text-[#7A8898]">${Number(p.unit_price).toFixed(2)}</td>
                          <td className="py-2 text-right font-semibold text-[#0D1B2A]">${Number(p.total).toFixed(2)}</td>
                          <td className="py-2 text-right">
                            <button onClick={() => handleRemovePart(p.id)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-[#7A8898] text-sm">No parts added yet.</p>
                )}

                {/* Add part */}
                <div className="flex gap-3 pt-2 border-t border-[#E8ECF0]">
                  <select
                    value={addPartId}
                    onChange={e => setAddPartId(e.target.value)}
                    className="flex-1 border border-[#E8ECF0] rounded-xl px-3 py-2 text-sm text-[#0D1B2A] focus:outline-none focus:ring-2 focus:ring-[#B87333]"
                  >
                    <option value="">Add part…</option>
                    {invParts.map(p => (
                      <option key={p.id} value={p.id}>{p.name} — ${Number(p.sell_price).toFixed(2)} ({p.quantity} in stock)</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={addPartQty}
                    onChange={e => setAddPartQty(e.target.value)}
                    min="1"
                    className="w-16 border border-[#E8ECF0] rounded-xl px-2 py-2 text-sm text-center text-[#0D1B2A] focus:outline-none focus:ring-2 focus:ring-[#B87333]"
                  />
                  <button
                    onClick={handleAddPart}
                    disabled={!addPartId || addingPart}
                    className="bg-[#E8ECF0] hover:bg-[#0D1B2A] hover:text-white text-[#0D1B2A] font-semibold px-4 rounded-xl text-sm transition-colors disabled:opacity-40"
                  >
                    {addingPart ? '…' : 'Add'}
                  </button>
                </div>
                {partErr && <p className="text-red-600 text-xs">{partErr}</p>}
              </div>
            </div>

            {/* Right — Totals */}
            <div className="space-y-5">
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="font-semibold text-[#0D1B2A] mb-4">Summary</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#7A8898]">Labor ({laborHours || '0'} hrs)</span>
                    <span className="text-[#0D1B2A]">${previewLaborTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7A8898]">Parts</span>
                    <span className="text-[#0D1B2A]">${Number(wo.parts_total).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base pt-3 border-t border-[#E8ECF0]">
                    <span className="text-[#0D1B2A]">Total</span>
                    <span className="text-[#B87333]">${previewGrand.toFixed(2)}</span>
                  </div>
                </div>
                {wo.completed_at && (
                  <p className="text-xs text-[#7A8898] mt-4">Completed: {new Date(wo.completed_at).toLocaleDateString()}</p>
                )}
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm text-sm space-y-3">
                <h2 className="font-semibold text-[#0D1B2A] mb-2">Quick Actions</h2>
                <button
                  onClick={handleGenerateInvoice}
                  className="w-full bg-[#0D1B2A] hover:bg-[#1a2e45] text-white font-semibold py-2.5 rounded-xl transition-colors"
                >
                  Generate Invoice
                </button>
                <button
                  onClick={handleEmail}
                  className="w-full border border-[#E8ECF0] text-[#0D1B2A] hover:bg-[#F4F6F9] font-semibold py-2.5 rounded-xl transition-colors"
                >
                  Email Customer
                </button>
                <button
                  onClick={() => window.print()}
                  className="w-full border border-[#E8ECF0] text-[#0D1B2A] hover:bg-[#F4F6F9] font-semibold py-2.5 rounded-xl transition-colors"
                >
                  Print Work Order
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ───── Print view ───── */}
      <div className="print-only p-10 text-sm font-sans">
        <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-[#0D1B2A]">
          <div>
            <h1 className="text-2xl font-bold text-[#0D1B2A]">Cafe Works</h1>
            <p className="text-[#7A8898] text-xs mt-1">Professional Coffee Equipment Service</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-[#B87333]">{wo.work_order_number}</p>
            <p className="text-[#7A8898] text-xs">Work Order</p>
            <p className="text-[#7A8898] text-xs mt-1">{new Date(wo.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <p className="text-xs font-bold text-[#7A8898] uppercase mb-2">Customer</p>
            <p className="font-semibold">{wo.customers?.full_name}</p>
            <p className="text-[#7A8898]">{wo.customers?.email}</p>
            <p className="text-[#7A8898]">{wo.customers?.phone}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-[#7A8898] uppercase mb-2">Equipment</p>
            {wo.equipment_list ? (
              <>
                <p className="font-semibold">{wo.equipment_list.brand} {wo.equipment_list.model}</p>
                <p className="text-[#7A8898]">{wo.equipment_list.equipment_type}</p>
                {wo.equipment_list.serial_number && <p className="text-[#7A8898]">S/N: {wo.equipment_list.serial_number}</p>}
              </>
            ) : <p className="text-[#7A8898]">—</p>}
          </div>
        </div>

        <div className="mb-6">
          <p className="text-xs font-bold text-[#7A8898] uppercase mb-2">Problem Description</p>
          <p className="border border-[#E8ECF0] rounded p-3">{wo.problem_description}</p>
        </div>

        {wo.technician_notes && (
          <div className="mb-6">
            <p className="text-xs font-bold text-[#7A8898] uppercase mb-2">Technician Notes</p>
            <p className="border border-[#E8ECF0] rounded p-3">{wo.technician_notes}</p>
          </div>
        )}

        {parts.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-bold text-[#7A8898] uppercase mb-2">Parts Used</p>
            <table className="w-full border-collapse border border-[#E8ECF0] text-sm">
              <thead>
                <tr className="bg-[#F4F6F9]">
                  <th className="border border-[#E8ECF0] px-3 py-2 text-left">Part</th>
                  <th className="border border-[#E8ECF0] px-3 py-2 text-center">Qty</th>
                  <th className="border border-[#E8ECF0] px-3 py-2 text-right">Unit Price</th>
                  <th className="border border-[#E8ECF0] px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {parts.map(p => (
                  <tr key={p.id}>
                    <td className="border border-[#E8ECF0] px-3 py-2">{p.parts_inventory?.name}</td>
                    <td className="border border-[#E8ECF0] px-3 py-2 text-center">{p.quantity_used}</td>
                    <td className="border border-[#E8ECF0] px-3 py-2 text-right">${Number(p.unit_price).toFixed(2)}</td>
                    <td className="border border-[#E8ECF0] px-3 py-2 text-right">${Number(p.total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="ml-auto max-w-xs mb-8">
          <div className="flex justify-between py-1 border-b border-[#E8ECF0]">
            <span className="text-[#7A8898]">Labor ({wo.labor_type}, {wo.labor_hours} hrs)</span>
            <span>${Number(wo.labor_total).toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#E8ECF0]">
            <span className="text-[#7A8898]">Parts</span>
            <span>${Number(wo.parts_total).toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-2 font-bold text-base">
            <span>Total</span>
            <span>${Number(wo.grand_total).toFixed(2)}</span>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-[#E8ECF0] grid grid-cols-2 gap-12">
          <div>
            <p className="text-xs text-[#7A8898] uppercase mb-8">Customer Signature</p>
            <div className="border-b border-[#7A8898] w-full" />
            <p className="text-xs text-[#7A8898] mt-1">Signature</p>
          </div>
          <div>
            <p className="text-xs text-[#7A8898] uppercase mb-8">Date</p>
            <div className="border-b border-[#7A8898] w-full" />
            <p className="text-xs text-[#7A8898] mt-1">Date</p>
          </div>
        </div>
      </div>
    </>
  )
}
