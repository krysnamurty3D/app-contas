import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { useLocalStorage } from '../lib/storage'
import { db } from '../lib/firebase'
import { useAuth } from './AuthContext'
import { TripsContext, newId, type TripsContextValue } from './TripsContext'
import type { Account, Expense, GroupSettlement, Participant, Trip } from '../types'

/** Firestore-backed trips provider, used only once the user is signed in and Firebase is configured. */
export function CloudTripsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [trips, setTrips] = useState<Trip[]>([])
  const [currentTripId, setCurrentTripId] = useLocalStorage<string | null>(
    'currentTripId',
    null,
  )

  useEffect(() => {
    if (!db || !user?.email) return
    const email = user.email.toLowerCase()
    const q = query(
      collection(db, 'trips'),
      where('memberEmails', 'array-contains', email),
    )
    return onSnapshot(q, (snapshot) => {
      setTrips(
        snapshot.docs.map((d) => {
          const data = d.data() as Partial<Trip>
          return {
            id: d.id,
            ...data,
            groups: data.groups ?? [],
            groupSettlements: data.groupSettlements ?? [],
          } as Trip
        }),
      )
    })
  }, [user?.email])

  const currentTrip = useMemo(
    () => trips.find((t) => t.id === currentTripId) ?? null,
    [trips, currentTripId],
  )

  const tripRef = (tripId: string) => {
    if (!db) throw new Error('Firebase não está configurado.')
    return doc(db, 'trips', tripId)
  }

  const reportError = (err: unknown) => {
    console.error(err)
    alert('Não foi possível salvar. Verifique sua conexão e tente novamente.')
  }

  const value: TripsContextValue = {
    trips,
    currentTrip,
    selectTrip: (id) => setCurrentTripId(id),
    createTrip: (name, baseCurrency) => {
      const id = newId()
      const email = user?.email?.toLowerCase()
      const trip: Omit<Trip, 'id'> = {
        name,
        baseCurrency,
        participants: [],
        groups: [],
        groupSettlements: [],
        accounts: [],
        expenses: [],
        createdAt: new Date().toISOString(),
        memberEmails: email ? [email] : [],
      }
      setDoc(tripRef(id), trip).catch(reportError)
      setCurrentTripId(id)
      return id
    },
    deleteTrip: (id) => {
      deleteDoc(tripRef(id)).catch(reportError)
      setCurrentTripId((prev) => (prev === id ? null : prev))
    },
    addParticipant: (tripId, name) => {
      const participant: Participant = { id: newId(), name }
      const trip = trips.find((t) => t.id === tripId)
      if (!trip) return
      updateDoc(tripRef(tripId), {
        participants: [...trip.participants, participant],
      }).catch(reportError)
    },
    removeParticipant: (tripId, participantId) => {
      const trip = trips.find((t) => t.id === tripId)
      if (!trip) return
      updateDoc(tripRef(tripId), {
        participants: trip.participants.filter((p) => p.id !== participantId),
        expenses: trip.expenses.filter(
          (e) =>
            e.paidBy !== participantId &&
            !e.splits.some((s) => s.participantId === participantId),
        ),
      }).catch(reportError)
    },
    addExpense: (tripId, expense) => {
      const newExpense: Expense = { ...expense, id: newId() }
      const trip = trips.find((t) => t.id === tripId)
      if (!trip) return
      updateDoc(tripRef(tripId), {
        expenses: [...trip.expenses, newExpense],
      }).catch(reportError)
    },
    updateExpense: (tripId, expense) => {
      const trip = trips.find((t) => t.id === tripId)
      if (!trip) return
      updateDoc(tripRef(tripId), {
        expenses: trip.expenses.map((e) => (e.id === expense.id ? expense : e)),
      }).catch(reportError)
    },
    deleteExpense: (tripId, expenseId) => {
      const trip = trips.find((t) => t.id === tripId)
      if (!trip) return
      updateDoc(tripRef(tripId), {
        expenses: trip.expenses.filter((e) => e.id !== expenseId),
      }).catch(reportError)
    },
    addAccount: (tripId, account) => {
      const newAccount: Account = { ...account, id: newId() }
      const trip = trips.find((t) => t.id === tripId)
      if (!trip) return
      updateDoc(tripRef(tripId), {
        accounts: [...trip.accounts, newAccount],
      }).catch(reportError)
    },
    updateAccount: (tripId, account) => {
      const trip = trips.find((t) => t.id === tripId)
      if (!trip) return
      updateDoc(tripRef(tripId), {
        accounts: trip.accounts.map((a) => (a.id === account.id ? account : a)),
      }).catch(reportError)
    },
    deleteAccount: (tripId, accountId) => {
      const trip = trips.find((t) => t.id === tripId)
      if (!trip) return
      updateDoc(tripRef(tripId), {
        accounts: trip.accounts.filter((a) => a.id !== accountId),
        expenses: trip.expenses.map((e) =>
          e.paymentMethodId === accountId
            ? { ...e, paymentMethodId: undefined }
            : e,
        ),
      }).catch(reportError)
    },
    addGroup: (tripId, name) => {
      const trip = trips.find((t) => t.id === tripId)
      if (!trip) return
      updateDoc(tripRef(tripId), {
        groups: [...trip.groups, { id: newId(), name }],
      }).catch(reportError)
    },
    removeGroup: (tripId, groupId) => {
      const trip = trips.find((t) => t.id === tripId)
      if (!trip) return
      updateDoc(tripRef(tripId), {
        groups: trip.groups.filter((g) => g.id !== groupId),
        participants: trip.participants.map((p) =>
          p.groupId === groupId ? { ...p, groupId: undefined } : p,
        ),
        groupSettlements: trip.groupSettlements.filter(
          (s) => s.fromGroupId !== groupId && s.toGroupId !== groupId,
        ),
      }).catch(reportError)
    },
    setParticipantGroup: (tripId, participantId, groupId) => {
      const trip = trips.find((t) => t.id === tripId)
      if (!trip) return
      updateDoc(tripRef(tripId), {
        participants: trip.participants.map((p) =>
          p.id === participantId ? { ...p, groupId: groupId ?? undefined } : p,
        ),
      }).catch(reportError)
    },
    addGroupSettlement: (tripId, settlement) => {
      const trip = trips.find((t) => t.id === tripId)
      if (!trip) return
      const newSettlement: GroupSettlement = { ...settlement, id: newId() }
      updateDoc(tripRef(tripId), {
        groupSettlements: [...trip.groupSettlements, newSettlement],
      }).catch(reportError)
    },
    removeGroupSettlement: (tripId, settlementId) => {
      const trip = trips.find((t) => t.id === tripId)
      if (!trip) return
      updateDoc(tripRef(tripId), {
        groupSettlements: trip.groupSettlements.filter(
          (s) => s.id !== settlementId,
        ),
      }).catch(reportError)
    },
    importTrips: (imported) => {
      const existingIds = new Set(trips.map((t) => t.id))
      const email = user?.email?.toLowerCase()
      const newTrips = imported.filter((t) => !existingIds.has(t.id))
      for (const trip of newTrips) {
        const { id, ...data } = trip
        setDoc(tripRef(id), {
          ...data,
          accounts: data.accounts ?? [],
          groups: data.groups ?? [],
          groupSettlements: data.groupSettlements ?? [],
          memberEmails: email ? [email] : [],
        }).catch(reportError)
      }
      return newTrips.length
    },
    inviteMember: async (tripId, email) => {
      // Errors are surfaced inline by the caller (ParticipantsTab), not via reportError.
      await updateDoc(tripRef(tripId), {
        memberEmails: arrayUnion(email.trim().toLowerCase()),
      })
    },
  }

  return (
    <TripsContext.Provider value={value}>{children}</TripsContext.Provider>
  )
}
