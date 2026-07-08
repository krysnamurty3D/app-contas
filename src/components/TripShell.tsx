import { useState } from 'react'
import { ArrowLeft, HandCoins, LayoutDashboard, Receipt, Users, Wallet } from 'lucide-react'
import { useTrips } from '../context/TripsContext'
import { Dashboard } from './Dashboard'
import { ExpensesTab } from './ExpensesTab'
import { ParticipantsTab } from './ParticipantsTab'
import { AccountsTab } from './AccountsTab'
import { ReceivablesTab } from './ReceivablesTab'
import type { Trip } from '../types'

type Tab = 'dashboard' | 'expenses' | 'accounts' | 'receivables' | 'participants'

export function TripShell({ trip }: { trip: Trip }) {
  const { selectTrip } = useTrips()
  const [tab, setTab] = useState<Tab>('dashboard')

  const tabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'dashboard', label: 'Resumo', icon: LayoutDashboard },
    { id: 'expenses', label: 'Despesas', icon: Receipt },
    { id: 'accounts', label: 'Saldos', icon: Wallet },
    { id: 'receivables', label: 'Acertos', icon: HandCoins },
    { id: 'participants', label: 'Grupo', icon: Users },
  ]

  return (
    <div className="mx-auto max-w-md min-h-screen pb-28">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-950/90 backdrop-blur px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          onClick={() => selectTrip(null)}
          className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          aria-label="Voltar para viagens"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-semibold text-neutral-900 dark:text-neutral-100 leading-tight">
            {trip.name}
          </h1>
          <p className="text-xs text-neutral-500">{trip.baseCurrency}</p>
        </div>
      </header>

      <main className="px-4 py-5">
        {tab === 'dashboard' && <Dashboard trip={trip} />}
        {tab === 'expenses' && <ExpensesTab trip={trip} />}
        {tab === 'accounts' && <AccountsTab trip={trip} />}
        {tab === 'receivables' && <ReceivablesTab trip={trip} />}
        {tab === 'participants' && <ParticipantsTab trip={trip} />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-10 border-t border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-md flex">
          {tabs.map((t) => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium ${
                  active
                    ? 'text-blue-600'
                    : 'text-neutral-400 dark:text-neutral-500'
                }`}
              >
                <Icon size={20} />
                {t.label}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
