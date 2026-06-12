"use client"

import { useState } from 'react'
import PublicNavbar from '../components/PublicNavbar'
import PublicFooter from '../components/PublicFooter'

const EQUIPMENT_TYPES = ['Espresso Machine', 'Grinder', 'Brewer', 'Other']

// ─── Calendar helpers ─────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const TIME_SLOTS = [
  '8:00 AM', '9:00 AM', '10:00 AM',
  '11:00 AM', '12:00 PM', '1:00 PM',
  '2:00 PM', '3:00 PM', '4:00 PM',
]

function padDate(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function buildGrid(year: number, month: number): (Date | null)[] {
  const firstDow    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (Date | null)[] = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  return cells
}

// ─── Form types ───────────────────────────────────────────────────────────────

type FormState = {
  full_name: string
  email: string
  phone: string
  street: string
  city: string
  state: string
  zip: string
  equipment_type: string
  brand: string
  model: string
  issue_description: string
  contact_preference: 'email' | 'phone' | ''
  notes: string
}

const EMPTY: FormState = {
  full_name: '',
  email: '',
  phone: '',
  street: '',
  city: '',
  state: '',
  zip: '',
  equipment_type: '',
  brand: '',
  model: '',
  issue_description: '',
  contact_preference: 'email',
  notes: '',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ServiceRequestPage() {
  const todayRef = new Date()
  todayRef.setHours(0, 0, 0, 0)

  const [form,                setForm]                = useState<FormState>(EMPTY)
  const [selectedDate,        setSelectedDate]        = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [submitting,   setSubmitting]   = useState(false)
  const [error,               setError]              = useState<string | null>(null)
  const [submitted,           setSubmitted]           = useState(false)

  // Calendar navigation state
  const [viewYear,  setViewYear]  = useState(todayRef.getFullYear())
  const [viewMonth, setViewMonth] = useState(todayRef.getMonth())

  const set = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleDateChange = (d: string) => {
    setSelectedDate(d)
    setSelectedTime(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedDate || !selectedTime) {
      setError('Please select a preferred appointment date and time.')
      return
    }

    setSubmitting(true)

    const res = await fetch('/api/service-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        scheduled_date: selectedDate,
        time_slot: selectedTime,
      }),
    })

    const data = await res.json()
    setSubmitting(false)

    if (!res.ok) {
      setError(data.error || 'Something went wrong. Please try again.')
      return
    }

    setSubmitted(true)
  }

  // Calendar derived values
  const canGoPrev = viewYear > todayRef.getFullYear() ||
    (viewYear === todayRef.getFullYear() && viewMonth > todayRef.getMonth())

  const prevMonth = () => {
    if (!canGoPrev) return
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11) }
    else setViewMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0) }
    else setViewMonth((m) => m + 1)
  }

  const grid = buildGrid(viewYear, viewMonth)

  // Labels for confirmation and success
  const slotDateLabel = selectedDate
    ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : null

  const inputClass = 'mt-1 block w-full px-3 py-2.5 border border-[#D4D8DC] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cafe-bronze text-cafe-navy bg-white'
  const labelClass = 'block text-sm font-medium text-cafe-navy'

  return (
    <div className="min-h-screen bg-cafe-silver flex flex-col">
      <PublicNavbar />

      <div className="flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-cafe-bronze">Get help fast</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-cafe-navy sm:text-4xl">Request a service visit</h1>
            <p className="mt-3 text-base text-cafe-steel">
              Fill out the form below and choose your preferred appointment time. We'll confirm within one business day.
            </p>
          </div>

          {submitted ? (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-green-800">Request submitted!</h2>
              <p className="mt-2 text-sm text-green-700">
                We&apos;ll be in touch within one business day to confirm your appointment.
                {slotDateLabel && selectedTime && (
                  <> Your preferred time is <strong>{slotDateLabel} at {selectedTime}</strong>.</>
                )}
              </p>
              <button
                onClick={() => { setForm(EMPTY); setSelectedDate(null); setSelectedTime(null); setSubmitted(false) }}
                className="mt-6 inline-flex items-center justify-center rounded-full bg-cafe-bronze px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition"
              >
                Submit another request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-[#D4D8DC] p-6 sm:p-8 space-y-6">

              {/* Contact info */}
              <div>
                <h2 className="text-base font-semibold text-cafe-navy mb-4">Your information</h2>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Full name</label>
                    <input type="text" value={form.full_name} onChange={set('full_name')} required placeholder="Jane Smith" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Email</label>
                    <input type="email" value={form.email} onChange={set('email')} required placeholder="jane@example.com" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Phone</label>
                    <input type="tel" value={form.phone} onChange={set('phone')} required placeholder="(555) 000-0000" className={inputClass} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Street Address</label>
                    <input type="text" value={form.street} onChange={set('street')} placeholder="123 Main St" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>City</label>
                    <input type="text" value={form.city} onChange={set('city')} placeholder="Portland" className={inputClass} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>State</label>
                      <input type="text" value={form.state} onChange={set('state')} placeholder="OR" maxLength={2} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>ZIP</label>
                      <input type="text" value={form.zip} onChange={set('zip')} placeholder="97201" maxLength={10} className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Preferred contact method</label>
                    <div className="mt-2 flex gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="contact_preference" value="email" checked={form.contact_preference === 'email'} onChange={set('contact_preference')} required className="accent-cafe-bronze" />
                        <span className="text-sm text-cafe-navy">Email</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="contact_preference" value="phone" checked={form.contact_preference === 'phone'} onChange={set('contact_preference')} className="accent-cafe-bronze" />
                        <span className="text-sm text-cafe-navy">Phone</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Equipment */}
              <div className="border-t border-[#D4D8DC] pt-6">
                <h2 className="text-base font-semibold text-cafe-navy mb-4">Equipment details</h2>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Equipment type</label>
                    <select value={form.equipment_type} onChange={set('equipment_type')} required className={inputClass}>
                      <option value="" disabled>Select type…</option>
                      {EQUIPMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Brand</label>
                    <input type="text" value={form.brand} onChange={set('brand')} required placeholder="e.g. La Marzocco" className={inputClass} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Model</label>
                    <input type="text" value={form.model} onChange={set('model')} required placeholder="e.g. Linea Mini" className={inputClass} />
                  </div>
                </div>
              </div>

              {/* Issue */}
              <div className="border-t border-[#D4D8DC] pt-6">
                <h2 className="text-base font-semibold text-cafe-navy mb-4">Describe the issue</h2>
                <div>
                  <label className={labelClass}>Issue description</label>
                  <textarea value={form.issue_description} onChange={set('issue_description')} required rows={4} placeholder="Describe the problem in as much detail as possible…" className={inputClass} />
                </div>
              </div>

              {/* Appointment */}
              <div className="border-t border-[#D4D8DC] pt-6">
                <h2 className="text-base font-semibold text-cafe-navy mb-1">Preferred arrival time</h2>
                <p className="text-sm text-cafe-steel mb-4">
                  Choose a date and your preferred arrival time. We&apos;ll confirm within one business day.
                </p>

                {/* ── Calendar ── */}
                <div className="rounded-xl border border-[#D4D8DC] bg-white p-4 select-none">
                  <div className="flex items-center justify-between mb-3">
                    <button
                      type="button"
                      onClick={prevMonth}
                      disabled={!canGoPrev}
                      className="rounded-lg p-2 text-[#7A8898] hover:bg-[#E8ECF0] disabled:opacity-30 disabled:cursor-not-allowed transition"
                      aria-label="Previous month"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <span className="text-sm font-bold text-cafe-navy">
                      {MONTH_NAMES[viewMonth]} {viewYear}
                    </span>
                    <button
                      type="button"
                      onClick={nextMonth}
                      className="rounded-lg p-2 text-[#7A8898] hover:bg-[#E8ECF0] transition"
                      aria-label="Next month"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  <div className="grid grid-cols-7 mb-1">
                    {DAY_LABELS.map((d, i) => (
                      <div
                        key={d}
                        className={`text-center text-[10px] font-semibold uppercase py-1 ${
                          i === 0 || i === 6 ? 'text-red-300' : 'text-[#7A8898]'
                        }`}
                      >
                        {d}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-0.5">
                    {grid.map((date, i) => {
                      if (!date) return <div key={`empty-${i}`} />

                      const key        = padDate(date.getFullYear(), date.getMonth(), date.getDate())
                      const isPast     = date < todayRef
                      const dow        = date.getDay()
                      const isWeekend  = dow === 0 || dow === 6
                      const disabled   = isPast || isWeekend
                      const isSelected = selectedDate === key
                      const isToday    = key === padDate(todayRef.getFullYear(), todayRef.getMonth(), todayRef.getDate())

                      let cls: string
                      if (isSelected) {
                        cls = 'bg-[#B87333] text-white font-bold ring-2 ring-[#B87333]/30'
                      } else if (isWeekend) {
                        cls = 'bg-red-50 text-red-300 cursor-not-allowed'
                      } else if (isPast) {
                        cls = 'text-gray-300 cursor-not-allowed'
                      } else if (isToday) {
                        cls = 'text-[#B87333] font-bold ring-1 ring-[#B87333]/30 hover:bg-[#B87333]/10'
                      } else {
                        cls = 'text-[#0D1B2A] hover:bg-[#B87333]/10 hover:text-[#B87333]'
                      }

                      return (
                        <button
                          key={key}
                          type="button"
                          disabled={disabled}
                          onClick={() => handleDateChange(key)}
                          className={`flex h-10 w-full items-center justify-center rounded-lg text-sm transition ${cls}`}
                        >
                          {date.getDate()}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* ── Time slots ── */}
                {selectedDate && (
                  <div className="mt-4">
                    <p className="mb-3 text-sm font-semibold text-cafe-navy">
                      {slotDateLabel}
                    </p>

                    <div className="grid grid-cols-3 gap-2">
                      {TIME_SLOTS.map((time) => {
                        const selected = selectedTime === time
                        return (
                          <button
                            key={time}
                            type="button"
                            onClick={() => setSelectedTime(time)}
                            className={`flex items-center justify-center rounded-[100px] border py-2.5 text-sm font-semibold transition ${
                              selected
                                ? 'bg-[#B87333] border-[#B87333] text-white'
                                : 'bg-white border-[#0D1B2A] text-[#0D1B2A] hover:bg-[#B87333]/5 hover:border-[#B87333]'
                            }`}
                          >
                            {time}
                          </button>
                        )
                      })}
                    </div>

                    {selectedDate && selectedTime && (
                      <p className="mt-3 text-xs text-green-700 font-medium">
                        ✓ {slotDateLabel} at {selectedTime}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="border-t border-[#D4D8DC] pt-6">
                <label className={labelClass}>Additional notes <span className="text-cafe-steel font-normal">(optional)</span></label>
                <textarea
                  value={form.notes}
                  onChange={set('notes')}
                  rows={2}
                  placeholder="Any access instructions, parking info, or other details…"
                  className={`${inputClass} mt-1`}
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-4 bg-cafe-bronze text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition"
              >
                {submitting ? 'Submitting…' : 'Submit service request'}
              </button>
            </form>
          )}
        </div>
      </div>

      <PublicFooter />
    </div>
  )
}
