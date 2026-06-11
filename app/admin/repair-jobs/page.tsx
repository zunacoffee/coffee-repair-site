"use client"

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type Customer = {
  id: number | string
  full_name: string
}

type Equipment = {
  id: number
  equipment_type: string
  brand: string
  model: string
  serial_number: string
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

export default function RepairJobsPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [repairJobs, setRepairJobs] = useState<RepairJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [customerId, setCustomerId] = useState<string>('')
  const [customerEquipment, setCustomerEquipment] = useState<Equipment[]>([])
  const [equipmentSelection, setEquipmentSelection] = useState<string>('')
  const [equipmentType, setEquipmentType] = useState('')
  const [showInlineEquipment, setShowInlineEquipment] = useState(false)
  const [inlineEquipment, setInlineEquipment] = useState({ equipment_type: '', brand: '', model: '', serial_number: '' })
  const [inlineSaving, setInlineSaving] = useState(false)
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('pending')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [updatingJobId, setUpdatingJobId] = useState<string | number | null>(null)
  const [notesDrafts, setNotesDrafts] = useState<Record<string, string>>({})
  const notesOriginals = useRef<Record<string, string>>({})

  const fetchRepairData = async () => {
    const res = await fetch('/api/admin-data')
    if (res.status === 401) { router.replace('/admin/login'); return }
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Unable to load repair jobs.'); return }
    setCustomers(json.customers ?? [])
    setRepairJobs(json.repairJobs ?? [])
    setCustomerId((json.customers?.[0]?.id?.toString() as string) ?? '')
  }

  useEffect(() => {
    let mounted = true
    fetchRepairData().finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!customerId) { setCustomerEquipment([]); setEquipmentSelection(''); setEquipmentType(''); return }
    fetch(`/api/admin/customers/${customerId}/equipment`)
      .then((r) => r.json())
      .then((j) => {
        setCustomerEquipment(j.equipment ?? [])
        setEquipmentSelection('')
        setEquipmentType('')
        setShowInlineEquipment(false)
      })
      .catch(() => {})
  }, [customerId])

  const handleEquipmentSelection = (value: string) => {
    setEquipmentSelection(value)
    if (value === '__add_new__') {
      setShowInlineEquipment(true)
      setEquipmentType('')
    } else {
      setShowInlineEquipment(false)
      const eq = customerEquipment.find((e) => e.id.toString() === value)
      setEquipmentType(eq ? eq.equipment_type : '')
    }
  }

  const handleSaveInlineEquipment = async () => {
    if (!customerId) return
    const { equipment_type, brand, model, serial_number } = inlineEquipment
    if (!equipment_type || !brand || !model) {
      setError('Equipment type, brand, and model are required.')
      return
    }
    setInlineSaving(true)
    setError(null)
    const res = await fetch(`/api/admin/customers/${customerId}/equipment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inlineEquipment),
    })
    const json = await res.json()
    setInlineSaving(false)
    if (!res.ok) { setError(json.error ?? 'Failed to add equipment.'); return }
    const newEq: Equipment = json.equipment
    setCustomerEquipment((prev) => [newEq, ...prev])
    setEquipmentSelection(newEq.id.toString())
    setEquipmentType(newEq.equipment_type)
    setShowInlineEquipment(false)
    setInlineEquipment({ equipment_type: '', brand: '', model: '', serial_number: '' })
  }

  const handleCreateJob = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setMessage(null)

    if (!customerId || !equipmentType.trim() || !description.trim()) {
      setError('Please select a customer, equipment, and enter a description.')
      return
    }

    setSaving(true)
    const res = await fetch('/api/admin-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_id: customerId, equipment_type: equipmentType, status, description }),
    })
    const json = await res.json()
    setSaving(false)

    if (!res.ok) { setError(json.error ?? 'Failed to create repair job.'); return }

    setMessage('Repair job created successfully.')
    setEquipmentType('')
    setEquipmentSelection('')
    setDescription('')
    setStatus('pending')
    setShowForm(false)
    setShowInlineEquipment(false)
    setInlineEquipment({ equipment_type: '', brand: '', model: '', serial_number: '' })
    await fetchRepairData()
  }

  const patchJob = async (jobId: string | number, updates: { status?: string; notes?: string }) => {
    setUpdatingJobId(jobId)
    const res = await fetch(`/api/admin/repair-jobs/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const json = await res.json()
    setUpdatingJobId(null)
    if (!res.ok) { setError(json.error ?? 'Failed to update repair job.'); return }
    setRepairJobs((prev) => prev.map((job) => job.id === jobId ? { ...job, ...json.job } : job))
  }

  const handleStatusChange = (job: RepairJob, newStatus: string) => {
    patchJob(job.id, { status: newStatus })
  }

  const handleNotesFocus = (job: RepairJob) => {
    const key = job.id.toString()
    const val = job.notes ?? ''
    notesOriginals.current[key] = val
    setNotesDrafts((prev) => ({ ...prev, [key]: val }))
  }

  const handleNotesBlur = (job: RepairJob) => {
    const key = job.id.toString()
    const draft = notesDrafts[key] ?? ''
    if (draft !== notesOriginals.current[key]) {
      patchJob(job.id, { notes: draft })
      notesOriginals.current[key] = draft
    }
  }

  const findCustomerName = (id: number | string) =>
    customers.find((c) => c.id.toString() === id.toString())?.full_name ?? 'Unknown'

  return (
    <div className="py-8 px-4 lg:px-10 max-w-7xl mx-auto w-full">
      <div>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Repair Jobs</h1>
            <p className="text-sm text-gray-500 mt-1">Track repair work, status, and equipment details.</p>
          </div>
          <button
            onClick={() => setShowForm((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-md bg-[#B87333] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#a0632b]"
          >
            {showForm ? 'Close form' : 'Create repair job'}
          </button>
        </div>

        {message && <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}
        {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {showForm && (
          <div className="mb-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">New Repair Job</h2>
            <form onSubmit={handleCreateJob} className="grid gap-4 lg:grid-cols-2">
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
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Equipment</label>
                <select
                  value={equipmentSelection}
                  onChange={(event) => handleEquipmentSelection(event.target.value)}
                  className="mt-2 block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                >
                  <option value="">Select equipment</option>
                  {customerEquipment.map((eq) => (
                    <option key={eq.id} value={eq.id.toString()}>
                      {eq.brand} {eq.model} ({eq.equipment_type})
                    </option>
                  ))}
                  <option value="__add_new__">＋ Add new equipment</option>
                </select>

                {showInlineEquipment && (
                  <div className="mt-3 rounded-xl border border-[#B87333]/30 bg-[#B87333]/5 p-4 space-y-3">
                    <p className="text-xs font-semibold text-[#B87333] uppercase tracking-wide">New Equipment</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600">Equipment type</label>
                        <input
                          value={inlineEquipment.equipment_type}
                          onChange={(e) => setInlineEquipment((p) => ({ ...p, equipment_type: e.target.value }))}
                          placeholder="e.g. Espresso Machine"
                          className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600">Brand</label>
                        <input
                          value={inlineEquipment.brand}
                          onChange={(e) => setInlineEquipment((p) => ({ ...p, brand: e.target.value }))}
                          placeholder="e.g. La Marzocco"
                          className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600">Model</label>
                        <input
                          value={inlineEquipment.model}
                          onChange={(e) => setInlineEquipment((p) => ({ ...p, model: e.target.value }))}
                          placeholder="e.g. Linea Mini"
                          className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600">Serial number <span className="font-normal text-gray-400">(optional)</span></label>
                        <input
                          value={inlineEquipment.serial_number}
                          onChange={(e) => setInlineEquipment((p) => ({ ...p, serial_number: e.target.value }))}
                          placeholder="e.g. LM-12345"
                          className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleSaveInlineEquipment}
                        disabled={inlineSaving}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#B87333] px-4 py-2 text-xs font-semibold text-white hover:bg-[#a0632b] disabled:opacity-50 transition"
                      >
                        {inlineSaving ? 'Saving…' : 'Save & select equipment'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowInlineEquipment(false); setEquipmentSelection('') }}
                        className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={4}
                  className="mt-2 block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                  placeholder="Describe the repair issue or service request"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="mt-2 block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="lg:col-span-2 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-xl bg-[#B87333] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#a0632b] disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Create job'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">Repair jobs</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Customer</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Equipment</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Description</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Notes</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Created</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {loading ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">Loading repair jobs...</td></tr>
                ) : repairJobs.length > 0 ? (
                  repairJobs.map((job) => {
                    const key = job.id.toString()
                    const isUpdating = updatingJobId === job.id
                    const noteValue = key in notesDrafts ? notesDrafts[key] : (job.notes ?? '')

                    return (
                      <tr key={job.id} className={`hover:bg-gray-50 ${isUpdating ? 'opacity-60' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{findCustomerName(job.customer_id)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{job.equipment_type}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">{job.description}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={job.status}
                            onChange={(e) => handleStatusChange(job, e.target.value)}
                            disabled={isUpdating}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#B87333]/20 disabled:cursor-not-allowed ${
                              job.status === 'completed' ? 'border-green-200 bg-green-50 text-green-800'
                              : job.status === 'in_progress' ? 'border-yellow-200 bg-yellow-50 text-yellow-800'
                              : 'border-gray-200 bg-gray-50 text-gray-800'
                            }`}
                          >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In progress</option>
                            <option value="completed">Completed</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 min-w-[180px]">
                          <textarea
                            rows={2}
                            value={noteValue}
                            placeholder="Add notes..."
                            disabled={isUpdating}
                            onFocus={() => handleNotesFocus(job)}
                            onChange={(e) => setNotesDrafts((prev) => ({ ...prev, [key]: e.target.value }))}
                            onBlur={() => handleNotesBlur(job)}
                            className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20 disabled:cursor-not-allowed disabled:bg-gray-50"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {job.created_at ? new Date(job.created_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {job.completed_at ? new Date(job.completed_at).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">No repair jobs found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
