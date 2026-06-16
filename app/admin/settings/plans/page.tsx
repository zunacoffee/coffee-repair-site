'use client'
import Link from 'next/link'
import { useEffect, useState, useRef } from 'react'

interface PlanSetting {
  id: number
  plan_key: string
  name: string
  description: string
  price: number
  features: string[]
  stripe_price_id: string
  stripe_product_id: string
  is_active: boolean
  updated_at: string
}

const KEY_LABELS: Record<string, string> = { basic: 'Basic', standard: 'Standard', premium: 'Premium' }

export default function PlanSettingsPage() {
  const [plans, setPlans] = useState<PlanSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)

  // Per-plan edit state
  const [edits, setEdits] = useState<Record<number, Partial<PlanSetting>>>({})
  const [newFeature, setNewFeature] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState<Record<number, boolean>>({})
  const [msgs, setMsgs] = useState<Record<number, { ok: boolean; text: string }>>({})
  const [toggling, setToggling] = useState<Record<number, boolean>>({})

  const priceTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    fetch('/api/admin/plan-settings', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        const ps: PlanSetting[] = d.plans ?? []
        setPlans(ps)
        const initEdits: Record<number, Partial<PlanSetting>> = {}
        ps.forEach(p => { initEdits[p.id] = { name: p.name, description: p.description, price: p.price, features: [...(p.features ?? [])] } })
        setEdits(initEdits)
        if (ps.length > 0) setExpanded(ps[0].id)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function setField(id: number, field: keyof PlanSetting, value: unknown) {
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
    clearMsg(id)
  }

  function clearMsg(id: number) {
    setMsgs(prev => { const n = { ...prev }; delete n[id]; return n })
  }

  function addFeature(id: number) {
    const text = (newFeature[id] ?? '').trim()
    if (!text) return
    const current = edits[id]?.features ?? []
    setField(id, 'features', [...current, text])
    setNewFeature(prev => ({ ...prev, [id]: '' }))
  }

  function removeFeature(id: number, idx: number) {
    const current = [...(edits[id]?.features ?? [])]
    current.splice(idx, 1)
    setField(id, 'features', current)
  }

  async function handleSave(id: number) {
    setSaving(prev => ({ ...prev, [id]: true }))
    clearMsg(id)
    const plan = plans.find(p => p.id === id)
    const edit = edits[id] ?? {}

    const payload: Record<string, unknown> = {
      name:        edit.name,
      description: edit.description,
      features:    edit.features,
    }

    const priceChanged = Number(edit.price) !== Number(plan?.price)
    if (priceChanged) {
      payload.price = Number(edit.price)
    }

    const res = await fetch(`/api/admin/plan-settings/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    setSaving(prev => ({ ...prev, [id]: false }))

    if (!res.ok) {
      setMsgs(prev => ({ ...prev, [id]: { ok: false, text: data.error ?? 'Save failed.' } }))
      return
    }

    setPlans(prev => prev.map(p => p.id === id ? data.plan : p))
    const updated: PlanSetting = data.plan
    setEdits(prev => ({ ...prev, [id]: { name: updated.name, description: updated.description, price: updated.price, features: [...(updated.features ?? [])] } }))
    const msg = priceChanged
      ? 'Saved — new Stripe price created and old price archived.'
      : 'Saved successfully.'
    setMsgs(prev => ({ ...prev, [id]: { ok: true, text: msg } }))
  }

  async function handleToggle(id: number, current: boolean) {
    setToggling(prev => ({ ...prev, [id]: true }))
    clearMsg(id)
    const res = await fetch(`/api/admin/plan-settings/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    })
    const data = await res.json()
    setToggling(prev => ({ ...prev, [id]: false }))
    if (res.ok) {
      setPlans(prev => prev.map(p => p.id === id ? data.plan : p))
      setMsgs(prev => ({ ...prev, [id]: { ok: true, text: `Plan ${!current ? 'activated' : 'deactivated'}.` } }))
    } else {
      setMsgs(prev => ({ ...prev, [id]: { ok: false, text: data.error ?? 'Toggle failed.' } }))
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-[#E8ECF0] flex items-center justify-center text-[#7A8898]">Loading…</div>
  }

  return (
    <div className="min-h-screen bg-[#E8ECF0] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/admin/settings" className="inline-flex items-center gap-1 text-sm font-medium text-[#7A8898] hover:text-[#0D1B2A] transition">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            Back
          </Link>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#7A8898] mt-3">Settings</p>
          <h1 className="text-2xl font-bold text-[#0D1B2A] mt-1">Maintenance Plans</h1>
          <p className="text-sm text-[#7A8898] mt-1">Edit plan names, descriptions, features, and pricing. Price changes automatically create a new Stripe price.</p>
        </div>

        <div className="space-y-4">
          {plans.map(plan => {
            const edit = edits[plan.id] ?? {}
            const isOpen = expanded === plan.id
            const isSaving = saving[plan.id] ?? false
            const isToggling = toggling[plan.id] ?? false
            const msg = msgs[plan.id]
            const features: string[] = edit.features ?? []

            return (
              <div key={plan.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {/* Header */}
                <div
                  className="flex items-center justify-between px-6 py-4 cursor-pointer select-none"
                  onClick={() => setExpanded(isOpen ? null : plan.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${plan.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <div>
                      <span className="font-semibold text-[#0D1B2A]">{plan.name}</span>
                      <span className="ml-3 text-xs text-[#7A8898]">{KEY_LABELS[plan.plan_key] ?? plan.plan_key}</span>
                    </div>
                    <span className="ml-2 text-sm font-bold text-[#B87333]">${Number(plan.price).toFixed(2)}/mo</span>
                    {!plan.is_active && (
                      <span className="ml-2 bg-gray-100 text-gray-500 text-xs font-semibold px-2 py-0.5 rounded-full">Inactive</span>
                    )}
                  </div>
                  <svg
                    className={`h-5 w-5 text-[#7A8898] transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {/* Body */}
                {isOpen && (
                  <div className="px-6 pb-6 border-t border-[#E8ECF0] pt-5 space-y-5">

                    {/* Active toggle */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[#0D1B2A]">Plan active</p>
                        <p className="text-xs text-[#7A8898]">Inactive plans are hidden from the public pricing page.</p>
                      </div>
                      <button
                        onClick={() => handleToggle(plan.id, plan.is_active)}
                        disabled={isToggling}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${plan.is_active ? 'bg-[#B87333]' : 'bg-gray-200'} disabled:opacity-60`}
                      >
                        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${plan.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Name */}
                      <div>
                        <label htmlFor={`plan-name-${plan.id}`} className="block text-xs font-semibold text-[#7A8898] uppercase tracking-wide mb-1">Plan Name</label>
                        <input
                          id={`plan-name-${plan.id}`}
                          type="text"
                          value={edit.name ?? ''}
                          onChange={e => setField(plan.id, 'name', e.target.value)}
                          className="w-full border border-[#E8ECF0] rounded-xl px-3 py-2.5 text-sm text-[#0D1B2A] focus:outline-none focus:ring-2 focus:ring-[#B87333]"
                        />
                      </div>

                      {/* Price */}
                      <div>
                        <label htmlFor={`plan-price-${plan.id}`} className="block text-xs font-semibold text-[#7A8898] uppercase tracking-wide mb-1">
                          Price ($/month)
                          {Number(edit.price) !== Number(plan.price) && (
                            <span className="ml-2 text-amber-600 font-normal normal-case">⚠ Will create new Stripe price</span>
                          )}
                        </label>
                        <input
                          id={`plan-price-${plan.id}`}
                          type="number"
                          min="1"
                          step="0.01"
                          value={edit.price ?? ''}
                          onChange={e => setField(plan.id, 'price', e.target.value)}
                          className="w-full border border-[#E8ECF0] rounded-xl px-3 py-2.5 text-sm text-[#0D1B2A] focus:outline-none focus:ring-2 focus:ring-[#B87333]"
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label htmlFor={`plan-description-${plan.id}`} className="block text-xs font-semibold text-[#7A8898] uppercase tracking-wide mb-1">Description</label>
                      <textarea
                        id={`plan-description-${plan.id}`}
                        value={edit.description ?? ''}
                        onChange={e => setField(plan.id, 'description', e.target.value)}
                        rows={2}
                        className="w-full border border-[#E8ECF0] rounded-xl px-3 py-2.5 text-sm text-[#0D1B2A] resize-none focus:outline-none focus:ring-2 focus:ring-[#B87333]"
                      />
                    </div>

                    {/* Features */}
                    <div>
                      <label className="block text-xs font-semibold text-[#7A8898] uppercase tracking-wide mb-2">Features</label>
                      <div className="space-y-2 mb-3">
                        {features.map((f, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-[#E8ECF0] rounded-xl px-3 py-2">
                            <span className="text-[#B87333] text-sm">•</span>
                            <span className="flex-1 text-sm text-[#0D1B2A]">{f}</span>
                            <button
                              onClick={() => removeFeature(plan.id, idx)}
                              className="text-[#7A8898] hover:text-red-500 text-xs transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        {features.length === 0 && (
                          <p className="text-xs text-[#7A8898] italic">No features added yet.</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newFeature[plan.id] ?? ''}
                          onChange={e => setNewFeature(prev => ({ ...prev, [plan.id]: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFeature(plan.id) } }}
                          placeholder="Add a feature…"
                          className="flex-1 border border-[#E8ECF0] rounded-xl px-3 py-2 text-sm text-[#0D1B2A] focus:outline-none focus:ring-2 focus:ring-[#B87333]"
                        />
                        <button
                          onClick={() => addFeature(plan.id)}
                          disabled={!(newFeature[plan.id] ?? '').trim()}
                          className="bg-[#E8ECF0] hover:bg-[#0D1B2A] hover:text-white text-[#0D1B2A] font-semibold px-4 rounded-xl text-sm transition-colors disabled:opacity-40"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {/* Stripe info */}
                    <div className="rounded-xl bg-[#E8ECF0] px-4 py-3 text-xs text-[#7A8898] space-y-0.5">
                      <p><span className="font-semibold">Stripe Price ID:</span> {plan.stripe_price_id || '—'}</p>
                      <p><span className="font-semibold">Stripe Product ID:</span> {plan.stripe_product_id || '—'}</p>
                      <p><span className="font-semibold">Last updated:</span> {plan.updated_at ? new Date(plan.updated_at).toLocaleString() : '—'}</p>
                    </div>

                    {/* Actions */}
                    {msg && (
                      <p className={`text-sm ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>
                    )}

                    <button
                      onClick={() => handleSave(plan.id)}
                      disabled={isSaving}
                      className="w-full bg-[#B87333] hover:opacity-90 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60"
                    >
                      {isSaving ? 'Saving…' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {plans.length === 0 && !loading && (
          <div className="bg-white rounded-2xl p-12 text-center text-[#7A8898]">
            <p className="font-semibold text-[#0D1B2A]">No plans found in database</p>
            <p className="text-sm mt-1">Run the SQL migration to seed the plan_settings table.</p>
          </div>
        )}
      </div>
    </div>
  )
}
