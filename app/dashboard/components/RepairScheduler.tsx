"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../supabase'

export const R_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
export const R_DAY_LABELS  = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const R_WEEKDAY_SLOTS = [
  '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
]
const R_SATURDAY_SLOTS = [
  '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '1:00 PM', '2:00 PM',
]
const REPAIR_EQUIPMENT_TYPES = ['Espresso Machine', 'Grinder', 'Brewer', 'Other']

function rPadDate(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
function rBuildGrid(year: number, month: number): (Date | null)[] {
  const firstDow    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (Date | null)[] = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  return cells
}

type Equipment = { id: number; equipment_type: string; brand: string; model: string; serial_number: string }
type Customer  = { id: number; full_name: string; email: string; phone: string; address: string; street: string | null; city: string | null; state: string | null; zip: string | null }

interface RepairSchedulerProps {
  onClose:    () => void
  onSuccess:  () => void
  equipment:  Equipment[]
  customer:   Customer | null
  userEmail:  string | null
}

export function RepairScheduler({ onClose, onSuccess, equipment, customer, userEmail }: RepairSchedulerProps) {
  const router = useRouter()

  const [repairEqType,       setRepairEqType]       = useState('')
  const [repairBrand,        setRepairBrand]        = useState('')
  const [repairModel,        setRepairModel]        = useState('')
  const [repairDescription,  setRepairDescription]  = useState('')
  const [repairDate,         setRepairDate]         = useState<string | null>(null)
  const [repairTime,         setRepairTime]         = useState<string | null>(null)
  const [repairBookedTimes,  setRepairBookedTimes]  = useState<string[]>([])
  const [repairAvailLoading, setRepairAvailLoading] = useState(false)
  const [repairSaving,       setRepairSaving]       = useState(false)
  const [repairError,        setRepairError]        = useState<string | null>(null)
  const [repairViewYear,     setRepairViewYear]     = useState(() => new Date().getFullYear())
  const [repairViewMonth,    setRepairViewMonth]    = useState(() => new Date().getMonth())
  const [bookingAdvanceDays, setBookingAdvanceDays]  = useState(0)

  useEffect(() => {
    fetch('/api/public-settings')
      .then((res) => res.json())
      .then((data) => setBookingAdvanceDays(Number(data.settings?.booking_advance_days) || 0))
      .catch(() => {})
  }, [])

  const repairToday = new Date(); repairToday.setHours(0, 0, 0, 0)
  const repairMaxDate = bookingAdvanceDays > 0
    ? new Date(repairToday.getFullYear(), repairToday.getMonth(), repairToday.getDate() + bookingAdvanceDays)
    : null
  const repairCanGoNext = !repairMaxDate ||
    repairViewYear < repairMaxDate.getFullYear() ||
    (repairViewYear === repairMaxDate.getFullYear() && repairViewMonth < repairMaxDate.getMonth())

  const handleRepairDateChange = async (d: string) => {
    setRepairDate(d)
    setRepairTime(null)
    setRepairBookedTimes([])
    setRepairAvailLoading(true)
    try {
      const res  = await fetch(`/api/availability?start=${d}&end=${d}`)
      const data = await res.json()
      setRepairBookedTimes(data.booked?.[d] ?? [])
    } catch {
      // availability fetch failed — show all slots as available
    } finally {
      setRepairAvailLoading(false)
    }
  }

  const handleRepairSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setRepairError(null)
    if (!repairDate || !repairTime) { setRepairError('Please select a date and time.'); return }
    setRepairSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const res  = await fetch('/api/service-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          full_name:         customer?.full_name ?? '',
          email:             userEmail ?? '',
          phone:             customer?.phone ?? '',
          equipment_type:    repairEqType,
          brand:             repairBrand,
          model:             repairModel,
          issue_description: repairDescription,
          scheduled_date:    repairDate,
          time_slot:         repairTime,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setRepairError(data.error ?? 'Submission failed. Please try again.'); return }
      onClose()
      onSuccess()
    } finally {
      setRepairSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl bg-white max-h-[85vh] sm:max-h-[90vh] flex flex-col z-50">
        <form onSubmit={handleRepairSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#E8ECF0] shrink-0">
            <p className="text-base font-bold text-[#0D1B2A]">Request Repair</p>
            <button type="button" onClick={onClose} className="text-[#7A8898] hover:text-[#0D1B2A] transition">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="overflow-y-auto flex-1 px-5 pt-3 pb-2 space-y-3">

            {/* Equipment type */}
            <div>
              <label htmlFor="repair-eq-type" className="block text-xs font-semibold text-[#0D1B2A] mb-1.5">Equipment type</label>
              <select
                id="repair-eq-type"
                value={repairEqType}
                onChange={(e) => setRepairEqType(e.target.value)}
                required
                className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-3 py-2 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
              >
                <option value="" disabled>Select type…</option>
                {equipment.length > 0 && (
                  <optgroup label="Your equipment">
                    {equipment.map((eq) => (
                      <option key={eq.id} value={eq.equipment_type}>
                        {eq.brand} {eq.model} ({eq.equipment_type})
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Other">
                  {REPAIR_EQUIPMENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Brand */}
            <div>
              <label htmlFor="repair-brand" className="block text-xs font-semibold text-[#0D1B2A] mb-1.5">Brand</label>
              <input
                id="repair-brand"
                type="text"
                value={repairBrand}
                onChange={(e) => setRepairBrand(e.target.value)}
                required
                placeholder="e.g. La Marzocco"
                className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-3 py-2 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
              />
            </div>

            {/* Model */}
            <div>
              <label htmlFor="repair-model" className="block text-xs font-semibold text-[#0D1B2A] mb-1.5">Model</label>
              <input
                id="repair-model"
                type="text"
                value={repairModel}
                onChange={(e) => setRepairModel(e.target.value)}
                required
                placeholder="e.g. Linea Mini"
                className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-3 py-2 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
              />
            </div>

            {/* Problem description */}
            <div>
              <label htmlFor="repair-description" className="block text-xs font-semibold text-[#0D1B2A] mb-1.5">Problem description</label>
              <textarea
                id="repair-description"
                value={repairDescription}
                onChange={(e) => setRepairDescription(e.target.value)}
                required
                rows={2}
                placeholder="Describe what's wrong…"
                className="block w-full rounded-xl border border-[#E8ECF0] bg-white px-3 py-2 text-sm text-[#0D1B2A] focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20 resize-none"
              />
            </div>

            {/* Preferred date — inline calendar */}
            <div>
              <label className="block text-xs font-semibold text-[#0D1B2A] mb-1.5">Preferred date</label>
              <div className="rounded-xl border border-[#E8ECF0] bg-white p-2 select-none">
                {/* Month nav */}
                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date()
                      const canGo = repairViewYear > now.getFullYear() || (repairViewYear === now.getFullYear() && repairViewMonth > now.getMonth())
                      if (!canGo) return
                      if (repairViewMonth === 0) { setRepairViewYear((y) => y - 1); setRepairViewMonth(11) }
                      else setRepairViewMonth((m) => m - 1)
                    }}
                    disabled={repairViewYear === new Date().getFullYear() && repairViewMonth === new Date().getMonth()}
                    className="rounded-lg p-1.5 text-[#7A8898] hover:bg-[#E8ECF0] disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="text-sm font-bold text-[#0D1B2A]">
                    {R_MONTH_NAMES[repairViewMonth]} {repairViewYear}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (!repairCanGoNext) return
                      if (repairViewMonth === 11) { setRepairViewYear((y) => y + 1); setRepairViewMonth(0) }
                      else setRepairViewMonth((m) => m + 1)
                    }}
                    disabled={!repairCanGoNext}
                    className="rounded-lg p-1.5 text-[#7A8898] hover:bg-[#E8ECF0] disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* Day labels */}
                <div className="grid grid-cols-7 mb-1">
                  {R_DAY_LABELS.map((d, i) => (
                    <div key={d} className={`text-center text-[10px] font-semibold uppercase py-1 ${i === 0 ? 'text-gray-300' : 'text-[#7A8898]'}`}>
                      {d}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-0.5">
                  {rBuildGrid(repairViewYear, repairViewMonth).map((date, i) => {
                    if (!date) return <div key={`e-${i}`} />
                    const rToday = new Date(); rToday.setHours(0, 0, 0, 0)
                    const key        = rPadDate(date.getFullYear(), date.getMonth(), date.getDate())
                    const isPast     = date < rToday
                    const isTooFar   = !!repairMaxDate && date > repairMaxDate
                    const isSun      = date.getDay() === 0
                    const isSelected = repairDate === key
                    const isToday    = key === rPadDate(rToday.getFullYear(), rToday.getMonth(), rToday.getDate())
                    const disabled   = isPast || isSun || isTooFar

                    let cls: string
                    if (isSelected)     cls = 'bg-[#B87333] text-white font-bold ring-2 ring-[#B87333]/30'
                    else if (disabled)  cls = 'text-gray-300 cursor-not-allowed'
                    else if (isToday)   cls = 'text-[#B87333] font-bold ring-1 ring-[#B87333]/30 hover:bg-[#B87333]/10'
                    else                cls = 'text-[#0D1B2A] hover:bg-[#B87333]/10 hover:text-[#B87333]'

                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={disabled}
                        onClick={() => handleRepairDateChange(key)}
                        className={`flex h-7 w-full items-center justify-center rounded-lg text-xs transition ${cls}`}
                      >
                        {date.getDate()}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Preferred time */}
            {repairDate && (
              <div>
                <label className="block text-xs font-semibold text-[#0D1B2A] mb-1.5">
                  Preferred time —{' '}
                  <span className="font-normal text-[#7A8898]">
                    {new Date(repairDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </span>
                </label>

                {repairAvailLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <svg className="h-5 w-5 animate-spin text-[#B87333]" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                ) : new Date(repairDate + 'T00:00:00').getDay() === 0 ? (
                  <p className="rounded-xl border border-[#E8ECF0] px-4 py-3 text-sm text-[#7A8898] text-center">
                    We are closed on Sundays. Please select another day.
                  </p>
                ) : (() => {
                  const dow   = new Date(repairDate + 'T00:00:00').getDay()
                  const slots = dow === 6 ? R_SATURDAY_SLOTS : R_WEEKDAY_SLOTS
                  const allBooked = slots.every((t) => repairBookedTimes.includes(t))
                  if (allBooked) return (
                    <p className="rounded-xl border border-[#E8ECF0] px-4 py-3 text-sm text-[#7A8898] text-center">
                      No availability on this date, please select another day.
                    </p>
                  )
                  return (
                    <div className="grid grid-cols-3 gap-2">
                      {slots.map((time) => {
                        const booked   = repairBookedTimes.includes(time)
                        const selected = repairTime === time
                        return (
                          <button
                            key={time}
                            type="button"
                            disabled={booked}
                            onClick={() => setRepairTime(time)}
                            className={`flex flex-col items-center justify-center rounded-full border py-1.5 text-xs font-semibold transition ${
                              selected ? 'bg-[#B87333] border-[#B87333] text-white'
                              : booked  ? 'bg-[#E8ECF0] border-[#E8ECF0] text-[#7A8898] cursor-not-allowed'
                                       : 'bg-white border-[#0D1B2A] text-[#0D1B2A] hover:bg-[#B87333]/5 hover:border-[#B87333]'
                            }`}
                          >
                            {time}
                            {booked && <span className="text-[10px] font-normal text-[#7A8898] mt-0.5">Booked</span>}
                          </button>
                        )
                      })}
                    </div>
                  )
                })()}

                {repairDate && repairTime && (
                  <p className="mt-2 text-xs text-green-700 font-medium">
                    ✓ {new Date(repairDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} at {repairTime}
                  </p>
                )}
              </div>
            )}

            {repairError && <p className="text-sm text-red-600">{repairError}</p>}

          </div>

          {/* Fixed submit button */}
          <div className="px-5 py-4 border-t border-[#E8ECF0] bg-white shrink-0">
            <button
              type="submit"
              disabled={repairSaving}
              className="w-full rounded-full bg-[#B87333] py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition"
            >
              {repairSaving ? 'Submitting…' : 'Submit repair request'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
