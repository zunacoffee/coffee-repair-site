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
}

const STATUS_BADGE: Record<string, string> = {
  active:          'bg-[#B87333] text-white',
  pending_payment: 'border border-[#B87333] text-[#B87333] bg-transparent',
  inactive:        'bg-[#E8ECF0] text-[#7A8898]',
  cancelled:       'bg-red-100 text-red-700',
}

export default function MaintenancePlansPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [plans, setPlans] = useState<MaintenancePlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

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

  const customCount   = plans.filter((p) => p.is_custom).length
  const activeCount   = plans.filter((p) => p.status === 'active').length
  const pendingCount  = plans.filter((p) => p.status === 'pending_payment').length

  return (
    <div className="py-8 px-4 lg:px-10 max-w-7xl mx-auto w-full space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0D1B2A]">Maintenance Plans</h1>
          <p className="mt-0.5 text-sm text-[#7A8898]">
            {plans.length} plan{plans.length !== 1 ? 's' : ''} total
          </p>
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

      {/* Plans table */}
      <div className="rounded-2xl border border-[#E8ECF0] bg-white shadow-sm overflow-hidden">
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
              <thead>
                <tr className="border-b border-[#E8ECF0]">
                  {['Customer', 'Plan', 'Status', 'Price', 'Renewal date', ''].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#0D1B2A]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8ECF0]">
                {plans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-[#F5F7FA] transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-[#0D1B2A]">{findCustomerName(plan.customer_id)}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-[#0D1B2A]">{plan.plan_name}</span>
                        {plan.is_custom && (
                          <span className="inline-flex items-center rounded-full bg-[#B87333]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#B87333]">
                            Custom
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_BADGE[plan.status] ?? 'bg-[#E8ECF0] text-[#7A8898]'}`}>
                        {plan.status === 'pending_payment' ? 'Pending payment' : plan.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-[#0D1B2A] whitespace-nowrap">
                      ${Number(plan.price).toFixed(2)}<span className="text-xs font-normal text-[#7A8898]">/mo</span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[#7A8898] whitespace-nowrap">
                      {plan.renewal_date ? new Date(plan.renewal_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <Link
                        href={`/admin/customers/${plan.customer_id}`}
                        className="inline-flex items-center rounded-full bg-[#B87333] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#a0632b] transition whitespace-nowrap"
                      >
                        View customer
                      </Link>
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
