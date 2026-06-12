"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

type Customer = {
  id: number
  full_name: string
  email: string
  phone: string
  address: string
  street: string | null
  city: string | null
  state: string | null
  zip: string | null
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
  is_custom?: boolean
  stripe_payment_link?: string | null
}

const CUSTOM_PLAN_EMPTY = {
  plan_name: '',
  description: '',
  price: '',
  visit_frequency: '',
  notes: '',
}

const STATUS_BADGE: Record<string, string> = {
  active:          'bg-green-100 text-green-800',
  pending_payment: 'bg-amber-100 text-amber-800',
  inactive:        'bg-gray-100 text-gray-500',
  cancelled:       'bg-gray-100 text-gray-500',
}

const JOB_STATUS: Record<string, string> = {
  pending:     'bg-amber-100 text-amber-800',
  in_progress: 'bg-violet-100 text-violet-800',
  completed:   'bg-green-100 text-green-800',
}

export default function CustomerDetailPage() {
  const params = useParams() as { id?: string }
  const router = useRouter()
  const customerId = params.id

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
    street: '',
    city: '',
    state: '',
    zip: '',
  })

  // Custom plan modal state
  const [showCustomPlan, setShowCustomPlan] = useState(false)
  const [customPlanForm, setCustomPlanForm] = useState(CUSTOM_PLAN_EMPTY)
  const [customPlanFeatures, setCustomPlanFeatures] = useState<string[]>([])
  const [featureInput, setFeatureInput] = useState('')
  const [customPlanSaving, setCustomPlanSaving] = useState(false)
  const [customPlanError, setCustomPlanError] = useState<string | null>(null)

  useEffect(() => {
    if (!customerId) return
    let mounted = true

    async function loadCustomer() {
      const res = await fetch(`/api/admin/customers/${customerId}`)
      if (res.status === 401) { router.replace('/admin/login'); return }
      const json = await res.json()
      if (!mounted) return
      if (!res.ok) { setError(json.error ?? 'Unable to load customer details.'); setLoading(false); return }

      setCustomer(json.customer ?? null)
      setEquipment(json.equipment ?? [])
      setJobs(json.repairJobs ?? [])
      setPlan(json.plan ?? null)
      setContactForm({
        full_name: json.customer?.full_name ?? '',
        email:     json.customer?.email     ?? '',
        phone:     json.customer?.phone     ?? '',
        street:    json.customer?.street    ?? '',
        city:      json.customer?.city      ?? '',
        state:     json.customer?.state     ?? '',
        zip:       json.customer?.zip       ?? '',
      })
      setLoading(false)
    }

    loadCustomer()
    return () => { mounted = false }
  }, [customerId, router])

  const handleSave = async () => {
    if (!customerId || !customer) return
    setSaving(true)
    setError(null)
    setSaveMessage(null)

    const res = await fetch(`/api/admin/customers/${customerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contactForm),
    })
    const json = await res.json()
    setSaving(false)

    if (!res.ok) { setError(json.error ?? 'Unable to update contact details.'); return }

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
    if (!customerId) return
    if (!equipmentForm.equipment_type || !equipmentForm.brand || !equipmentForm.model) {
      setError('Equipment type, brand, and model are required.')
      return
    }

    setEquipmentSaving(true)
    setError(null)
    setSaveMessage(null)

    const res = await fetch(`/api/admin/customers/${customerId}/equipment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(equipmentForm),
    })
    const json = await res.json()
    setEquipmentSaving(false)

    if (!res.ok) { setError(json.error ?? 'Failed to add equipment.'); return }

    setEquipmentForm({ equipment_type: '', brand: '', model: '', serial_number: '' })
    setShowEquipmentForm(false)
    setSaveMessage('Equipment added successfully.')
    setEquipment((prev) => [...prev, json.equipment])
  }

  const openCustomPlanModal = () => {
    setCustomPlanForm({
      ...CUSTOM_PLAN_EMPTY,
      plan_name: customer ? `${customer.full_name} — Custom Plan` : '',
    })
    setCustomPlanFeatures([])
    setFeatureInput('')
    setCustomPlanError(null)
    setShowCustomPlan(true)
  }

  const addFeature = () => {
    const trimmed = featureInput.trim()
    if (trimmed) {
      setCustomPlanFeatures((prev) => [...prev, trimmed])
      setFeatureInput('')
    }
  }

  const handleCustomPlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerId) return
    setCustomPlanSaving(true)
    setCustomPlanError(null)

    const res = await fetch(`/api/admin/customers/${customerId}/custom-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan_name: customPlanForm.plan_name,
        description: customPlanForm.description || undefined,
        price: parseFloat(customPlanForm.price),
        visit_frequency: customPlanForm.visit_frequency ? parseInt(customPlanForm.visit_frequency, 10) : null,
        features: customPlanFeatures,
        notes: customPlanForm.notes || undefined,
      }),
    })
    const json = await res.json()
    setCustomPlanSaving(false)

    if (!res.ok) {
      setCustomPlanError(json.error ?? 'Failed to create custom plan.')
      return
    }

    setPlan(json.plan)
    setShowCustomPlan(false)
    setSaveMessage('Custom plan created and email sent to customer.')
  }

  return (
    <div className="min-h-screen bg-[#E8ECF0] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link href="/admin/customers" className="inline-flex items-center gap-1 text-sm font-medium text-[#7A8898] hover:text-[#0D1B2A] transition">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              Back
            </Link>
            <h1 className="mt-3 text-3xl font-semibold text-[#0D1B2A]">Customer details</h1>
            <p className="mt-2 text-sm text-[#7A8898]">Review contact info, equipment, repair history, and maintenance status.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditing((prev) => !prev)
              if (!editing && customer) {
                setContactForm({ full_name: customer.full_name, email: customer.email, phone: customer.phone, street: customer.street ?? '', city: customer.city ?? '', state: customer.state ?? '', zip: customer.zip ?? '' })
              }
            }}
            className="inline-flex items-center justify-center rounded-full bg-[#B87333] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            {editing ? 'Cancel edit' : 'Edit contact'}
          </button>
        </div>

        {error && <div className="mb-6 rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>}
        {saveMessage && <div className="mb-6 rounded-3xl border border-green-200 bg-green-50 p-5 text-sm text-green-700">{saveMessage}</div>}

        {loading ? (
          <div className="rounded-3xl border border-[#E8ECF0] bg-white p-8 shadow-sm">
            <p className="text-sm text-[#7A8898]">Loading customer details...</p>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1.4fr_0.9fr]">
            <div className="space-y-8">
              <section className="rounded-3xl border border-[#E8ECF0] bg-white p-8 shadow-sm">
                <div>
                  <h2 className="text-xl font-semibold text-[#0D1B2A]">Contact information</h2>
                  <p className="mt-2 text-sm text-[#7A8898]">Customer contact info and billing address.</p>
                </div>

                <div className="mt-8 grid gap-6 sm:grid-cols-2">
                  {editing ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-[#0D1B2A]">Full name</label>
                        <input value={contactForm.full_name} onChange={(e) => updateFormField('full_name', e.target.value)} className="mt-2 w-full rounded-2xl border border-[#E8ECF0] bg-[#E8ECF0] px-4 py-3 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#0D1B2A]">Email</label>
                        <input type="email" value={contactForm.email} onChange={(e) => updateFormField('email', e.target.value)} className="mt-2 w-full rounded-2xl border border-[#E8ECF0] bg-[#E8ECF0] px-4 py-3 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#0D1B2A]">Phone</label>
                        <input value={contactForm.phone} onChange={(e) => updateFormField('phone', e.target.value)} className="mt-2 w-full rounded-2xl border border-[#E8ECF0] bg-[#E8ECF0] px-4 py-3 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-[#0D1B2A]">Street Address</label>
                        <input value={contactForm.street} onChange={(e) => updateFormField('street', e.target.value)} placeholder="123 Main St" className="mt-2 w-full rounded-2xl border border-[#E8ECF0] bg-[#E8ECF0] px-4 py-3 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#0D1B2A]">City</label>
                        <input value={contactForm.city} onChange={(e) => updateFormField('city', e.target.value)} placeholder="Portland" className="mt-2 w-full rounded-2xl border border-[#E8ECF0] bg-[#E8ECF0] px-4 py-3 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-[#0D1B2A]">State</label>
                          <input value={contactForm.state} onChange={(e) => updateFormField('state', e.target.value)} placeholder="OR" maxLength={2} className="mt-2 w-full rounded-2xl border border-[#E8ECF0] bg-[#E8ECF0] px-4 py-3 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#0D1B2A]">ZIP</label>
                          <input value={contactForm.zip} onChange={(e) => updateFormField('zip', e.target.value)} placeholder="97201" maxLength={10} className="mt-2 w-full rounded-2xl border border-[#E8ECF0] bg-[#E8ECF0] px-4 py-3 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7A8898]">Name</p>
                        <p className="mt-3 text-sm text-[#0D1B2A]">{customer?.full_name || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7A8898]">Email</p>
                        <p className="mt-3 text-sm text-[#0D1B2A]">{customer?.email || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7A8898]">Phone</p>
                        <p className="mt-3 text-sm text-[#0D1B2A]">{customer?.phone || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7A8898]">Address</p>
                        {customer?.street || customer?.city ? (
                          <div className="mt-3 text-sm text-[#0D1B2A]">
                            {customer.street && <p>{customer.street}</p>}
                            <p>{[customer.city, [customer.state, customer.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ') || '—'}</p>
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-[#0D1B2A]">{customer?.address || '—'}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {editing ? (
                  <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
                    <button type="button" onClick={handleSave} disabled={saving} className="inline-flex items-center justify-center rounded-full bg-[#B87333] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50">
                      {saving ? 'Saving...' : 'Save changes'}
                    </button>
                    <button type="button" onClick={() => setEditing(false)} className="inline-flex items-center justify-center rounded-full border border-[#E8ECF0] bg-white px-6 py-3 text-sm font-semibold text-[#0D1B2A] transition hover:border-[#7A8898]">
                      Cancel
                    </button>
                  </div>
                ) : null}
              </section>

              <section className="rounded-3xl border border-[#E8ECF0] bg-white p-8 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-[#0D1B2A]">Equipment</h2>
                    <p className="mt-2 text-sm text-[#7A8898]">Equipment registered for this customer.</p>
                  </div>
                  <button type="button" onClick={() => setShowEquipmentForm((prev) => !prev)} className="inline-flex items-center gap-2 justify-center rounded-full bg-[#B87333] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90">
                    {showEquipmentForm ? (
                      <>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Cancel
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Add Equipment
                      </>
                    )}
                  </button>
                </div>

                {showEquipmentForm ? (
                  <form onSubmit={handleAddEquipment} className="mt-6 space-y-4 rounded-2xl border border-[#E8ECF0] bg-[#E8ECF0] p-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-[#0D1B2A]">Equipment type</label>
                        <input value={equipmentForm.equipment_type} onChange={(e) => updateEquipmentField('equipment_type', e.target.value)} placeholder="e.g., Espresso Machine" className="mt-2 w-full rounded-2xl border border-[#E8ECF0] bg-white px-4 py-3 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#0D1B2A]">Brand</label>
                        <input value={equipmentForm.brand} onChange={(e) => updateEquipmentField('brand', e.target.value)} placeholder="e.g., La Marzocco" className="mt-2 w-full rounded-2xl border border-[#E8ECF0] bg-white px-4 py-3 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#0D1B2A]">Model</label>
                        <input value={equipmentForm.model} onChange={(e) => updateEquipmentField('model', e.target.value)} placeholder="e.g., Linea Mini" className="mt-2 w-full rounded-2xl border border-[#E8ECF0] bg-white px-4 py-3 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#0D1B2A]">Serial number <span className="text-[#7A8898] font-normal">(optional)</span></label>
                        <input value={equipmentForm.serial_number} onChange={(e) => updateEquipmentField('serial_number', e.target.value)} placeholder="e.g., LM-12345" className="mt-2 w-full rounded-2xl border border-[#E8ECF0] bg-white px-4 py-3 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20" />
                      </div>
                    </div>
                    <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-end">
                      <button type="button" onClick={() => setShowEquipmentForm(false)} className="inline-flex items-center justify-center rounded-full border border-[#E8ECF0] bg-white px-6 py-3 text-sm font-semibold text-[#0D1B2A] transition hover:border-[#7A8898]">Cancel</button>
                      <button type="submit" disabled={equipmentSaving} className="inline-flex items-center justify-center rounded-full bg-[#B87333] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50">{equipmentSaving ? 'Saving...' : 'Save equipment'}</button>
                    </div>
                  </form>
                ) : null}

                <div className="mt-6 space-y-4">
                  {equipment.length > 0 ? (
                    equipment.map((item) => (
                      <div key={item.id} className="rounded-3xl border border-[#E8ECF0] bg-[#E8ECF0] p-5">
                        <p className="text-sm font-semibold text-[#0D1B2A]">{item.equipment_type}</p>
                        <p className="mt-2 text-sm text-[#7A8898]">{item.brand} {item.model}</p>
                        <p className="mt-1 text-xs text-[#7A8898]">Serial: {item.serial_number}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-3xl border-2 border-dashed border-[#B87333]/30 bg-[#B87333]/5 p-8 text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#B87333]/10">
                        <svg className="h-6 w-6 text-[#B87333]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18" />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-[#0D1B2A]">No equipment on file</p>
                      <p className="mt-1 text-xs text-[#7A8898]">Add this customer's equipment to start tracking repairs.</p>
                      {!showEquipmentForm && (
                        <button
                          type="button"
                          onClick={() => setShowEquipmentForm(true)}
                          className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#B87333] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                          Add Equipment
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-[#E8ECF0] bg-white p-8 shadow-sm">
                <div>
                  <h2 className="text-xl font-semibold text-[#0D1B2A]">Repair history</h2>
                  <p className="mt-2 text-sm text-[#7A8898]">Recent repair jobs for this customer.</p>
                </div>
                <div className="mt-6 space-y-4">
                  {jobs.length > 0 ? (
                    jobs.map((job) => (
                      <div key={job.id} className="rounded-3xl border border-[#E8ECF0] bg-[#E8ECF0] p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-[#0D1B2A]">{job.equipment_type}</p>
                            <p className="mt-1 text-sm text-[#7A8898]">{job.description}</p>
                          </div>
                          <div className={`rounded-full px-3 py-1 text-xs font-semibold ${JOB_STATUS[job.status] ?? 'bg-[#E8ECF0] text-[#0D1B2A]'}`}>
                            {job.status.replace('_', ' ')}
                          </div>
                        </div>
                        <p className="mt-3 text-xs uppercase tracking-[0.24em] text-[#7A8898]">{new Date(job.created_at).toLocaleDateString()}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-3xl border border-dashed border-[#E8ECF0] bg-[#E8ECF0] p-6 text-sm text-[#7A8898]">No repair jobs found for this customer.</div>
                  )}
                </div>
              </section>
            </div>

            <aside className="space-y-6">
              <section className="rounded-3xl border border-[#E8ECF0] bg-white p-8 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-[#0D1B2A]">Maintenance plan</h2>
                    <p className="mt-1 text-sm text-[#7A8898]">Current plan status and renewal info.</p>
                  </div>
                  {!plan && (
                    <button
                      type="button"
                      onClick={openCustomPlanModal}
                      className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-[#B87333] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Custom Plan
                    </button>
                  )}
                </div>

                {plan ? (
                  <div className="mt-6 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-[#0D1B2A]">{plan.plan_name}</p>
                          {plan.is_custom && (
                            <span className="inline-flex rounded-full bg-[#B87333]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#B87333]">
                              Custom
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm font-bold text-[#B87333]">${Number(plan.price).toFixed(2)}<span className="text-xs font-normal text-[#7A8898]">/mo</span></p>
                      </div>
                      <span className={`shrink-0 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_BADGE[plan.status] ?? 'bg-[#E8ECF0] text-[#7A8898]'}`}>
                        {plan.status === 'pending_payment' ? 'Pending' : plan.status}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm border-t border-[#E8ECF0] pt-3">
                      <div className="flex justify-between">
                        <span className="text-[#7A8898]">Renewal</span>
                        <span className="text-[#0D1B2A]">{plan.renewal_date ? new Date(plan.renewal_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
                      </div>
                    </div>
                    {plan.stripe_payment_link && plan.status === 'pending_payment' && (
                      <a
                        href={plan.stripe_payment_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#B87333] hover:underline"
                      >
                        View payment link ↗
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={openCustomPlanModal}
                      className="mt-3 w-full rounded-2xl border border-[#E8ECF0] px-4 py-2.5 text-xs font-semibold text-[#0D1B2A] hover:bg-[#E8ECF0] transition text-center"
                    >
                      Create new custom plan
                    </button>
                  </div>
                ) : (
                  <div className="mt-6 rounded-2xl border-2 border-dashed border-[#B87333]/30 bg-[#B87333]/5 p-6 text-center">
                    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#B87333]/10">
                      <svg className="h-5 w-5 text-[#B87333]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-[#0D1B2A]">No plan assigned</p>
                    <p className="mt-1 text-xs text-[#7A8898]">Create a custom plan tailored to this customer.</p>
                    <button
                      type="button"
                      onClick={openCustomPlanModal}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#B87333] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Create Custom Plan
                    </button>
                  </div>
                )}
              </section>
            </aside>
          </div>
        )}
      </div>

      {/* Custom Plan Modal */}
      {showCustomPlan && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCustomPlan(false)} />
          <div className="relative z-10 w-full sm:max-w-xl bg-white sm:rounded-2xl shadow-xl flex flex-col max-h-[92dvh] sm:max-h-[90vh] rounded-t-2xl">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8ECF0] shrink-0">
              <div>
                <h2 className="text-base font-bold text-[#0D1B2A]">Create Custom Plan</h2>
                <p className="text-xs text-[#7A8898] mt-0.5">
                  Creates a Stripe product + payment link and emails the customer.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomPlan(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-[#7A8898] hover:bg-[#E8ECF0] hover:text-[#0D1B2A] transition"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto flex-1 px-6 py-5">
              <form id="custom-plan-form" onSubmit={handleCustomPlanSubmit} className="space-y-4">

                <div>
                  <label className="block text-sm font-semibold text-[#0D1B2A] mb-1.5">Plan Name *</label>
                  <input
                    required
                    value={customPlanForm.plan_name}
                    onChange={(e) => setCustomPlanForm((f) => ({ ...f, plan_name: e.target.value }))}
                    placeholder="e.g. Santos Espresso Bar — Custom Plan"
                    className="block w-full rounded-xl border border-[#E8ECF0] px-4 py-3 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#0D1B2A] mb-1.5">Description</label>
                  <textarea
                    rows={2}
                    value={customPlanForm.description}
                    onChange={(e) => setCustomPlanForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Brief description shown to the customer…"
                    className="block w-full rounded-xl border border-[#E8ECF0] px-4 py-3 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#0D1B2A] mb-1.5">Monthly Price ($) *</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#7A8898]">$</span>
                      <input
                        required
                        type="number"
                        min="0.50"
                        step="0.01"
                        inputMode="decimal"
                        value={customPlanForm.price}
                        onChange={(e) => setCustomPlanForm((f) => ({ ...f, price: e.target.value }))}
                        placeholder="0.00"
                        className="block w-full rounded-xl border border-[#E8ECF0] pl-7 pr-4 py-3 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#0D1B2A] mb-1.5">Visits / Month</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      inputMode="numeric"
                      value={customPlanForm.visit_frequency}
                      onChange={(e) => setCustomPlanForm((f) => ({ ...f, visit_frequency: e.target.value }))}
                      placeholder="e.g. 2"
                      className="block w-full rounded-xl border border-[#E8ECF0] px-4 py-3 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                    />
                  </div>
                </div>

                {/* Features list */}
                <div>
                  <label className="block text-sm font-semibold text-[#0D1B2A] mb-1.5">Features</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={featureInput}
                      onChange={(e) => setFeatureInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFeature() } }}
                      placeholder="e.g. Priority scheduling"
                      className="flex-1 rounded-xl border border-[#E8ECF0] px-4 py-2.5 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                    />
                    <button
                      type="button"
                      onClick={addFeature}
                      className="shrink-0 rounded-xl bg-[#E8ECF0] px-4 py-2.5 text-sm font-semibold text-[#0D1B2A] hover:bg-[#d0d4d8] transition"
                    >
                      Add
                    </button>
                  </div>
                  {customPlanFeatures.length > 0 && (
                    <ul className="space-y-1.5">
                      {customPlanFeatures.map((f, i) => (
                        <li key={i} className="flex items-center justify-between gap-2 rounded-xl bg-[#E8ECF0] px-3 py-2">
                          <span className="text-sm text-[#0D1B2A] flex items-center gap-1.5">
                            <span className="text-[#B87333]">•</span> {f}
                          </span>
                          <button
                            type="button"
                            onClick={() => setCustomPlanFeatures((prev) => prev.filter((_, j) => j !== i))}
                            className="shrink-0 text-[#7A8898] hover:text-red-600 transition"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#0D1B2A] mb-1.5">Notes <span className="font-normal text-[#7A8898]">(admin only)</span></label>
                  <textarea
                    rows={2}
                    value={customPlanForm.notes}
                    onChange={(e) => setCustomPlanForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Internal notes about this plan…"
                    className="block w-full rounded-xl border border-[#E8ECF0] px-4 py-3 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20 resize-none"
                  />
                </div>

                {customPlanError && (
                  <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{customPlanError}</p>
                )}
              </form>
            </div>

            {/* Modal footer */}
            <div className="shrink-0 flex gap-3 px-6 py-4 border-t border-[#E8ECF0] bg-[#E8ECF0] rounded-b-2xl">
              <button
                type="submit"
                form="custom-plan-form"
                disabled={customPlanSaving}
                className="flex-1 rounded-xl bg-[#B87333] px-5 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition"
              >
                {customPlanSaving ? 'Creating plan…' : 'Create Plan & Send Email'}
              </button>
              <button
                type="button"
                onClick={() => setShowCustomPlan(false)}
                className="flex-1 rounded-xl border border-[#E8ECF0] px-5 py-3 text-sm font-semibold text-[#0D1B2A] hover:bg-[#E8ECF0] transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
