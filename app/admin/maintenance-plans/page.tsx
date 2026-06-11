"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

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
}

export default function MaintenancePlansPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [plans, setPlans] = useState<MaintenancePlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [customerId, setCustomerId] = useState('')
  const [planName, setPlanName] = useState('')
  const [status, setStatus] = useState('active')
  const [price, setPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const fetchData = async () => {
    const [customersRes, plansRes] = await Promise.all([
      fetch('/api/admin/customers'),
      fetch('/api/admin/maintenance-plans'),
    ])

    if (customersRes.status === 401 || plansRes.status === 401) {
      router.replace('/admin/login')
      return
    }

    const customersJson = await customersRes.json()
    const plansJson = await plansRes.json()

    if (!customersRes.ok) { setError(customersJson.error ?? 'Unable to load customers.'); return }
    if (!plansRes.ok) { setError(plansJson.error ?? 'Unable to load plans.'); return }

    setCustomers(customersJson.customers ?? [])
    setPlans(plansJson.plans ?? [])
    setCustomerId((customersJson.customers?.[0]?.id?.toString() as string) ?? '')
  }

  useEffect(() => {
    let mounted = true
    fetchData().finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreatePlan = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setMessage(null)

    if (!customerId || !planName.trim() || !status || !price.trim()) {
      setError('Please fill in all fields.')
      return
    }

    const numericPrice = Number(price)
    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      setError('Enter a valid price.')
      return
    }

    setSaving(true)
    const res = await fetch('/api/admin/maintenance-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_id: customerId, plan_name: planName, status, price: numericPrice }),
    })
    const json = await res.json()
    setSaving(false)

    if (!res.ok) { setError(json.error ?? 'Failed to create maintenance plan.'); return }

    setPlanName('')
    setStatus('active')
    setPrice('')
    setMessage('Maintenance plan created successfully.')
    setShowForm(false)
    await fetchData()
  }

  const findCustomerName = (id: number | string) =>
    customers.find((c) => c.id.toString() === id.toString())?.full_name ?? 'Unknown'

  return (
    <div className="py-8 px-4 lg:px-10 max-w-7xl mx-auto w-full">
      <div>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Maintenance Plans</h1>
            <p className="text-sm text-gray-500 mt-1">Manage customer maintenance subscriptions.</p>
          </div>
          <button
            onClick={() => setShowForm((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-md bg-[#B87333] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#a0632b]"
          >
            {showForm ? 'Close form' : 'Create maintenance plan'}
          </button>
        </div>

        {message && <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}
        {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {showForm && (
          <div className="mb-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">New Maintenance Plan</h2>
            <form onSubmit={handleCreatePlan} className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Customer</label>
                <select
                  value={customerId}
                  onChange={(event) => setCustomerId(event.target.value)}
                  className="mt-2 block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                >
                  <option value="">Select a customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id.toString()}>{customer.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Plan name</label>
                <input
                  value={planName}
                  onChange={(event) => setPlanName(event.target.value)}
                  className="mt-2 block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                  placeholder="Premium maintenance"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="mt-2 block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Price</label>
                <div className="mt-2 flex rounded-xl border border-gray-300 bg-white shadow-sm focus-within:border-[#B87333] focus-within:ring-2 focus-within:ring-[#B87333]/20">
                  <span className="inline-flex items-center px-3 text-sm text-gray-500">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    className="block w-full rounded-r-xl border-0 bg-transparent px-4 py-3 text-sm text-gray-900 focus:outline-none"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="lg:col-span-2 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-xl bg-[#B87333] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#a0632b] disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Create plan'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">Maintenance plans</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Customer</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Plan name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Price</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Renewal date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">Loading maintenance plans...</td></tr>
                ) : plans.length > 0 ? (
                  plans.map((plan) => (
                    <tr key={plan.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{findCustomerName(plan.customer_id)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{plan.plan_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          plan.status === 'active' ? 'bg-green-100 text-green-800'
                          : plan.status === 'inactive' ? 'bg-gray-100 text-gray-800'
                          : 'bg-red-100 text-red-800'
                        }`}>
                          {plan.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${plan.price.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {plan.renewal_date ? new Date(plan.renewal_date).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">No maintenance plans found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
