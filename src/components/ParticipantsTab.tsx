import { useState } from 'react'
import { Plus, Trash2, Users } from 'lucide-react'
import { useTrips } from '../context/TripsContext'
import type { Trip } from '../types'

export function ParticipantsTab({ trip }: { trip: Trip }) {
  const { addParticipant, removeParticipant } = useTrips()
  const [name, setName] = useState('')

  const handleAdd = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    addParticipant(trip.id, trimmed)
    setName('')
  }

  const handleRemove = (id: string, participantName: string) => {
    const involved = trip.expenses.some(
      (e) => e.paidBy === id || e.splits.some((s) => s.participantId === id),
    )
    const msg = involved
      ? `${participantName} está envolvido(a) em uma ou mais despesas. Removê-lo(a) também removerá essas despesas. Continuar?`
      : `Remover ${participantName} do grupo?`
    if (confirm(msg)) removeParticipant(trip.id, id)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-neutral-500">
        <Users size={18} />
        <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
          Participantes do grupo
        </h2>
      </div>

      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Nome da pessoa"
          className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2.5 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleAdd}
          disabled={!name.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus size={18} />
        </button>
      </div>

      {trip.participants.length === 0 ? (
        <p className="text-sm text-neutral-500 text-center py-6">
          Adicione as pessoas que vão dividir as despesas da viagem.
        </p>
      ) : (
        <ul className="space-y-2">
          {trip.participants.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold text-sm">
                  {p.name.slice(0, 1).toUpperCase()}
                </div>
                <span className="text-neutral-900 dark:text-neutral-100">
                  {p.name}
                </span>
              </div>
              <button
                onClick={() => handleRemove(p.id, p.name)}
                className="rounded-full p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                aria-label={`Remover ${p.name}`}
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
