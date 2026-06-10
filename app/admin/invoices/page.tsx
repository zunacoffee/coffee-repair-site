"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Invoice = {
  id: number
  invoice_number: string
  status: 'draft' | 'sent' | 'paid'
  subtotal: number
  total: number
  created_at: string
  customers: { id: number; full_name: string; email: string } | null
}

const STATUS_STYLE = {
  draft: 'bg-gray-100 text-gray-600',
  sent:  'bg-blue-100 text-blue-700',
  paid:  'bg-green-100 text-green-700',
}

export default function InvoicesPage() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [sending,  setSending]  = useState<number | null>(null)
  const [sendMsg,  setSendMsg]  = useState<{ id: number; msg: string; ok: boolean } | null>(null)

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

  const handleSend = async (inv: Invoice) => {
    if (!confirm(`Send invoice ${inv.invoice_number} to ${inv.customers?.email ?? 'customer'}?`)) return
    setSending(inv.id); setSendMsg(null)
    const res  = await fetch(`/api/admin/invoices/${inv.id}/send`, { method: 'POST' })
    const data = await res.json()
    setSending(null)
    if (res.ok) {
      setInvoices((prev) => prev.map((i) => i.id === inv.id ? { ...i, status: 'sent' } : i))
      setSendMsg({ id: inv.id, msg: 'Invoice sent!', ok: true })
    } else {
      setSendMsg({ id: inv.id, msg: data.error ?? 'Failed to send', ok: false })
    }
    setTimeout(() => setSendMsg(null), 4000)
  }

  const totals = invoices.reduce(
    (acc, inv) => {
      acc[inv.status] = (acc[inv.status] ?? 0) + Number(inv.total)
      return acc
    },
    {} as Record<string, number>
  )

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
        <Link
          href="/admin/invoices/new"
          className="inline-flex items-center gap-2 rounded-xl bg-[#B87333] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#a0632b] transition self-start sm:self-auto"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Invoice
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Outstanding', amount: (totals.sent ?? 0), color: 'border-l-blue-500' },
          { label: 'Collected',   amount: (totals.paid ?? 0), color: 'border-l-green-500' },
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
                  <tr key={inv.id} className="hover:bg-[#F9FAFB]">
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-semibold text-[#0D1B2A] font-mono">{inv.invoice_number}</span>
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
                        {inv.status !== 'paid' && (
                          <button
                            onClick={() => handleSend(inv)}
                            disabled={sending === inv.id}
                            className="rounded-lg border border-[#E8ECF0] px-3 py-1.5 text-xs font-semibold text-[#0D1B2A] hover:border-[#B87333] hover:text-[#B87333] disabled:opacity-50 transition whitespace-nowrap"
                          >
                            {sending === inv.id ? 'Sending…' : inv.status === 'sent' ? 'Resend' : 'Send'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
