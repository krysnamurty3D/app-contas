import { useMemo, useState } from 'react'
import * as Icons from 'lucide-react'
import { Plus, Trash2, Pencil, Wallet } from 'lucide-react'
import { useTrips } from '../context/TripsContext'
import { ACCOUNT_TYPES, type Account, type Trip } from '../types'
import { computeAccountBalances } from '../lib/balances'
import { AccountForm } from './AccountForm'

function TypeIcon({ icon, size = 18 }: { icon: string; size?: number }) {
  const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[icon]
  return Icon ? <Icon size={size} /> : null
}

export function AccountsTab({ trip }: { trip: Trip }) {
  const { addAccount, updateAccount, deleteAccount } = useTrips()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Account | undefined>(undefined)

  const balances = useMemo(
    () => computeAccountBalances(trip.accounts, trip.expenses),
    [trip.accounts, trip.expenses],
  )

  const totalRemainingBase = useMemo(
    () => balances.reduce((sum, b) => sum + b.remainingBase, 0),
    [balances],
  )

  const handleSave = (data: Omit<Account, 'id'> & { id?: string }) => {
    if (data.id) {
      updateAccount(trip.id, data as Account)
    } else {
      addAccount(trip.id, data)
    }
  }

  const openNew = () => {
    setEditing(undefined)
    setShowForm(true)
  }
  const openEdit = (a: Account) => {
    setEditing(a)
    setShowForm(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-neutral-500">
          <Wallet size={18} />
          <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
            Saldos
          </h2>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus size={16} /> Adicionar
        </button>
      </div>

      {trip.accounts.length === 0 ? (
        <p className="text-sm text-neutral-500 text-center py-6">
          Cadastre suas fontes de dinheiro (ex: dinheiro vivo, cartão Wise)
          para acompanhar quanto sobra em cada uma.
        </p>
      ) : (
        <>
          <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 p-5 text-white">
            <p className="text-emerald-100 text-sm">Saldo total restante</p>
            <p className="text-3xl font-bold mt-1">
              {totalRemainingBase.toFixed(2)} {trip.baseCurrency}
            </p>
          </div>

          <ul className="space-y-2">
            {trip.accounts.map((a) => {
              const b = balances.find((x) => x.accountId === a.id)!
              const typeInfo = ACCOUNT_TYPES.find((t) => t.id === a.type)
              const isForeign = a.currency !== trip.baseCurrency
              return (
                <li
                  key={a.id}
                  className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                        <TypeIcon icon={typeInfo?.icon ?? 'Wallet'} />
                      </div>
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">
                          {a.name}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {typeInfo?.label} · saldo inicial{' '}
                          {a.initialBalance.toFixed(2)} {a.currency}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className={`font-semibold ${b.remaining < 0 ? 'text-red-600' : 'text-neutral-900 dark:text-neutral-100'}`}
                      >
                        {b.remaining.toFixed(2)} {a.currency}
                      </p>
                      {isForeign && (
                        <p className="text-xs text-neutral-500">
                          ≈ {b.remainingBase.toFixed(2)} {trip.baseCurrency}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2 border-t border-neutral-100 dark:border-neutral-800 pt-2">
                    <button
                      onClick={() => openEdit(a)}
                      className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-blue-600"
                    >
                      <Pencil size={13} /> Editar
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Excluir "${a.name}"? As despesas continuam, apenas deixam de estar vinculadas a esse saldo.`)) {
                          deleteAccount(trip.id, a.id)
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
        </>
      )}

      {showForm && (
        <AccountForm
          trip={trip}
          account={editing}
          onClose={() => setShowForm(false)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
