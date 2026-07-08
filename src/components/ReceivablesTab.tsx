import { useMemo, useState } from 'react'
import { ArrowRight, ArrowRightLeft, ChevronDown, HandCoins, Wallet } from 'lucide-react'
import { computeBalances, simplifyDebts } from '../lib/balances'
import { formatCurrency } from '../lib/currencies'
import type { Trip } from '../types'

function nameOf(trip: Trip, id: string) {
  return trip.participants.find((p) => p.id === id)?.name ?? '—'
}

function groupNameOf(trip: Trip, id: string) {
  return trip.groups.find((g) => g.id === id)?.name ?? '—'
}

/** Net amount each of this group's expenses contributes to its balance
 * (positive = group is owed for it, negative = group owes for it). */
function expensesForGroup(trip: Trip, memberIds: string[]) {
  return trip.expenses
    .map((e) => {
      const rate = e.exchangeRate || 1
      const totalSettled = e.splits.reduce(
        (sum, s) => sum + Math.max(0, Math.min(s.settledAmount ?? 0, s.amount)),
        0,
      )
      const paidByGroup = memberIds.includes(e.paidBy)
        ? (e.amount - totalSettled) * rate
        : 0
      const owedByGroup = e.splits
        .filter((s) => memberIds.includes(s.participantId))
        .reduce((sum, s) => {
          const settled = Math.max(0, Math.min(s.settledAmount ?? 0, s.amount))
          return sum + (s.amount - settled) * rate
        }, 0)
      return {
        id: e.id,
        description: e.description,
        date: e.date,
        net: paidByGroup - owedByGroup,
      }
    })
    .filter((e) => Math.abs(e.net) > 0.005)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function ReceivablesTab({ trip }: { trip: Trip }) {
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null)
  const balances = useMemo(
    () => computeBalances(trip.participants, trip.expenses),
    [trip.participants, trip.expenses],
  )
  const settlements = useMemo(() => simplifyDebts(balances), [balances])

  const creditors = useMemo(
    () => balances.filter((b) => b.net > 0.005).sort((a, b) => b.net - a.net),
    [balances],
  )
  const debtors = useMemo(
    () => balances.filter((b) => b.net < -0.005).sort((a, b) => a.net - b.net),
    [balances],
  )

  const totalToReceive = useMemo(
    () => creditors.reduce((sum, c) => sum + c.net, 0),
    [creditors],
  )
  const totalToPay = useMemo(
    () => debtors.reduce((sum, d) => sum + Math.abs(d.net), 0),
    [debtors],
  )

  const groupTotals = useMemo(
    () =>
      trip.groups.map((g) => {
        const memberIds = trip.participants
          .filter((p) => p.groupId === g.id)
          .map((p) => p.id)
        const memberBalances = balances.filter((b) =>
          memberIds.includes(b.participantId),
        )
        const toReceive = memberBalances
          .filter((b) => b.net > 0.005)
          .reduce((sum, b) => sum + b.net, 0)
        const toPay = memberBalances
          .filter((b) => b.net < -0.005)
          .reduce((sum, b) => sum + Math.abs(b.net), 0)
        return { id: g.id, name: g.name, toReceive, toPay }
      }),
    [trip.groups, trip.participants, balances],
  )

  const groupSettlements = useMemo(() => {
    if (groupTotals.length < 2) return []
    const pseudoBalances = groupTotals.map((g) => ({
      participantId: g.id,
      net: g.toReceive - g.toPay,
      paid: 0,
      owes: 0,
    }))
    return simplifyDebts(pseudoBalances)
  }, [groupTotals])

  if (trip.participants.length === 0) {
    return (
      <p className="text-sm text-neutral-500 text-center py-6">
        Adicione participantes para acompanhar o dinheiro a receber e a pagar.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {groupTotals.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-neutral-500 mb-3">
            <Wallet size={18} />
            <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
              Por subgrupo
            </h2>
          </div>
          <ul className="space-y-2">
            {groupTotals.map((g) => {
              const isExpanded = expandedGroupId === g.id
              const memberIds = trip.participants
                .filter((p) => p.groupId === g.id)
                .map((p) => p.id)
              const groupExpenses = isExpanded
                ? expensesForGroup(trip, memberIds)
                : []
              return (
                <li
                  key={g.id}
                  className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedGroupId(isExpanded ? null : g.id)
                    }
                    className="w-full text-left p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">
                        {g.name}
                      </p>
                      <ChevronDown
                        size={16}
                        className={`text-neutral-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-neutral-500">A receber</p>
                        <p className="font-semibold text-green-600">
                          {formatCurrency(g.toReceive)} {trip.baseCurrency}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-500">A pagar</p>
                        <p className="font-semibold text-red-600">
                          {formatCurrency(g.toPay)} {trip.baseCurrency}
                        </p>
                      </div>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="border-t border-neutral-100 dark:border-neutral-800 px-4 py-3">
                      {groupExpenses.length === 0 ? (
                        <p className="text-xs text-neutral-500">
                          Nenhuma despesa envolvendo este subgrupo.
                        </p>
                      ) : (
                        <ul className="space-y-1.5">
                          {groupExpenses.map((e) => (
                            <li
                              key={e.id}
                              className="flex items-center gap-2 text-sm"
                            >
                              <span className="text-neutral-700 dark:text-neutral-300 shrink-0">
                                {e.description}
                              </span>
                              <span className="flex-1 border-b border-dotted border-neutral-300 dark:border-neutral-700" />
                              <span
                                className={`font-medium shrink-0 ${e.net > 0 ? 'text-green-600' : 'text-red-600'}`}
                              >
                                {formatCurrency(Math.abs(e.net))} {trip.baseCurrency}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {groupTotals.length >= 2 && (
        <div>
          <div className="flex items-center gap-2 text-neutral-500 mb-3">
            <ArrowRightLeft size={18} />
            <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
              Compensação entre subgrupos
            </h2>
          </div>
          {groupSettlements.length === 0 ? (
            <p className="text-sm text-neutral-500 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 px-4 py-6 text-center">
              Os subgrupos estão equilibrados entre si no momento.
            </p>
          ) : (
            <ul className="space-y-2">
              {groupSettlements.map((s, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3"
                >
                  <div className="flex items-center gap-2 text-sm text-neutral-800 dark:text-neutral-200">
                    <span className="font-medium">{groupNameOf(trip, s.from)}</span>
                    <ArrowRight size={14} className="text-neutral-400" />
                    <span className="font-medium">{groupNameOf(trip, s.to)}</span>
                  </div>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {formatCurrency(s.amount)} {trip.baseCurrency}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div>
        <div className="flex items-center gap-2 text-neutral-500 mb-3">
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

            <ul className="space-y-2 mt-3">
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

      <div>
        <div className="flex items-center gap-2 text-neutral-500 mb-3">
          <HandCoins size={18} className="rotate-180" />
          <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
            Dinheiro a pagar
          </h2>
        </div>

        {debtors.length === 0 ? (
          <p className="text-sm text-neutral-500 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 px-4 py-6 text-center">
            Ninguém tem dinheiro a pagar no momento.
          </p>
        ) : (
          <>
            <div className="rounded-2xl bg-gradient-to-br from-red-500 to-red-600 p-5 text-white">
              <p className="text-red-100 text-sm">Total a pagar</p>
              <p className="text-3xl font-bold mt-1">
                {formatCurrency(totalToPay)} {trip.baseCurrency}
              </p>
            </div>

            <ul className="space-y-2 mt-3">
              {debtors.map((d) => {
                const debts = settlements.filter((s) => s.from === d.participantId)
                return (
                  <li
                    key={d.participantId}
                    className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-neutral-900 dark:text-neutral-100">
                        {nameOf(trip, d.participantId)}
                      </span>
                      <span className="font-semibold text-red-600">
                        -{formatCurrency(Math.abs(d.net))} {trip.baseCurrency}
                      </span>
                    </div>
                    {debts.length > 0 && (
                      <ul className="mt-2 space-y-1 border-t border-neutral-100 dark:border-neutral-800 pt-2">
                        {debts.map((s, i) => (
                          <li
                            key={i}
                            className="flex items-center justify-between text-sm text-neutral-600 dark:text-neutral-400"
                          >
                            <span>{nameOf(trip, s.to)}</span>
                            <span>
                              {formatCurrency(s.amount)} {trip.baseCurrency}
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
    </div>
  )
}
