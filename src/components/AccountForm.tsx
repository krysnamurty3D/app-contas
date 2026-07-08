import { useState } from 'react'
import * as Icons from 'lucide-react'
import { Modal } from './ui/Modal'
import { ACCOUNT_TYPES, type Account, type AccountType, type Trip } from '../types'
import { quickCurrencies } from '../lib/currencies'

function TypeIcon({ icon, size = 16 }: { icon: string; size?: number }) {
  const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[icon]
  return Icon ? <Icon size={size} /> : null
}

export function AccountForm({
  trip,
  account,
  onClose,
  onSave,
}: {
  trip: Trip
  account?: Account
  onClose: () => void
  onSave: (account: Omit<Account, 'id'> & { id?: string }) => void
}) {
  const isEdit = !!account
  const [name, setName] = useState(account?.name ?? '')
  const [type, setType] = useState<AccountType>(account?.type ?? 'dinheiro')
  const [currency, setCurrency] = useState(account?.currency ?? trip.baseCurrency)
  const [exchangeRate, setExchangeRate] = useState(
    account ? String(account.exchangeRate) : '1',
  )
  const [initialBalance, setInitialBalance] = useState(
    account ? String(account.initialBalance) : '',
  )

  const isForeign = currency.trim().toUpperCase() !== trip.baseCurrency.toUpperCase()
  const chips = quickCurrencies(trip.baseCurrency)
  const balanceNum = parseFloat(initialBalance) || 0

  const canSave = name.trim() && currency.trim() && balanceNum >= 0

  const handleSave = () => {
    if (!canSave) return
    onSave({
      id: account?.id,
      name: name.trim(),
      type,
      currency: currency.trim().toUpperCase(),
      exchangeRate: isForeign ? parseFloat(exchangeRate) || 1 : 1,
      initialBalance: balanceNum,
    })
    onClose()
  }

  return (
    <Modal title={isEdit ? 'Editar saldo' : 'Novo saldo'} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Nome
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Cartão Wise, Dinheiro"
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2.5 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Tipo
          </label>
          <div className="grid grid-cols-3 gap-2">
            {ACCOUNT_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setType(t.id)}
                className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-xs font-medium transition ${
                  type === t.id
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                    : 'border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400'
                }`}
              >
                <TypeIcon icon={t.icon} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Saldo inicial
            </label>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              placeholder="0,00"
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2.5 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Moeda
            </label>
            <input
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              placeholder={trip.baseCurrency}
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2.5 text-neutral-900 dark:text-neutral-100 uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 -mt-2">
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCurrency(c)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                currency.toUpperCase() === c
                  ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                  : 'border-neutral-300 dark:border-neutral-700 text-neutral-500'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {isForeign && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Câmbio (1 {currency.toUpperCase()} = ? {trip.baseCurrency})
            </label>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.0001"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2.5 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {balanceNum > 0 && (
              <p className="text-xs text-neutral-500 mt-1">
                ≈ {(balanceNum * (parseFloat(exchangeRate) || 0)).toFixed(2)}{' '}
                {trip.baseCurrency}
              </p>
            )}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={!canSave}
          className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {isEdit ? 'Salvar alterações' : 'Adicionar saldo'}
        </button>
      </div>
    </Modal>
  )
}
