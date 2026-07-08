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
import type { Account, Expense, Participant, Trip } from '../types'

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
        snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Trip),
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
        accounts: [],
        expenses: [],
        createdAt: new Date().toISOString(),
        memberEmails: email ? [email] : [],
      }
      void setDoc(tripRef(id), trip)
      setCurrentTripId(id)
      return id
    },
    deleteTrip: (id) => {
      void deleteDoc(tripRef(id))
      setCurrentTripId((prev) => (prev === id ? null : prev))
    },
    addParticipant: (tripId, name) => {
      const participant: Participant = { id: newId(), name }
      const trip = trips.find((t) => t.id === tripId)
      if (!trip) return
      void updateDoc(tripRef(tripId), {
        participants: [...trip.participants, participant],
      })
    },
    removeParticipant: (tripId, participantId) => {
      const trip = trips.find((t) => t.id === tripId)
      if (!trip) return
      void updateDoc(tripRef(tripId), {
        participants: trip.participants.filter((p) => p.id !== participantId),
        expenses: trip.expenses.filter(
          (e) =>
            e.paidBy !== participantId &&
            !e.splits.some((s) => s.participantId === participantId),
        ),
      })
    },
    addExpense: (tripId, expense) => {
      const newExpense: Expense = { ...expense, id: newId() }
      const trip = trips.find((t) => t.id === tripId)
      if (!trip) return
      void updateDoc(tripRef(tripId), {
        expenses: [...trip.expenses, newExpense],
      })
    },
    updateExpense: (tripId, expense) => {
      const trip = trips.find((t) => t.id === tripId)
      if (!trip) return
      void updateDoc(tripRef(tripId), {
        expenses: trip.expenses.map((e) => (e.id === expense.id ? expense : e)),
      })
    },
    deleteExpense: (tripId, expenseId) => {
      const trip = trips.find((t) => t.id === tripId)
      if (!trip) return
      void updateDoc(tripRef(tripId), {
        expenses: trip.expenses.filter((e) => e.id !== expenseId),
      })
    },
    addAccount: (tripId, account) => {
      const newAccount: Account = { ...account, id: newId() }
      const trip = trips.find((t) => t.id === tripId)
      if (!trip) return
      void updateDoc(tripRef(tripId), {
        accounts: [...trip.accounts, newAccount],
      })
    },
    updateAccount: (tripId, account) => {
      const trip = trips.find((t) => t.id === tripId)
      if (!trip) return
      void updateDoc(tripRef(tripId), {
        accounts: trip.accounts.map((a) => (a.id === account.id ? account : a)),
      })
    },
    deleteAccount: (tripId, accountId) => {
      const trip = trips.find((t) => t.id === tripId)
      if (!trip) return
      void updateDoc(tripRef(tripId), {
        accounts: trip.accounts.filter((a) => a.id !== accountId),
        expenses: trip.expenses.map((e) =>
          e.paymentMethodId === accountId
            ? { ...e, paymentMethodId: undefined }
            : e,
        ),
      })
    },
    importTrips: (imported) => {
      const existingIds = new Set(trips.map((t) => t.id))
      const email = user?.email?.toLowerCase()
      const newTrips = imported.filter((t) => !existingIds.has(t.id))
      for (const trip of newTrips) {
        const { id, ...data } = trip
        void setDoc(tripRef(id), {
          ...data,
          memberEmails: email ? [email] : [],
        })
      }
      return newTrips.length
    },
    inviteMember: async (tripId, email) => {
      await updateDoc(tripRef(tripId), {
        memberEmails: arrayUnion(email.trim().toLowerCase()),
      })
    },
  }

  return (
    <TripsContext.Provider value={value}>{children}</TripsContext.Provider>
  )
}
