'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface WorkOrder {
  id: number
  work_order_number: string
  status: 'open' | 'in_progress' | 'completed' | 'cancelled'
  problem_description: string
  labor_total: number
  parts_total: number
  grand_total: number
  created_at: string
  completed_at: string | null
  customers: { id: number; full_name: string; email: string } | null
  equipment_list: { equipment_type: string; brand: string; model: string } | null
}

const STATUS_BADGE: Record<WorkOrder['status'], string> = {
  open:        'bg-amber-100 text-amber-800',
  in_progress: 'bg-violet-100 text-violet-800',
  completed:   'bg-green-100 text-green-800',
  cancelled:   'bg-gray-100 text-gray-500',
}
const STATUS_LABEL: Record<WorkOrder['status'], string> = {
  open: 'Open', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled',
}

export default function WorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/admin/work-orders', { credentials: 'include' })
      .then(r => r.json())
      .then(d => { setWorkOrders(d.workOrders ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filteredOrders = workOrders.filter(wo => {
    const matchesStatus = statusFilter === '' || wo.status === statusFilter
    const matchesSearch = search === '' ||
      wo.work_order_number?.toLowerCase().includes(search.toLowerCase()) ||
      wo.customers?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      wo.problem_description?.toLowerCase().includes(search.toLowerCase())
    return matchesStatus && matchesSearch
  })

  return (
    <div className="min-h-screen bg-[#E8ECF0] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0D1B2A]">Work Orders</h1>
          </div>
          <Link
            href="/admin/work-orders/new"
            className="shrink-0 inline-flex items-center justify-center bg-[#B87333] hover:opacity-90 text-white font-semibold px-5 py-3 rounded-xl text-sm transition-colors"
          >
            + New Work Order
          </Link>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-[#E8ECF0] shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-[18px] py-[14px] border-b border-[#E8ECF0] sticky top-0 z-10 bg-white">
            <span className="text-sm font-semibold text-[#0D1B2A]">Work order list</span>
            <div className="flex items-center gap-2">
              {['All', 'Open', 'In Progress', 'Completed', 'Cancelled'].map((s) => (
                <button key={s} onClick={() => setStatusFilter(s === 'All' ? '' : s.toLowerCase().replace(' ', '_'))}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                    (statusFilter === '' && s === 'All') || statusFilter === s.toLowerCase().replace(' ', '_')
                      ? 'bg-[#0D1B2A] text-white'
                      : 'bg-[#E8ECF0] text-[#7A8898] hover:text-[#0D1B2A]'
                  }`}>
                  {s}
                </button>
              ))}
              <div className="flex items-center gap-2 bg-[#E8ECF0] rounded-xl px-3 py-1.5 w-52">
                <svg className="h-4 w-4 text-[#7A8898] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="bg-transparent text-sm text-[#0D1B2A] placeholder-[#7A8898] outline-none w-full" />
              </div>
            </div>
          </div>
          {loading ? (
            <div className="p-12 text-center text-[#7A8898]">Loading…</div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-12 text-center text-[#7A8898]">No work orders found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-[#0D1B2A] sticky top-[57px] z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-white">WO #</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-white">Customer</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-white">Equipment</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-white">Problem</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-white">Status</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-white">Total</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-white">Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(wo => (
                  <tr
                    key={wo.id}
                    className="border-b border-[#E8ECF0] last:border-0 hover:bg-[#E8ECF0] cursor-pointer transition-colors"
                    onClick={() => window.location.href = `/admin/work-orders/${wo.id}`}
                  >
                    <td className="px-4 py-3 font-mono font-semibold text-[#B87333]">{wo.work_order_number}</td>
                    <td className="px-4 py-3 text-[#0D1B2A] font-medium">{wo.customers?.full_name ?? '—'}</td>
                    <td className="px-4 py-3 text-[#7A8898]">
                      {wo.equipment_list
                        ? `${wo.equipment_list.brand} ${wo.equipment_list.model}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-[#0D1B2A] max-w-[220px]">
                      <span className="truncate block">{wo.problem_description}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[wo.status]}`}>
                        {STATUS_LABEL[wo.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-[#0D1B2A] font-semibold">
                      ${Number(wo.grand_total).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-[#7A8898]">
                      {new Date(wo.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
