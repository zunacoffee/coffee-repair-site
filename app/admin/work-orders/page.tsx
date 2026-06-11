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
  open:        'bg-[#7A8898] text-white',
  in_progress: 'bg-[#0D1B2A] text-[#E8ECF0]',
  completed:   'bg-green-100 text-green-700',
  cancelled:   'bg-gray-100 text-gray-500',
}
const STATUS_LABEL: Record<WorkOrder['status'], string> = {
  open: 'Open', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled',
}

export default function WorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState<'all' | WorkOrder['status']>('all')

  useEffect(() => {
    fetch('/api/admin/work-orders', { credentials: 'include' })
      .then(r => r.json())
      .then(d => { setWorkOrders(d.workOrders ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = filter === 'all'
    ? workOrders
    : workOrders.filter(wo => wo.status === filter)

  return (
    <div className="min-h-screen bg-[#F4F6F9] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0D1B2A]">Work Orders</h1>
            <p className="text-sm text-[#7A8898] mt-1">{workOrders.length} total work orders</p>
          </div>
          <Link
            href="/admin/work-orders/new"
            className="shrink-0 inline-flex items-center justify-center bg-[#B87333] hover:bg-[#a0632b] text-white font-semibold px-5 py-3 rounded-xl text-sm transition-colors"
          >
            + New Work Order
          </Link>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(['all', 'open', 'in_progress', 'completed', 'cancelled'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === s
                  ? 'bg-[#0D1B2A] text-white'
                  : 'bg-white text-[#7A8898] hover:bg-[#E8ECF0]'
              }`}
            >
              {s === 'all' ? 'All' : STATUS_LABEL[s as WorkOrder['status']]}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-[#7A8898]">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-[#7A8898]">No work orders found.</div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F4F6F9] border-b border-[#E8ECF0]">
                <tr>
                  <th className="px-4 py-3 text-left text-[#0D1B2A] font-semibold">WO #</th>
                  <th className="px-4 py-3 text-left text-[#0D1B2A] font-semibold">Customer</th>
                  <th className="px-4 py-3 text-left text-[#0D1B2A] font-semibold">Equipment</th>
                  <th className="px-4 py-3 text-left text-[#0D1B2A] font-semibold">Problem</th>
                  <th className="px-4 py-3 text-left text-[#0D1B2A] font-semibold">Status</th>
                  <th className="px-4 py-3 text-right text-[#0D1B2A] font-semibold">Total</th>
                  <th className="px-4 py-3 text-left text-[#0D1B2A] font-semibold">Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(wo => (
                  <tr
                    key={wo.id}
                    className="border-b border-[#E8ECF0] last:border-0 hover:bg-[#F5F7FA] cursor-pointer transition-colors"
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
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
