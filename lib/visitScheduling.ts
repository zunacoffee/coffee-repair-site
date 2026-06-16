// visit_frequency is months between PM visits (defaults to 1 when unset).
export function computeNextVisitDate(visitFrequencyMonths: number | null | undefined, from: Date = new Date()): string {
  const freq = visitFrequencyMonths ?? 1
  const next = new Date(from.getFullYear(), from.getMonth() + freq, from.getDate())
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`
}
