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
  created_at: string
}

const STATUS_STYLES: Record<string, string> = {
  new:       'border-blue-200 bg-blue-50 text-blue-800',
  contacted: 'border-yellow-200 bg-yellow-50 text-yellow-800',
  scheduled: 'border-purple-200 bg-purple-50 text-purple-800',
  completed: 'border-green-200 bg-green-50 text-green-800',
}

export default function ServiceRequestsPage() {
  const router = useRouter()
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  const fetchRequests = async () => {
    const res = await fetch('/api/admin/service-requests')
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

  const handleStatusChange = async (id: number, newStatus: string) => {
    setUpdatingId(id)
    const res = await fetch(`/api/admin/service-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    const json = await res.json()
    setUpdatingId(null)
    if (!res.ok) { setError(json.error ?? 'Failed to update status.'); return }
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: json.serviceRequest.status } : r))
    )
  }

  return (
    <div className="py-8 px-4 lg:px-10 max-w-7xl mx-auto w-full">
      <div>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <Link href="/admin" className="text-xs font-medium text-gray-400 hover:text-gray-600 transition">
              ← Admin
            </Link>
            <h1 className="mt-1 text-3xl font-semibold text-gray-900">Service Requests</h1>
            <p className="text-sm text-gray-500 mt-1">Incoming repair requests from the public form.</p>
          </div>
          <div className="text-sm text-gray-500">
            {!loading && `${requests.length} request${requests.length !== 1 ? 's' : ''}`}
          </div>
        </div>

        {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">All requests</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Equipment</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Brand / Model</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Issue</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">Loading…</td>
                  </tr>
                ) : requests.length > 0 ? (
                  requests.map((req) => {
                    const isUpdating = updatingId === req.id
                    return (
                      <tr key={req.id} className={`hover:bg-gray-50 ${isUpdating ? 'opacity-60' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm font-medium text-gray-900">{req.full_name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{req.phone}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{req.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{req.equipment_type}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm text-gray-900">{req.brand}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{req.model}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">
                          <p className="line-clamp-2">{req.issue_description}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={req.status}
                            onChange={(e) => handleStatusChange(req.id, e.target.value)}
                            disabled={isUpdating}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed ${STATUS_STYLES[req.status] ?? 'border-gray-200 bg-gray-50 text-gray-800'}`}
                          >
                            <option value="new">New</option>
                            <option value="contacted">Contacted</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="completed">Completed</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(req.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">No service requests yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
