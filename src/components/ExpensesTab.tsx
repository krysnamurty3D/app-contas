import { useMemo, useState } from 'react'
import { CheckCircle2, Circle, Plus, Trash2, Pencil, Receipt, MoreHorizontal } from 'lucide-react'
import { useTrips } from '../context/TripsContext'
import { CATEGORIES, type Expense, type Trip } from '../types'
import { formatCurrency } from '../lib/currencies'
import { ExpenseForm } from './ExpenseForm'
import { SettleExpenseModal } from './SettleExpenseModal'

function nameOf(trip: Trip, id: string) {
  return trip.participants.find((p) => p.id === id)?.name ?? '—'
}

export function ExpensesTab({ trip }: { trip: Trip }) {
  const { addExpense, updateExpense, deleteExpense } = useTrips()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Expense | undefined>(undefined)
  const [settling, setSettling] = useState<Expense | undefined>(undefined)

  const handleSettle = (settledAmount: number) => {
    if (!settling) return
    updateExpense(trip.id, { ...settling, settledAmount })
  }

  const sorted = useMemo(
    () =>
      [...trip.expenses].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [trip.expenses],
  )

  const handleSave = (data: Omit<Expense, 'id'> & { id?: string }) => {
    if (data.id) {
      updateExpense(trip.id, data as Expense)
    } else {
      addExpense(trip.id, data)
    }
  }

  const openNew = () => {
    setEditing(undefined)
    setShowForm(true)
  }
  const openEdit = (e: Expense) => {
    setEditing(e)
    setShowForm(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-neutral-500">
          <Receipt size={18} />
          <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
            Despesas
          </h2>
        </div>
        <button
          onClick={openNew}
          disabled={trip.participants.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus size={16} /> Adicionar
        </button>
      </div>

      {trip.participants.length === 0 ? (
        <p className="text-sm text-neutral-500 text-center py-6">
          Adicione participantes ao grupo antes de registrar despesas.
        </p>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-neutral-500 text-center py-6">
          Nenhuma despesa registrada ainda.
        </p>
      ) : (
        <ul className="space-y-2">
          {sorted.map((e) => {
            const cat = CATEGORIES.find((c) => c.id === e.category)
            const CategoryIconComp = cat?.icon ?? MoreHorizontal
            return (
              <li
                key={e.id}
                className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                      <CategoryIconComp size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">
                          {e.description}
                        </p>
                        {e.settledAmount != null && e.settledAmount > 0 && (
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                              e.settledAmount >= e.amount
                                ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {e.settledAmount >= e.amount
                              ? 'Paga'
                              : `Paga parcialmente (${formatCurrency(e.settledAmount)})`}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500">
                        {new Date(e.date + 'T00:00:00').toLocaleDateString('pt-BR')} ·{' '}
                        {nameOf(trip, e.paidBy)} pagou · dividido com{' '}
                        {e.splits.length}{' '}
                        {e.splits.length === 1 ? 'pessoa' : 'pessoas'}
                        {e.paymentMethodId &&
                          trip.accounts.find((a) => a.id === e.paymentMethodId) && (
                            <>
                              {' '}
                              ·{' '}
                              {
                                trip.accounts.find(
                                  (a) => a.id === e.paymentMethodId,
                                )?.name
                              }
                            </>
                          )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {formatCurrency(e.amount)} {e.currency}
                    </p>
                    {e.currency !== trip.baseCurrency && (
                      <p className="text-xs text-neutral-500">
                        ≈ {formatCurrency(e.amount * e.exchangeRate)}{' '}
                        {trip.baseCurrency}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex gap-2 border-t border-neutral-100 dark:border-neutral-800 pt-2">
                  <button
                    onClick={() => setSettling(e)}
                    className={`inline-flex items-center gap-1 text-xs ${
                      e.settledAmount != null && e.settledAmount >= e.amount
                        ? 'text-green-600'
                        : 'text-neutral-500 hover:text-green-600'
                    }`}
                  >
                    {e.settledAmount != null && e.settledAmount >= e.amount ? (
                      <CheckCircle2 size={13} />
                    ) : (
                      <Circle size={13} />
                    )}{' '}
                    Marcar como paga
                  </button>
                  <button
                    onClick={() => openEdit(e)}
                    className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-blue-600"
                  >
                    <Pencil size={13} /> Editar
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Excluir esta despesa?')) {
                        deleteExpense(trip.id, e.id)
                      }
                    }}
                    className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-red-600"
                  >
                    <Trash2 size={13} /> Excluir
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {showForm && (
        <ExpenseForm
          trip={trip}
          expense={editing}
          onClose={() => setShowForm(false)}
          onSave={handleSave}
        />
      )}

      {settling && (
        <SettleExpenseModal
          expense={settling}
          onClose={() => setSettling(undefined)}
          onSave={handleSettle}
        />
      )}
    </div>
  )
}
