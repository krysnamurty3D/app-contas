import { useState } from 'react'
import { Modal } from './ui/Modal'
import { formatCurrency } from '../lib/currencies'
import type { Expense, ExpenseSplit } from '../types'

export function SettleExpenseModal({
  expense,
  nameOf,
  onClose,
  onSave,
}: {
  expense: Expense
  nameOf: (participantId: string) => string
  onClose: () => void
  onSave: (splits: ExpenseSplit[]) => void
}) {
  const [amounts, setAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      expense.splits.map((s) => [
        s.participantId,
        s.settledAmount ? String(s.settledAmount) : '',
      ]),
    ),
  )

  const parsed = (participantId: string) => {
    const n = parseFloat(amounts[participantId])
    return Number.isFinite(n) && n > 0 ? n : 0
  }

  const totalSettled = expense.splits.reduce(
    (sum, s) => sum + Math.min(parsed(s.participantId), s.amount),
    0,
  )
  const canSave = expense.splits.every(
    (s) => parsed(s.participantId) <= s.amount,
  )

  const handleSave = () => {
    if (!canSave) return
    const splits = expense.splits.map((s) => {
      const settledAmount = Math.min(parsed(s.participantId), s.amount)
      return { ...s, settledAmount: settledAmount > 0 ? settledAmount : undefined }
    })
    onSave(splits)
    onClose()
  }

  const markAllPaid = () => {
    setAmounts(
      Object.fromEntries(
        expense.splits.map((s) => [s.participantId, String(s.amount)]),
      ),
    )
  }

  const clearAll = () => {
    setAmounts(
      Object.fromEntries(expense.splits.map((s) => [s.participantId, ''])),
    )
  }

  return (
    <Modal title="Marcar despesa como paga" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {expense.description} — {formatCurrency(expense.amount)}{' '}
          {expense.currency}
        </p>
        <p className="text-xs text-neutral-500">
          Informe quanto cada pessoa já adiantou da própria parte, fora do app.
          O saldo devedor restante será distribuído considerando isso.
        </p>

        <div className="space-y-3">
          {expense.splits.map((s) => {
            const value = parsed(s.participantId)
            const over = value > s.amount
            return (
              <div key={s.participantId}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    {nameOf(s.participantId)}
                  </label>
                  <span className="text-xs text-neutral-500">
                    parte: {formatCurrency(s.amount)}
                  </span>
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max={s.amount}
                  step="0.01"
                  value={amounts[s.participantId] ?? ''}
                  onChange={(e) =>
                    setAmounts((prev) => ({
                      ...prev,
                      [s.participantId]: e.target.value,
                    }))
                  }
                  placeholder="0,00"
                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2.5 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {over && (
                  <p className="text-xs text-red-600 mt-1">
                    Não pode ser maior que a parte desta pessoa.
                  </p>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={markAllPaid}
            className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-700 py-1.5 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800"
          >
            Marcar tudo como pago
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-700 py-1.5 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800"
          >
            Limpar
          </button>
        </div>

        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Total já adiantado: {formatCurrency(totalSettled)} de{' '}
          {formatCurrency(expense.amount)}
        </p>

        <button
          onClick={handleSave}
          disabled={!canSave}
          className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          Salvar
        </button>
      </div>
    </Modal>
  )
}
