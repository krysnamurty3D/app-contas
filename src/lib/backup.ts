import type { Trip } from '../types'

interface BackupFile {
  version: 1
  exportedAt: string
  trips: Trip[]
}

export function exportBackup(trips: Trip[]) {
  const backup: BackupFile = {
    version: 1,
    exportedAt: new Date().toISOString(),
    trips,
  }
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `despesas-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function isTrip(t: unknown): t is Trip {
  if (!t || typeof t !== 'object') return false
  const trip = t as Record<string, unknown>
  return (
    typeof trip.id === 'string' &&
    typeof trip.name === 'string' &&
    typeof trip.baseCurrency === 'string' &&
    Array.isArray(trip.participants) &&
    Array.isArray(trip.accounts) &&
    Array.isArray(trip.expenses)
  )
}

/** Parses a backup file's contents. Throws if the format is unrecognized. */
export function parseBackup(text: string): Trip[] {
  const data = JSON.parse(text)
  const trips = Array.isArray(data) ? data : (data as BackupFile)?.trips
  if (!Array.isArray(trips) || !trips.every(isTrip)) {
    throw new Error('Arquivo de backup inválido.')
  }
  return trips
}
