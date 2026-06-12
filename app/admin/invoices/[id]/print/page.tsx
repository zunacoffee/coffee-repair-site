'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'

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

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-500',
  sent:  'bg-violet-100 text-violet-800',
  paid:  'bg-green-100 text-green-800',
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', sent: 'Sent', paid: 'Paid',
}

function fmt(n: number | string) { return `$${Number(n).toFixed(2)}` }

export default function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [invoice,   setInvoice]   = useState<Invoice | null>(null)
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [biz,       setBiz]       = useState<BizInfo>({ name: 'Cafe Works', address: '', phone: '', email: '' })
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)

  useEffect(() => {
    Promise.allSettled([
      fetch(`/api/admin/invoices/${id}`),
      fetch('/api/admin/site-settings'),
    ]).then(async ([invResult, settingsResult]) => {
      if (invResult.status === 'rejected' || !invResult.value.ok) {
        setError('Invoice not found.')
        setLoading(false)
        return
      }
      const invData = await invResult.value.json()
      setInvoice(invData.invoice)
      setLineItems(invData.lineItems ?? [])

      if (settingsResult.status === 'fulfilled' && settingsResult.value.ok) {
        const j = await settingsResult.value.json()
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
    })
  }, [id])

  const dateStr = invoice
    ? new Date(invoice.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : ''

  return (
    <>
      {/* Print styles — hide the admin sidebar, topbar, and action bar */}
      <style>{`
        @media print {
          aside { display: none !important; }
          .no-print { display: none !important; }
          body, html { background: white !important; margin: 0 !important; padding: 0 !important; }
          main { overflow: visible !important; }
          .print-page { box-shadow: none !important; }
        }
        @media screen {
          .print-url { display: none; }
        }
      `}</style>

      {/* Action bar — hidden when printing */}
      <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-[#E8ECF0] bg-white px-6 py-3 shadow-sm">
        <Link
          href="/admin/invoices"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#7A8898] hover:text-[#0D1B2A] transition"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Invoices
        </Link>
        {invoice && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#7A8898]">
              {invoice.invoice_number} — {invoice.customers?.full_name ?? 'Unknown'}
            </span>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0D1B2A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#152436] transition"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print / Save PDF
            </button>
          </div>
        )}
      </div>

      {/* Print area */}
      <div className="min-h-screen bg-[#E8ECF0] py-8 px-4 print-page">
        {loading ? (
          <div className="flex items-center justify-center py-24 no-print">
            <div className="flex items-center gap-2 text-[#7A8898]">
              <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm">Loading invoice…</span>
            </div>
          </div>
        ) : error ? (
          <div className="no-print mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>
        ) : invoice ? (
          <div className="mx-auto max-w-3xl bg-white shadow-lg rounded-2xl overflow-hidden">

            {/* ── Invoice header ───────────────────────────────────────── */}
            <div className="bg-[#0D1B2A] px-10 py-8">
              <div className="flex items-start justify-between">
                {/* Business info */}
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">{biz.name}</h1>
                  <p className="text-sm text-[#7A8898] mt-0.5">Professional Coffee Equipment Service</p>
                  {biz.address && (
                    <p className="text-xs text-[#7A8898] mt-3">{biz.address}</p>
                  )}
                  <div className="mt-1 space-y-0.5">
                    {biz.phone && <p className="text-xs text-[#7A8898]">{biz.phone}</p>}
                    {biz.email && <p className="text-xs text-[#7A8898]">{biz.email}</p>}
                  </div>
                </div>
                {/* Invoice number */}
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#7A8898]">Invoice</p>
                  <p className="font-mono text-3xl font-bold text-[#B87333] mt-0.5">{invoice.invoice_number}</p>
                  <div className="mt-2">
                    <span className={`inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${STATUS_STYLE[invoice.status]}`}>
                      {STATUS_LABEL[invoice.status]}
                    </span>
                  </div>
                  <p className="text-xs text-[#7A8898] mt-1.5">Date: {dateStr}</p>
                </div>
              </div>
            </div>

            {/* ── Bill To + Amount ─────────────────────────────────────── */}
            <div className="border-b border-[#E8ECF0] bg-[#E8ECF0] px-10 py-6">
              <div className="grid grid-cols-2 gap-12">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#7A8898] mb-2">Bill To</p>
                  {invoice.customers ? (
                    <div className="space-y-0.5">
                      <p className="font-bold text-[#0D1B2A]">{invoice.customers.full_name}</p>
                      <p className="text-sm text-[#7A8898]">{invoice.customers.email}</p>
                      {invoice.customers.phone && (
                        <p className="text-sm text-[#7A8898]">{invoice.customers.phone}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-[#7A8898]">—</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#7A8898] mb-2">Amount Due</p>
                  <p className="text-4xl font-bold text-[#B87333]">{fmt(invoice.total)}</p>
                  {invoice.status === 'paid' && (
                    <p className="text-xs font-semibold text-green-600 mt-1">PAID</p>
                  )}
                </div>
              </div>
            </div>

            {/* ── Line items ───────────────────────────────────────────── */}
            <div className="px-10 py-6">
              {lineItems.length > 0 ? (
                <>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b-2 border-[#0D1B2A]">
                        <th className="pb-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#7A8898]">Description</th>
                        <th className="pb-3 pr-4 text-right text-[10px] font-bold uppercase tracking-widest text-[#7A8898]">Qty</th>
                        <th className="pb-3 pr-4 text-right text-[10px] font-bold uppercase tracking-widest text-[#7A8898]">Unit Price</th>
                        <th className="pb-3 text-right text-[10px] font-bold uppercase tracking-widest text-[#7A8898]">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item, idx) => (
                        <tr
                          key={item.id}
                          className={`border-b border-[#E8ECF0] ${idx % 2 === 1 ? 'bg-[#E8ECF0]' : 'bg-white'}`}
                        >
                          <td className="py-3.5 pr-4">
                            <p className="font-medium text-[#0D1B2A]">{item.description}</p>
                            <span className={`inline-block text-[10px] font-bold uppercase px-1.5 py-0.5 rounded mt-0.5 ${
                              item.type === 'labor'
                                ? 'bg-[#0D1B2A]/8 text-[#0D1B2A]'
                                : 'bg-[#B87333]/10 text-[#B87333]'
                            }`}>
                              {item.type}
                            </span>
                          </td>
                          <td className="py-3.5 pr-4 text-right tabular-nums text-[#7A8898]">{item.quantity}</td>
                          <td className="py-3.5 pr-4 text-right tabular-nums text-[#7A8898]">{fmt(item.unit_price)}</td>
                          <td className="py-3.5 text-right tabular-nums font-semibold text-[#0D1B2A]">{fmt(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Totals */}
                  <div className="mt-5 flex flex-col items-end gap-1.5">
                    <div className="flex w-64 items-center justify-between text-sm text-[#7A8898]">
                      <span>Subtotal</span>
                      <span className="tabular-nums">{fmt(invoice.subtotal)}</span>
                    </div>
                    <div className="flex w-64 items-center justify-between border-t-2 border-[#0D1B2A] pt-2.5">
                      <span className="text-base font-bold text-[#0D1B2A]">Total Due</span>
                      <span className="text-2xl font-bold text-[#B87333] tabular-nums">{fmt(invoice.total)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-[#7A8898]">No line items on this invoice.</p>
              )}

              {/* Notes */}
              {invoice.notes && (
                <div className="mt-6 rounded-xl border border-[#E8ECF0] bg-[#E8ECF0] px-5 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#7A8898] mb-1.5">Notes</p>
                  <p className="text-sm text-[#0D1B2A] whitespace-pre-wrap">{invoice.notes}</p>
                </div>
              )}
            </div>

            {/* ── Payment section ─────────────────────────────────────── */}
            <div className="px-10 pb-10">
              {invoice.status === 'paid' ? (
                <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-center">
                  <svg className="mx-auto h-6 w-6 text-green-500 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-bold text-green-700">Payment Received</p>
                  <p className="text-xs text-green-600 mt-0.5">Thank you for your prompt payment!</p>
                </div>
              ) : (
                <div className="rounded-xl border-2 border-[#B87333]/20 bg-[#B87333]/5 px-6 py-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#7A8898] mb-1">Payment Instructions</p>
                  <p className="text-sm text-[#0D1B2A] mb-3">
                    Please remit payment by bank transfer, credit card, or use the secure online link below.
                    {biz.email && ` Contact us at ${biz.email} with any questions.`}
                  </p>
                  {invoice.stripe_payment_link && (
                    <>
                      {/* Screen: clickable button */}
                      <a
                        href={invoice.stripe_payment_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="no-print inline-flex items-center gap-2 rounded-xl bg-[#B87333] px-6 py-3 text-sm font-bold text-white hover:opacity-90 transition shadow-sm"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        Pay Online — {fmt(invoice.total)}
                      </a>
                      {/* Print: plain URL */}
                      <p className="print-url text-xs text-[#7A8898] break-all">
                        Pay online: {invoice.stripe_payment_link}
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* ── Footer ──────────────────────────────────────────────── */}
            <div className="border-t border-[#E8ECF0] bg-[#E8ECF0] px-10 py-5 text-center">
              <p className="text-sm font-semibold text-[#0D1B2A]">{biz.name}</p>
              <p className="text-xs text-[#7A8898] mt-0.5">Thank you for your business!</p>
              <div className="mt-1 flex items-center justify-center gap-4 text-xs text-[#7A8898]">
                {biz.phone && <span>{biz.phone}</span>}
                {biz.email && <span>{biz.email}</span>}
                {biz.address && <span>{biz.address}</span>}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  )
}
