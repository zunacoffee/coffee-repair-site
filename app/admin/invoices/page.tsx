"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AddCustomerModal from '../components/AddCustomerModal'

type BizInfo = { name: string; address: string; phone: string; email: string }

type Invoice = {
  id: number
  invoice_number: string
  status: 'draft' | 'sent' | 'paid'
  subtotal: number
  total: number
  notes?: string | null
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
  invoice: Invoice
  lineItems: LineItem[]
}

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-500',
  sent:  'bg-violet-100 text-violet-800',
  paid:  'bg-green-100 text-green-800',
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', sent: 'Sent', paid: 'Paid',
}

function fmt(n: number | string) { return `$${Number(n).toFixed(2)}` }

function Spinner() {
  return (
    <div className="flex items-center gap-2 text-[#7A8898]">
      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span className="text-sm">Loading…</span>
    </div>
  )
}

export default function InvoicesPage() {
  const router = useRouter()
  const [invoices,        setInvoices]        = useState<Invoice[]>([])
  const [loading,         setLoading]         = useState(true)
  const [error,           setError]           = useState<string | null>(null)
  const [sending,         setSending]         = useState<number | null>(null)
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [biz,             setBiz]             = useState<BizInfo>({ name: 'Cafe Works', address: '', phone: '', email: '' })

  // Modal state
  const [selectedId,       setSelectedId]       = useState<number | null>(null)
  const [invDetail,        setInvDetail]        = useState<InvoiceDetail | null>(null)
  const [invDetailLoading, setInvDetailLoading] = useState(false)
  const [markingPaid,      setMarkingPaid]      = useState(false)
  const [modalMsg,         setModalMsg]         = useState<{ msg: string; ok: boolean } | null>(null)

  useEffect(() => {
    async function load() {
      const [invRes, settingsRes] = await Promise.allSettled([
        fetch('/api/admin/invoices'),
        fetch('/api/admin/site-settings'),
      ])

      if (invRes.status === 'fulfilled') {
        const r = invRes.value
        if (r.status === 401) { router.replace('/admin/login'); return }
        const j = await r.json()
        if (r.ok) setInvoices(j.invoices ?? [])
        else setError(j.error ?? 'Failed to load invoices')
      } else {
        setError('Network error')
      }

      if (settingsRes.status === 'fulfilled' && settingsRes.value.ok) {
        const j = await settingsRes.value.json()
        if (j?.settings) {
          setBiz({
            name:    j.settings.public_business_name || j.settings.business_name || 'Cafe Works',
            address: j.settings.address || '',
            phone:   j.settings.phone   || '',
            email:   j.settings.email   || '',
          })
        }
      }

      setLoading(false)
    }
    load()
  }, [router])

  const currentInv = selectedId ? (invoices.find((i) => i.id === selectedId) ?? null) : null

  const openModal = async (inv: Invoice) => {
    setSelectedId(inv.id)
    setInvDetail(null)
    setInvDetailLoading(true)
    setModalMsg(null)
    const res  = await fetch(`/api/admin/invoices/${inv.id}`)
    const json = await res.json()
    setInvDetailLoading(false)
    if (res.ok) setInvDetail(json)
  }

  const closeModal = () => { setSelectedId(null); setInvDetail(null) }

  const handleSend = async (inv: Invoice) => {
    if (!confirm(`Send invoice ${inv.invoice_number} to ${inv.customers?.email ?? 'customer'}?`)) return
    setSending(inv.id)
    setModalMsg(null)
    const res  = await fetch(`/api/admin/invoices/${inv.id}/send`, { method: 'POST' })
    const data = await res.json()
    setSending(null)
    const ok  = res.ok
    const msg = ok ? 'Invoice sent to customer.' : (data.error ?? 'Failed to send.')
    if (ok) {
      setInvoices((prev) => prev.map((i) => i.id === inv.id ? { ...i, status: 'sent' } : i))
    }
    setModalMsg({ msg, ok })
  }

  const handleMarkPaid = async () => {
    if (!currentInv) return
    setMarkingPaid(true)
    setModalMsg(null)
    const res  = await fetch(`/api/admin/invoices/${currentInv.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'paid' }),
    })
    const data = await res.json()
    setMarkingPaid(false)
    if (res.ok) {
      setInvoices((prev) => prev.map((i) => i.id === currentInv.id ? { ...i, status: 'paid' } : i))
      if (invDetail) setInvDetail((p) => p ? { ...p, invoice: { ...p.invoice, status: 'paid' } } : null)
      setModalMsg({ msg: 'Invoice marked as paid.', ok: true })
    } else {
      setModalMsg({ msg: data.error ?? 'Failed to update.', ok: false })
    }
  }

  const totals = invoices.reduce(
    (acc, inv) => { acc[inv.status] = (acc[inv.status] ?? 0) + Number(inv.total); return acc },
    {} as Record<string, number>,
  )

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Spinner />
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
            className="inline-flex items-center gap-2 rounded-xl border border-[#E8ECF0] bg-white px-4 py-2.5 text-sm font-semibold text-[#0D1B2A] hover:border-[#0D1B2A] transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Add Customer
          </button>
          <Link
            href="/admin/invoices/new"
            className="inline-flex items-center gap-2 rounded-xl bg-[#B87333] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Invoice
          </Link>
        </div>
      </div>

      <AddCustomerModal open={showAddCustomer} onClose={() => setShowAddCustomer(false)} />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#E8ECF0] border-l-4 border-l-blue-500 bg-white px-5 py-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#7A8898]">Outstanding</p>
          <p className="mt-2 text-2xl font-bold text-[#0D1B2A]">{fmt(totals.sent ?? 0)}</p>
          <p className="mt-1 text-xs text-[#7A8898]">{invoices.filter(i => i.status === 'sent').length} sent</p>
        </div>
        <div className="rounded-2xl border border-[#E8ECF0] border-l-4 border-l-green-500 bg-white px-5 py-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#7A8898]">Collected</p>
          <p className="mt-2 text-2xl font-bold text-[#0D1B2A]">{fmt(totals.paid ?? 0)}</p>
          <p className="mt-1 text-xs text-[#7A8898]">{invoices.filter(i => i.status === 'paid').length} paid</p>
        </div>
        <div className="rounded-2xl border border-[#E8ECF0] border-l-4 border-l-[#7A8898] bg-white px-5 py-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#7A8898]">Drafts</p>
          <p className="mt-2 text-2xl font-bold text-[#0D1B2A]">{fmt(totals.draft ?? 0)}</p>
          <p className="mt-1 text-xs text-[#7A8898]">{invoices.filter(i => i.status === 'draft').length} drafts</p>
        </div>
        <div className="rounded-2xl border border-[#E8ECF0] border-l-4 border-l-[#B87333] bg-white px-5 py-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#7A8898]">Total Invoiced</p>
          <p className="mt-2 text-2xl font-bold text-[#B87333]">{fmt(Object.values(totals).reduce((s, v) => s + v, 0))}</p>
          <p className="mt-1 text-xs text-[#7A8898]">{invoices.length} invoices</p>
        </div>
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
            <Link
              href="/admin/invoices/new"
              className="mt-4 rounded-xl bg-[#B87333] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition"
            >
              Create Invoice
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-[#E8ECF0] bg-[#E8ECF0]">
                  {['Invoice #', 'Customer', 'Date', 'Amount', 'Status', ''].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#0D1B2A]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8ECF0]">
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => openModal(inv)}
                    className="hover:bg-[#E8ECF0] cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-sm font-bold text-[#0D1B2A]">{inv.invoice_number}</span>
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
                      {fmt(inv.total)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[inv.status]}`}>
                        {STATUS_LABEL[inv.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end">
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

      {/* ── Invoice modal ─────────────────────────────────────────────────── */}
      {selectedId && currentInv && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[92dvh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Invoice header — dark band ───────────────────────────── */}
            <div className="shrink-0 rounded-t-2xl bg-[#0D1B2A] px-7 py-6 relative">
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 rounded-lg p-1.5 text-[#7A8898] hover:text-white hover:bg-white/10 transition"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="flex items-start justify-between pr-8">
                <div>
                  <p className="text-xl font-bold text-white">{biz.name}</p>
                  <p className="text-xs text-[#7A8898] mt-0.5">Professional Coffee Equipment Service</p>
                  {biz.address && <p className="text-xs text-[#7A8898] mt-1">{biz.address}</p>}
                  <div className="flex items-center gap-3 mt-0.5">
                    {biz.phone && <p className="text-xs text-[#7A8898]">{biz.phone}</p>}
                    {biz.email && <p className="text-xs text-[#7A8898]">{biz.email}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-2xl font-bold text-[#B87333]">{currentInv.invoice_number}</p>
                  <div className="mt-1 flex items-center justify-end gap-2">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[currentInv.status]}`}>
                      {STATUS_LABEL[currentInv.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#7A8898]">
                    {new Date(currentInv.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>

            {/* ── Bill To band ─────────────────────────────────────────── */}
            <div className="shrink-0 border-b border-[#E8ECF0] bg-[#E8ECF0] px-7 py-4">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#7A8898] mb-1.5">Bill To</p>
                  {currentInv.customers ? (
                    <>
                      <p className="text-sm font-bold text-[#0D1B2A]">{currentInv.customers.full_name}</p>
                      <p className="text-xs text-[#7A8898]">{currentInv.customers.email}</p>
                      {currentInv.customers.phone && (
                        <p className="text-xs text-[#7A8898]">{currentInv.customers.phone}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-[#7A8898]">—</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#7A8898] mb-1.5">Amount Due</p>
                  <p className="text-2xl font-bold text-[#B87333]">{fmt(currentInv.total)}</p>
                </div>
              </div>
            </div>

            {/* ── Scrollable body ───────────────────────────────────────── */}
            <div className="overflow-y-auto flex-1 px-7 py-5 space-y-5">

              {invDetailLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Spinner />
                </div>
              ) : invDetail && (
                <>
                  {/* Line items */}
                  {invDetail.lineItems.length > 0 ? (
                    <div>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b-2 border-[#0D1B2A]">
                            <th className="pb-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-[#7A8898]">Description</th>
                            <th className="pb-2.5 pr-2 text-right text-[10px] font-bold uppercase tracking-widest text-[#7A8898]">Qty</th>
                            <th className="pb-2.5 pr-2 text-right text-[10px] font-bold uppercase tracking-widest text-[#7A8898]">Unit Price</th>
                            <th className="pb-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-[#7A8898]">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invDetail.lineItems.map((item, idx) => (
                            <tr key={item.id} className={`${idx % 2 === 1 ? 'bg-[#E8ECF0]' : ''} border-b border-[#E8ECF0]`}>
                              <td className="py-3 pr-4">
                                <p className="font-medium text-[#0D1B2A]">{item.description}</p>
                                <span className={`inline-block text-[10px] font-bold uppercase px-1.5 py-0.5 rounded mt-0.5 ${
                                  item.type === 'labor'
                                    ? 'bg-[#0D1B2A]/8 text-[#0D1B2A]'
                                    : 'bg-[#B87333]/10 text-[#B87333]'
                                }`}>
                                  {item.type}
                                </span>
                              </td>
                              <td className="py-3 pr-2 text-right text-[#7A8898] tabular-nums">{item.quantity}</td>
                              <td className="py-3 pr-2 text-right text-[#7A8898] tabular-nums">{fmt(item.unit_price)}</td>
                              <td className="py-3 text-right font-semibold text-[#0D1B2A] tabular-nums">{fmt(item.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Totals */}
                      <div className="mt-3 flex flex-col items-end gap-1">
                        <div className="flex justify-between w-52 text-sm text-[#7A8898]">
                          <span>Subtotal</span>
                          <span className="tabular-nums">{fmt(invDetail.invoice.subtotal ?? currentInv.subtotal)}</span>
                        </div>
                        <div className="flex justify-between w-52 border-t-2 border-[#0D1B2A] pt-2 mt-0.5">
                          <span className="text-base font-bold text-[#0D1B2A]">Total Due</span>
                          <span className="text-xl font-bold text-[#B87333] tabular-nums">{fmt(currentInv.total)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-[#7A8898]">No line items.</p>
                  )}

                  {/* Notes */}
                  {invDetail.invoice.notes && (
                    <div className="rounded-xl border border-[#E8ECF0] bg-[#E8ECF0] px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#7A8898] mb-1">Notes</p>
                      <p className="text-sm text-[#0D1B2A] whitespace-pre-wrap">{invDetail.invoice.notes}</p>
                    </div>
                  )}

                  {/* Pay online button */}
                  {invDetail.invoice.stripe_payment_link && currentInv.status !== 'paid' && (
                    <a
                      href={invDetail.invoice.stripe_payment_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 rounded-xl bg-[#B87333] px-4 py-3 text-sm font-semibold text-white hover:opacity-90 transition"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      Pay Online — {fmt(currentInv.total)}
                    </a>
                  )}

                  {currentInv.status === 'paid' && (
                    <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 flex items-center gap-2">
                      <svg className="h-5 w-5 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm font-semibold text-green-700">Payment received — thank you!</p>
                    </div>
                  )}
                </>
              )}

              {modalMsg && (
                <p className={`text-sm font-medium ${modalMsg.ok ? 'text-green-600' : 'text-red-600'}`}>
                  {modalMsg.msg}
                </p>
              )}
            </div>

            {/* ── Footer actions ────────────────────────────────────────── */}
            <div className="shrink-0 rounded-b-2xl border-t border-[#E8ECF0] bg-[#E8ECF0] px-6 py-4">
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                <button
                  onClick={closeModal}
                  className="text-sm font-semibold text-[#7A8898] hover:text-[#0D1B2A] transition py-2"
                >
                  Close
                </button>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  {/* Print */}
                  <a
                    href={`/admin/invoices/${currentInv.id}/print`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#E8ECF0] bg-white px-4 py-2.5 text-sm font-semibold text-[#0D1B2A] hover:border-[#0D1B2A] transition whitespace-nowrap"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print / PDF
                  </a>

                  {currentInv.status !== 'paid' && (
                    <>
                      {/* Send email */}
                      <button
                        onClick={() => handleSend(currentInv)}
                        disabled={sending === currentInv.id}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#E8ECF0] bg-white px-4 py-2.5 text-sm font-semibold text-[#0D1B2A] hover:border-[#B87333] hover:text-[#B87333] disabled:opacity-50 transition whitespace-nowrap"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {sending === currentInv.id ? 'Sending…' : currentInv.status === 'sent' ? 'Resend' : 'Send Email'}
                      </button>

                      {/* Mark paid */}
                      <button
                        onClick={handleMarkPaid}
                        disabled={markingPaid}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#0D1B2A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#152436] disabled:opacity-50 transition whitespace-nowrap"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {markingPaid ? 'Saving…' : 'Mark Paid'}
                      </button>
                    </>
                  )}

                  {currentInv.status === 'paid' && (
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
        </div>
      )}
    </div>
  )
}
