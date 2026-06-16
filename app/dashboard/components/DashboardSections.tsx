"use client"

import Link from 'next/link'

const MONO = 'font-[family-name:var(--font-ibm-plex-mono)]'

const WO_STATUS: Record<string, string> = {
  open:        'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-800',
  completed:   'bg-green-100 text-green-700',
  cancelled:   'bg-gray-100 text-gray-500',
}
const INV_STATUS: Record<string, string> = {
  paid:    'bg-green-100 text-green-700',
  unpaid:  'bg-red-100 text-red-700',
  overdue: 'bg-orange-100 text-orange-800',
  sent:    'bg-amber-100 text-amber-700',
}

function fmt(dateStr: string | null | undefined) {
  if (!dateStr) return '—'
  return new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'))
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function EmptyState({ icon, title, body, cta }: { icon: React.ReactNode; title: string; body: string; cta?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center px-4">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#E8ECF0] text-[#7A8898]">{icon}</div>
      <p className="text-sm font-semibold text-[#0D1B2A]">{title}</p>
      <p className="mt-1 text-xs text-[#7A8898] max-w-xs">{body}</p>
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  )
}

function StatusBadge({ status, map }: { status: string; map: Record<string, string> }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

type Section   = 'invoices' | 'equipment' | 'plan' | 'repairs' | 'account' | 'contact' | null
type WorkOrder = { id: number; work_order_number: string; status: string; problem_description: string; grand_total: number; created_at: string; completed_at: string | null; equipment_list: { equipment_type: string; brand: string; model: string } | null }
type Equipment = { id: number; equipment_type: string; brand: string; model: string; serial_number: string }
type Plan      = { id: number; plan_name: string; status: string; price: number; renewal_date: string | null; next_visit_date?: string | null; next_visit_slot?: string | null; is_custom?: boolean; stripe_payment_link?: string | null; description?: string | null; visit_frequency?: number | null; features?: string[] }
type Invoice   = { id: number; total: number; status: string; due_date: string | null; description: string; created_at: string; invoice_number?: string | null; stripe_payment_link?: string | null }

interface DashboardSectionsProps {
  activeSection:        NonNullable<Section>
  setActiveSection:     (s: Section) => void
  sectionRef:           React.RefObject<HTMLDivElement | null>
  // Repairs
  workOrders:           WorkOrder[]
  // Equipment
  equipment:            Equipment[]
  showEqForm:           boolean
  setShowEqForm:        React.Dispatch<React.SetStateAction<boolean>>
  eqType:               string
  setEqType:            React.Dispatch<React.SetStateAction<string>>
  eqBrand:              string
  setEqBrand:           React.Dispatch<React.SetStateAction<string>>
  eqModel:              string
  setEqModel:           React.Dispatch<React.SetStateAction<string>>
  eqSerial:             string
  setEqSerial:          React.Dispatch<React.SetStateAction<string>>
  eqSaving:             boolean
  eqError:              string | null
  setEqError:           React.Dispatch<React.SetStateAction<string | null>>
  eqSuccess:            string | null
  setEqSuccess:         React.Dispatch<React.SetStateAction<string | null>>
  handleAddEquipment:   (e: React.FormEvent) => void
  setSelectedEquipment: (v: any) => void
  // Plan
  plan:               Plan | null
  portalLoading:      boolean
  portalError:        string | null
  handleManagePlan:   () => void
  setShowPlanModal:   (v: boolean) => void
  // Invoices
  invoices:           Invoice[]
  setSelectedInvoice: (v: any) => void
  // Account
  userEmail:          string | null
  profileName:        string
  setProfileName:     React.Dispatch<React.SetStateAction<string>>
  profilePhone:       string
  setProfilePhone:    React.Dispatch<React.SetStateAction<string>>
  profileStreet:      string
  setProfileStreet:   React.Dispatch<React.SetStateAction<string>>
  profileCity:        string
  setProfileCity:     React.Dispatch<React.SetStateAction<string>>
  profileState:       string
  setProfileState:    React.Dispatch<React.SetStateAction<string>>
  profileZip:         string
  setProfileZip:      React.Dispatch<React.SetStateAction<string>>
  profileSaving:      boolean
  profileMsg:         string | null
  profileError:       string | null
  handleSaveProfile:  (e: React.FormEvent) => void
  handleSignOut:      () => void
  // Contact
  siteSettings: { phone?: string; email?: string; business_hours?: string }
}

export function DashboardSections({
  activeSection, setActiveSection, sectionRef,
  workOrders,
  equipment, showEqForm, setShowEqForm, eqType, setEqType, eqBrand, setEqBrand, eqModel, setEqModel, eqSerial, setEqSerial, eqSaving, eqError, setEqError, eqSuccess, setEqSuccess, handleAddEquipment, setSelectedEquipment,
  plan, portalLoading, portalError, handleManagePlan, setShowPlanModal,
  invoices, setSelectedInvoice,
  userEmail, profileName, setProfileName, profilePhone, setProfilePhone, profileStreet, setProfileStreet, profileCity, setProfileCity, profileState, setProfileState, profileZip, setProfileZip, profileSaving, profileMsg, profileError, handleSaveProfile, handleSignOut,
  siteSettings,
}: DashboardSectionsProps) {
  return (
    <div ref={sectionRef} className="sm:order-2 rounded-2xl bg-white border border-black/5 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8ECF0]">
        <h2 className="text-base font-bold text-[#0D1B2A]">
          {activeSection === 'repairs'   ? 'Repair History'   :
           activeSection === 'equipment' ? 'Equipment'        :
           activeSection === 'plan'      ? 'My Plan'          :
           activeSection === 'invoices'  ? 'Invoices'         :
           activeSection === 'account'   ? 'Account'          :
           activeSection === 'contact'   ? 'Contact Us'       : ''}
        </h2>
        <button onClick={() => setActiveSection(null)} className="text-[#7A8898] hover:text-[#0D1B2A] transition">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="p-5">

        {/* ── Repairs section ── */}
        {activeSection === 'repairs' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-[#7A8898]">{workOrders.length} total</p>
              <Link href="/service-request" className="inline-flex items-center gap-1.5 rounded-xl bg-[#B87333] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                Request repair
              </Link>
            </div>
            {workOrders.length > 0 ? (
              <div className="space-y-3">
                {workOrders.map((wo) => (
                  <div key={wo.id} className="rounded-xl border border-[#E8ECF0] p-4 border-l-2 border-l-[#B87333]">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className={`${MONO} text-[10px] font-semibold text-[#B87333]`}>{wo.work_order_number}</p>
                        <p className="mt-0.5 text-sm font-semibold text-[#0D1B2A] truncate">
                          {wo.equipment_list ? `${wo.equipment_list.brand} ${wo.equipment_list.model}` : wo.problem_description || '—'}
                        </p>
                        {wo.problem_description && wo.equipment_list && (
                          <p className="text-xs text-[#7A8898] truncate mt-0.5">{wo.problem_description}</p>
                        )}
                      </div>
                      <StatusBadge status={wo.status} map={WO_STATUS} />
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-xs text-[#7A8898]">{wo.created_at ? fmt(wo.created_at) : '—'}</p>
                      <p className="text-sm font-bold text-[#0D1B2A]">${Number(wo.grand_total).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>}
                title="No repair history"
                body="Completed and in-progress repairs will appear here."
                cta={<Link href="/service-request" className="rounded-xl bg-[#B87333] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition">Request a repair</Link>}
              />
            )}
          </div>
        )}

        {/* ── Equipment section ── */}
        {activeSection === 'equipment' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-[#7A8898]">{equipment.length} registered</p>
              <button
                onClick={() => { setShowEqForm((v) => !v); setEqError(null); setEqSuccess(null) }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#B87333] px-3 py-1.5 text-xs font-semibold text-[#B87333] hover:bg-[#B87333]/5 transition"
              >
                {showEqForm ? 'Cancel' : 'Add equipment'}
              </button>
            </div>

            {eqSuccess && (
              <div className="mb-4 rounded-xl bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700">{eqSuccess}</div>
            )}

            {showEqForm && (
              <form onSubmit={handleAddEquipment} className="mb-4 rounded-2xl border border-[#E8ECF0] bg-[#E8ECF0] p-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="ds-eq-type" className="block text-xs font-semibold text-[#0D1B2A] mb-1">Type</label>
                    <select id="ds-eq-type" value={eqType} onChange={(e) => setEqType(e.target.value)} required
                      className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-3 py-2 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none">
                      <option value="" disabled>Select…</option>
                      <option value="Espresso Machine">Espresso Machine</option>
                      <option value="Grinder">Grinder</option>
                      <option value="Brewer">Brewer</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="ds-eq-brand" className="block text-xs font-semibold text-[#0D1B2A] mb-1">Brand</label>
                    <input id="ds-eq-brand" type="text" value={eqBrand} onChange={(e) => setEqBrand(e.target.value)} required placeholder="e.g. La Marzocco"
                      className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-3 py-2 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none" />
                  </div>
                  <div>
                    <label htmlFor="ds-eq-model" className="block text-xs font-semibold text-[#0D1B2A] mb-1">Model</label>
                    <input id="ds-eq-model" type="text" value={eqModel} onChange={(e) => setEqModel(e.target.value)} required placeholder="e.g. Linea Mini"
                      className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-3 py-2 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none" />
                  </div>
                  <div>
                    <label htmlFor="ds-eq-serial" className="block text-xs font-semibold text-[#0D1B2A] mb-1">Serial <span className="font-normal text-[#7A8898]">(optional)</span></label>
                    <input id="ds-eq-serial" type="text" value={eqSerial} onChange={(e) => setEqSerial(e.target.value)} placeholder="SN123456"
                      className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-3 py-2 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none" />
                  </div>
                </div>
                {eqError && <p className="text-xs text-red-600">{eqError}</p>}
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setShowEqForm(false); setEqError(null) }}
                    className="rounded-xl border border-[#E8ECF0] px-4 py-2 text-sm font-semibold text-[#7A8898] hover:bg-[#E8ECF0] transition">
                    Cancel
                  </button>
                  <button type="submit" disabled={eqSaving}
                    className="rounded-xl bg-[#B87333] px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition">
                    {eqSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </form>
            )}

            {equipment.length > 0 ? (
              <div className="space-y-3">
                {equipment.map((eq) => (
                  <div key={eq.id} onClick={() => setSelectedEquipment(eq)} className="rounded-xl border border-[#E8ECF0] p-4 border-l-2 border-l-emerald-500 cursor-pointer hover:shadow-sm transition">
                    <p className={`${MONO} text-[10px] font-semibold text-[#B87333]`}>{eq.equipment_type}</p>
                    <p className="mt-0.5 text-sm font-bold text-[#0D1B2A]">{eq.brand} {eq.model}</p>
                    {eq.serial_number && (
                      <p className="mt-0.5 text-xs font-mono text-[#7A8898]">S/N: {eq.serial_number}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : !showEqForm ? (
              <EmptyState
                icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18" /></svg>}
                title="No equipment yet"
                body="Add your coffee equipment to track service history."
                cta={
                  <button onClick={() => { setShowEqForm(true); setEqError(null) }}
                    className="rounded-xl bg-[#B87333] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition">
                    Add Equipment
                  </button>
                }
              />
            ) : null}
          </div>
        )}

        {/* ── Plan section ── */}
        {activeSection === 'plan' && (
          <div>
            {plan ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-[#E8ECF0] bg-[#E8ECF0] p-5 space-y-4 cursor-pointer hover:shadow-sm transition" onClick={() => setShowPlanModal(true)}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-lg font-bold text-[#0D1B2A]">{plan.plan_name}</p>
                        {plan.is_custom && (
                          <span className="inline-flex rounded-full bg-[#B87333]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#B87333]">Custom</span>
                        )}
                      </div>
                      {plan.price ? <p className="text-2xl font-bold text-[#B87333] mt-1">${plan.price}<span className="text-sm font-normal text-[#7A8898]">/mo</span></p> : null}
                      {plan.description && <p className="mt-1 text-sm text-[#7A8898]">{plan.description}</p>}
                    </div>
                    <span className={`shrink-0 inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                      plan.status === 'active'          ? 'bg-green-100 text-green-700' :
                      plan.status === 'pending_payment' ? 'bg-amber-100 text-amber-700' :
                                                          'bg-[#E8ECF0] text-[#7A8898]'
                    }`}>
                      {plan.status === 'pending_payment' ? 'Pending' : plan.status}
                    </span>
                  </div>

                  {plan.visit_frequency && (
                    <div className="text-sm flex justify-between border-t border-white/60 pt-3">
                      <span className="text-[#7A8898]">Visits per month</span>
                      <span className="font-medium text-[#0D1B2A]">{plan.visit_frequency}</span>
                    </div>
                  )}

                  {plan.features && plan.features.length > 0 && (
                    <ul className="space-y-1.5 border-t border-white/60 pt-3">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[#7A8898]">
                          <span className="mt-0.5 text-[#B87333] shrink-0">•</span>{f}
                        </li>
                      ))}
                    </ul>
                  )}

                  {plan.status !== 'pending_payment' && (
                    <div className="border-t border-white/60 pt-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-[#7A8898]">Next renewal</span>
                        <span className="font-medium text-[#0D1B2A]">{plan.renewal_date ? fmt(plan.renewal_date) : '—'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-[#7A8898]">Billing</span>
                        <span className="font-medium text-[#0D1B2A]">Monthly</span>
                      </div>
                    </div>
                  )}
                </div>

                {plan.status === 'pending_payment' && plan.stripe_payment_link ? (
                  <>
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      Your plan is ready — complete payment to activate it.
                    </div>
                    <a href={plan.stripe_payment_link}
                      className="flex w-full items-center justify-center rounded-xl bg-[#B87333] py-3 text-sm font-semibold text-white hover:opacity-90 transition">
                      Activate My Plan →
                    </a>
                  </>
                ) : (
                  <>
                    {portalError && <p className="text-sm text-red-600">{portalError}</p>}
                    <button onClick={handleManagePlan} disabled={portalLoading}
                      className="w-full rounded-xl bg-[#B87333] py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition">
                      {portalLoading ? 'Opening billing portal…' : 'Manage plan & billing'}
                    </button>
                    <p className="text-xs text-center text-[#7A8898]">Update payment, cancel, or change your plan via the Stripe billing portal.</p>
                  </>
                )}
              </div>
            ) : (
              <EmptyState
                icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
                title="No active plan"
                body="Subscribe to a maintenance plan to keep your equipment in peak condition."
                cta={<Link href="/pricing" className="rounded-xl bg-[#B87333] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition">See plans & pricing</Link>}
              />
            )}
          </div>
        )}

        {/* ── Invoices section ── */}
        {activeSection === 'invoices' && (
          <div>
            {invoices.length > 0 ? (
              <div className="space-y-3">
                {invoices.map((inv) => {
                  const payable = (inv.status === 'sent' || inv.status === 'unpaid') && inv.stripe_payment_link
                  const displayStatus = inv.status === 'sent' && inv.stripe_payment_link ? 'Payment Due' : null
                  return (
                    <div key={inv.id} onClick={() => setSelectedInvoice(inv)} className={`rounded-xl border p-4 border-l-2 cursor-pointer hover:shadow-sm transition ${inv.status === 'paid' ? 'border-[#E8ECF0] border-l-green-400' : inv.status === 'overdue' ? 'border-orange-100 border-l-orange-400' : 'border-[#E8ECF0] border-l-red-400'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-[#0D1B2A]">{inv.description}</p>
                        {displayStatus
                          ? <span className="inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700">{displayStatus}</span>
                          : <StatusBadge status={inv.status} map={INV_STATUS} />}
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs text-[#7A8898]">{inv.due_date ? `Due ${fmt(inv.due_date)}` : '—'}</p>
                        <p className="text-sm font-bold text-[#0D1B2A]">${Number(inv.total).toFixed(2)}</p>
                      </div>
                      {payable && (
                        <div className="mt-3">
                          <a href={inv.stripe_payment_link!} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center rounded-full bg-[#B87333] px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition">
                            Pay Now
                          </a>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <EmptyState
                icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                title="No invoices yet"
                body="Your invoices will appear here when Cafe Works issues them."
              />
            )}
          </div>
        )}

        {/* ── Account section ── */}
        {activeSection === 'account' && (
          <div>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label htmlFor="ds-profile-name" className="block text-xs font-semibold text-[#0D1B2A] mb-1.5">Full name</label>
                <input id="ds-profile-name" type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)} required
                  className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-4 py-2.5 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20" />
              </div>
              <div>
                <label htmlFor="ds-profile-email" className="block text-xs font-semibold text-[#0D1B2A] mb-1.5">Email</label>
                <input id="ds-profile-email" type="email" value={userEmail ?? ''} disabled
                  className="block w-full rounded-xl border border-[#E8ECF0] bg-[#E8ECF0] px-4 py-2.5 text-sm text-[#7A8898] cursor-not-allowed" />
                <p className="mt-1 text-xs text-[#7A8898]">Email cannot be changed here.</p>
              </div>
              <div>
                <label htmlFor="ds-profile-phone" className="block text-xs font-semibold text-[#0D1B2A] mb-1.5">Phone</label>
                <input id="ds-profile-phone" type="tel" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} placeholder="(555) 000-0000"
                  className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-4 py-2.5 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20" />
              </div>
              <div>
                <label htmlFor="ds-profile-street" className="block text-xs font-semibold text-[#0D1B2A] mb-1.5">Street Address</label>
                <input id="ds-profile-street" type="text" value={profileStreet} onChange={(e) => setProfileStreet(e.target.value)} placeholder="123 Main St"
                  className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-4 py-2.5 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20" />
              </div>
              <div>
                <label htmlFor="ds-profile-city" className="block text-xs font-semibold text-[#0D1B2A] mb-1.5">City</label>
                <input id="ds-profile-city" type="text" value={profileCity} onChange={(e) => setProfileCity(e.target.value)} placeholder="Portland"
                  className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-4 py-2.5 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ds-profile-state" className="block text-xs font-semibold text-[#0D1B2A] mb-1.5">State</label>
                  <input id="ds-profile-state" type="text" value={profileState} onChange={(e) => setProfileState(e.target.value)} placeholder="OR" maxLength={2}
                    className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-4 py-2.5 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20" />
                </div>
                <div>
                  <label htmlFor="ds-profile-zip" className="block text-xs font-semibold text-[#0D1B2A] mb-1.5">ZIP</label>
                  <input id="ds-profile-zip" type="text" value={profileZip} onChange={(e) => setProfileZip(e.target.value)} placeholder="97201" maxLength={10}
                    className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-4 py-2.5 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20" />
                </div>
              </div>
              {profileError && <p className="text-sm text-red-600">{profileError}</p>}
              {profileMsg   && <p className="text-sm text-green-600">{profileMsg}</p>}
              <button type="submit" disabled={profileSaving}
                className="w-full rounded-xl bg-[#B87333] py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition">
                {profileSaving ? 'Saving…' : 'Save changes'}
              </button>
            </form>
            <button
              onClick={handleSignOut}
              className="mt-4 w-full rounded-full border border-[#E8ECF0] py-3 text-sm font-semibold text-[#7A8898] hover:bg-[#E8ECF0] transition"
            >
              Sign out
            </button>
          </div>
        )}

        {/* ── Contact section ── */}
        {activeSection === 'contact' && (
          <div className="space-y-1">
            {/* Phone */}
            <a
              href={`tel:${siteSettings.phone || '(555) 012-3456'}`}
              className="flex items-center gap-4 rounded-2xl border-l-4 border-[#B87333] bg-white px-4 py-4 shadow-sm hover:bg-[#B87333]/5 transition"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#B87333]/10">
                <svg className="h-5 w-5 text-[#B87333]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div>
                <p className={`${MONO} text-[10px] font-semibold uppercase tracking-wide text-[#7A8898]`}>Call or Text</p>
                <p className="mt-0.5 text-lg font-bold text-[#0D1B2A]">{siteSettings.phone || '(555) 012-3456'}</p>
              </div>
            </a>

            {/* Email */}
            <a
              href={`mailto:${siteSettings.email || 'hello@cafeworks.com'}`}
              className="flex items-center gap-4 rounded-2xl border-l-4 border-[#B87333] bg-white px-4 py-4 shadow-sm hover:bg-[#B87333]/5 transition"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#B87333]/10">
                <svg className="h-5 w-5 text-[#B87333]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className={`${MONO} text-[10px] font-semibold uppercase tracking-wide text-[#7A8898]`}>Email Us</p>
                <p className="mt-0.5 text-base font-bold text-[#0D1B2A]">{siteSettings.email || 'hello@cafeworks.com'}</p>
              </div>
            </a>

            {/* Hours */}
            <div className="flex items-center gap-4 rounded-2xl border-l-4 border-[#B87333] bg-white px-4 py-4 shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#B87333]/10">
                <svg className="h-5 w-5 text-[#B87333]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className={`${MONO} text-[10px] font-semibold uppercase tracking-wide text-[#7A8898]`}>Business Hours</p>
                <p className="mt-0.5 text-base font-bold text-[#0D1B2A]">{siteSettings.business_hours || 'Mon–Sat, 7am–6pm'}</p>
              </div>
            </div>

            {/* Emergency note */}
            <p className="pt-2 text-center text-xs text-[#7A8898]">
              <span className="font-semibold text-[#0D1B2A]">Emergency?</span> Call or text anytime for urgent repairs.
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
