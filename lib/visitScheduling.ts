// visit_frequency is visits per month (defaults to 1 when unset).
export function computeNextVisitDate(visitsPerMonth: number | null | undefined, from: Date = new Date()): string {
  const freq = visitsPerMonth && visitsPerMonth > 0 ? visitsPerMonth : 1
  const daysUntilNext = Math.round(30 / freq)
  const next = new Date(from.getFullYear(), from.getMonth(), from.getDate() + daysUntilNext)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`
}
