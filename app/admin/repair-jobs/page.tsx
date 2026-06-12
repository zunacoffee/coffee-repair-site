"use client"

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import TimePickerSelect from '../../components/ui/TimePickerSelect'

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
  scheduled_date: string | null
  scheduled_time: string | null
  is_emergency: boolean
}

const STATUS_BADGE: Record<string, string> = {
  completed:   'border-green-200 bg-green-100 text-green-800',
  in_progress: 'border-violet-200 bg-violet-100 text-violet-800',
  pending:     'border-amber-200 bg-amber-100 text-amber-800',
}

export default function RepairJobsPage() {
  const router = useRouter()
  const [customers,          setCustomers]          = useState<Customer[]>([])
  const [repairJobs,         setRepairJobs]         = useState<RepairJob[]>([])
  const [loading,            setLoading]            = useState(true)
  const [error,              setError]              = useState<string | null>(null)
  const [showForm,           setShowForm]           = useState(false)
  const [customerId,         setCustomerId]         = useState<string>('')
  const [customerEquipment,  setCustomerEquipment]  = useState<Equipment[]>([])
  const [equipmentSelection, setEquipmentSelection] = useState<string>('')
  const [equipmentType,      setEquipmentType]      = useState('')
  const [showInlineEquipment, setShowInlineEquipment] = useState(false)
  const [inlineEquipment,    setInlineEquipment]    = useState({ equipment_type: '', brand: '', model: '', serial_number: '' })
  const [inlineSaving,       setInlineSaving]       = useState(false)
  const [description,        setDescription]        = useState('')
  const [status,             setStatus]             = useState('pending')
  const [scheduledDate,      setScheduledDate]      = useState('')
  const [scheduledTime,      setScheduledTime]      = useState('')
  const [isEmergency,        setIsEmergency]        = useState(false)
  const [saving,             setSaving]             = useState(false)
  const [message,            setMessage]            = useState<string | null>(null)
  const [updatingJobId,      setUpdatingJobId]      = useState<string | number | null>(null)

  // Modal state
  const [selectedJob,  setSelectedJob]  = useState<RepairJob | null>(null)
  const [modalStatus,        setModalStatus]        = useState('')
  const [modalNotes,         setModalNotes]         = useState('')
  const [modalScheduledDate, setModalScheduledDate] = useState('')
  const [modalScheduledTime, setModalScheduledTime] = useState('')
  const [modalIsEmergency,   setModalIsEmergency]   = useState(false)
  const [modalSaving,        setModalSaving]        = useState(false)
  const [modalError,         setModalError]         = useState<string | null>(null)
  const [modalSaved,         setModalSaved]         = useState(false)

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
    const res  = await fetch(`/api/admin/customers/${customerId}/equipment`, {
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
    const res  = await fetch('/api/admin-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_id: customerId, equipment_type: equipmentType, status, description, scheduled_date: scheduledDate || null, scheduled_time: scheduledTime || null, is_emergency: isEmergency }),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { setError(json.error ?? 'Failed to create repair job.'); return }
    setMessage('Repair job created successfully.')
    setEquipmentType('')
    setEquipmentSelection('')
    setDescription('')
    setStatus('pending')
    setScheduledDate('')
    setScheduledTime('')
    setIsEmergency(false)
    setShowForm(false)
    setShowInlineEquipment(false)
    setInlineEquipment({ equipment_type: '', brand: '', model: '', serial_number: '' })
    await fetchRepairData()
  }

  const patchJob = async (jobId: string | number, updates: { status?: string; notes?: string; scheduled_date?: string | null; scheduled_time?: string | null; is_emergency?: boolean }) => {
    setUpdatingJobId(jobId)
    const res  = await fetch(`/api/admin/repair-jobs/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const json = await res.json()
    setUpdatingJobId(null)
    if (!res.ok) { setError(json.error ?? 'Failed to update repair job.'); return null }
    setRepairJobs((prev) => prev.map((job) => job.id === jobId ? { ...job, ...json.job } : job))
    return json.job as RepairJob
  }

  const openModal = (job: RepairJob) => {
    setSelectedJob(job)
    setModalStatus(job.status)
    setModalNotes(job.notes ?? '')
    setModalScheduledDate(job.scheduled_date ?? '')
    setModalScheduledTime(job.scheduled_time ?? '')
    setModalIsEmergency(job.is_emergency ?? false)
    setModalError(null)
    setModalSaved(false)
  }

  const handleModalSave = async () => {
    if (!selectedJob) return
    setModalSaving(true)
    setModalError(null)
    const updated = await patchJob(selectedJob.id, { status: modalStatus, notes: modalNotes, scheduled_date: modalScheduledDate || null, scheduled_time: modalScheduledTime || null, is_emergency: modalIsEmergency })
    setModalSaving(false)
    if (updated) {
      setSelectedJob((prev) => prev ? { ...prev, ...updated } : null)
      setModalSaved(true)
      setTimeout(() => setModalSaved(false), 2500)
    }
  }

  const handleInlineStatus = (job: RepairJob, newStatus: string, e: React.MouseEvent) => {
    e.stopPropagation()
    patchJob(job.id, { status: newStatus })
  }

  const findCustomerName = (id: number | string) =>
    customers.find((c) => c.id.toString() === id.toString())?.full_name ?? 'Unknown'

  const inputCls = 'block w-full rounded-xl border border-[#E8ECF0] bg-white px-4 py-2.5 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20'

  return (
    <div className="py-8 px-4 lg:px-10 max-w-7xl mx-auto w-full space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0D1B2A]">Repair Jobs</h1>
          <p className="mt-0.5 text-sm text-[#7A8898]">Track repair work, status, and equipment details.</p>
        </div>
        <button
          onClick={() => setShowForm((prev) => !prev)}
          className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl bg-[#B87333] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition"
        >
          {showForm ? 'Close form' : 'Create repair job'}
        </button>
      </div>

      {message && <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-700">{message}</div>}
      {error   && <div className="rounded-xl border border-red-200  bg-red-50  px-5 py-4 text-sm text-red-700">{error}</div>}

      {/* Create form */}
      {showForm && (
        <div className="rounded-2xl border border-[#E8ECF0] bg-white shadow-sm p-6">
          <h2 className="text-base font-bold text-[#0D1B2A] mb-4">New Repair Job</h2>
          <form onSubmit={handleCreateJob} className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-[#0D1B2A] mb-1">Customer</label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className={inputCls}
              >
                <option value="">Select a customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id.toString()}>{customer.full_name}</option>
                ))}
              </select>
            </div>
            <div className="lg:col-span-2">
              <label className="block text-sm font-semibold text-[#0D1B2A] mb-1">Equipment</label>
              <select
                value={equipmentSelection}
                onChange={(e) => handleEquipmentSelection(e.target.value)}
                className={inputCls}
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
                    {[
                      { label: 'Equipment type', key: 'equipment_type', placeholder: 'e.g. Espresso Machine' },
                      { label: 'Brand',           key: 'brand',           placeholder: 'e.g. La Marzocco' },
                      { label: 'Model',           key: 'model',           placeholder: 'e.g. Linea Mini' },
                      { label: 'Serial number',   key: 'serial_number',   placeholder: 'e.g. LM-12345' },
                    ].map(({ label, key, placeholder }) => (
                      <div key={key}>
                        <label className="block text-xs font-medium text-[#7A8898]">{label}</label>
                        <input
                          value={inlineEquipment[key as keyof typeof inlineEquipment]}
                          onChange={(e) => setInlineEquipment((p) => ({ ...p, [key]: e.target.value }))}
                          placeholder={placeholder}
                          className="mt-1 block w-full rounded-lg border border-[#E8ECF0] bg-white px-3 py-2 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleSaveInlineEquipment}
                      disabled={inlineSaving}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#B87333] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50 transition"
                    >
                      {inlineSaving ? 'Saving…' : 'Save & select'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowInlineEquipment(false); setEquipmentSelection('') }}
                      className="rounded-lg border border-[#E8ECF0] px-4 py-2 text-xs font-semibold text-[#0D1B2A] hover:bg-[#E8ECF0] transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="lg:col-span-2">
              <label className="block text-sm font-semibold text-[#0D1B2A] mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className={inputCls + ' resize-none'}
                placeholder="Describe the repair issue"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#0D1B2A] mb-1">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
                <option value="pending">Pending</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#0D1B2A] mb-1">Scheduled Date <span className="text-[#7A8898] font-normal">(optional)</span></label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#0D1B2A] mb-1">Scheduled Time <span className="text-[#7A8898] font-normal">(optional)</span></label>
              <TimePickerSelect value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className={inputCls} />
            </div>
            <div className="lg:col-span-2 flex items-center justify-between gap-4">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isEmergency}
                  onChange={(e) => setIsEmergency(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 accent-red-600"
                />
                <span className="text-sm font-semibold text-red-600">Emergency</span>
              </label>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-[#B87333] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition"
              >
                {saving ? 'Saving…' : 'Create job'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-[#E8ECF0] bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E8ECF0] bg-[#E8ECF0]">
          <h2 className="text-sm font-semibold text-[#0D1B2A]">
            Repair jobs
            {!loading && <span className="ml-2 text-[#7A8898] font-normal">({repairJobs.length})</span>}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#E8ECF0]">
            <thead className="bg-white">
              <tr>
                {['Customer', 'Equipment', 'Description', 'Status', 'Notes', 'Created', 'Completed', ''].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#7A8898]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8ECF0] bg-white">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-[#7A8898] text-sm">Loading…</td></tr>
              ) : repairJobs.length > 0 ? (
                repairJobs.map((job) => {
                  const isUpdating = updatingJobId === job.id
                  return (
                    <tr
                      key={job.id}
                      onClick={() => openModal(job)}
                      className={`hover:bg-[#E8ECF0] cursor-pointer transition-colors ${isUpdating ? 'opacity-60' : ''}`}
                    >
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm font-medium text-[#0D1B2A]">
                        {findCustomerName(job.customer_id)}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm text-[#7A8898]">{job.equipment_type}</td>
                      <td className="px-5 py-3.5 text-sm text-[#7A8898] max-w-xs">
                        <p className="line-clamp-2">{job.description}</p>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={job.status}
                          onChange={(e) => { handleInlineStatus(job, e.target.value, e as unknown as React.MouseEvent) }}
                          onClick={(e) => e.stopPropagation()}
                          disabled={isUpdating}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#B87333]/20 disabled:cursor-not-allowed ${STATUS_BADGE[job.status] ?? 'border-gray-200 bg-gray-50 text-gray-800'}`}
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In progress</option>
                          <option value="completed">Completed</option>
                        </select>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-[#7A8898] max-w-[140px]">
                        {job.notes ? <p className="line-clamp-1 text-xs">{job.notes}</p> : <span className="text-[#7A8898] text-xs">—</span>}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm text-[#7A8898]">
                        {job.created_at ? new Date(job.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm text-[#7A8898]">
                        {job.completed_at ? new Date(job.completed_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <svg className="h-4 w-4 text-[#7A8898] ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-[#7A8898] text-sm">No repair jobs found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Repair job detail modal */}
      {selectedJob && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setSelectedJob(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-[#E8ECF0] shrink-0">
              <div>
                <h2 className="text-base font-bold text-[#0D1B2A]">{selectedJob.equipment_type}</h2>
                <p className="mt-0.5 text-xs text-[#7A8898]">{findCustomerName(selectedJob.customer_id)}</p>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="rounded-lg p-1.5 text-[#7A8898] hover:bg-[#E8ECF0] transition shrink-0"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
              {/* Description */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7A8898] mb-1">Description</p>
                <p className="text-sm text-[#0D1B2A] leading-relaxed">{selectedJob.description}</p>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7A8898] mb-1">Created</p>
                  <p className="text-sm text-[#0D1B2A]">
                    {selectedJob.created_at ? new Date(selectedJob.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7A8898] mb-1">Completed</p>
                  <p className="text-sm text-[#0D1B2A]">
                    {selectedJob.completed_at ? new Date(selectedJob.completed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}
                  </p>
                </div>
              </div>

              {/* Schedule */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-[#7A8898] mb-2">Scheduled Date</label>
                  <input
                    type="date"
                    value={modalScheduledDate}
                    onChange={(e) => setModalScheduledDate(e.target.value)}
                    className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-4 py-2.5 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-[#7A8898] mb-2">Scheduled Time</label>
                  <TimePickerSelect value={modalScheduledTime} onChange={(e) => setModalScheduledTime(e.target.value)} />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-[#7A8898] mb-2">Status</label>
                <select
                  value={modalStatus}
                  onChange={(e) => setModalStatus(e.target.value)}
                  className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-4 py-2.5 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-[#7A8898] mb-2">Notes</label>
                <textarea
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  rows={4}
                  placeholder="Add technician notes…"
                  className="block w-full resize-none rounded-xl border border-[#E8ECF0] bg-white px-4 py-2.5 text-sm text-[#0D1B2A] placeholder-[#7A8898] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                />
              </div>

              {/* Emergency */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={modalIsEmergency}
                  onChange={(e) => setModalIsEmergency(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 accent-red-600"
                />
                <span className="text-sm font-semibold text-red-600">Emergency job</span>
              </label>

              {modalError && <p className="text-sm text-red-600">{modalError}</p>}
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-[#E8ECF0] px-6 py-4 flex items-center justify-between gap-3">
              <button
                onClick={() => setSelectedJob(null)}
                className="text-sm font-semibold text-[#7A8898] hover:text-[#0D1B2A] transition"
              >
                Close
              </button>
              <div className="flex items-center gap-3">
                {modalSaved && (
                  <span className="text-sm font-medium text-green-600">Saved!</span>
                )}
                <button
                  onClick={handleModalSave}
                  disabled={modalSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#B87333] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition"
                >
                  {modalSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
