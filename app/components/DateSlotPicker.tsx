"use client"

import { useEffect, useState } from 'react'

type Availability = {
  blocked: string[]
  booked: Record<string, string[]>
}

type Props = {
  selectedDate: string | null
  selectedSlot: 'morning' | 'afternoon' | null
  onDateChange: (date: string) => void
  onSlotChange: (slot: 'morning' | 'afternoon') => void
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

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

export default function DateSlotPicker({ selectedDate, selectedSlot, onDateChange, onSlotChange }: Props) {
  const todayRef = new Date()
  todayRef.setHours(0, 0, 0, 0)

  const [viewYear,  setViewYear]  = useState(todayRef.getFullYear())
  const [viewMonth, setViewMonth] = useState(todayRef.getMonth())
  const [avail,     setAvail]     = useState<Availability>({ blocked: [], booked: {} })
  const [loading,   setLoading]   = useState(false)

  useEffect(() => {
    const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate()
    const start   = padDate(viewYear, viewMonth, 1)
    const end     = padDate(viewYear, viewMonth, lastDay)
    setLoading(true)
    fetch(`/api/availability?start=${start}&end=${end}`)
      .then((r) => r.json())
      .then((data: Availability) => setAvail(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [viewYear, viewMonth])

  const canGoPrev = viewYear > todayRef.getFullYear() ||
    (viewYear === todayRef.getFullYear() && viewMonth > todayRef.getMonth())

  const prevMonth = () => {
    if (!canGoPrev) return
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const grid = buildGrid(viewYear, viewMonth)

  return (
    <div className="rounded-xl border border-[#E8ECF0] bg-white p-4 select-none">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={prevMonth}
          disabled={!canGoPrev}
          className="rounded-lg p-1.5 text-[#7A8898] hover:bg-[#F4F6F9] disabled:opacity-30 disabled:cursor-not-allowed transition"
          aria-label="Previous month"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-bold text-[#0D1B2A]">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="rounded-lg p-1.5 text-[#7A8898] hover:bg-[#F4F6F9] transition"
          aria-label="Next month"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day-of-week labels */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((d, i) => (
          <div
            key={d}
            className={`text-center text-[10px] font-semibold uppercase py-1 ${
              i === 0 || i === 6 ? 'text-gray-300' : 'text-[#7A8898]'
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <svg className="h-4 w-4 animate-spin text-[#B87333]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-0.5">
          {grid.map((date, i) => {
            if (!date) {
              return <div key={`empty-${i}`} />
            }

            const key       = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
            const isPast    = date < todayRef
            const isWeekend = date.getDay() === 0 || date.getDay() === 6
            const isBlocked = avail.blocked.includes(key)
            const booked    = avail.booked[key] ?? []
            const fullBook  = booked.includes('morning') && booked.includes('afternoon')
            const disabled  = isPast || isWeekend || isBlocked || fullBook
            const isSelected = selectedDate === key
            const isToday    = key === padDate(todayRef.getFullYear(), todayRef.getMonth(), todayRef.getDate())

            let cls: string
            if (isSelected) {
              cls = 'bg-[#B87333] text-white font-bold ring-2 ring-[#B87333]/30'
            } else if (disabled) {
              cls = 'text-gray-300 cursor-not-allowed'
            } else if (isToday) {
              cls = 'text-[#B87333] font-bold ring-1 ring-[#B87333]/30 hover:bg-[#B87333]/10'
            } else {
              cls = 'text-[#0D1B2A] hover:bg-[#B87333]/10 hover:text-[#B87333]'
            }

            const title = isBlocked ? 'Date blocked' : fullBook ? 'Fully booked' : undefined

            return (
              <button
                key={key}
                type="button"
                disabled={disabled}
                onClick={() => onDateChange(key)}
                title={title}
                className={`flex h-9 w-full items-center justify-center rounded-lg text-sm transition ${cls}`}
              >
                {date.getDate()}
              </button>
            )
          })}
        </div>
      )}

      {/* Slot picker */}
      {selectedDate && (
        <div className="mt-4 border-t border-[#E8ECF0] pt-4">
          <p className="mb-2 text-xs font-semibold text-[#0D1B2A]">Select a time slot</p>
          <div className="grid grid-cols-2 gap-2">
            {(['morning', 'afternoon'] as const).map((slot) => {
              const slotBooked   = (avail.booked[selectedDate] ?? []).includes(slot)
              const slotSelected = selectedSlot === slot
              return (
                <button
                  key={slot}
                  type="button"
                  disabled={slotBooked}
                  onClick={() => onSlotChange(slot)}
                  className={`rounded-xl border px-3 py-2.5 text-left transition ${
                    slotSelected
                      ? 'border-[#B87333] bg-[#B87333]/10 text-[#B87333]'
                      : slotBooked
                      ? 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed'
                      : 'border-[#E8ECF0] text-[#0D1B2A] hover:border-[#B87333]/40 hover:bg-[#B87333]/5'
                  }`}
                >
                  <span className="block text-sm font-semibold">
                    {slot === 'morning' ? 'Morning' : 'Afternoon'}
                    {slotBooked && <span className="ml-1 text-[10px] font-normal text-gray-400">(full)</span>}
                  </span>
                  <span className="block text-xs opacity-60">
                    {slot === 'morning' ? '8am – 12pm' : '12pm – 5pm'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
