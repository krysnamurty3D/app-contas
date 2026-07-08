import { useMemo } from 'react'
import { HandCoins } from 'lucide-react'
import { computeBalances, simplifyDebts } from '../lib/balances'
import { formatCurrency } from '../lib/currencies'
import type { Trip } from '../types'

function nameOf(trip: Trip, id: string) {
  return trip.participants.find((p) => p.id === id)?.name ?? '—'
}

export function ReceivablesTab({ trip }: { trip: Trip }) {
  const balances = useMemo(
    () => computeBalances(trip.participants, trip.expenses),
    [trip.participants, trip.expenses],
  )
  const settlements = useMemo(() => simplifyDebts(balances), [balances])

  const creditors = useMemo(
    () =>
      balances
        .filter((b) => b.net > 0.005)
        .sort((a, b) => b.net - a.net),
    [balances],
  )

  const totalToReceive = useMemo(
    () => creditors.reduce((sum, c) => sum + c.net, 0),
    [creditors],
  )

  if (trip.participants.length === 0) {
    return (
      <p className="text-sm text-neutral-500 text-center py-6">
        Adicione participantes para acompanhar o dinheiro a receber.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-neutral-500">
        <HandCoins size={18} />
        <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
          Dinheiro a receber
        </h2>
      </div>

      {creditors.length === 0 ? (
        <p className="text-sm text-neutral-500 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 px-4 py-6 text-center">
          Ninguém tem dinheiro a receber no momento.
        </p>
      ) : (
        <>
          <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 p-5 text-white">
            <p className="text-amber-100 text-sm">Total a receber</p>
            <p className="text-3xl font-bold mt-1">
              {formatCurrency(totalToReceive)} {trip.baseCurrency}
            </p>
          </div>

          <ul className="space-y-2">
            {creditors.map((c) => {
              const debts = settlements.filter((s) => s.to === c.participantId)
              return (
                <li
                  key={c.participantId}
                  className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">
                      {nameOf(trip, c.participantId)}
                    </span>
                    <span className="font-semibold text-green-600">
                      +{formatCurrency(c.net)} {trip.baseCurrency}
                    </span>
                  </div>
                  {debts.length > 0 && (
                    <ul className="mt-2 space-y-1 border-t border-neutral-100 dark:border-neutral-800 pt-2">
                      {debts.map((d, i) => (
                        <li
                          key={i}
                          className="flex items-center justify-between text-sm text-neutral-600 dark:text-neutral-400"
                        >
                          <span>{nameOf(trip, d.from)}</span>
                          <span>
                            {formatCurrency(d.amount)} {trip.baseCurrency}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
