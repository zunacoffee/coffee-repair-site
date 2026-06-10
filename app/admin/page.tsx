"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type NavItem = 'dashboard' | 'customers' | 'repair-jobs' | 'maintenance-plans'

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
  created_at: string | null
  customer_id?: number | string
}

type MaintenancePlan = {
  id: number | string
  plan_name?: string
  status: string
}

export default function AdminPage() {
  const router = useRouter()
  const [activeNav, setActiveNav] = useState<NavItem>('dashboard')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [repairJobs, setRepairJobs] = useState<RepairJob[]>([])
  const [plans, setPlans] = useState<MaintenancePlan[]>([])
  const [newJobEquipment, setNewJobEquipment] = useState('')
  const [newJobCustomer, setNewJobCustomer] = useState<string>('')
  const [newJobStatus, setNewJobStatus] = useState('pending')
  const [newJobIssue, setNewJobIssue] = useState('')
  const [newJobSubmitting, setNewJobSubmitting] = useState(false)
  const [newJobError, setNewJobError] = useState<string | null>(null)
  const [newJobSuccess, setNewJobSuccess] = useState<string | null>(null)

  const fetchAdminData = async () => {
    const response = await fetch('/api/admin-data')
    if (response.status === 401) {
      router.replace('/admin/login')
      return null
    }
    const json = await response.json()
    if (!response.ok) throw new Error(json.error ?? 'Failed to load admin data.')
    return json
  }

  useEffect(() => {
    let mounted = true

    async function loadData() {
      try {
        const json = await fetchAdminData()
        if (!mounted || !json) return
        setCustomers(json.customers ?? [])
        setRepairJobs(json.repairJobs ?? [])
        setPlans(json.plans ?? [])
        setNewJobCustomer(json.customers?.[0]?.id?.toString() ?? '')
      } catch (error) {
        if (!mounted) return
        setLoadError((error as Error).message)
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    loadData()

    return () => { mounted = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const refreshData = async () => {
    const json = await fetchAdminData()
    if (!json) return
    setCustomers(json.customers ?? [])
    setRepairJobs(json.repairJobs ?? [])
    setPlans(json.plans ?? [])
    if (!newJobCustomer && json.customers?.length) {
      setNewJobCustomer(json.customers[0].id.toString())
    }
  }

  const handleSignOut = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.push('/admin/login')
  }

  const handleCreateRepairJob = async (event: React.FormEvent) => {
    event.preventDefault()
    setNewJobError(null)
    setNewJobSuccess(null)

    if (!newJobEquipment.trim()) { setNewJobError('Equipment type is required.'); return }
    if (!newJobCustomer) { setNewJobError('Please select a customer.'); return }

    setNewJobSubmitting(true)

    const response = await fetch('/api/admin-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: newJobCustomer,
        equipment_type: newJobEquipment,
        status: newJobStatus,
        description: newJobIssue,
      }),
    })

    const json = await response.json()
    setNewJobSubmitting(false)

    if (!response.ok) { setNewJobError(json.error ?? 'Unable to create repair job.'); return }

    setNewJobSuccess('Repair job created successfully.')
    setNewJobEquipment('')
    setNewJobIssue('')
    setNewJobStatus('pending')
    await refreshData()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cafe-silver">
        <p className="text-cafe-steel">Loading admin data...</p>
      </div>
    )
  }

  const activePlanCount = plans.filter((plan) => plan.status === 'active').length
  const expiringSoonCount = plans.filter((plan) => plan.status === 'expiring_soon').length
  const inactivePlanCount = plans.filter((plan) => plan.status !== 'active' && plan.status !== 'expiring_soon').length

  const navItems = [
    { id: 'dashboard' as NavItem, label: 'Dashboard', icon: '📊' },
    { id: 'customers' as NavItem, label: 'Customers', icon: '👥' },
    { id: 'repair-jobs' as NavItem, label: 'Repair Jobs', icon: '🔧' },
    { id: 'maintenance-plans' as NavItem, label: 'Maintenance Plans', icon: '📋' },
  ]

  return (
    <div className="min-h-screen bg-cafe-silver flex">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-md flex flex-col transition-transform duration-200 md:relative md:translate-x-0 md:z-auto ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-cafe-navy">Admin Panel</h1>
            <p className="text-xs text-cafe-steel mt-1">Coffee Repair Co.</p>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden p-1 rounded-md text-cafe-steel hover:bg-cafe-silver"
            aria-label="Close menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveNav(item.id); setIsSidebarOpen(false) }}
              className={`w-full text-left px-4 py-2 rounded-md transition ${
                activeNav === item.id
                  ? 'bg-cafe-bronze/10 text-cafe-bronze font-medium'
                  : 'text-cafe-steel hover:bg-cafe-silver'
              }`}
            >
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </button>
          ))}
          <Link
            href="/admin/service-requests"
            onClick={() => setIsSidebarOpen(false)}
            className="flex w-full items-center px-4 py-2 rounded-md text-cafe-steel hover:bg-cafe-silver transition"
          >
            <span className="mr-2">📋</span>
            Service Requests
          </Link>
        </nav>

        <div className="p-4 border-t">
          <button
            onClick={handleSignOut}
            className="w-full py-2 px-3 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 sm:p-8 overflow-auto min-w-0">
        <div className="flex items-center gap-3 mb-6 md:hidden">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-md bg-white shadow text-cafe-navy hover:bg-cafe-silver transition"
            aria-label="Open menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-lg font-semibold text-cafe-navy">
            {navItems.find((item) => item.id === activeNav)?.label || 'Dashboard'}
          </span>
        </div>
        <div className="max-w-7xl mx-auto">
          <div className="hidden md:block mb-8">
            <h2 className="text-3xl font-semibold text-cafe-navy">
              {navItems.find((item) => item.id === activeNav)?.label || 'Dashboard'}
            </h2>
            <p className="text-cafe-steel mt-1">Manage your repair business operations</p>
          </div>

          {loadError ? (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-6">{loadError}</div>
          ) : null}

          {activeNav === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-sm text-cafe-steel">Total Customers</p>
                <p className="text-3xl font-semibold text-cafe-navy mt-2">{customers.length}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-sm text-cafe-steel">Total Repair Jobs</p>
                <p className="text-3xl font-semibold text-cafe-navy mt-2">{repairJobs.length}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-sm text-cafe-steel">Active Maintenance Plans</p>
                <p className="text-3xl font-semibold text-cafe-navy mt-2">{activePlanCount}</p>
              </div>
            </div>
          )}

          {activeNav === 'customers' && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b flex items-center justify-between">
                <h3 className="text-lg font-semibold text-cafe-navy">Customers</h3>
                <button className="px-4 py-2 bg-cafe-bronze text-white rounded-md hover:bg-[#a0632b]">
                  Add Customer
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-cafe-silver border-b">
                    <tr>
                      <th className="px-6 py-4 text-xs font-semibold text-cafe-navy uppercase">Name</th>
                      <th className="px-6 py-4 text-xs font-semibold text-cafe-navy uppercase">Email</th>
                      <th className="px-6 py-4 text-xs font-semibold text-cafe-navy uppercase">Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.length > 0 ? (
                      customers.map((customer) => (
                        <tr key={customer.id} className="border-b hover:bg-cafe-silver">
                          <td className="px-6 py-4 text-sm text-cafe-navy">{customer.full_name}</td>
                          <td className="px-6 py-4 text-sm text-cafe-steel">{customer.email}</td>
                          <td className="px-6 py-4 text-sm text-cafe-steel">{customer.phone}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-6 py-12 text-center text-cafe-steel">No customers found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeNav === 'repair-jobs' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-cafe-navy">Repair Jobs</h3>
                    <p className="text-sm text-cafe-steel">Add a new repair job and review current work.</p>
                  </div>
                </div>

                <form onSubmit={handleCreateRepairJob} className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-cafe-navy">Customer</label>
                    <select
                      value={newJobCustomer}
                      onChange={(event) => setNewJobCustomer(event.target.value)}
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="">Select a customer</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id.toString()}>{customer.full_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-cafe-navy">Equipment type</label>
                    <input
                      type="text"
                      value={newJobEquipment}
                      onChange={(event) => setNewJobEquipment(event.target.value)}
                      placeholder="e.g. Espresso machine"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-cafe-navy">Issue description</label>
                    <textarea
                      value={newJobIssue}
                      onChange={(event) => setNewJobIssue(event.target.value)}
                      rows={4}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="Describe the repair issue"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-cafe-navy">Status</label>
                    <select
                      value={newJobStatus}
                      onChange={(event) => setNewJobStatus(event.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={newJobSubmitting}
                      className="inline-flex justify-center rounded-md bg-cafe-bronze px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#a0632b] disabled:opacity-50"
                    >
                      {newJobSubmitting ? 'Saving…' : 'Create repair job'}
                    </button>
                  </div>
                </form>
                {newJobError && <p className="mt-4 text-sm text-red-600">{newJobError}</p>}
                {newJobSuccess && <p className="mt-4 text-sm text-green-600">{newJobSuccess}</p>}
              </div>

              <div className="bg-white rounded-lg shadow overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-cafe-silver border-b">
                    <tr>
                      <th className="px-6 py-4 text-xs font-semibold uppercase text-cafe-navy">Equipment</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase text-cafe-navy">Status</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase text-cafe-navy">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repairJobs.length > 0 ? (
                      repairJobs.map((job) => (
                        <tr key={job.id} className="border-b hover:bg-cafe-silver">
                          <td className="px-6 py-4 text-sm text-cafe-navy">{job.equipment_type}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                              job.status === 'completed' ? 'bg-green-100 text-green-800'
                              : job.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-[#F5F7FA] text-cafe-steel'
                            }`}>
                              {job.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-cafe-steel">
                            {job.created_at ? new Date(job.created_at).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-6 py-12 text-center text-cafe-steel">No repair jobs found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeNav === 'maintenance-plans' && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="border rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600">Active Plans</p>
                  <p className="mt-3 text-3xl font-semibold text-gray-900">{activePlanCount}</p>
                </div>
                <div className="border rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600">Expiring Soon</p>
                  <p className="mt-3 text-3xl font-semibold text-gray-900">{expiringSoonCount}</p>
                </div>
                <div className="border rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600">Inactive Plans</p>
                  <p className="mt-3 text-3xl font-semibold text-gray-900">{inactivePlanCount}</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-cafe-silver border-b">
                    <tr>
                      <th className="px-6 py-4 text-xs font-semibold uppercase text-cafe-navy">Plan</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase text-cafe-navy">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.length > 0 ? (
                      plans.map((plan) => (
                        <tr key={plan.id} className="border-b hover:bg-cafe-silver">
                          <td className="px-6 py-4 text-sm text-cafe-navy">{plan.plan_name ?? `Plan ${plan.id}`}</td>
                          <td className="px-6 py-4 text-sm text-cafe-steel capitalize">{plan.status.replace('_', ' ')}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className="px-6 py-12 text-center text-cafe-steel">No maintenance plans found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
