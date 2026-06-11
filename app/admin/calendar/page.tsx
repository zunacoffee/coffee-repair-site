"use client"

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type CalendarEvent = {
  id: string
  title: string
  date: string
  type: 'repair' | 'maintenance' | 'emergency' | 'service_request'
  status: string
  customerName: string
  detail: string
  time_slot?: 'morning' | 'afternoon' | null
}

type BlockedDate = {
  id: number
  date: string
  reason: string | null
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const EVENT_STYLE: Record<CalendarEvent['type'], { pill: string; dot: string; badge: string }> = {
  repair:          { pill: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400', badge: 'bg-orange-100 text-orange-700' },
  maintenance:     { pill: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-400',   badge: 'bg-blue-100 text-blue-700'    },
  emergency:       { pill: 'bg-red-100 text-red-700',       dot: 'bg-red-400',    badge: 'bg-red-100 text-red-700'      },
  service_request: { pill: 'bg-green-100 text-green-700',   dot: 'bg-green-400',  badge: 'bg-green-100 text-green-700'  },
}

const TYPE_LABEL: Record<CalendarEvent['type'], string> = {
  repair:          'Repair Job',
  maintenance:     'PM Visit',
  emergency:       'Emergency',
  service_request: 'Service Request',
}

const PILL_LABEL: Record<CalendarEvent['type'], string> = {
  repair:          'Repair',
  maintenance:     'PM Visit',
  emergency:       'Emergency',
  service_request: 'Service Req.',
}

const SLOT_TIME: Record<string, string> = {
  morning:   '8am',
  afternoon: '12pm',
}

const STATUS_STYLE: Record<string, string> = {
  pending:     'bg-gray-100 text-gray-600',
  in_progress: 'bg-amber-100 text-amber-800',
  completed:   'bg-green-100 text-green-700',
  active:      'bg-green-100 text-green-700',
}

const SLOT_LABEL: Record<string, string> = {
  morning:   'AM (8am–12pm)',
  afternoon: 'PM (12pm–5pm)',
}

function buildGrid(year: number, month: number): Date[] {
  const firstDay    = new Date(year, month, 1)
  const startDow    = firstDay.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevLastDay = new Date(year, month, 0).getDate()
  const cells: Date[] = []

  for (let i = startDow - 1; i >= 0; i--) cells.push(new Date(year, month - 1, prevLastDay - i))
  for (let d = 1; d <= daysInMonth; d++)  cells.push(new Date(year, month, d))
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

  const [viewYear,      setViewYear]      = useState(today.getFullYear())
  const [viewMonth,     setViewMonth]     = useState(today.getMonth())
  const [events,        setEvents]        = useState<CalendarEvent[]>([])
  const [blockedDates,  setBlockedDates]  = useState<BlockedDate[]>([])
  const [loading,       setLoading]       = useState(true)
  const [selected,      setSelected]      = useState<string | null>(toKey(today))

  // Block Date modal state
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [blockDate,      setBlockDate]      = useState('')
  const [blockReason,    setBlockReason]    = useState('')
  const [blockSaving,    setBlockSaving]    = useState(false)
  const [blockError,     setBlockError]     = useState<string | null>(null)

  // Unblock confirm
  const [unblockingId, setUnblockingId] = useState<number | null>(null)

  const fetchEvents = useCallback(async (year: number, month: number) => {
    setLoading(true)
    const res = await fetch(`/api/admin/calendar?year=${year}&month=${month + 1}`)
    if (res.status === 401) { router.replace('/admin/login'); return }
    const json = await res.json()
    setEvents(json.events ?? [])
    setBlockedDates(json.blockedDates ?? [])
    setLoading(false)
  }, [router])

  useEffect(() => { fetchEvents(viewYear, viewMonth) }, [viewYear, viewMonth, fetchEvents])

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

  const handleBlockDate = async (e: React.FormEvent) => {
    e.preventDefault()
    setBlockError(null)
    setBlockSaving(true)
    const res  = await fetch('/api/admin/blocked-dates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: blockDate, reason: blockReason }),
    })
    const json = await res.json()
    setBlockSaving(false)
    if (!res.ok) { setBlockError(json.error ?? 'Failed to block date.'); return }
    setShowBlockModal(false)
    setBlockDate('')
    setBlockReason('')
    await fetchEvents(viewYear, viewMonth)
  }

  const handleUnblock = async (id: number) => {
    setUnblockingId(id)
    await fetch(`/api/admin/blocked-dates/${id}`, { method: 'DELETE' })
    setUnblockingId(null)
    await fetchEvents(viewYear, viewMonth)
  }

  const grid        = buildGrid(viewYear, viewMonth)
  const eventsByDay = events.reduce<Record<string, CalendarEvent[]>>((acc, ev) => {
    if (!acc[ev.date]) acc[ev.date] = []
    acc[ev.date].push(ev)
    return acc
  }, {})
  const blockedSet  = new Set(blockedDates.map((b) => b.date))
  const blockedMap  = Object.fromEntries(blockedDates.map((b) => [b.date, b]))

  const selectedEvents      = selected ? (eventsByDay[selected] ?? []) : []
  const selectedBlocked     = selected ? blockedMap[selected] ?? null : null
  const selectedDateObj     = selected ? new Date(selected + 'T12:00:00') : null

  // Sort events: morning first, then afternoon, then no slot
  const sortedEvents = [...selectedEvents].sort((a, b) => {
    const order = { morning: 0, afternoon: 1 }
    const aOrder = a.time_slot ? (order[a.time_slot] ?? 2) : 2
    const bOrder = b.time_slot ? (order[b.time_slot] ?? 2) : 2
    return aOrder - bOrder
  })

  return (
    <div className="flex-1 bg-[#F4F6F9]">

      {/* Page header */}
      <div className="border-b border-[#E8ECF0] bg-white px-4 py-4 sm:px-8">
        <div className="mx-auto max-w-7xl flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#0D1B2A]">Schedule</h1>
            <p className="text-xs text-[#7A8898]">Repair jobs, maintenance visits, and service requests</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => { setShowBlockModal(true); setBlockError(null) }}
              className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition"
            >
              <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              Block Date
            </button>
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
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">

          {/* ── Calendar panel ── */}
          <div className="flex-1 min-w-0 rounded-2xl bg-white border border-[#E8ECF0] shadow-sm overflow-hidden">

            {/* Month nav */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8ECF0]">
              <button onClick={prevMonth} className="rounded-lg p-2 text-[#7A8898] hover:bg-[#F4F6F9] hover:text-[#0D1B2A] transition" aria-label="Previous month">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold text-[#0D1B2A] tabular-nums">
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </h2>
                {(viewYear !== today.getFullYear() || viewMonth !== today.getMonth()) && (
                  <button onClick={goToday} className="rounded-full bg-[#E8ECF0] px-3 py-0.5 text-xs font-semibold text-[#0D1B2A] hover:bg-[#d4d8dc] transition">
                    Today
                  </button>
                )}
              </div>

              <button onClick={nextMonth} className="rounded-lg p-2 text-[#7A8898] hover:bg-[#F4F6F9] hover:text-[#0D1B2A] transition" aria-label="Next month">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Grid area */}
            {loading ? (
              <div className="flex items-center justify-center py-24 text-[#7A8898]">
                <svg className="h-5 w-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-sm">Loading schedule…</span>
              </div>
            ) : (
              <div className="p-3">
                {/* Day-of-week headers */}
                <div className="grid grid-cols-7 gap-1.5 mb-1.5">
                  {DAY_LABELS.map((d, i) => (
                    <div key={d} className={`py-1.5 text-center text-[10px] font-semibold uppercase tracking-widest ${i === 0 || i === 6 ? 'text-[#B87333]/70' : 'text-[#7A8898]'}`}>
                      {d}
                    </div>
                  ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7 gap-1.5">
                  {grid.map((date, i) => {
                    const key        = toKey(date)
                    const inMonth    = date.getMonth() === viewMonth
                    const isSelected = selected === key
                    const todayCell  = isToday(date)
                    const isWeekend  = date.getDay() === 0 || date.getDay() === 6
                    const isBlocked  = blockedSet.has(key)
                    const dayEvents  = eventsByDay[key] ?? []
                    const visible    = dayEvents.slice(0, 3)
                    const overflow   = dayEvents.length - visible.length

                    let cellCls: string
                    if (isBlocked) {
                      cellCls = isSelected
                        ? 'border-2 border-gray-400 bg-gray-100'
                        : 'border border-gray-300 bg-gray-100 hover:bg-gray-200'
                    } else if (todayCell) {
                      cellCls = 'border-2 border-[#B87333] bg-white shadow-sm'
                    } else if (isSelected) {
                      cellCls = 'border-2 border-[#B87333]/40 bg-[#B87333]/5'
                    } else if (!inMonth) {
                      cellCls = 'border border-[#E8ECF0] bg-[#FAFAFA] hover:bg-[#F4F6F9]'
                    } else if (isWeekend) {
                      cellCls = 'border border-[#E8ECF0] bg-[#F4F6F9] hover:bg-[#eef0f3]'
                    } else {
                      cellCls = 'border border-[#E8ECF0] bg-white hover:bg-[#F4F6F9]'
                    }

                    return (
                      <button
                        key={i}
                        onClick={() => setSelected(isSelected ? null : key)}
                        className={`relative flex min-h-[80px] sm:min-h-[100px] w-full flex-col items-start rounded-xl p-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B87333]/50 ${cellCls}`}
                      >
                        {/* Day number */}
                        <span className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          todayCell && !isBlocked ? 'bg-[#B87333] text-white'
                          : isBlocked ? 'text-[#7A8898]'
                          : inMonth   ? 'text-[#0D1B2A]'
                          : 'text-[#7A8898]'
                        }`}>
                          {date.getDate()}
                        </span>

                        {/* Blocked badge */}
                        {isBlocked && (
                          <span className="hidden sm:block text-[9px] font-bold uppercase tracking-wide text-[#7A8898] mb-0.5">Blocked</span>
                        )}

                        {/* Event pills — sm+ */}
                        <div className="hidden sm:flex w-full flex-col gap-0.5">
                          {visible.map((ev) => (
                            <span key={ev.id} className={`truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium leading-tight ${EVENT_STYLE[ev.type].pill}`}>
                              {PILL_LABEL[ev.type]}{ev.time_slot ? ` ${SLOT_TIME[ev.time_slot]}` : ''}
                            </span>
                          ))}
                          {overflow > 0 && (
                            <span className="pl-1 text-[10px] font-semibold text-[#7A8898]">+{overflow} more</span>
                          )}
                        </div>

                        {/* Dots — xs only */}
                        <div className="flex sm:hidden gap-0.5 flex-wrap mt-0.5">
                          {isBlocked && <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />}
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
              </div>
            )}

            {/* Legend */}
            <div className="border-t border-[#E8ECF0] px-4 py-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#7A8898]">Event types</p>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(TYPE_LABEL) as [CalendarEvent['type'], string][]).map(([type, label]) => (
                  <span key={type} className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${EVENT_STYLE[type].pill}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${EVENT_STYLE[type].dot}`} />
                    {label}
                  </span>
                ))}
                <span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold bg-gray-100 text-gray-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                  Blocked
                </span>
              </div>
            </div>
          </div>

          {/* ── Day detail panel ── */}
          <div className="w-full lg:w-72 shrink-0 rounded-2xl bg-white border border-[#E8ECF0] shadow-sm overflow-hidden">
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
                    {selectedBlocked ? 'Blocked' : selectedEvents.length === 0 ? 'No events' : `${selectedEvents.length} event${selectedEvents.length !== 1 ? 's' : ''}`}
                  </p>
                </>
              ) : (
                <p className="text-sm text-[#7A8898]">Click a day to see its schedule</p>
              )}
            </div>

            {selectedDateObj && selectedBlocked && (
              <div className="px-5 py-4 bg-gray-50 border-b border-[#E8ECF0]">
                <div className="flex items-start gap-2">
                  <svg className="mt-0.5 h-4 w-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-700">Blocked date</p>
                    {selectedBlocked.reason && (
                      <p className="mt-0.5 text-xs text-gray-500">{selectedBlocked.reason}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleUnblock(selectedBlocked.id)}
                    disabled={unblockingId === selectedBlocked.id}
                    className="text-[10px] font-semibold text-red-500 hover:text-red-700 disabled:opacity-50"
                  >
                    {unblockingId === selectedBlocked.id ? '…' : 'Unblock'}
                  </button>
                </div>
              </div>
            )}

            {sortedEvents.length > 0 ? (
              <ul className="divide-y divide-[#E8ECF0]">
                {sortedEvents.map((ev) => (
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
                    {ev.time_slot && (
                      <span className="mt-1 inline-flex items-center rounded-full bg-[#B87333]/10 px-2 py-0.5 text-[10px] font-semibold text-[#B87333]">
                        {SLOT_LABEL[ev.time_slot]}
                      </span>
                    )}
                    {ev.detail && (
                      <p className="mt-1.5 text-xs text-[#7A8898] line-clamp-2">{ev.detail}</p>
                    )}
                    {ev.type === 'repair' && (
                      <Link href="/admin/repair-jobs" className="mt-2 inline-flex text-xs font-semibold text-[#B87333] hover:underline">
                        View job →
                      </Link>
                    )}
                    {ev.type === 'service_request' && (
                      <Link href="/admin/service-requests" className="mt-2 inline-flex text-xs font-semibold text-[#B87333] hover:underline">
                        View request →
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
                {!selectedBlocked && (
                  <Link href="/admin/repair-jobs" className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#B87333] px-4 py-2 text-xs font-semibold text-white hover:bg-[#a0632b] transition">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Repair
                  </Link>
                )}
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

      {/* ── Block Date Modal ── */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8ECF0]">
              <h2 className="text-base font-bold text-[#0D1B2A]">Block a Date</h2>
              <button onClick={() => setShowBlockModal(false)} className="rounded-lg p-1.5 text-[#7A8898] hover:bg-[#F4F6F9] transition">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleBlockDate} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={blockDate}
                  onChange={(e) => setBlockDate(e.target.value)}
                  required
                  className="block w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason <span className="text-gray-400 font-normal">(optional)</span></label>
                <input
                  type="text"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="e.g. Holiday, staff training…"
                  className="block w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20"
                />
              </div>
              {blockError && <p className="text-sm text-red-600">{blockError}</p>}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowBlockModal(false)}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={blockSaving}
                  className="flex-1 rounded-xl bg-[#0D1B2A] py-2.5 text-sm font-semibold text-white hover:bg-[#1a2d40] disabled:opacity-50 transition"
                >
                  {blockSaving ? 'Blocking…' : 'Block date'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
