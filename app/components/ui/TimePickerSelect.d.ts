import type { ChangeEvent } from 'react'

export interface TimeOption {
  value: string
  label: string
}

export declare const TIME_OPTIONS: TimeOption[]
export declare function formatTime(hhmm: string | null | undefined): string

export interface TimePickerSelectProps {
  id?: string
  value: string
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void
  className?: string
  placeholder?: string
}

declare function TimePickerSelect(props: TimePickerSelectProps): React.JSX.Element
export default TimePickerSelect
