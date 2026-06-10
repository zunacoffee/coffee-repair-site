"use client"

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type CalendarEvent = {
  id: string
  title: string
  date: string
  type: 'repair' | 'maintenance' | 'emergency'
  status: string
  customerName: string
  detail: string
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const EVENT_STYLE: Record<CalendarEvent['type'], { pill: string; dot: string; badge: string }> = {
  repair:      { pill: 'bg-[#B87333] text-white',        dot: 'bg-[#B87333]',  badge: 'bg-[#B87333]/15 text-[#8a5a25]' },
  maintenance: { pill: 'bg-blue-500 text-white',          dot: 'bg-blue-500',   badge: 'bg-blue-50 text-blue-700' },
  emergency:   { pill: 'bg-red-500 text-white',           dot: 'bg-red-500',    badge: 'bg-red-50 text-red-700' },
}

const TYPE_LABEL: Record<CalendarEvent['type'], string> = {
  repair:      'Repair',
  maintenance: 'PM Visit',
  emergency:   'Emergency',
}

const STATUS_STYLE: Record<string, string> = {
  pending:     'bg-gray-100 text-gray-600',
  in_progress: 'bg-amber-100 text-amber-800',
  completed:   'bg-green-100 text-green-700',
  active:      'bg-green-100 text-green-700',
}

// Build a 42-cell grid for the month (6 rows × 7 cols)
function buildGrid(year: number, month: number): Date[] {
  const firstDay      = new Date(year, month, 1)
  const startDow      = firstDay.getDay()
  const daysInMonth   = new Date(year, month + 1, 0).getDate()
  const prevLastDay   = new Date(year, month, 0).getDate()
  const cells: Date[] = []

  for (let i = startDow - 1; i >= 0; i--) {
    cells.push(new Date(year, month - 1, prevLastDay - i))
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d))
  }
  let n = 1
  while (cells.length < 42) cells.push(new Date(year, month + 1, n++))
  return cells
}

function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isToday(d: Date): boolean {
  const t = new Date()
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate()
}

export default function CalendarPage() {
  const router = useRouter()
  const today  = new Date()

  const [viewYear,  setViewYear]  = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth()) // 0-indexed
  const [events,    setEvents]    = useState<CalendarEvent[]>([])
  const [loading,   setLoading]   = useState(true)
  const [selected,  setSelected]  = useState<string | null>(toKey(today))

  const fetchEvents = useCallback(async (year: number, month: number) => {
    setLoading(true)
    const res = await fetch(`/api/admin/calendar?year=${year}&month=${month + 1}`)
    if (res.status === 401) { router.replace('/admin/login'); return }
    const json = await res.json()
    setEvents(json.events ?? [])
    setLoading(false)
  }, [router])

  useEffect(() => {
    fetchEvents(viewYear, viewMonth)
  }, [viewYear, viewMonth, fetchEvents])

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }
  const goToday = () => {
    setViewYear(today.getFullYear())
    setViewMonth(today.getMonth())
    setSelected(toKey(today))
  }

  const grid        = buildGrid(viewYear, viewMonth)
  const eventsByDay = events.reduce<Record<string, CalendarEvent[]>>((acc, ev) => {
    if (!acc[ev.date]) acc[ev.date] = []
    acc[ev.date].push(ev)
    return acc
  }, {})

  const selectedEvents = selected ? (eventsByDay[selected] ?? []) : []
  const selectedDateObj = selected ? new Date(selected + 'T12:00:00') : null

  return (
    <div className="flex-1">
      {/* Page header */}
      <div className="border-b border-[#E8ECF0] bg-white px-4 py-4 sm:px-8">
        <div className="mx-auto max-w-7xl flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="rounded-lg p-1.5 text-[#7A8898] hover:bg-[#E8ECF0] transition"
              aria-label="Back to admin"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-[#0D1B2A]">Schedule</h1>
              <p className="text-xs text-[#7A8898]">Repair jobs and maintenance visits</p>
            </div>
          </div>
          <Link
            href="/admin/repair-jobs"
            className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl bg-[#B87333] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#a0632b] transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Repair
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">

          {/* ── Calendar panel ── */}
          <div className="flex-1 rounded-2xl bg-white border border-[#E8ECF0] shadow-sm overflow-hidden">

            {/* Month nav */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8ECF0]">
              <button
                onClick={prevMonth}
                className="rounded-lg p-2 text-[#7A8898] hover:bg-[#E8ECF0] transition"
                aria-label="Previous month"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold text-[#0D1B2A]">
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </h2>
                {(viewYear !== today.getFullYear() || viewMonth !== today.getMonth()) && (
                  <button
                    onClick={goToday}
                    className="rounded-full bg-[#E8ECF0] px-3 py-0.5 text-xs font-semibold text-[#0D1B2A] hover:bg-[#d4d8dc] transition"
                  >
                    Today
                  </button>
                )}
              </div>

              <button
                onClick={nextMonth}
                className="rounded-lg p-2 text-[#7A8898] hover:bg-[#E8ECF0] transition"
                aria-label="Next month"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 border-b border-[#E8ECF0]">
              {DAY_LABELS.map((d) => (
                <div key={d} className="py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-[#7A8898]">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            {loading ? (
              <div className="flex items-center justify-center py-24 text-[#7A8898]">
                <svg className="h-5 w-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-sm">Loading schedule…</span>
              </div>
            ) : (
              <div className="grid grid-cols-7 divide-x divide-[#E8ECF0]">
                {grid.map((date, i) => {
                  const key         = toKey(date)
                  const inMonth     = date.getMonth() === viewMonth
                  const isSelected  = selected === key
                  const todayCell   = isToday(date)
                  const dayEvents   = eventsByDay[key] ?? []
                  const visible     = dayEvents.slice(0, 3)
                  const overflow    = dayEvents.length - visible.length

                  return (
                    <button
                      key={i}
                      onClick={() => setSelected(isSelected ? null : key)}
                      className={`relative flex min-h-[80px] sm:min-h-[100px] flex-col items-start p-1.5 sm:p-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B87333] ${
                        i % 7 !== 6 ? '' : ''
                      } ${
                        Math.floor(i / 7) < 5 ? 'border-b border-[#E8ECF0]' : ''
                      } ${
                        isSelected
                          ? 'bg-[#B87333]/8 ring-inset ring-2 ring-[#B87333]'
                          : inMonth ? 'hover:bg-[#F4F6F9]' : 'bg-[#FAFBFC] hover:bg-[#F4F6F9]'
                      }`}
                    >
                      {/* Date number */}
                      <span
                        className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                          todayCell
                            ? 'bg-[#B87333] text-white'
                            : inMonth
                            ? 'text-[#0D1B2A]'
                            : 'text-[#7A8898]'
                        }`}
                      >
                        {date.getDate()}
                      </span>

                      {/* Event pills — hidden on xs, shown on sm+ */}
                      <div className="hidden sm:flex w-full flex-col gap-0.5">
                        {visible.map((ev) => (
                          <span
                            key={ev.id}
                            className={`truncate rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight ${EVENT_STYLE[ev.type].pill}`}
                          >
                            {ev.title}
                          </span>
                        ))}
                        {overflow > 0 && (
                          <span className="pl-1 text-[10px] font-semibold text-[#7A8898]">+{overflow} more</span>
                        )}
                      </div>

                      {/* Dots — shown on xs only */}
                      <div className="flex sm:hidden gap-0.5 flex-wrap mt-0.5">
                        {dayEvents.slice(0, 4).map((ev) => (
                          <span key={ev.id} className={`h-1.5 w-1.5 rounded-full ${EVENT_STYLE[ev.type].dot}`} />
                        ))}
                        {dayEvents.length > 4 && (
                          <span className="text-[8px] text-[#7A8898] font-bold leading-none mt-0.5">+{dayEvents.length - 4}</span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-5 border-t border-[#E8ECF0] px-5 py-3">
              {(Object.entries(TYPE_LABEL) as [CalendarEvent['type'], string][]).map(([type, label]) => (
                <div key={type} className="flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${EVENT_STYLE[type].dot}`} />
                  <span className="text-xs text-[#7A8898]">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Day detail panel ── */}
          <div className="w-full lg:w-80 rounded-2xl bg-white border border-[#E8ECF0] shadow-sm overflow-hidden">
            <div className="border-b border-[#E8ECF0] px-5 py-4">
              {selectedDateObj ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#7A8898]">
                    {selectedDateObj.toLocaleDateString('en-US', { weekday: 'long' })}
                  </p>
                  <h2 className="mt-0.5 text-lg font-bold text-[#0D1B2A]">
                    {selectedDateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </h2>
                  <p className="mt-0.5 text-xs text-[#7A8898]">
                    {selectedEvents.length === 0
                      ? 'No events'
                      : `${selectedEvents.length} event${selectedEvents.length !== 1 ? 's' : ''}`}
                  </p>
                </>
              ) : (
                <p className="text-sm text-[#7A8898]">Click a day to see its schedule</p>
              )}
            </div>

            {selectedEvents.length > 0 ? (
              <ul className="divide-y divide-[#E8ECF0]">
                {selectedEvents.map((ev) => (
                  <li key={ev.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${EVENT_STYLE[ev.type].badge}`}>
                        {TYPE_LABEL[ev.type]}
                      </span>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[ev.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {ev.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-[#0D1B2A]">{ev.title}</p>
                    {ev.customerName && (
                      <p className="mt-0.5 text-xs text-[#7A8898]">{ev.customerName}</p>
                    )}
                    {ev.detail && (
                      <p className="mt-1.5 text-xs text-[#7A8898] line-clamp-2">{ev.detail}</p>
                    )}
                    {ev.type === 'repair' && (
                      <Link
                        href="/admin/repair-jobs"
                        className="mt-2 inline-flex text-xs font-semibold text-[#B87333] hover:underline"
                      >
                        View job →
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            ) : selectedDateObj ? (
              <div className="px-5 py-10 text-center">
                <svg className="mx-auto h-10 w-10 text-[#E8ECF0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="mt-3 text-sm font-medium text-[#0D1B2A]">Nothing scheduled</p>
                <p className="mt-1 text-xs text-[#7A8898]">No repairs or visits on this day.</p>
                <Link
                  href="/admin/repair-jobs"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#B87333] px-4 py-2 text-xs font-semibold text-white hover:bg-[#a0632b] transition"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Add Repair
                </Link>
              </div>
            ) : (
              <div className="px-5 py-10 text-center">
                <svg className="mx-auto h-10 w-10 text-[#E8ECF0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
                </svg>
                <p className="mt-3 text-sm font-medium text-[#0D1B2A]">Select a day</p>
                <p className="mt-1 text-xs text-[#7A8898]">Click any date to see its events.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
