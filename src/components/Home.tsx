import { useRef, useState } from 'react'
import { Download, Plane, Plus, Trash2, Upload } from 'lucide-react'
import { useTrips } from '../context/TripsContext'
import { Modal } from './ui/Modal'
import { COMMON_CURRENCIES } from '../lib/currencies'
import { exportBackup, parseBackup } from '../lib/backup'

export function Home() {
  const { trips, selectTrip, createTrip, deleteTrip, importTrips } = useTrips()
  const [showNewTrip, setShowNewTrip] = useState(false)
  const [name, setName] = useState('')
  const [baseCurrency, setBaseCurrency] = useState('BRL')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleCreate = () => {
    if (!name.trim()) return
    createTrip(name.trim(), baseCurrency)
    setShowNewTrip(false)
    setName('')
    setBaseCurrency('BRL')
  }

  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text()
      const imported = parseBackup(text)
      const added = importTrips(imported)
      const skipped = imported.length - added
      const plural = (n: number, singular: string, pluralForm: string) =>
        n === 1 ? singular : pluralForm
      alert(
        `${added} ${plural(added, 'viagem importada', 'viagens importadas')}.` +
          (skipped > 0
            ? ` ${skipped} ${plural(skipped, 'já existia e foi ignorada', 'já existiam e foram ignoradas')}.`
            : ''),
      )
    } catch {
      alert('Não foi possível importar esse arquivo. Verifique se é um backup válido.')
    }
  }

  return (
    <div className="mx-auto max-w-md min-h-screen px-5 pb-8 pt-[max(2rem,env(safe-area-inset-top))]">
      <div className="flex items-center gap-3 mb-8">
        <div className="rounded-xl bg-blue-600 p-2.5 text-white">
          <Plane size={24} />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
            Minhas Viagens
          </h1>
          <p className="text-sm text-neutral-500">Despesas e divisão de contas</p>
        </div>
        <button
          onClick={() => exportBackup(trips)}
          disabled={trips.length === 0}
          title="Exportar backup"
          aria-label="Exportar backup"
          className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-300 disabled:opacity-40"
        >
          <Download size={20} />
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Importar backup"
          aria-label="Importar backup"
          className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
        >
          <Upload size={20} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleImportFile(file)
            e.target.value = ''
          }}
        />
      </div>

      {trips.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 p-8 text-center">
          <p className="text-neutral-500 mb-4">
            Você ainda não tem nenhuma viagem cadastrada.
          </p>
          <button
            onClick={() => setShowNewTrip(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-white font-medium hover:bg-blue-700"
          >
            <Plus size={18} /> Nova viagem
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {trips.map((trip) => (
            <div
              key={trip.id}
              className="flex items-center justify-between rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-sm cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition"
              onClick={() => selectTrip(trip.id)}
            >
              <div>
                <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {trip.name}
                </p>
                <p className="text-sm text-neutral-500">
                  {trip.participants.length} participante
                  {trip.participants.length !== 1 ? 's' : ''} ·{' '}
                  {trip.expenses.length} despesa
                  {trip.expenses.length !== 1 ? 's' : ''} · {trip.baseCurrency}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm(`Excluir a viagem "${trip.name}"? Essa ação não pode ser desfeita.`)) {
                    deleteTrip(trip.id)
                  }
                }}
                className="rounded-full p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                aria-label="Excluir viagem"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          <button
            onClick={() => setShowNewTrip(true)}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-300 dark:border-neutral-700 px-4 py-3 text-neutral-700 dark:text-neutral-300 font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800"
          >
            <Plus size={18} /> Nova viagem
          </button>
        </div>
      )}

      {showNewTrip && (
        <Modal title="Nova viagem" onClose={() => setShowNewTrip(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Nome da viagem
              </label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Argentina 2026"
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2.5 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Moeda principal
              </label>
              <select
                value={baseCurrency}
                onChange={(e) => setBaseCurrency(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2.5 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {COMMON_CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <p className="text-xs text-neutral-500 mt-1">
                Os saldos e totais serão exibidos nesta moeda.
              </p>
            </div>
            <button
              onClick={handleCreate}
              disabled={!name.trim()}
              className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              Criar viagem
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
