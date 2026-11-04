const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'] as const
const WEEKDAY_INITIALS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'] as const

// Server timestamps already carry Mexico City's offset, so the wall-clock time is read as-is.
export function clockFromIso(iso: string): string {
  return iso.slice(11, 16)
}

export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes} min`
  if (minutes === 0) return `${hours} h`
  return `${hours} h ${minutes} min`
}

export function parseNextDose(nextDose: string | null): { time: string; tomorrow: boolean } | null {
  const match = nextDose?.match(/^(\d{2}:\d{2})( \(mañana\))?$/)
  if (!match?.[1]) return null
  return { time: match[1], tomorrow: Boolean(match[2]) }
}

export function timeAgo(iso: string, nowIso: string): string {
  const minutes = Math.max(0, Math.round((Date.parse(nowIso) - Date.parse(iso)) / 60_000))
  if (minutes < 1) return 'justo ahora'
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  return `hace ${Math.round(hours / 24)} d`
}

function weekdayIndex(date: string): number {
  return new Date(`${date}T12:00:00`).getDay()
}

export function weekdayInitial(date: string): string {
  return WEEKDAY_INITIALS[weekdayIndex(date)] ?? ''
}

export function weekdayName(date: string): string {
  return WEEKDAYS[weekdayIndex(date)] ?? ''
}
