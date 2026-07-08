import { useMemo } from 'react'
import { ArrowRight, Scale, PieChart } from 'lucide-react'
import { computeBalances, simplifyDebts } from '../lib/balances'
import { formatCurrency } from '../lib/currencies'
import { CATEGORIES, type Trip } from '../types'

function nameOf(trip: Trip, id: string) {
  return trip.participants.find((p) => p.id === id)?.name ?? '—'
}

export function Dashboard({ trip }: { trip: Trip }) {
  const balances = useMemo(
    () => computeBalances(trip.participants, trip.expenses),
    [trip.participants, trip.expenses],
  )
  const settlements = useMemo(() => simplifyDebts(balances), [balances])

  const totalSpent = useMemo(
    () =>
      trip.expenses.reduce((sum, e) => sum + e.amount * e.exchangeRate, 0),
    [trip.expenses],
  )

  const byCategory = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const e of trip.expenses) {
      totals[e.category] = (totals[e.category] ?? 0) + e.amount * e.exchangeRate
    }
    return CATEGORIES.map((c) => ({ ...c, total: totals[c.id] ?? 0 })).filter(
      (c) => c.total > 0,
    ).sort((a, b) => b.total - a.total)
  }, [trip.expenses])

  // Total efetivamente gasto (soma das próprias parcelas, não o saldo líquido)
  // por subgrupo, para saber quanto cada um consumiu na viagem.
  const byGroup = useMemo(() => {
    if (trip.groups.length === 0) return []
    const spentByParticipant: Record<string, number> = {}
    for (const e of trip.expenses) {
      const rate = e.exchangeRate || 1
      for (const s of e.splits) {
        spentByParticipant[s.participantId] =
          (spentByParticipant[s.participantId] ?? 0) + s.amount * rate
      }
    }
    const groupTotals = trip.groups.map((g) => {
      const memberIds = trip.participants
        .filter((p) => p.groupId === g.id)
        .map((p) => p.id)
      const total = memberIds.reduce(
        (sum, id) => sum + (spentByParticipant[id] ?? 0),
        0,
      )
      return { id: g.id, name: g.name, total }
    })
    const ungroupedIds = trip.participants
      .filter((p) => !p.groupId)
      .map((p) => p.id)
    const ungroupedTotal = ungroupedIds.reduce(
      (sum, id) => sum + (spentByParticipant[id] ?? 0),
      0,
    )
    if (ungroupedTotal > 0.005) {
      groupTotals.push({ id: 'ungrouped', name: 'Sem grupo', total: ungroupedTotal })
    }
    return groupTotals
      .filter((g) => g.total > 0.005)
      .sort((a, b) => b.total - a.total)
  }, [trip.groups, trip.participants, trip.expenses])

  if (trip.participants.length === 0) {
    return (
      <p className="text-sm text-neutral-500 text-center py-6">
        Adicione participantes para começar a acompanhar os saldos.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-5 text-white">
        <p className="text-blue-100 text-sm">Total gasto na viagem</p>
        <p className="text-3xl font-bold mt-1">
          {formatCurrency(totalSpent)} {trip.baseCurrency}
        </p>
      </div>

      <div>
        <div className="flex items-center gap-2 text-neutral-500 mb-3">
          <Scale size={18} />
          <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
            Saldo por pessoa
          </h2>
        </div>
        <ul className="space-y-2">
          {balances.map((b) => (
            <li
              key={b.participantId}
              className="flex items-center justify-between rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3"
            >
              <span className="text-neutral-900 dark:text-neutral-100">
                {nameOf(trip, b.participantId)}
              </span>
              <span
                className={`font-semibold ${
                  b.net > 0.005
                    ? 'text-green-600'
                    : b.net < -0.005
                      ? 'text-red-600'
                      : 'text-neutral-400'
                }`}
              >
                {b.net > 0.005 && '+'}
                {formatCurrency(b.net)} {trip.baseCurrency}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="flex items-center gap-2 text-neutral-500 mb-3">
          <ArrowRight size={18} />
          <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
            Quem deve pagar quem
          </h2>
        </div>
        {settlements.length === 0 ? (
          <p className="text-sm text-neutral-500 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 px-4 py-4 text-center">
            Tudo certo! Ninguém deve nada no momento.
          </p>
        ) : (
          <ul className="space-y-2">
            {settlements.map((s, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3"
              >
                <div className="flex items-center gap-2 text-sm text-neutral-800 dark:text-neutral-200">
                  <span className="font-medium">{nameOf(trip, s.from)}</span>
                  <ArrowRight size={14} className="text-neutral-400" />
                  <span className="font-medium">{nameOf(trip, s.to)}</span>
                </div>
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {formatCurrency(s.amount)} {trip.baseCurrency}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {byCategory.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-neutral-500 mb-3">
            <PieChart size={18} />
            <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
              Gastos por categoria
            </h2>
          </div>
          <ul className="space-y-2">
            {byCategory.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3"
              >
                <div className="flex items-center gap-2.5 text-neutral-800 dark:text-neutral-200">
                  <c.icon size={16} />
                  <span>{c.label}</span>
                </div>
                <div className="flex items-center gap-3 flex-1 max-w-[55%]">
                  <div className="h-1.5 flex-1 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{
                        width: `${totalSpent > 0 ? (c.total / totalSpent) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 w-20 text-right">
                    {formatCurrency(c.total)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {byGroup.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-neutral-500 mb-3">
            <PieChart size={18} />
            <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
              Gastos por subgrupo
            </h2>
          </div>
          <ul className="space-y-2">
            {byGroup.map((g) => (
              <li
                key={g.id}
                className="flex items-center justify-between rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3"
              >
                <span className="text-neutral-800 dark:text-neutral-200">
                  {g.name}
                </span>
                <div className="flex items-center gap-3 flex-1 max-w-[55%]">
                  <div className="h-1.5 flex-1 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{
                        width: `${totalSpent > 0 ? (g.total / totalSpent) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 w-20 text-right">
                    {formatCurrency(g.total)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
