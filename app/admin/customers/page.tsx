"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Customer = {
  id: number | string
  full_name: string
  email: string
  phone: string
  address: string
  street: string | null
  city: string | null
  state: string | null
  zip: string | null
}

export default function CustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [addrState, setAddrState] = useState('')
  const [zip, setZip] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | string | null>(null)

  const fetchCustomers = async () => {
    const res = await fetch('/api/admin/customers')
    if (res.status === 401) { router.replace('/admin/login'); return }
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Unable to load customers.'); return }
    setCustomers(json.customers ?? [])
  }

  useEffect(() => {
    let mounted = true
    fetchCustomers().finally(() => { if (mounted) setIsLoading(false) })
    return () => { mounted = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddCustomer = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setSaveMessage(null)

    if (!fullName || !email || !phone || !street || !city) {
      setError('Name, email, phone, street address, and city are required.')
      return
    }

    setSaving(true)
    const res = await fetch('/api/admin/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: fullName, email, phone, street, city, state: addrState, zip }),
    })
    const json = await res.json()
    setSaving(false)

    if (!res.ok) { setError(json.error ?? 'Failed to add customer.'); return }

    setFullName('')
    setEmail('')
    setPhone('')
    setStreet('')
    setCity('')
    setAddrState('')
    setZip('')
    setShowForm(false)
    setSaveMessage('Customer added successfully.')
    await fetchCustomers()
  }

  const handleDelete = async (id: number | string) => {
    const res = await fetch(`/api/admin/customers/${id}`, { method: 'DELETE' })
    const json = await res.json()

    if (!res.ok) { setError(json.error ?? 'Unable to delete customer.'); return }

    setSaveMessage('Customer deleted successfully.')
    await fetchCustomers()
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-10 max-w-7xl mx-auto w-full">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Customers</h1>
            <p className="text-sm text-gray-500 mt-1">Manage customer records and address info.</p>
          </div>
          <button
            onClick={() => setShowForm((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-md bg-[#B87333] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#a0632b]"
          >
            {showForm ? 'Hide form' : 'Add customer'}
          </button>
        </div>

        {saveMessage && <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{saveMessage}</div>}
        {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {showForm && (
          <div className="mb-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">New customer</h2>
            <form onSubmit={handleAddCustomer} className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Full name</label>
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="mt-2 block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                  placeholder="jane@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="mt-2 block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                  placeholder="(123) 456-7890"
                />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Street Address</label>
                <input
                  value={street}
                  onChange={(event) => setStreet(event.target.value)}
                  className="mt-2 block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                  placeholder="123 Main St"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">City</label>
                <input
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  className="mt-2 block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                  placeholder="Portland"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">State</label>
                  <input
                    value={addrState}
                    onChange={(event) => setAddrState(event.target.value)}
                    maxLength={2}
                    className="mt-2 block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                    placeholder="OR"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">ZIP Code</label>
                  <input
                    value={zip}
                    onChange={(event) => setZip(event.target.value)}
                    maxLength={10}
                    className="mt-2 block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                    placeholder="97201"
                  />
                </div>
              </div>
              <div className="lg:col-span-2 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-xl bg-[#B87333] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#a0632b] disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save customer'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">Customer list</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[#0D1B2A]">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[#0D1B2A]">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[#0D1B2A]">Phone</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[#0D1B2A]">Address</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-[#0D1B2A]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {isLoading ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">Loading customers...</td></tr>
                ) : customers.length > 0 ? (
                  customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-[#F5F7FA] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <Link href={`/admin/customers/${customer.id}`} className="text-[#B87333] hover:text-[#a0632b]">
                          {customer.full_name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{customer.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{customer.phone}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {customer.street || customer.city
                          ? [customer.street, [customer.city, [customer.state, customer.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')].filter(Boolean).join(', ')
                          : customer.address || '—'}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        {confirmDeleteId === customer.id ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="text-xs text-[#0D1B2A] font-medium">Are you sure?</span>
                            <button
                              onClick={() => { handleDelete(customer.id); setConfirmDeleteId(null) }}
                              className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 transition"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="rounded-full border border-[#7A8898] px-3 py-1 text-xs font-semibold text-[#7A8898] hover:bg-[#F4F6F9] transition"
                            >
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2">
                            <Link
                              href={`/admin/customers/${customer.id}`}
                              className="rounded-full bg-[#B87333] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#a0632b] transition"
                            >
                              View
                            </Link>
                            <button
                              onClick={() => setConfirmDeleteId(customer.id)}
                              className="rounded-full border border-[#7A8898] px-3 py-1.5 text-xs font-semibold text-[#7A8898] hover:bg-[#F4F6F9] transition"
                            >
                              Delete
                            </button>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">No customers found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
