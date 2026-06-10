"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../supabase'

type Customer = {
  id: number
  full_name: string
  email: string
  phone: string
  address: string
}

type Equipment = {
  id: number
  equipment_type: string
  brand: string
  model: string
  serial_number: string
}

type RepairJob = {
  id: number
  equipment_type: string
  status: string
  description: string
  created_at: string
}

type Plan = {
  id: number
  plan_name: string
  status: string
  price: number
  renewal_date: string | null
}

export default function CustomerDetailPage() {
  const params = useParams() as { id?: string }
  const router = useRouter()
  const customerId = params.id

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [jobs, setJobs] = useState<RepairJob[]>([])
  const [plan, setPlan] = useState<Plan | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [showEquipmentForm, setShowEquipmentForm] = useState(false)
  const [equipmentSaving, setEquipmentSaving] = useState(false)
  const [equipmentForm, setEquipmentForm] = useState({
    equipment_type: '',
    brand: '',
    model: '',
    serial_number: '',
  })
  const [contactForm, setContactForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
  })

  useEffect(() => {
    let mounted = true

    async function loadCustomer() {
      if (!customerId) {
        return
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!mounted) return
      if (!session?.user || !session.access_token) {
        router.replace('/login')
        return
      }

      setSessionToken(session.access_token)

      const res = await fetch(`/api/admin/customers/${customerId}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })
      const json = await res.json()

      if (!mounted) return
      if (!res.ok) {
        setError(json.error ?? 'Unable to load customer details.')
        setLoading(false)
        return
      }

      setCustomer(json.customer ?? null)
      setEquipment(json.equipment ?? [])
      setJobs(json.repairJobs ?? [])
      setPlan(json.plan ?? null)
      setContactForm({
        full_name: json.customer?.full_name ?? '',
        email: json.customer?.email ?? '',
        phone: json.customer?.phone ?? '',
        address: json.customer?.address ?? '',
      })
      setLoading(false)
    }

    loadCustomer()

    return () => {
      mounted = false
    }
  }, [customerId, router])

  const handleSave = async () => {
    if (!sessionToken || !customerId) return
    if (!customer) return

    setSaving(true)
    setError(null)
    setSaveMessage(null)

    const res = await fetch(`/api/admin/customers/${customerId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(contactForm),
    })
    const json = await res.json()
    setSaving(false)

    if (!res.ok) {
      setError(json.error ?? 'Unable to update contact details.')
      return
    }

    setCustomer(json.customer)
    setEditing(false)
    setSaveMessage('Customer contact info updated.')
  }

  const updateFormField = (field: keyof typeof contactForm, value: string) => {
    setContactForm((current) => ({ ...current, [field]: value }))
  }

  const updateEquipmentField = (field: keyof typeof equipmentForm, value: string) => {
    setEquipmentForm((current) => ({ ...current, [field]: value }))
  }

  const handleAddEquipment = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!sessionToken || !customerId) return
    if (!equipmentForm.equipment_type || !equipmentForm.brand || !equipmentForm.model || !equipmentForm.serial_number) {
      setError('All equipment fields are required.')
      return
    }

    setEquipmentSaving(true)
    setError(null)
    setSaveMessage(null)

    const res = await fetch(`/api/admin/customers/${customerId}/equipment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(equipmentForm),
    })
    const json = await res.json()
    setEquipmentSaving(false)

    if (!res.ok) {
      setError(json.error ?? 'Failed to add equipment.')
      return
    }

    setEquipmentForm({
      equipment_type: '',
      brand: '',
      model: '',
      serial_number: '',
    })
    setShowEquipmentForm(false)
    setSaveMessage('Equipment added successfully.')
    setEquipment((prev) => [...prev, json.equipment])
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link href="/admin/customers" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
              ← Back to customers
            </Link>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900">Customer details</h1>
            <p className="mt-2 text-sm text-slate-600">Review contact info, equipment, repair history, and maintenance status.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditing((prev) => !prev)
              if (!editing && customer) {
                setContactForm({
                  full_name: customer.full_name,
                  email: customer.email,
                  phone: customer.phone,
                  address: customer.address,
                })
              }
            }}
            className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            {editing ? 'Cancel edit' : 'Edit contact'}
          </button>
        </div>

        {error && <div className="mb-6 rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>}
        {saveMessage && <div className="mb-6 rounded-3xl border border-green-200 bg-green-50 p-5 text-sm text-green-700">{saveMessage}</div>}

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm text-slate-500">Loading customer details...</p>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1.4fr_0.9fr]">
            <div className="space-y-8">
              <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Contact information</h2>
                    <p className="mt-2 text-sm text-slate-600">Customer contact info and billing address.</p>
                  </div>
                </div>

                <div className="mt-8 grid gap-6 sm:grid-cols-2">
                  {editing ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Full name</label>
                        <input
                          value={contactForm.full_name}
                          onChange={(event) => updateFormField('full_name', event.target.value)}
                          className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Email</label>
                        <input
                          type="email"
                          value={contactForm.email}
                          onChange={(event) => updateFormField('email', event.target.value)}
                          className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Phone</label>
                        <input
                          value={contactForm.phone}
                          onChange={(event) => updateFormField('phone', event.target.value)}
                          className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-slate-700">Address</label>
                        <input
                          value={contactForm.address}
                          onChange={(event) => updateFormField('address', event.target.value)}
                          className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Name</p>
                        <p className="mt-3 text-sm text-slate-900">{customer?.full_name || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Email</p>
                        <p className="mt-3 text-sm text-slate-900">{customer?.email || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Phone</p>
                        <p className="mt-3 text-sm text-slate-900">{customer?.phone || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Address</p>
                        <p className="mt-3 text-sm text-slate-900">{customer?.address || '—'}</p>
                      </div>
                    </div>
                  )}
                </div>

                {editing ? (
                  <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save changes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                    >
                      Cancel
                    </button>
                  </div>
                ) : null}
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Equipment</h2>
                    <p className="mt-2 text-sm text-slate-600">Equipment registered for this customer.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowEquipmentForm((prev) => !prev)}
                    className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
                  >
                    {showEquipmentForm ? 'Hide form' : 'Add equipment'}
                  </button>
                </div>

                {showEquipmentForm ? (
                  <form onSubmit={handleAddEquipment} className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Equipment type</label>
                        <input
                          value={equipmentForm.equipment_type}
                          onChange={(event) => updateEquipmentField('equipment_type', event.target.value)}
                          placeholder="e.g., Espresso Machine"
                          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Brand</label>
                        <input
                          value={equipmentForm.brand}
                          onChange={(event) => updateEquipmentField('brand', event.target.value)}
                          placeholder="e.g., La Marzocco"
                          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Model</label>
                        <input
                          value={equipmentForm.model}
                          onChange={(event) => updateEquipmentField('model', event.target.value)}
                          placeholder="e.g., Linea Mini"
                          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Serial number</label>
                        <input
                          value={equipmentForm.serial_number}
                          onChange={(event) => updateEquipmentField('serial_number', event.target.value)}
                          placeholder="e.g., LM-12345"
                          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={() => setShowEquipmentForm(false)}
                        className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={equipmentSaving}
                        className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
                      >
                        {equipmentSaving ? 'Saving...' : 'Save equipment'}
                      </button>
                    </div>
                  </form>
                ) : null}

                <div className="mt-6 space-y-4">
                  {equipment.length > 0 ? (
                    equipment.map((item) => (
                      <div key={item.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                        <p className="text-sm font-semibold text-slate-900">{item.equipment_type}</p>
                        <p className="mt-2 text-sm text-slate-600">{item.brand} {item.model}</p>
                        <p className="mt-1 text-xs text-slate-500">Serial: {item.serial_number}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                      No equipment records found for this customer.
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Repair history</h2>
                    <p className="mt-2 text-sm text-slate-600">Recent repair jobs for this customer.</p>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {jobs.length > 0 ? (
                    jobs.map((job) => (
                      <div key={job.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{job.equipment_type}</p>
                            <p className="mt-1 text-sm text-slate-600">{job.description}</p>
                          </div>
                          <div className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                            {job.status}
                          </div>
                        </div>
                        <p className="mt-3 text-xs uppercase tracking-[0.24em] text-slate-500">{new Date(job.created_at).toLocaleDateString()}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                      No repair jobs found for this customer.
                    </div>
                  )}
                </div>
              </section>
            </div>

            <aside className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900">Maintenance plan</h2>
                <p className="mt-2 text-sm text-slate-600">Current plan status and renewal information.</p>
                <div className="mt-6 space-y-4 text-sm text-slate-700">
                  {plan ? (
                    <>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{plan.plan_name}</p>
                        <p className="mt-1 text-slate-600">Status: {plan.status}</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Price</p>
                        <p className="mt-1 text-slate-600">${plan.price.toFixed(2)} / month</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Renewal</p>
                        <p className="mt-1 text-slate-600">{plan.renewal_date ? new Date(plan.renewal_date).toLocaleDateString() : 'Not scheduled'}</p>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">No maintenance plan is currently assigned.</p>
                  )}
                </div>
              </section>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}
