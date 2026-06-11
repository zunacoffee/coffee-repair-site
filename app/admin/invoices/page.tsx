"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AddCustomerModal from '../components/AddCustomerModal'

type Invoice = {
  id: number
  invoice_number: string
  status: 'draft' | 'sent' | 'paid'
  subtotal: number
  total: number
  created_at: string
  stripe_payment_link?: string | null
  customers: { id: number; full_name: string; email: string; phone?: string } | null
}

type LineItem = {
  id: number
  type: 'labor' | 'part'
  description: string
  quantity: number
  unit_price: number
  total: number
}

type InvoiceDetail = {
  invoice: Invoice & { subtotal: number }
  lineItems: LineItem[]
}

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent:  'bg-blue-100 text-blue-700',
  paid:  'bg-green-100 text-green-700',
}

export default function InvoicesPage() {
  const router = useRouter()
  const [invoices,         setInvoices]         = useState<Invoice[]>([])
  const [loading,          setLoading]          = useState(true)
  const [error,            setError]            = useState<string | null>(null)
  const [sending,          setSending]          = useState<number | null>(null)
  const [sendMsg,          setSendMsg]          = useState<{ id: number; msg: string; ok: boolean } | null>(null)
  const [showAddCustomer,  setShowAddCustomer]  = useState(false)

  // Modal state
  const [selectedInv,      setSelectedInv]      = useState<Invoice | null>(null)
  const [invDetail,        setInvDetail]        = useState<InvoiceDetail | null>(null)
  const [invDetailLoading, setInvDetailLoading] = useState(false)
  const [markingPaid,      setMarkingPaid]      = useState(false)
  const [modalSendMsg,     setModalSendMsg]     = useState<{ msg: string; ok: boolean } | null>(null)

  useEffect(() => {
    fetch('/api/admin/invoices')
      .then(async (r) => {
        if (r.status === 401) { router.replace('/admin/login'); return }
        const j = await r.json()
        if (r.ok) setInvoices(j.invoices ?? [])
        else setError(j.error ?? 'Failed to load invoices')
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false))
  }, [router])

  const openModal = async (inv: Invoice) => {
    setSelectedInv(inv)
    setInvDetail(null)
    setInvDetailLoading(true)
    setModalSendMsg(null)
    const res  = await fetch(`/api/admin/invoices/${inv.id}`)
    const json = await res.json()
    setInvDetailLoading(false)
    if (res.ok) setInvDetail(json)
  }

  const handleSend = async (inv: Invoice, fromModal = false) => {
    if (!confirm(`Send invoice ${inv.invoice_number} to ${inv.customers?.email ?? 'customer'}?`)) return
    setSending(inv.id)
    if (fromModal) setModalSendMsg(null)
    else setSendMsg(null)
    const res  = await fetch(`/api/admin/invoices/${inv.id}/send`, { method: 'POST' })
    const data = await res.json()
    setSending(null)
    const ok  = res.ok
    const msg = ok ? 'Invoice sent!' : (data.error ?? 'Failed to send')
    if (ok) {
      setInvoices((prev) => prev.map((i) => i.id === inv.id ? { ...i, status: 'sent' } : i))
      if (selectedInv?.id === inv.id) setSelectedInv((prev) => prev ? { ...prev, status: 'sent' } : null)
    }
    if (fromModal) {
      setModalSendMsg({ msg, ok })
    } else {
      setSendMsg({ id: inv.id, msg, ok })
      setTimeout(() => setSendMsg(null), 4000)
    }
  }

  const handleMarkPaid = async () => {
    if (!selectedInv) return
    setMarkingPaid(true)
    setModalSendMsg(null)
    const res  = await fetch(`/api/admin/invoices/${selectedInv.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'paid' }),
    })
    const data = await res.json()
    setMarkingPaid(false)
    if (res.ok) {
      setInvoices((prev) => prev.map((i) => i.id === selectedInv.id ? { ...i, status: 'paid' } : i))
      setSelectedInv((prev) => prev ? { ...prev, status: 'paid' } : null)
      if (invDetail) setInvDetail((prev) => prev ? { ...prev, invoice: { ...prev.invoice, status: 'paid' } } : null)
      setModalSendMsg({ msg: 'Marked as paid.', ok: true })
    } else {
      setModalSendMsg({ msg: data.error ?? 'Failed to update.', ok: false })
    }
  }

  const totals = invoices.reduce(
    (acc, inv) => { acc[inv.status] = (acc[inv.status] ?? 0) + Number(inv.total); return acc },
    {} as Record<string, number>,
  )

  const currentStatus = selectedInv
    ? (invoices.find((i) => i.id === selectedInv.id)?.status ?? selectedInv.status)
    : null

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <div className="flex items-center gap-3 text-[#7A8898]">
          <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Loading invoices…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="py-8 px-4 lg:px-10 max-w-7xl mx-auto w-full space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0D1B2A]">Invoices</h1>
          <p className="mt-0.5 text-sm text-[#7A8898]">{invoices.length} total</p>
        </div>
        <div className="flex gap-2 flex-wrap self-start sm:self-auto">
          <button
            onClick={() => setShowAddCustomer(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#B87333] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#a0632b] transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Add Customer
          </button>
          <Link
            href="/admin/invoices/new"
            className="inline-flex items-center gap-2 rounded-xl border border-[#E8ECF0] bg-white px-5 py-2.5 text-sm font-semibold text-[#0D1B2A] hover:border-[#B87333]/40 transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Invoice
          </Link>
        </div>
      </div>

      <AddCustomerModal open={showAddCustomer} onClose={() => setShowAddCustomer(false)} />

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>}

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Outstanding', amount: (totals.sent  ?? 0), color: 'border-l-blue-500' },
          { label: 'Collected',   amount: (totals.paid  ?? 0), color: 'border-l-green-500' },
          { label: 'Drafts',      amount: (totals.draft ?? 0), color: 'border-l-gray-300' },
        ].map((card) => (
          <div key={card.label} className={`rounded-2xl border-l-4 bg-white px-5 py-4 shadow-sm ${card.color}`}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7A8898]">{card.label}</p>
            <p className="mt-1.5 text-xl font-bold text-[#0D1B2A]">${card.amount.toFixed(2)}</p>
          </div>
        ))}
      </div>

      {/* Invoices table */}
      <div className="rounded-2xl border border-[#E8ECF0] bg-white shadow-sm overflow-hidden">
        {invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <svg className="h-12 w-12 text-[#E8ECF0] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm font-semibold text-[#0D1B2A]">No invoices yet</p>
            <p className="mt-1 text-xs text-[#7A8898]">Create your first invoice to get started.</p>
            <Link href="/admin/invoices/new" className="mt-4 rounded-xl bg-[#B87333] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#a0632b] transition">
              Create Invoice
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-[#E8ECF0]">
                  {['Invoice', 'Customer', 'Date', 'Total', 'Status', ''].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#7A8898]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8ECF0]">
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => openModal(inv)}
                    className="hover:bg-[#F9FAFB] cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-sm font-semibold text-[#0D1B2A]">{inv.invoice_number}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      {inv.customers ? (
                        <div>
                          <p className="text-sm font-medium text-[#0D1B2A]">{inv.customers.full_name}</p>
                          <p className="text-xs text-[#7A8898]">{inv.customers.email}</p>
                        </div>
                      ) : (
                        <span className="text-sm text-[#7A8898]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[#7A8898] whitespace-nowrap">
                      {new Date(inv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3.5 text-sm font-bold text-[#0D1B2A]">
                      ${Number(inv.total).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLE[inv.status]}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        {sendMsg?.id === inv.id && (
                          <span className={`text-xs font-semibold ${sendMsg.ok ? 'text-green-600' : 'text-red-600'}`}>
                            {sendMsg.msg}
                          </span>
                        )}
                        <svg className="h-4 w-4 text-[#7A8898]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice detail modal */}
      {selectedInv && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setSelectedInv(null)}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-[#E8ECF0] shrink-0">
              <div>
                <h2 className="font-mono text-base font-bold text-[#0D1B2A]">{selectedInv.invoice_number}</h2>
                <p className="mt-0.5 text-xs text-[#7A8898]">{selectedInv.customers?.full_name ?? 'Unknown customer'}</p>
              </div>
              <button
                onClick={() => setSelectedInv(null)}
                className="rounded-lg p-1.5 text-[#7A8898] hover:bg-[#F4F6F9] transition shrink-0"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

              {/* Status + date row */}
              <div className="flex items-center justify-between">
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLE[currentStatus ?? selectedInv.status]}`}>
                  {currentStatus ?? selectedInv.status}
                </span>
                <span className="text-xs text-[#7A8898]">
                  {new Date(selectedInv.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>

              {/* Customer info */}
              {selectedInv.customers && (
                <div className="rounded-xl border border-[#E8ECF0] px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7A8898]">Customer</p>
                    <p className="mt-0.5 text-sm font-medium text-[#0D1B2A]">{selectedInv.customers.full_name}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7A8898]">Email</p>
                    <p className="mt-0.5 text-sm text-[#0D1B2A]">{selectedInv.customers.email}</p>
                  </div>
                </div>
              )}

              {/* Line items */}
              {invDetailLoading ? (
                <div className="flex items-center justify-center py-6 text-[#7A8898]">
                  <svg className="h-4 w-4 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-sm">Loading details…</span>
                </div>
              ) : invDetail && (
                <>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7A8898] mb-2">Line Items</p>
                    {invDetail.lineItems.length > 0 ? (
                      <div className="rounded-xl border border-[#E8ECF0] overflow-hidden">
                        <table className="min-w-full">
                          <thead>
                            <tr className="border-b border-[#E8ECF0] bg-[#F9FAFB]">
                              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-[#7A8898]">Description</th>
                              <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-[#7A8898]">Qty</th>
                              <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-[#7A8898]">Unit</th>
                              <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-[#7A8898]">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E8ECF0]">
                            {invDetail.lineItems.map((item) => (
                              <tr key={item.id}>
                                <td className="px-4 py-2.5">
                                  <p className="text-sm text-[#0D1B2A]">{item.description}</p>
                                  <span className={`text-[10px] font-semibold uppercase rounded px-1.5 py-0.5 ${item.type === 'labor' ? 'bg-blue-50 text-blue-600' : 'bg-[#B87333]/10 text-[#B87333]'}`}>
                                    {item.type}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-right text-sm text-[#7A8898]">{item.quantity}</td>
                                <td className="px-4 py-2.5 text-right text-sm text-[#7A8898]">${Number(item.unit_price).toFixed(2)}</td>
                                <td className="px-4 py-2.5 text-right text-sm font-semibold text-[#0D1B2A]">${Number(item.total).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-[#7A8898]">No line items.</p>
                    )}
                  </div>

                  {/* Totals */}
                  <div className="rounded-xl border border-[#E8ECF0] px-4 py-3 space-y-1.5">
                    <div className="flex justify-between text-sm text-[#7A8898]">
                      <span>Subtotal</span>
                      <span>${Number(invDetail.invoice.subtotal ?? selectedInv.subtotal).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold text-[#0D1B2A] border-t border-[#E8ECF0] pt-1.5">
                      <span>Total</span>
                      <span>${Number(selectedInv.total).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Payment link */}
                  {(invDetail.invoice as Record<string, unknown>).stripe_payment_link && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7A8898] mb-1">Payment Link</p>
                      <a
                        href={(invDetail.invoice as Record<string, unknown>).stripe_payment_link as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[#B87333] hover:underline break-all"
                      >
                        {(invDetail.invoice as Record<string, unknown>).stripe_payment_link as string}
                      </a>
                    </div>
                  )}
                </>
              )}

              {modalSendMsg && (
                <p className={`text-sm font-medium ${modalSendMsg.ok ? 'text-green-600' : 'text-red-600'}`}>
                  {modalSendMsg.msg}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-[#E8ECF0] px-6 py-4 flex items-center justify-between gap-3">
              <button
                onClick={() => setSelectedInv(null)}
                className="text-sm font-semibold text-[#7A8898] hover:text-[#0D1B2A] transition"
              >
                Close
              </button>
              <div className="flex items-center gap-2">
                {currentStatus !== 'paid' && (
                  <>
                    <button
                      onClick={() => handleSend(selectedInv, true)}
                      disabled={sending === selectedInv.id}
                      className="rounded-xl border border-[#E8ECF0] px-4 py-2.5 text-sm font-semibold text-[#0D1B2A] hover:border-[#B87333] hover:text-[#B87333] disabled:opacity-50 transition whitespace-nowrap"
                    >
                      {sending === selectedInv.id ? 'Sending…' : currentStatus === 'sent' ? 'Resend' : 'Send'}
                    </button>
                    <button
                      onClick={handleMarkPaid}
                      disabled={markingPaid}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#0D1B2A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1a2d40] disabled:opacity-50 transition whitespace-nowrap"
                    >
                      {markingPaid ? 'Saving…' : 'Mark as paid'}
                    </button>
                  </>
                )}
                {currentStatus === 'paid' && (
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-green-50 border border-green-200 px-4 py-2.5 text-sm font-semibold text-green-700">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Paid
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
