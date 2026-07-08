import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { useLocalStorage } from '../lib/storage'
import type { Account, Expense, GroupSettlement, Participant, Trip } from '../types'

export interface TripsContextValue {
  trips: Trip[]
  currentTrip: Trip | null
  selectTrip: (id: string | null) => void
  createTrip: (name: string, baseCurrency: string) => string
  deleteTrip: (id: string) => void
  addParticipant: (tripId: string, name: string) => void
  removeParticipant: (tripId: string, participantId: string) => void
  addExpense: (tripId: string, expense: Omit<Expense, 'id'>) => void
  updateExpense: (tripId: string, expense: Expense) => void
  deleteExpense: (tripId: string, expenseId: string) => void
  addAccount: (tripId: string, account: Omit<Account, 'id'>) => void
  updateAccount: (tripId: string, account: Account) => void
  deleteAccount: (tripId: string, accountId: string) => void
  addGroup: (tripId: string, name: string) => void
  removeGroup: (tripId: string, groupId: string) => void
  setParticipantGroup: (
    tripId: string,
    participantId: string,
    groupId: string | null,
  ) => void
  addGroupSettlement: (
    tripId: string,
    settlement: Omit<GroupSettlement, 'id'>,
  ) => void
  removeGroupSettlement: (tripId: string, settlementId: string) => void
  /** Merges trips from a backup, skipping any whose id already exists. Returns how many were added. */
  importTrips: (trips: Trip[]) => number
  /** Adds an e-mail to a trip's member list. Only available when synced via Firebase. */
  inviteMember?: (tripId: string, email: string) => Promise<void>
}

export const TripsContext = createContext<TripsContextValue | null>(null)

export function newId() {
  return crypto.randomUUID()
}

export function TripsProvider({ children }: { children: ReactNode }) {
  const [trips, setTrips] = useLocalStorage<Trip[]>('trips', [])
  const [currentTripId, setCurrentTripId] = useLocalStorage<string | null>(
    'currentTripId',
    null,
  )

  // Migrate trips saved before the `accounts`/`groups`/`groupSettlements` fields existed.
  useEffect(() => {
    setTrips((prev) =>
      prev.some((t) => !t.accounts || !t.groups || !t.groupSettlements)
        ? prev.map((t) => ({
            ...t,
            accounts: t.accounts ?? [],
            groups: t.groups ?? [],
            groupSettlements: t.groupSettlements ?? [],
          }))
        : prev,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const currentTrip = useMemo(
    () => trips.find((t) => t.id === currentTripId) ?? null,
    [trips, currentTripId],
  )

  const value: TripsContextValue = {
    trips,
    currentTrip,
    selectTrip: (id) => setCurrentTripId(id),
    createTrip: (name, baseCurrency) => {
      const id = newId()
      const trip: Trip = {
        id,
        name,
        baseCurrency,
        participants: [],
        groups: [],
        groupSettlements: [],
        accounts: [],
        expenses: [],
        createdAt: new Date().toISOString(),
      }
      setTrips((prev) => [...prev, trip])
      setCurrentTripId(id)
      return id
    },
    deleteTrip: (id) => {
      setTrips((prev) => prev.filter((t) => t.id !== id))
      setCurrentTripId((prev) => (prev === id ? null : prev))
    },
    addParticipant: (tripId, name) => {
      const participant: Participant = { id: newId(), name }
      setTrips((prev) =>
        prev.map((t) =>
          t.id === tripId
            ? { ...t, participants: [...t.participants, participant] }
            : t,
        ),
      )
    },
    removeParticipant: (tripId, participantId) => {
      setTrips((prev) =>
        prev.map((t) =>
          t.id === tripId
            ? {
                ...t,
                participants: t.participants.filter(
                  (p) => p.id !== participantId,
                ),
                expenses: t.expenses.filter(
                  (e) =>
                    e.paidBy !== participantId &&
                    !e.splits.some((s) => s.participantId === participantId),
                ),
              }
            : t,
        ),
      )
    },
    addExpense: (tripId, expense) => {
      const newExpense: Expense = { ...expense, id: newId() }
      setTrips((prev) =>
        prev.map((t) =>
          t.id === tripId
            ? { ...t, expenses: [...t.expenses, newExpense] }
            : t,
        ),
      )
    },
    updateExpense: (tripId, expense) => {
      setTrips((prev) =>
        prev.map((t) =>
          t.id === tripId
            ? {
                ...t,
                expenses: t.expenses.map((e) =>
                  e.id === expense.id ? expense : e,
                ),
              }
            : t,
        ),
      )
    },
    deleteExpense: (tripId, expenseId) => {
      setTrips((prev) =>
        prev.map((t) =>
          t.id === tripId
            ? { ...t, expenses: t.expenses.filter((e) => e.id !== expenseId) }
            : t,
        ),
      )
    },
    addAccount: (tripId, account) => {
      const newAccount: Account = { ...account, id: newId() }
      setTrips((prev) =>
        prev.map((t) =>
          t.id === tripId
            ? { ...t, accounts: [...t.accounts, newAccount] }
            : t,
        ),
      )
    },
    updateAccount: (tripId, account) => {
      setTrips((prev) =>
        prev.map((t) =>
          t.id === tripId
            ? {
                ...t,
                accounts: t.accounts.map((a) =>
                  a.id === account.id ? account : a,
                ),
              }
            : t,
        ),
      )
    },
    deleteAccount: (tripId, accountId) => {
      setTrips((prev) =>
        prev.map((t) =>
          t.id === tripId
            ? {
                ...t,
                accounts: t.accounts.filter((a) => a.id !== accountId),
                expenses: t.expenses.map((e) =>
                  e.paymentMethodId === accountId
                    ? { ...e, paymentMethodId: undefined }
                    : e,
                ),
              }
            : t,
        ),
      )
    },
    addGroup: (tripId, name) => {
      setTrips((prev) =>
        prev.map((t) =>
          t.id === tripId
            ? { ...t, groups: [...t.groups, { id: newId(), name }] }
            : t,
        ),
      )
    },
    removeGroup: (tripId, groupId) => {
      setTrips((prev) =>
        prev.map((t) =>
          t.id === tripId
            ? {
                ...t,
                groups: t.groups.filter((g) => g.id !== groupId),
                participants: t.participants.map((p) =>
                  p.groupId === groupId ? { ...p, groupId: undefined } : p,
                ),
                groupSettlements: t.groupSettlements.filter(
                  (s) => s.fromGroupId !== groupId && s.toGroupId !== groupId,
                ),
              }
            : t,
        ),
      )
    },
    setParticipantGroup: (tripId, participantId, groupId) => {
      setTrips((prev) =>
        prev.map((t) =>
          t.id === tripId
            ? {
                ...t,
                participants: t.participants.map((p) =>
                  p.id === participantId
                    ? { ...p, groupId: groupId ?? undefined }
                    : p,
                ),
              }
            : t,
        ),
      )
    },
    addGroupSettlement: (tripId, settlement) => {
      setTrips((prev) =>
        prev.map((t) =>
          t.id === tripId
            ? {
                ...t,
                groupSettlements: [
                  ...t.groupSettlements,
                  { ...settlement, id: newId() },
                ],
              }
            : t,
        ),
      )
    },
    removeGroupSettlement: (tripId, settlementId) => {
      setTrips((prev) =>
        prev.map((t) =>
          t.id === tripId
            ? {
                ...t,
                groupSettlements: t.groupSettlements.filter(
                  (s) => s.id !== settlementId,
                ),
              }
            : t,
        ),
      )
    },
    importTrips: (imported) => {
      let added = 0
      setTrips((prev) => {
        const existingIds = new Set(prev.map((t) => t.id))
        const newTrips = imported
          .filter((t) => !existingIds.has(t.id))
          .map((t) => ({
            ...t,
            accounts: t.accounts ?? [],
            groups: t.groups ?? [],
            groupSettlements: t.groupSettlements ?? [],
          }))
        added = newTrips.length
        return [...prev, ...newTrips]
      })
      return added
    },
  }

  return (
    <TripsContext.Provider value={value}>{children}</TripsContext.Provider>
  )
}

export function useTrips() {
  const ctx = useContext(TripsContext)
  if (!ctx) throw new Error('useTrips must be used within TripsProvider')
  return ctx
}
