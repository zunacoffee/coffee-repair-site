"use client"

import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

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

function CustomersPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
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
  const [search, setSearch] = useState('')

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

  useEffect(() => {
    const name  = searchParams.get('name')
    const email = searchParams.get('email')
    if (name || email) {
      if (name)  setFullName(name)
      if (email) setEmail(email)
      setShowForm(true)
    }
  }, [searchParams])

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

  function formatPhone(phone: string | null) {
    if (!phone) return '—'
    const digits = phone.replace(/\D/g, '')
    if (digits.length === 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
    return phone
  }

  const filteredCustomers = customers.filter(c =>
    search === '' ||
    (c.full_name?.toLowerCase().includes(search.toLowerCase())) ||
    (c.email?.toLowerCase().includes(search.toLowerCase())) ||
    (c.phone?.includes(search))
  )

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-10 max-w-7xl mx-auto w-full">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-[#0D1B2A]">Customers</h1>
            <p className="text-sm text-[#7A8898] mt-1">Manage customer records and address info.</p>
          </div>
          <button
            onClick={() => setShowForm((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-xl bg-[#B87333] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90"
          >
            {showForm ? 'Hide form' : 'Add customer'}
          </button>
        </div>

        {saveMessage && <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{saveMessage}</div>}
        {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {showForm && (
          <div className="mb-8 rounded-2xl border border-[#E8ECF0] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#0D1B2A] mb-4">New customer</h2>
            <form onSubmit={handleAddCustomer} className="grid gap-4 lg:grid-cols-2">
              <div>
                <label htmlFor="newcust-fullname" className="block text-sm font-medium text-[#7A8898]">Full name</label>
                <input
                  id="newcust-fullname"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="mt-2 block w-full rounded-xl border border-[#E8ECF0] bg-white px-4 py-3 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <label htmlFor="newcust-email" className="block text-sm font-medium text-[#7A8898]">Email</label>
                <input
                  id="newcust-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 block w-full rounded-xl border border-[#E8ECF0] bg-white px-4 py-3 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                  placeholder="jane@example.com"
                />
              </div>
              <div>
                <label htmlFor="newcust-phone" className="block text-sm font-medium text-[#7A8898]">Phone</label>
                <input
                  id="newcust-phone"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="mt-2 block w-full rounded-xl border border-[#E8ECF0] bg-white px-4 py-3 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                  placeholder="(123) 456-7890"
                />
              </div>
              <div className="lg:col-span-2">
                <label htmlFor="newcust-street" className="block text-sm font-medium text-[#7A8898]">Street Address</label>
                <input
                  id="newcust-street"
                  value={street}
                  onChange={(event) => setStreet(event.target.value)}
                  className="mt-2 block w-full rounded-xl border border-[#E8ECF0] bg-white px-4 py-3 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                  placeholder="123 Main St"
                />
              </div>
              <div>
                <label htmlFor="newcust-city" className="block text-sm font-medium text-[#7A8898]">City</label>
                <input
                  id="newcust-city"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  className="mt-2 block w-full rounded-xl border border-[#E8ECF0] bg-white px-4 py-3 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                  placeholder="Portland"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="newcust-state" className="block text-sm font-medium text-[#7A8898]">State</label>
                  <input
                    id="newcust-state"
                    value={addrState}
                    onChange={(event) => setAddrState(event.target.value)}
                    maxLength={2}
                    className="mt-2 block w-full rounded-xl border border-[#E8ECF0] bg-white px-4 py-3 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                    placeholder="OR"
                  />
                </div>
                <div>
                  <label htmlFor="newcust-zip" className="block text-sm font-medium text-[#7A8898]">ZIP Code</label>
                  <input
                    id="newcust-zip"
                    value={zip}
                    onChange={(event) => setZip(event.target.value)}
                    maxLength={10}
                    className="mt-2 block w-full rounded-xl border border-[#E8ECF0] bg-white px-4 py-3 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                    placeholder="97201"
                  />
                </div>
              </div>
              <div className="lg:col-span-2 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-xl bg-[#B87333] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save customer'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="md:hidden bg-white rounded-2xl border border-[#E8ECF0] shadow-sm divide-y divide-[#E8ECF0]">
          {isLoading ? (
            <p className="px-4 py-8 text-center text-sm text-[#7A8898]">Loading customers…</p>
          ) : filteredCustomers.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[#7A8898]">No customers found.</p>
          ) : filteredCustomers.map((customer) => (
            <Link
              key={customer.id}
              href={`/admin/customers/${customer.id}`}
              className="flex items-center gap-3 px-4 py-4 hover:bg-[#E8ECF0] transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#B87333] truncate">{customer.full_name}</p>
                <p className="text-xs text-[#7A8898] truncate mt-0.5">{customer.email}</p>
                <p className="text-xs text-[#7A8898] mt-0.5">{formatPhone(customer.phone)}</p>
              </div>
              <svg className="h-4 w-4 shrink-0 text-[#7A8898]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>

        <div className="hidden md:block">
        <div className="overflow-hidden rounded-2xl border border-[#E8ECF0] bg-white shadow-sm">
          <div className="flex items-center justify-between px-[18px] py-[14px] border-b border-[#E8ECF0] sticky top-0 z-10 bg-white">
            <span className="text-sm font-semibold text-[#0D1B2A]">Customer list</span>
            <div className="flex items-center gap-2 bg-[#E8ECF0] border border-[#E8ECF0] rounded-xl px-3 py-1.5 w-64">
              <svg className="h-4 w-4 text-[#7A8898] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customers…"
                className="bg-transparent text-sm text-[#0D1B2A] placeholder-[#7A8898] outline-none w-full"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#E8ECF0]">
              <thead className="bg-[#0D1B2A]">
                <tr>
                  <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-white">Name</th>
                  <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-white">Email</th>
                  <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-white">Phone</th>
                  <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-white">Address</th>
                  <th className="px-6 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-white">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8ECF0] bg-white">
                {isLoading ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-[#7A8898]">Loading customers...</td></tr>
                ) : filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-[#E8ECF0] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#0D1B2A]">
                        <Link href={`/admin/customers/${customer.id}`} className="text-[#B87333] hover:opacity-90">
                          {customer.full_name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#7A8898]">{customer.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#7A8898]">{formatPhone(customer.phone)}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-[#7A8898]">
                        {customer.street || customer.city
                          ? [customer.street, [customer.city, [customer.state, customer.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')].filter(Boolean).join(', ')
                          : customer.address || '—'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
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
                              className="rounded-full border border-[#7A8898] px-3 py-1 text-xs font-semibold text-[#7A8898] hover:bg-[#E8ECF0] transition"
                            >
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2">
                            <Link
                              href={`/admin/customers/${customer.id}`}
                              className="rounded-full bg-[#B87333] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition"
                            >
                              View
                            </Link>
                            <button
                              onClick={() => setConfirmDeleteId(customer.id)}
                              className="rounded-full border border-[#7A8898] px-3 py-1.5 text-xs font-semibold text-[#7A8898] hover:bg-[#E8ECF0] transition"
                            >
                              Delete
                            </button>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-[#7A8898]">No customers found.</td></tr>
                )}
              </tbody>
          </table>
          </div>
        </div>
        </div>
    </div>
  )
}

export default function CustomersPage() {
  return (
    <Suspense>
      <CustomersPageInner />
    </Suspense>
  )
}
