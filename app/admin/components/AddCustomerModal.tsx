"use client"

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

type NewCustomer = { id: number; full_name: string; email: string }
type EquipmentRow = { equipment_type: string; brand: string; model: string; serial_number: string }

interface Props {
  open: boolean
  onClose: () => void
  onAdded?: (customer: NewCustomer) => void
}

const EMPTY_CUSTOMER = { full_name: '', email: '', phone: '', street: '', city: '', state: '', zip: '' }
const EMPTY_EQ = (): EquipmentRow => ({ equipment_type: '', brand: '', model: '', serial_number: '' })

export default function AddCustomerModal({ open, onClose, onAdded }: Props) {
  const [form,         setForm]         = useState(EMPTY_CUSTOMER)
  const [equipRows,    setEquipRows]    = useState<EquipmentRow[]>([])
  const [showEquip,    setShowEquip]    = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [added,        setAdded]        = useState<NewCustomer | null>(null)
  const [addedEquip,   setAddedEquip]   = useState(0)
  const firstInputRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setForm(EMPTY_CUSTOMER)
      setEquipRows([])
      setShowEquip(false)
      setError(null)
      setAdded(null)
      setAddedEquip(0)
      setSaving(false)
      setTimeout(() => firstInputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const setField = (field: keyof typeof EMPTY_CUSTOMER) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))

  const setEqField = (index: number, field: keyof EquipmentRow) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setEquipRows((rows) => rows.map((r, i) => i === index ? { ...r, [field]: e.target.value } : r))

  const addEquipRow = () => {
    setEquipRows((rows) => [...rows, EMPTY_EQ()])
    setShowEquip(true)
  }

  const removeEquipRow = (index: number) => {
    setEquipRows((rows) => {
      const next = rows.filter((_, i) => i !== index)
      if (next.length === 0) setShowEquip(false)
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    // 1. Create customer
    const custRes  = await fetch('/api/admin/customers', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(form),
    })
    const custData = await custRes.json()
    if (!custRes.ok) { setError(custData.error ?? 'Failed to add customer.'); setSaving(false); return }

    const customer: NewCustomer = custData.customer ?? { id: 0, full_name: form.full_name, email: form.email }

    // 2. Create equipment records in parallel (skip blank rows)
    const validRows = equipRows.filter((r) => r.equipment_type && r.brand && r.model)
    if (validRows.length > 0 && customer.id) {
      await Promise.all(
        validRows.map((row) =>
          fetch(`/api/admin/customers/${customer.id}/equipment`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(row),
          })
        )
      )
    }

    setSaving(false)
    setAddedEquip(validRows.length)
    setAdded(customer)
    onAdded?.(customer)
  }

  const inputCls =
    'block w-full rounded-xl border border-[#E8ECF0] bg-[#E8ECF0] px-4 py-2.5 text-sm text-[#0D1B2A] placeholder:text-[#7A8898] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20'
  const labelCls = 'block text-sm font-semibold text-[#0D1B2A] mb-1'
  const eqInputCls =
    'block w-full rounded-lg border border-[#E8ECF0] bg-white px-3 py-2 text-sm text-[#0D1B2A] placeholder:text-[#7A8898] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E8ECF0] px-6 py-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#B87333]/10">
              <svg className="h-4 w-4 text-[#B87333]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </span>
            <h2 className="text-base font-bold text-[#0D1B2A]">Add Customer</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#7A8898] hover:bg-[#E8ECF0] hover:text-[#0D1B2A] transition" aria-label="Close">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-6 py-5">
          {added ? (
            /* ── Success state ── */
            <div className="text-center py-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-base font-bold text-[#0D1B2A]">{added.full_name} added!</p>
              <p className="mt-1 text-sm text-[#7A8898]">{added.email}</p>
              {addedEquip > 0 && (
                <p className="mt-1 text-xs text-[#B87333] font-semibold">
                  {addedEquip} piece{addedEquip !== 1 ? 's' : ''} of equipment registered
                </p>
              )}
              <div className="mt-6 flex flex-col gap-2">
                <Link
                  href="/admin/invoices/new"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#B87333] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Create Invoice for {added.full_name.split(' ')[0]}
                </Link>
                <button
                  onClick={onClose}
                  className="rounded-xl border border-[#E8ECF0] px-5 py-2.5 text-sm font-semibold text-[#0D1B2A] hover:bg-[#E8ECF0] transition"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* ── Form ── */
            <form id="add-customer-form" onSubmit={handleSubmit} className="space-y-3">

              {/* Customer fields */}
              <div>
                <label htmlFor="addcust-full-name" className={labelCls}>Full name <span className="text-red-500">*</span></label>
                <input id="addcust-full-name" ref={firstInputRef} required value={form.full_name} onChange={setField('full_name')} placeholder="Jane Smith" className={inputCls} />
              </div>
              <div>
                <label htmlFor="addcust-email" className={labelCls}>Email <span className="text-red-500">*</span></label>
                <input id="addcust-email" required type="email" value={form.email} onChange={setField('email')} placeholder="jane@example.com" className={inputCls} />
              </div>
              <div>
                <label htmlFor="addcust-phone" className={labelCls}>Phone <span className="text-red-500">*</span></label>
                <input id="addcust-phone" required type="tel" value={form.phone} onChange={setField('phone')} placeholder="(555) 000-0000" className={inputCls} />
              </div>
              <div>
                <label htmlFor="addcust-street" className={labelCls}>Street Address <span className="text-red-500">*</span></label>
                <input id="addcust-street" required value={form.street} onChange={setField('street')} placeholder="123 Main St" className={inputCls} />
              </div>
              <div>
                <label htmlFor="addcust-city" className={labelCls}>City <span className="text-red-500">*</span></label>
                <input id="addcust-city" required value={form.city} onChange={setField('city')} placeholder="Portland" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="addcust-state" className={labelCls}>State</label>
                  <input id="addcust-state" value={form.state} onChange={setField('state')} placeholder="OR" maxLength={2} className={inputCls} />
                </div>
                <div>
                  <label htmlFor="addcust-zip" className={labelCls}>ZIP</label>
                  <input id="addcust-zip" value={form.zip} onChange={setField('zip')} placeholder="97201" maxLength={10} className={inputCls} />
                </div>
              </div>

              {/* Equipment section */}
              <div className="pt-2">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 border-t border-[#E8ECF0]" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-[#7A8898]">Equipment <span className="normal-case font-normal">(optional)</span></span>
                  <div className="flex-1 border-t border-[#E8ECF0]" />
                </div>

                {/* Equipment rows */}
                {equipRows.length > 0 && (
                  <div className="space-y-3 mb-3">
                    {equipRows.map((row, i) => (
                      <div key={i} className="rounded-xl border border-[#E8ECF0] bg-[#E8ECF0] p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-[#7A8898]">Equipment {i + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeEquipRow(i)}
                            className="rounded-md p-0.5 text-[#7A8898] hover:bg-red-50 hover:text-red-500 transition"
                            aria-label="Remove"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label htmlFor={`addcust-eq-type-${i}`} className="block text-xs font-medium text-[#7A8898] mb-1">Type</label>
                            <input id={`addcust-eq-type-${i}`} value={row.equipment_type} onChange={setEqField(i, 'equipment_type')} placeholder="Espresso Machine" className={eqInputCls} />
                          </div>
                          <div>
                            <label htmlFor={`addcust-eq-brand-${i}`} className="block text-xs font-medium text-[#7A8898] mb-1">Brand</label>
                            <input id={`addcust-eq-brand-${i}`} value={row.brand} onChange={setEqField(i, 'brand')} placeholder="La Marzocco" className={eqInputCls} />
                          </div>
                          <div>
                            <label htmlFor={`addcust-eq-model-${i}`} className="block text-xs font-medium text-[#7A8898] mb-1">Model</label>
                            <input id={`addcust-eq-model-${i}`} value={row.model} onChange={setEqField(i, 'model')} placeholder="Linea Mini" className={eqInputCls} />
                          </div>
                          <div>
                            <label htmlFor={`addcust-eq-serial-${i}`} className="block text-xs font-medium text-[#7A8898] mb-1">Serial # <span className="font-normal">(optional)</span></label>
                            <input id={`addcust-eq-serial-${i}`} value={row.serial_number} onChange={setEqField(i, 'serial_number')} placeholder="LM-12345" className={eqInputCls} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={addEquipRow}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#B87333]/40 py-2.5 text-sm font-semibold text-[#B87333] hover:border-[#B87333] hover:bg-[#B87333]/5 transition"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  {equipRows.length === 0 ? 'Add Equipment' : 'Add Another'}
                </button>
              </div>

              {error && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
              )}
            </form>
          )}
        </div>

        {/* Footer — only shown on form state */}
        {!added && (
          <div className="shrink-0 flex gap-2 border-t border-[#E8ECF0] px-6 py-4">
            <button
              type="submit"
              form="add-customer-form"
              disabled={saving}
              className="flex-1 rounded-xl bg-[#B87333] py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition"
            >
              {saving ? 'Saving…' : equipRows.filter((r) => r.equipment_type || r.brand).length > 0
                ? `Add Customer + ${equipRows.filter((r) => r.equipment_type || r.brand).length} Equipment`
                : 'Add Customer'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#E8ECF0] px-4 py-2.5 text-sm font-semibold text-[#0D1B2A] hover:bg-[#E8ECF0] transition"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
