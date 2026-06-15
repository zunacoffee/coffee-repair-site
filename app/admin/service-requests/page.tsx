"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type ServiceRequest = {
  id: number
  full_name: string
  email: string
  phone: string
  equipment_type: string
  brand: string
  model: string
  issue_description: string
  contact_preference: string
  status: string
  scheduled_date: string | null
  time_slot: string | null
  notes: string | null
  created_at: string
}

const STATUS_STYLES: Record<string, string> = {
  new:       'border-blue-200 bg-blue-100 text-blue-800',
  contacted: 'border-orange-200 bg-orange-100 text-orange-800',
  scheduled: 'border-blue-200 bg-blue-100 text-blue-800',
  completed: 'border-green-200 bg-green-100 text-green-800',
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ServiceRequestsPage() {
  const router = useRouter()
  const [requests,   setRequests]   = useState<ServiceRequest[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  // Modal state
  const [selectedReq,  setSelectedReq]  = useState<ServiceRequest | null>(null)
  const [modalStatus,  setModalStatus]  = useState('')
  const [modalNotes,   setModalNotes]   = useState('')
  const [modalSaving,  setModalSaving]  = useState(false)
  const [modalSaved,   setModalSaved]   = useState(false)
  const [modalError,   setModalError]   = useState<string | null>(null)
  const [converting,   setConverting]   = useState(false)
  const [convertMsg,   setConvertMsg]   = useState<{ ok: boolean; text: string } | null>(null)
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Inline create-customer form (shown when convert fails with "No customer")
  const [showCreateCustomer, setShowCreateCustomer] = useState(false)
  const [ccName,   setCcName]   = useState('')
  const [ccEmail,  setCcEmail]  = useState('')
  const [ccPhone,  setCcPhone]  = useState('')
  const [ccSaving, setCcSaving] = useState(false)
  const [ccError,  setCcError]  = useState<string | null>(null)

  const fetchRequests = async () => {
    const res  = await fetch('/api/admin/service-requests')
    if (res.status === 401) { router.replace('/admin/login'); return }
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Unable to load service requests.'); return }
    setRequests(json.serviceRequests ?? [])
  }

  useEffect(() => {
    let mounted = true
    fetchRequests().finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const openModal = (req: ServiceRequest) => {
    setSelectedReq(req)
    setModalStatus(req.status)
    setModalNotes(req.notes ?? '')
    setModalError(null)
    setModalSaved(false)
    setConvertMsg(null)
  }

  const handleInlineStatus = async (id: number, newStatus: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setUpdatingId(id)
    const res  = await fetch(`/api/admin/service-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    const json = await res.json()
    setUpdatingId(null)
    if (!res.ok) { setError(json.error ?? 'Failed to update status.'); return }
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: json.serviceRequest.status } : r))
    if (selectedReq?.id === id) setSelectedReq((prev) => prev ? { ...prev, status: json.serviceRequest.status } : null)
  }

  const handleModalSave = async () => {
    if (!selectedReq) return
    setModalSaving(true)
    setModalError(null)
    const res  = await fetch(`/api/admin/service-requests/${selectedReq.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: modalStatus, notes: modalNotes }),
    })
    const json = await res.json()
    setModalSaving(false)
    if (!res.ok) { setModalError(json.error ?? 'Failed to save.'); return }
    const updated = { ...selectedReq, ...json.serviceRequest, notes: modalNotes }
    setRequests((prev) => prev.map((r) => r.id === selectedReq.id ? updated : r))
    setSelectedReq(updated)
    setModalSaved(true)
    setTimeout(() => setModalSaved(false), 2500)
  }

  const handleConvert = async () => {
    if (!selectedReq) return
    setConverting(true)
    setConvertMsg(null)
    const res  = await fetch(`/api/admin/service-requests/${selectedReq.id}/convert`, { method: 'POST' })
    const json = await res.json()
    setConverting(false)
    if (!res.ok) {
      setConvertMsg({ ok: false, text: json.error ?? 'Failed to convert.' })
    } else {
      setConvertMsg({ ok: true, text: 'Work order created successfully.' })
      const updated = { ...selectedReq, status: 'scheduled' }
      setRequests((prev) => prev.map((r) => r.id === selectedReq.id ? updated : r))
      setSelectedReq(updated)
      setModalStatus('scheduled')
    }
  }

  const handleCreateCustomerAndConvert = async (e: React.FormEvent) => {
    e.preventDefault()
    setCcSaving(true)
    setCcError(null)
    const res  = await fetch('/api/admin/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: ccName, email: ccEmail, phone: ccPhone }),
    })
    const json = await res.json()
    setCcSaving(false)
    if (!res.ok) { setCcError(json.error ?? 'Failed to create customer.'); return }
    setShowCreateCustomer(false)
    setConvertMsg(null)
    await handleConvert()
  }

  const filteredRequests = requests.filter(req =>
    (statusFilter === '' || req.status === statusFilter) &&
    (search === '' ||
      req.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      req.email?.toLowerCase().includes(search.toLowerCase()) ||
      req.issue_description?.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div>
      {/* Header */}
      <div className="bg-white border-b border-[#E8ECF0] px-6 py-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <Link href="/admin" className="text-xs font-medium text-[#7A8898] hover:text-[#0D1B2A] transition">
            ← Admin
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-[#0D1B2A]">Service Requests</h1>
          <p className="text-sm text-[#7A8898] mt-0.5">Incoming repair requests from the public form.</p>
        </div>
      </div>

    <div className="py-8 px-4 lg:px-10 max-w-7xl mx-auto w-full">

      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>}

      <div className="md:hidden bg-white rounded-2xl border border-[#E8ECF0] shadow-sm divide-y divide-[#E8ECF0]">
        {loading ? (
          <p className="px-4 py-8 text-center text-sm text-[#7A8898]">Loading…</p>
        ) : filteredRequests.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-[#7A8898]">No service requests yet.</p>
        ) : filteredRequests.map((req) => (
          <div
            key={req.id}
            onClick={() => openModal(req)}
            className="px-4 py-4 hover:bg-[#E8ECF0] transition-colors cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#0D1B2A]">{req.full_name}</p>
                <p className="text-xs text-[#7A8898] mt-0.5">{req.equipment_type}{req.brand ? ` · ${req.brand}` : ''}</p>
              </div>
              <span className={`shrink-0 inline-flex rounded-lg border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[req.status] ?? 'border-gray-200 bg-gray-50 text-gray-800'}`}>
                {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
              </span>
            </div>
            <p className="mt-1.5 text-xs text-[#7A8898] line-clamp-2">{req.issue_description}</p>
            {req.scheduled_date && (
              <p className="mt-1 text-xs font-semibold text-[#B87333]">{fmtDate(req.scheduled_date)}</p>
            )}
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="hidden md:block">
      <div className="rounded-2xl border border-[#E8ECF0] bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-[18px] py-[14px] border-b border-[#E8ECF0] sticky top-0 z-10 bg-white">
          <span className="text-sm font-semibold text-[#0D1B2A]">All requests</span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-[#E8ECF0] rounded-xl px-3 py-1.5 w-52">
              <svg className="h-4 w-4 text-[#7A8898] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search requests…" className="bg-transparent text-sm text-[#0D1B2A] placeholder-[#7A8898] outline-none w-full" />
            </div>
            {['All', 'New', 'Contacted', 'Scheduled', 'Completed'].map((s) => (
              <button key={s} onClick={() => setStatusFilter(s === 'All' ? '' : s.toLowerCase())}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                  (statusFilter === '' && s === 'All') || statusFilter === s.toLowerCase()
                    ? 'bg-[#0D1B2A] text-white'
                    : 'bg-[#E8ECF0] text-[#7A8898] hover:text-[#0D1B2A]'
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[#E8ECF0]">
          <thead className="bg-[#0D1B2A]">
            <tr>
              {['Name', 'Equipment', 'Appointment', 'Issue', 'Status', 'Submitted', ''].map((h) => (
                <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-white">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8ECF0] bg-white">
            {loading ? (
              <tr>
                <td colSpan={7} className="whitespace-nowrap px-6 py-12 text-center text-[#7A8898] text-sm">Loading…</td>
              </tr>
            ) : filteredRequests.length > 0 ? (
              filteredRequests.map((req) => {
                const isUpdating = updatingId === req.id
                return (
                  <tr
                    key={req.id}
                    onClick={() => openModal(req)}
                    className={`hover:bg-[#E8ECF0] cursor-pointer transition-colors ${isUpdating ? 'opacity-60' : ''}`}
                  >
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <p className="text-sm font-medium text-[#0D1B2A]">{req.full_name}</p>
                      <p className="text-xs text-[#7A8898] mt-0.5">{req.email}</p>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <p className="text-sm text-[#0D1B2A]">{req.equipment_type}</p>
                      <p className="text-xs text-[#7A8898] mt-0.5">{req.brand} {req.model}</p>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {req.scheduled_date ? (
                        <>
                          <p className="text-sm font-medium text-[#0D1B2A]">{fmtDate(req.scheduled_date)}</p>
                          {req.time_slot && (
                            <p className="mt-0.5 text-xs text-[#7A8898]">{req.time_slot}</p>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-[#7A8898]">Not scheduled</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-sm text-[#7A8898] max-w-xs">
                      <p className="line-clamp-2">{req.issue_description}</p>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={req.status}
                        onChange={(e) => handleInlineStatus(req.id, e.target.value, e as unknown as React.MouseEvent)}
                        onClick={(e) => e.stopPropagation()}
                        disabled={isUpdating}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#B87333]/20 disabled:cursor-not-allowed ${STATUS_STYLES[req.status] ?? 'border-gray-200 bg-gray-50 text-gray-800'}`}
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="completed">Completed</option>
                      </select>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-[#7A8898]">
                      {new Date(req.created_at).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right">
                      <svg className="h-4 w-4 text-[#7A8898] ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={7} className="whitespace-nowrap px-6 py-12 text-center text-[#7A8898] text-sm">No service requests yet.</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
      </div>

      {/* Service request detail modal */}
      {selectedReq && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setSelectedReq(null)}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-[#E8ECF0] shrink-0">
              <div>
                <h2 className="text-base font-bold text-[#0D1B2A]">{selectedReq.full_name}</h2>
                <p className="mt-0.5 text-xs text-[#7A8898]">{selectedReq.equipment_type} · {selectedReq.brand} {selectedReq.model}</p>
              </div>
              <button
                onClick={() => setSelectedReq(null)}
                className="rounded-lg p-1.5 text-[#7A8898] hover:bg-[#E8ECF0] transition shrink-0"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

              {/* Contact info */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7A8898]">Email</p>
                  <p className="mt-1 text-sm text-[#0D1B2A]">{selectedReq.email}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7A8898]">Phone</p>
                  <p className="mt-1 text-sm text-[#0D1B2A]">{selectedReq.phone}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7A8898]">Contact preference</p>
                  <p className="mt-1 text-sm capitalize text-[#0D1B2A]">{selectedReq.contact_preference}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7A8898]">Submitted</p>
                  <p className="mt-1 text-sm text-[#0D1B2A]">
                    {new Date(selectedReq.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* Issue */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7A8898] mb-1">Issue description</p>
                <p className="text-sm text-[#0D1B2A] leading-relaxed">{selectedReq.issue_description}</p>
              </div>

              {/* Appointment */}
              {selectedReq.scheduled_date && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7A8898] mb-1">Appointment</p>
                  <p className="text-sm font-medium text-[#0D1B2A]">{fmtDate(selectedReq.scheduled_date)}</p>
                  {selectedReq.time_slot && (
                    <p className="text-xs text-[#7A8898] mt-0.5">{selectedReq.time_slot}</p>
                  )}
                </div>
              )}

              {/* Status */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-[#7A8898] mb-2">Status</label>
                <select
                  value={modalStatus}
                  onChange={(e) => setModalStatus(e.target.value)}
                  className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-4 py-2.5 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {/* Internal notes */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-[#7A8898] mb-2">Internal notes</label>
                <textarea
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  rows={3}
                  placeholder="Add internal notes (not visible to customer)…"
                  className="block w-full resize-none rounded-xl border border-[#E8ECF0] bg-white px-4 py-2.5 text-sm text-[#0D1B2A] placeholder-[#7A8898] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                />
              </div>

              {/* Convert to work order */}
              <div className="rounded-xl border border-[#E8ECF0] bg-[#E8ECF0] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7A8898] mb-1">Convert to Work Order</p>
                <p className="text-xs text-[#7A8898] mb-3">
                  Customer must have an account before converting. If they don&apos;t exist yet, create them first then come back to convert.
                </p>
                {convertMsg && (
                  <>
                    <p className={`mb-2 text-sm font-medium ${convertMsg.ok ? 'text-green-600' : 'text-red-600'}`}>
                      {convertMsg.text}
                    </p>
                    {!convertMsg.ok && convertMsg.text.includes('No customer') && selectedReq && (
                      showCreateCustomer ? (
                        <form onSubmit={handleCreateCustomerAndConvert} className="mb-3 rounded-xl border border-[#E8ECF0] bg-white p-3 space-y-2">
                          <p className="text-xs font-semibold text-[#0D1B2A]">Create Customer</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-semibold uppercase tracking-wide text-[#7A8898] mb-1">Full Name</label>
                              <input type="text" value={ccName} onChange={(e) => setCcName(e.target.value)} required
                                className="w-full rounded-lg border border-[#E8ECF0] px-2.5 py-1.5 text-sm text-[#0D1B2A] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold uppercase tracking-wide text-[#7A8898] mb-1">Email</label>
                              <input type="email" value={ccEmail} onChange={(e) => setCcEmail(e.target.value)} required
                                className="w-full rounded-lg border border-[#E8ECF0] px-2.5 py-1.5 text-sm text-[#0D1B2A] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20" />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-[10px] font-semibold uppercase tracking-wide text-[#7A8898] mb-1">Phone</label>
                              <input type="tel" value={ccPhone} onChange={(e) => setCcPhone(e.target.value)} placeholder="(555) 000-0000"
                                className="w-full rounded-lg border border-[#E8ECF0] px-2.5 py-1.5 text-sm text-[#0D1B2A] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20" />
                            </div>
                          </div>
                          {ccError && <p className="text-xs text-red-600">{ccError}</p>}
                          <div className="flex items-center gap-2 pt-1">
                            <button type="submit" disabled={ccSaving}
                              className="rounded-lg bg-[#B87333] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50 transition">
                              {ccSaving ? 'Saving…' : 'Save & Convert'}
                            </button>
                            <button type="button" onClick={() => setShowCreateCustomer(false)}
                              className="rounded-lg border border-[#E8ECF0] px-3 py-1.5 text-xs font-semibold text-[#7A8898] hover:text-[#0D1B2A] transition">
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setCcName(selectedReq.full_name); setCcEmail(selectedReq.email); setCcPhone(''); setCcError(null); setShowCreateCustomer(true) }}
                          className="mb-3 inline-flex items-center gap-1.5 rounded-lg border border-[#B87333] px-3 py-1.5 text-xs font-semibold text-[#B87333] hover:bg-[#B87333]/5 transition"
                        >
                          Create Customer
                        </button>
                      )
                    )}
                  </>
                )}
                <button
                  onClick={handleConvert}
                  disabled={converting || convertMsg?.ok === true}
                  className="mt-1 inline-flex items-center gap-2 rounded-xl bg-[#B87333] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition"
                >
                  {converting ? 'Converting…' : convertMsg?.ok ? 'Work order created ✓' : 'Convert to Work Order'}
                </button>
              </div>

              {modalError && <p className="text-sm text-red-600">{modalError}</p>}
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-[#E8ECF0] px-6 py-4 flex items-center justify-between gap-3">
              <button
                onClick={() => setSelectedReq(null)}
                className="text-sm font-semibold text-[#7A8898] hover:text-[#0D1B2A] transition"
              >
                Close
              </button>
              <div className="flex items-center gap-3">
                {modalSaved && <span className="text-sm font-medium text-green-600">Saved!</span>}
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
    </div>
  )
}
