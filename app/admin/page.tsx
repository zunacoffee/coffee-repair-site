"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Customer = {
  id: number | string
  full_name: string
  email: string
  phone: string
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

type MaintenancePlan = {
  id: number | string
  plan_name?: string
  status: string
  renewal_date?: string | null
}

type ServiceRequest = {
  id: number | string
  full_name: string
  email: string
  equipment_type: string
  brand: string
  issue_description: string
  status: string
  contact_preference: string
  created_at: string
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function todayLabel() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

const STATUS_BADGE: Record<string, string> = {
  pending:    'bg-gray-100 text-gray-700',
  in_progress:'bg-amber-100 text-amber-800',
  completed:  'bg-green-100 text-green-700',
  new:        'bg-blue-100 text-blue-800',
  contacted:  'bg-yellow-100 text-yellow-800',
  scheduled:  'bg-purple-100 text-purple-800',
}

export default function AdminPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [repairJobs, setRepairJobs] = useState<RepairJob[]>([])
  const [plans, setPlans] = useState<MaintenancePlan[]>([])
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([])

  useEffect(() => {
    let mounted = true

    async function load() {
      const res = await fetch('/api/admin-data')
      if (res.status === 401) { router.replace('/admin/login'); return }
      const json = await res.json()
      if (!mounted) return
      if (!res.ok) { setLoadError(json.error ?? 'Failed to load.'); setIsLoading(false); return }
      setCustomers(json.customers ?? [])
      setRepairJobs(json.repairJobs ?? [])
      setPlans(json.plans ?? [])
      setServiceRequests(json.serviceRequests ?? [])
      setIsLoading(false)
    }

    load()
    return () => { mounted = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const openRepairs = repairJobs.filter((j) => j.status !== 'completed')
  const inProgressJobs = repairJobs.filter((j) => j.status === 'in_progress')
  const activePlans = plans.filter((p) => p.status === 'active')
  const newRequests = serviceRequests.filter((r) => r.status === 'new')

  const customerMap = Object.fromEntries(customers.map((c) => [c.id.toString(), c.full_name]))

  if (isLoading) {
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
        <div className="px-4 py-6 sm:px-8 sm:py-8 max-w-7xl mx-auto space-y-8">

          {loadError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{loadError}</div>
          )}

          {/* ── Greeting ── */}
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#B87333]">{todayLabel()}</p>
              <h1 className="mt-1 text-2xl font-bold text-[#0D1B2A] sm:text-3xl">{getGreeting()} —</h1>
            </div>
            <Link
              href="/admin/repair-jobs"
              className="inline-flex items-center gap-2 rounded-xl bg-[#B87333] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#a0632b] transition self-start sm:self-auto"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Repair Job
            </Link>
          </div>

          {/* ── Quick Actions ── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'New Repair', href: '/admin/repair-jobs', icon: 'M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z' },
              { label: 'Add Customer', href: '/admin/customers', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z' },
              { label: 'Create Invoice', href: '/admin/repair-jobs', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
              { label: 'View Schedule', href: '/admin/calendar', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
            ].map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-white border border-[#E8ECF0] px-4 py-5 text-center shadow-sm hover:border-[#B87333]/40 hover:shadow-md transition group"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#B87333]/10 text-[#B87333] group-hover:bg-[#B87333]/20 transition">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={action.icon} />
                  </svg>
                </span>
                <span className="text-xs font-semibold text-[#0D1B2A]">{action.label}</span>
              </Link>
            ))}
          </div>

          {/* ── Stat Cards ── */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              {
                label: 'Active Plans',
                value: activePlans.length,
                border: 'border-l-[#B87333]',
                badge: activePlans.length > 0 ? `${activePlans.length} active` : null,
                sub: 'Maintenance subscriptions',
                href: '/admin/maintenance-plans',
              },
              {
                label: 'Open Repairs',
                value: openRepairs.length,
                border: 'border-l-blue-500',
                badge: inProgressJobs.length > 0 ? `${inProgressJobs.length} in progress` : null,
                sub: 'Pending + in progress',
                href: '/admin/repair-jobs',
              },
              {
                label: 'New Requests',
                value: newRequests.length,
                border: 'border-l-orange-400',
                badge: newRequests.length > 0 ? 'Needs follow-up' : null,
                sub: 'Uncontacted service requests',
                href: '/admin/service-requests',
              },
              {
                label: 'Total Customers',
                value: customers.length,
                border: 'border-l-emerald-500',
                badge: null,
                sub: 'Registered customer accounts',
                href: '/admin/customers',
              },
            ].map((card) => (
              <Link
                key={card.label}
                href={card.href}
                className={`group flex flex-col justify-between rounded-2xl border-l-4 bg-white px-5 py-5 shadow-sm hover:shadow-md transition ${card.border}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#7A8898]">{card.label}</p>
                  {card.badge && (
                    <span className="shrink-0 rounded-full bg-[#B87333]/10 px-2 py-0.5 text-[10px] font-semibold text-[#B87333]">
                      {card.badge}
                    </span>
                  )}
                </div>
                <p className="mt-3 text-4xl font-bold tracking-tight text-[#0D1B2A]">{card.value}</p>
                <p className="mt-2 text-xs text-[#7A8898]">{card.sub}</p>
              </Link>
            ))}
          </div>

          {/* ── Main grid ── */}
          <div className="grid gap-6 lg:grid-cols-2">

            {/* Today's Schedule — in-progress jobs */}
            <section className="rounded-2xl bg-white shadow-sm border border-[#E8ECF0] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8ECF0]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#7A8898]">Today's Work</p>
                  <h2 className="mt-0.5 text-sm font-bold text-[#0D1B2A]">Jobs In Progress</h2>
                </div>
                <Link href="/admin/repair-jobs" className="text-xs font-semibold text-[#B87333] hover:underline">View all</Link>
              </div>
              {inProgressJobs.length > 0 ? (
                <ul className="divide-y divide-[#E8ECF0]">
                  {inProgressJobs.slice(0, 5).map((job) => (
                    <li key={job.id} className="flex items-center justify-between gap-4 px-6 py-3.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#0D1B2A]">{job.equipment_type}</p>
                        <p className="truncate text-xs text-[#7A8898]">{customerMap[job.customer_id?.toString()] ?? 'Unknown'}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                        In progress
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-6 py-10 text-center">
                  <p className="text-sm font-medium text-[#0D1B2A]">No jobs in progress</p>
                  <p className="mt-1 text-xs text-[#7A8898]">Start a repair job to see it here.</p>
                </div>
              )}
            </section>

            {/* Upcoming Maintenance */}
            <section className="rounded-2xl bg-white shadow-sm border border-[#E8ECF0] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8ECF0]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#7A8898]">Maintenance</p>
                  <h2 className="mt-0.5 text-sm font-bold text-[#0D1B2A]">Active Plans</h2>
                </div>
                <Link href="/admin/maintenance-plans" className="text-xs font-semibold text-[#B87333] hover:underline">View all</Link>
              </div>
              {activePlans.length > 0 ? (
                <ul className="divide-y divide-[#E8ECF0]">
                  {activePlans.slice(0, 5).map((plan) => (
                    <li key={plan.id} className="flex items-center justify-between gap-4 px-6 py-3.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#0D1B2A]">{plan.plan_name ?? `Plan #${plan.id}`}</p>
                        {plan.renewal_date && (
                          <p className="text-xs text-[#7A8898]">
                            Renews {new Date(plan.renewal_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-semibold text-green-700">
                        Active
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-6 py-10 text-center">
                  <p className="text-sm font-medium text-[#0D1B2A]">No active plans</p>
                  <p className="mt-1 text-xs text-[#7A8898]">Customers with active subscriptions appear here.</p>
                </div>
              )}
            </section>

            {/* Open Repairs */}
            <section className="rounded-2xl bg-white shadow-sm border border-[#E8ECF0] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8ECF0]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#7A8898]">Queue</p>
                  <h2 className="mt-0.5 text-sm font-bold text-[#0D1B2A]">Open Repairs</h2>
                </div>
                <Link href="/admin/repair-jobs" className="text-xs font-semibold text-[#B87333] hover:underline">View all</Link>
              </div>
              {openRepairs.length > 0 ? (
                <ul className="divide-y divide-[#E8ECF0]">
                  {openRepairs.slice(0, 6).map((job) => (
                    <li key={job.id} className="flex items-center justify-between gap-4 px-6 py-3.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#0D1B2A]">{job.equipment_type}</p>
                        <p className="truncate text-xs text-[#7A8898]">
                          {customerMap[job.customer_id?.toString()] ?? 'Unknown'}
                          {job.created_at ? ` · ${new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_BADGE[job.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {job.status.replace('_', ' ')}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-6 py-10 text-center">
                  <p className="text-sm font-medium text-[#0D1B2A]">All caught up!</p>
                  <p className="mt-1 text-xs text-[#7A8898]">No open repairs at the moment.</p>
                </div>
              )}
            </section>

            {/* Recent Service Requests */}
            <section className="rounded-2xl bg-white shadow-sm border border-[#E8ECF0] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8ECF0]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#7A8898]">Incoming</p>
                  <h2 className="mt-0.5 text-sm font-bold text-[#0D1B2A]">Recent Service Requests</h2>
                </div>
                <Link href="/admin/service-requests" className="text-xs font-semibold text-[#B87333] hover:underline">View all</Link>
              </div>
              {serviceRequests.length > 0 ? (
                <ul className="divide-y divide-[#E8ECF0]">
                  {serviceRequests.slice(0, 6).map((req) => (
                    <li key={req.id} className="flex items-center justify-between gap-4 px-6 py-3.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#0D1B2A]">{req.full_name}</p>
                        <p className="truncate text-xs text-[#7A8898]">
                          {req.equipment_type} · {req.brand}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_BADGE[req.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {req.status}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-6 py-10 text-center">
                  <p className="text-sm font-medium text-[#0D1B2A]">No service requests yet</p>
                  <p className="mt-1 text-xs text-[#7A8898]">Submissions from the public form appear here.</p>
                </div>
              )}
            </section>

          </div>
        </div>
  )
}
