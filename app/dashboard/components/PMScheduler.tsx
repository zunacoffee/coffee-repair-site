"use client"

import { useState } from 'react'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const PM_SLOTS = ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM']

interface PMSchedulerProps {
  onClose: () => void
  onSave: (date: string, slot: string) => void
  saving: boolean
  error: string | null
}

export function PMScheduler({ onClose, onSave, saving, error }: PMSchedulerProps) {
  const [pmDate,      setPmDate]      = useState<string | null>(null)
  const [pmSlot,      setPmSlot]      = useState<string | null>(null)
  const [pmViewYear,  setPmViewYear]  = useState(() => new Date().getFullYear())
  const [pmViewMonth, setPmViewMonth] = useState(() => new Date().getMonth())

  const pmToday = new Date(); pmToday.setHours(0, 0, 0, 0)
  const canGoPrev = pmViewYear > pmToday.getFullYear() || (pmViewYear === pmToday.getFullYear() && pmViewMonth > pmToday.getMonth())
  const firstDow = new Date(pmViewYear, pmViewMonth, 1).getDay()
  const daysInMonth = new Date(pmViewYear, pmViewMonth + 1, 0).getDate()
  const cells: (Date | null)[] = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(pmViewYear, pmViewMonth, d))
  const pad = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl bg-white max-h-[85vh] sm:max-h-[90vh] flex flex-col z-50 overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <p className="text-base font-bold text-[#0D1B2A]">Schedule PM Visit</p>
          <button onClick={onClose} className="text-[#7A8898] hover:text-[#0D1B2A] transition">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-4">
          <div className="rounded-xl border border-[#E8ECF0] bg-white p-4 select-none">
            <div className="flex items-center justify-between mb-3">
              <button type="button" onClick={() => { if (!canGoPrev) return; if (pmViewMonth === 0) { setPmViewYear(y => y - 1); setPmViewMonth(11) } else setPmViewMonth(m => m - 1) }} disabled={!canGoPrev} className="rounded-lg p-2 text-[#7A8898] hover:bg-[#E8ECF0] disabled:opacity-30 disabled:cursor-not-allowed transition">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <span className="text-sm font-bold text-[#0D1B2A]">{MONTH_NAMES[pmViewMonth]} {pmViewYear}</span>
              <button type="button" onClick={() => { if (pmViewMonth === 11) { setPmViewYear(y => y + 1); setPmViewMonth(0) } else setPmViewMonth(m => m + 1) }} className="rounded-lg p-2 text-[#7A8898] hover:bg-[#E8ECF0] transition">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
            <div className="grid grid-cols-7 mb-1">
              {DAY_LABELS.map((d, i) => (
                <div key={d} className={`text-center text-[10px] font-semibold uppercase py-1 ${i === 0 || i === 6 ? 'text-red-300' : 'text-[#7A8898]'}`}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((date, i) => {
                if (!date) return <div key={`e-${i}`} />
                const key = pad(date.getFullYear(), date.getMonth(), date.getDate())
                const isPast = date < pmToday
                const dow = date.getDay()
                const isWeekend = dow === 0 || dow === 6
                const disabled = isPast || isWeekend
                const isSelected = pmDate === key
                let cls: string
                if (isSelected)      cls = 'bg-[#B87333] text-white font-bold ring-2 ring-[#B87333]/30'
                else if (isWeekend)  cls = 'bg-red-50 text-red-300 cursor-not-allowed'
                else if (isPast)     cls = 'text-gray-300 cursor-not-allowed'
                else                 cls = 'text-[#0D1B2A] hover:bg-[#B87333]/10 hover:text-[#B87333]'
                return (
                  <button key={key} type="button" disabled={disabled} onClick={() => { setPmDate(key); setPmSlot(null) }}
                    className={`flex h-10 w-full items-center justify-center rounded-lg text-sm transition ${cls}`}>
                    {date.getDate()}
                  </button>
                )
              })}
            </div>
            {pmDate && (
              <div className="mt-4 border-t border-[#E8ECF0] pt-4">
                <p className="mb-2 text-xs font-semibold text-[#0D1B2A]">Select an arrival time</p>
                <div className="grid grid-cols-3 gap-2">
                  {PM_SLOTS.map((slot) => (
                    <button key={slot} type="button" onClick={() => setPmSlot(slot)}
                      className={`flex items-center justify-center rounded-full border py-2 text-xs font-semibold transition ${pmSlot === slot ? 'bg-[#B87333] border-[#B87333] text-white' : 'bg-white border-[#0D1B2A] text-[#0D1B2A] hover:border-[#B87333] hover:bg-[#B87333]/5'}`}>
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </div>
        <div className="px-6 pb-6">
          <button
            onClick={() => pmDate && pmSlot && onSave(pmDate, pmSlot)}
            disabled={saving || !pmDate || !pmSlot}
            className="mt-4 w-full rounded-xl bg-[#B87333] py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition"
          >
            {saving ? 'Saving…' : 'Confirm appointment'}
          </button>
        </div>
      </div>
    </div>
  )
}
