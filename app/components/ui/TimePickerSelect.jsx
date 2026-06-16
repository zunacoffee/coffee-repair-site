'use client'

export const TIME_OPTIONS = [
  { value: '08:00', label: '8:00 AM' },  { value: '08:30', label: '8:30 AM' },
  { value: '09:00', label: '9:00 AM' },  { value: '09:30', label: '9:30 AM' },
  { value: '10:00', label: '10:00 AM' }, { value: '10:30', label: '10:30 AM' },
  { value: '11:00', label: '11:00 AM' }, { value: '11:30', label: '11:30 AM' },
  { value: '12:00', label: '12:00 PM' }, { value: '12:30', label: '12:30 PM' },
  { value: '13:00', label: '1:00 PM' },  { value: '13:30', label: '1:30 PM' },
  { value: '14:00', label: '2:00 PM' },  { value: '14:30', label: '2:30 PM' },
  { value: '15:00', label: '3:00 PM' },  { value: '15:30', label: '3:30 PM' },
  { value: '16:00', label: '4:00 PM' },  { value: '16:30', label: '4:30 PM' },
  { value: '17:00', label: '5:00 PM' },
]

export function formatTime(hhmm) {
  if (!hhmm) return ''
  const opt = TIME_OPTIONS.find(o => o.value === hhmm)
  return opt ? opt.label : hhmm
}

const DEFAULT_CLS =
  'block w-full rounded-xl border border-[#E8ECF0] bg-white px-4 py-2.5 text-sm text-[#0D1B2A] ' +
  'focus:border-[#B87333] focus:outline-none focus:ring-2 focus:ring-[#B87333]/20'

export default function TimePickerSelect({ id, value, onChange, className, placeholder = '— No time —' }) {
  return (
    <select
      id={id}
      value={value ?? ''}
      onChange={onChange}
      className={className ?? DEFAULT_CLS}
    >
      <option value="">{placeholder}</option>
      {TIME_OPTIONS.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
