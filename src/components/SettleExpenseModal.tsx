import { useState } from 'react'
import { Modal } from './ui/Modal'
import { formatCurrency } from '../lib/currencies'
import type { Expense } from '../types'

export function SettleExpenseModal({
  expense,
  onClose,
  onSave,
}: {
  expense: Expense
  onClose: () => void
  onSave: (settledAmount: number) => void
}) {
  const alreadySettled = expense.settledAmount ?? 0
  const wasPartial = alreadySettled > 0 && alreadySettled < expense.amount
  const [mode, setMode] = useState<'full' | 'partial'>(
    wasPartial ? 'partial' : 'full',
  )
  const [partialAmount, setPartialAmount] = useState(
    alreadySettled > 0 ? String(alreadySettled) : '',
  )

  const partialNum = parseFloat(partialAmount) || 0
  const canSave = mode === 'full' || (partialNum > 0 && partialNum <= expense.amount)

  const handleSave = () => {
    if (!canSave) return
    onSave(mode === 'full' ? expense.amount : partialNum)
    onClose()
  }

  const handleUnmark = () => {
    onSave(0)
    onClose()
  }

  return (
    <Modal title="Marcar despesa como paga" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {expense.description} — {formatCurrency(expense.amount)}{' '}
          {expense.currency}
        </p>

        <div className="flex rounded-lg border border-neutral-300 dark:border-neutral-700 overflow-hidden text-sm">
          <button
            type="button"
            onClick={() => setMode('full')}
            className={`flex-1 py-2 font-medium ${mode === 'full' ? 'bg-blue-600 text-white' : 'text-neutral-600 dark:text-neutral-400'}`}
          >
            Paga totalmente
          </button>
          <button
            type="button"
            onClick={() => setMode('partial')}
            className={`flex-1 py-2 font-medium ${mode === 'partial' ? 'bg-blue-600 text-white' : 'text-neutral-600 dark:text-neutral-400'}`}
          >
            Paga parcialmente
          </button>
        </div>

        {mode === 'partial' && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Valor já pago
            </label>
            <input
              autoFocus
              type="number"
              inputMode="decimal"
              min="0"
              max={expense.amount}
              step="0.01"
              value={partialAmount}
              onChange={(e) => setPartialAmount(e.target.value)}
              placeholder="0,00"
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2.5 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {partialNum > expense.amount && (
              <p className="text-xs text-red-600 mt-1">
                Não pode ser maior que o valor da despesa.
              </p>
            )}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={!canSave}
          className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          Salvar
        </button>

        {alreadySettled > 0 && (
          <button
            onClick={handleUnmark}
            className="w-full text-sm text-red-600 hover:underline"
          >
            Desmarcar (voltar a pendente)
          </button>
        )}
      </div>
    </Modal>
  )
}
